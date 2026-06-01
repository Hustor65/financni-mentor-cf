/**
 * Cloudflare Pages Function — Market Data API
 * Replaces yfinance with Yahoo Finance REST API
 */

// Yahoo Finance blokuje requesty bez browser User-Agent (vrací 429).
// yfinance v původní Streamlit appce tohle řešil interně; tady to musíme přidat ručně.
const YF_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type');
  const ticker = url.searchParams.get('ticker') || '';
  const period = url.searchParams.get('period') || '1y';

  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=300' };

  try {
    switch (type) {
      case 'stock':
      case 'crypto': {
        const symbol = type === 'crypto' ? `${ticker.toUpperCase()}-USD` : ticker.toUpperCase();
        const resp = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`, { headers: YF_HEADERS });
        if (!resp.ok) return new Response(JSON.stringify({ error: `Ticker ${ticker} not found` }), { status: 404, headers });
        const data = await resp.json() as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
        const meta = data.chart?.result?.[0]?.meta;
        return new Response(JSON.stringify({
          ticker: symbol, price: meta?.regularMarketPrice,
          currency: meta?.currency, timestamp: new Date().toISOString(),
        }), { headers });
      }

      case 'summary': {
        const symbols = ['^GSPC', '^IXIC', '^DJI', 'BTC-USD', 'ETH-USD', 'GC=F', 'EURCZK=X'];
        const results: Record<string, unknown> = {};
        for (const sym of symbols) {
          try {
            const resp = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`, { headers: YF_HEADERS });
            if (resp.ok) {
              const data = await resp.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
              results[sym] = { price: data.chart?.result?.[0]?.meta?.regularMarketPrice };
            }
          } catch { /* skip failed symbols */ }
        }
        return new Response(JSON.stringify({ summary: results, timestamp: new Date().toISOString() }), { headers });
      }

      case 'history': {
        const symbol = ticker.toUpperCase();
        const resp = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`, { headers: YF_HEADERS });
        if (!resp.ok) return new Response(JSON.stringify({ error: `No data for ${ticker}` }), { status: 404, headers });
        const data = await resp.json() as { chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: number[] }> } }> } };
        const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean) || [];
        if (closes.length < 2) return new Response(JSON.stringify({ error: 'Insufficient data' }), { status: 404, headers });
        const perf = ((closes[closes.length - 1]! - closes[0]!) / closes[0]!) * 100;
        return new Response(JSON.stringify({
          ticker: symbol, period, performance_percent: Math.round(perf * 100) / 100,
          start_price: closes[0], end_price: closes[closes.length - 1], data_points: closes.length,
        }), { headers });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid type parameter' }), { status: 400, headers });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers });
  }
};
