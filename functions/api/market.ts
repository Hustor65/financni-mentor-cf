/**
 * Cloudflare Pages Function — Market Data API
 * Replaces yfinance with Yahoo Finance REST API
 *
 *   GET /api/market?type=series&ticker=AAPL&period=1y  → svíčky pro obrazovku Trhy
 *   GET /api/market?type=quotes&symbols=AAPL,MSFT      → ceny pro pásek trhů
 */

// Yahoo Finance blokuje requesty bez browser User-Agent (vrací 429).
// yfinance v původní Streamlit appce tohle řešil interně; tady to musíme přidat ručně.
const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

interface YahooChart {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: {
        regularMarketPrice?: number; chartPreviousClose?: number; currency?: string;
        longName?: string; shortName?: string; exchangeName?: string; fullExchangeName?: string;
        regularMarketTime?: number;
      };
      indicators?: { quote?: Array<{
        open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[];
        close?: (number | null)[]; volume?: (number | null)[];
      }> };
    }>;
  };
}

/** Yahoo chart endpoint s 10s timeoutem — zaseknutý symbol nezablokuje celý request. */
async function fetchYahoo(symbol: string, range: string, interval: string): Promise<YahooChart | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const resp = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { headers: YF_HEADERS, signal: ctrl.signal },
    );
    if (!resp.ok) return null;
    return await resp.json() as YahooChart;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sdílená cache na okraji sítě (Cache API). Bez ní by každý návštěvník spustil
 * vlastní dotazy na Yahoo — při desítkách lidí naráz Yahoo začne odmítat.
 * Ukládáme jen úplné odpovědi; neúplná (část symbolů selhala) se necachuje vůbec,
 * ani v prohlížeči.
 */
async function edgeCached(
  context: { request: Request; waitUntil: (p: Promise<unknown>) => void },
  key: string,
  ttl: number,
  build: () => Promise<{ body: unknown; complete: boolean; status?: number }>,
): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(`${new URL(context.request.url).origin}/__market-cache/${key}`);
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch { /* cache nedostupná → pokračuj bez ní */ }

  const { body, complete, status = 200 } = await build();
  const resp = new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': complete && status === 200 ? `public, max-age=${ttl}` : 'no-store',
    },
  });
  if (complete && status === 200) {
    try { context.waitUntil(cache.put(cacheKey, resp.clone())); } catch { /* nevadí */ }
  }
  return resp;
}

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const ticker = url.searchParams.get('ticker') || '';
  const period = url.searchParams.get('period') || '1y';

  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };

  try {
    switch (type) {
      // ── Časová řada OHLCV pro obrazovku Trhy (svíčky, objem, indikátory) ──
      case 'series': {
        const symbol = ticker.toUpperCase().trim();
        if (!/^[A-Z0-9.^=-]{1,14}$/.test(symbol)) {
          return new Response(JSON.stringify({ error: 'Neplatný ticker' }), { status: 400, headers });
        }
        const RANGES: Record<string, string> = { '1mo': '1d', '6mo': '1d', '1y': '1d', '2y': '1d', '5y': '1wk', 'max': '1mo' };
        const range = RANGES[period] ? period : '1y';
        return edgeCached(context, `series/${encodeURIComponent(symbol)}/${range}`, 600, async () => {
          const data = await fetchYahoo(symbol, range, RANGES[range]);
          const r = data?.chart?.result?.[0];
          const q = r?.indicators?.quote?.[0];
          if (!r?.timestamp || !q?.close) {
            return { body: { error: `Pro ${symbol} nemáme data` }, complete: false, status: 404 };
          }
          const points: Array<[number, number, number, number, number, number]> = [];
          for (let i = 0; i < r.timestamp.length; i++) {
            const c = q.close[i];
            if (c == null) continue; // svátky / chybějící svíčky
            points.push([r.timestamp[i] * 1000, q.open?.[i] ?? c, q.high?.[i] ?? c, q.low?.[i] ?? c, c, q.volume?.[i] ?? 0]);
          }
          if (points.length < 2) return { body: { error: 'Málo dat' }, complete: false, status: 404 };
          return {
            complete: true,
            body: {
              ticker: symbol,
              name: r.meta?.longName || r.meta?.shortName || symbol,
              currency: r.meta?.currency ?? '',
              exchange: r.meta?.fullExchangeName || r.meta?.exchangeName || '',
              range,
              // [čas ms, open, high, low, close, objem]
              points,
              timestamp: new Date().toISOString(),
            },
          };
        });
      }

      // ── Rychlé kotace (cena + denní změna) pro pásek trhů ──
      case 'quotes': {
        const symbols = [...new Set((url.searchParams.get('symbols') || '')
          .split(',').map(s => s.trim().toUpperCase())
          .filter(s => /^[A-Z0-9.^=-]{1,14}$/.test(s)))].slice(0, 30);
        if (!symbols.length) return new Response(JSON.stringify({ quotes: [] }), { headers });
        // každý symbol má vlastní záznam v cache: přeházený nebo jinak poskládaný
        // seznam tak nevyvolá nové dotazy na Yahoo
        const quotes = await Promise.all(symbols.map(async sym => {
          try {
            const resp = await edgeCached(context, `quote/${encodeURIComponent(sym)}`, 60, async () => {
              const data = await fetchYahoo(sym, '5d', '1d');
              const r = data?.chart?.result?.[0];
              const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter((v): v is number => v != null);
              const price = r?.meta?.regularMarketPrice ?? closes[closes.length - 1];
              // předchozí denní zavíračka = předposlední svíčka (poslední je dnešek)
              const prev = closes.length >= 2 ? closes[closes.length - 2] : r?.meta?.chartPreviousClose;
              if (price == null || prev == null) return { body: null, complete: false };
              return {
                body: {
                  ticker: sym, price, change_percent: ((price - prev) / prev) * 100, currency: r?.meta?.currency ?? '',
                  name: r?.meta?.longName || r?.meta?.shortName || sym,
                  // kdy burza naposledy obchodovala (ms) — web podle toho píše datum místo „dnes“
                  asof: (r?.meta?.regularMarketTime ?? r?.timestamp?.[r.timestamp.length - 1] ?? 0) * 1000 || undefined,
                },
                complete: true,
              };
            });
            return await resp.json() as Record<string, unknown> | null;
          } catch { return null; }
        }));
        const ok = quotes.filter(Boolean);
        return new Response(JSON.stringify({ quotes: ok, timestamp: new Date().toISOString() }), {
          headers: { ...headers, 'Cache-Control': ok.length === symbols.length ? 'public, max-age=60' : 'no-store' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid type parameter' }), { status: 400, headers });
    }
  } catch (error) {
    console.error('market error', error);
    return new Response(JSON.stringify({ error: 'Tržní data teď nejsou dostupná.' }), { status: 500, headers });
  }
};
