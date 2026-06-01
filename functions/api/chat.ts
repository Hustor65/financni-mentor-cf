/**
 * Cloudflare Pages Function — Chat API
 * 1:1 port jádra `core.py` (FinanceMentorBot) do TypeScriptu.
 *
 * Obsahuje:
 *  - kompletní systémové instrukce (10 guardrails) jako v core.py
 *  - Function Calling nad živými daty z Yahoo Finance
 *    (get_stock_price, get_crypto_price, get_market_summary, get_historical_performance)
 *  - primární model gemini-3.5-flash + fallback gemini-2.5-flash-lite při chybě 429
 */

interface Env {
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
}

type Role = 'user' | 'model';
interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: { result: unknown } };
}
interface GeminiContent {
  role: Role;
  parts: GeminiPart[];
}

// gemini-3.5-flash má na free tieru jen 20 requestů/den → web po pár dotazech
// padal na 429. gemini-2.5-flash má výrazně vyšší free kvótu a kvalitou bohatě stačí.
// (Chceš-li zpět 3.5-flash, zapni billing v Google AI Studio a vrať název modelu.)
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

// ── Systémové instrukce (1:1 s core.py) ───────────────────────────────
function buildSystemInstruction(): string {
  const today = new Date().toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    `Jsi Finanční AI Mentor, striktně edukativní asistent pro finanční gramotnost. ` +
    `Dnešní datum je ${today}. ` +
    'Tvé chování se musí bezpodmínečně řídit těmito pravidly (Guardrails):\n\n' +

    '1. ČASOVÝ KONTEXT A DATA: Aktuální rok je 2026. ' +
    'MÁŠ K DISPOZICI NÁSTROJE pro načtení živých tržních dat z Yahoo Finance. ' +
    'Když se uživatel zeptá na aktuální cenu, výkonnost nebo stav trhů, ' +
    'VŽDY použij příslušný nástroj (get_stock_price, get_crypto_price, ' +
    'get_market_summary, get_historical_performance) místo odhadování.\n\n' +

    '2. ZÁKAZ HALUCINACÍ: Nikdy si nevymýšlej ceny, kurzy, inflaci ani úrokové sazby. ' +
    'Pokud nástroj vrátí chybu nebo data nejsou dostupná, upřímně to přiznej.\n\n' +

    '3. ZÁKAZ INVESTIČNÍCH RAD: Nikdy nesmíš poskytovat konkrétní doporučení, ' +
    'co má uživatel koupit, prodat nebo držet. Nejsi finanční poradce. ' +
    'Můžeš ale ukázat data a vysvětlit finanční pojmy a teorii.\n\n' +

    '4. SPRÁVNÁ REAKCE: Prezentuj reálná data z nástrojů a doplň je edukativním ' +
    'vysvětlením — co znamená P/E ratio, tržní kapitalizace, diverzifikace atd. ' +
    'Pro hlubší analýzu odkaž na TradingView, Yahoo Finance, CoinMarketCap.\n\n' +

    '5. TÓN KOMUNIKACE: S uživatelem komunikuj zásadně zdvořilým a profesionálním vykáním ' +
    "(např. 'Vy', 'Váš', 'můžete'). Tykání je přísně zakázáno!\n\n" +

    '6. FORMÁTOVÁNÍ: Data prezentuj přehledně. Používej emoji pro přehlednost ' +
    '(📈 růst, 📉 pokles, 💰 cena). Čísla formátuj s mezerami jako oddělovači tisíců.\n\n' +

    "7. OVĚŘENÝ KONTEXT (GROUNDING): Před dotazem uživatele můžeš dostat blok " +
    "'OVĚŘENÝ KONTEXT' z naší vlastní databáze (lekce Akademie, Slovníček, daňová a " +
    'důchodová pravidla). Faktická tvrzení — definice, čísla, daňová a důchodová pravidla ' +
    '— opírej PŘEDNOSTNĚ o tento kontext nebo o data z nástrojů. Nevymýšlej si je z hlavy.\n\n' +

    '8. CITACE ZDROJŮ: Když v odpovědi použiješ informaci z OVĚŘENÉHO KONTEXTU, na konci ' +
    "odpovědi přidej řádek začínající 'Zdroje:' a vyjmenuj použité zdroje přesně tak, jak " +
    "jsou uvedené v hranatých závorkách (např. 'Akademie → lekce 2: Akcie, dluhopisy, ETF' " +
    "nebo 'Slovníček → ETF'). Pokud jsi z kontextu nečerpal, řádek se zdroji neuváděj.\n\n" +

    '9. MIMO ROZSAH: Pokud kontext téma nepokrývá a nejde o obecně známý vzdělávací pojem, ' +
    'raději přiznej, že to přesně nevíš, a nasměruj uživatele na příslušnou lekci či ' +
    'kalkulačku v aplikaci nebo na poradce s licencí ČNB. Lepší upřímné „to přesně nevím" ' +
    'než nepřesnost nebo smyšlené číslo.\n\n' +

    '10. VÝPOČTY: Konkrétní propočty (kolik našetřím, jaká bude daň, důchod, DIP) nepočítej ' +
    'zpaměti — vždy odkaž uživatele na interaktivní kalkulačky v záložce Nástroje, kde běží ' +
    'přesná matematika. Tím se vyhneš početní chybě.'
  );
}

// ── Function declarations (1:1 s core.py) ─────────────────────────────
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'get_stock_price',
        description:
          'Získá aktuální cenu a data o akcii nebo ETF z Yahoo Finance. Použij pro dotazy na konkrétní akcie, ETF, indexové fondy.',
        parameters: {
          type: 'OBJECT',
          properties: {
            ticker: {
              type: 'STRING',
              description: 'Burzovní ticker symbol, např. AAPL, MSFT, VOO, CEZ.PR, CSPX.L',
            },
          },
          required: ['ticker'],
        },
      },
      {
        name: 'get_crypto_price',
        description:
          'Získá aktuální cenu kryptoměny z Yahoo Finance. Použij pro dotazy na Bitcoin, Ethereum a další kryptoměny.',
        parameters: {
          type: 'OBJECT',
          properties: {
            symbol: {
              type: 'STRING',
              description: 'Symbol kryptoměny, např. BTC, ETH, SOL, ADA, XRP',
            },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_market_summary',
        description:
          'Vrátí přehled hlavních světových indexů, kryptoměn, komodit a měnových párů. Použij když se uživatel ptá na celkový stav trhů.',
        parameters: { type: 'OBJECT', properties: {} },
      },
      {
        name: 'get_historical_performance',
        description:
          "Vrátí historickou výkonnost aktiva za zadané období. Použij pro otázky typu 'jak si vedlo X za poslední rok'.",
        parameters: {
          type: 'OBJECT',
          properties: {
            ticker: {
              type: 'STRING',
              description: 'Burzovní ticker, např. AAPL, BTC-USD, ^GSPC, VOO',
            },
            period: {
              type: 'STRING',
              description: 'Časové období: 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max',
            },
          },
          required: ['ticker'],
        },
      },
    ],
  },
];

// ── Yahoo Finance helpery (nahrazují yfinance z core.py) ──────────────
const CRYPTO_SHORTCUTS = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP'];

interface YahooMeta {
  regularMarketPrice?: number;
  currency?: string;
  shortName?: string;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

async function fetchChart(symbol: string, range = '5d', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?interval=${interval}&range=${range}`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    chart?: {
      result?: Array<{
        meta?: YahooMeta;
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        timestamp?: number[];
      }>;
    };
  };
  return data.chart?.result?.[0] ?? null;
}

function pctChange(meta: YahooMeta): number | undefined {
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  if (meta.regularMarketPrice != null && prev != null && prev !== 0) {
    return Math.round(((meta.regularMarketPrice - prev) / prev) * 10000) / 100;
  }
  return undefined;
}

async function getStockPrice(ticker: string): Promise<Record<string, unknown>> {
  const clean = ticker.toUpperCase().trim();
  if (CRYPTO_SHORTCUTS.includes(clean)) return getCryptoPrice(clean);
  const r = await fetchChart(clean);
  if (!r?.meta?.regularMarketPrice) {
    return { error: `Ticker '${clean}' nebyl nalezen na Yahoo Finance.` };
  }
  const m = r.meta;
  return clean48({
    ticker: clean,
    name: m.shortName ?? clean,
    price: m.regularMarketPrice,
    currency: m.currency ?? 'USD',
    change_percent: pctChange(m),
    day_high: m.regularMarketDayHigh,
    day_low: m.regularMarketDayLow,
    volume: m.regularMarketVolume,
    '52_week_high': m.fiftyTwoWeekHigh,
    '52_week_low': m.fiftyTwoWeekLow,
    timestamp: new Date().toISOString(),
  });
}

async function getCryptoPrice(symbol: string): Promise<Record<string, unknown>> {
  let clean = symbol.toUpperCase().trim();
  const only = clean.replace('-USD', '');
  if (!clean.endsWith('-USD')) clean = `${clean}-USD`;
  const r = await fetchChart(clean);
  if (!r?.meta?.regularMarketPrice) {
    return { error: `Kryptoměna '${only}' nebyla nalezena.` };
  }
  const m = r.meta;
  return clean48({
    symbol: only,
    name: m.shortName ?? only,
    price_usd: m.regularMarketPrice,
    change_percent_24h: pctChange(m),
    day_high: m.regularMarketDayHigh,
    day_low: m.regularMarketDayLow,
    volume_24h: m.regularMarketVolume,
    '52_week_high': m.fiftyTwoWeekHigh,
    '52_week_low': m.fiftyTwoWeekLow,
    timestamp: new Date().toISOString(),
  });
}

async function getMarketSummary(): Promise<Record<string, unknown>> {
  const indices: Record<string, string> = {
    'S&P 500': '^GSPC',
    NASDAQ: '^IXIC',
    'Dow Jones': '^DJI',
    'DAX (Německo)': '^GDAXI',
    'FTSE 100 (UK)': '^FTSE',
    'Nikkei 225 (Japonsko)': '^N225',
    Bitcoin: 'BTC-USD',
    Ethereum: 'ETH-USD',
    Zlato: 'GC=F',
    'Ropa Brent': 'BZ=F',
    'EUR/USD': 'EURUSD=X',
    'EUR/CZK': 'EURCZK=X',
  };
  const summary: Record<string, unknown> = {};
  await Promise.all(
    Object.entries(indices).map(async ([name, sym]) => {
      try {
        const r = await fetchChart(sym, '5d');
        if (r?.meta?.regularMarketPrice != null) {
          summary[name] = {
            price: Math.round(r.meta.regularMarketPrice * 100) / 100,
            change_percent: pctChange(r.meta),
          };
        }
      } catch {
        /* přeskoč selhaný symbol */
      }
    }),
  );
  summary.timestamp = new Date().toISOString();
  return summary;
}

async function getHistoricalPerformance(
  ticker: string,
  period = '1y',
): Promise<Record<string, unknown>> {
  const valid = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'];
  let p = period.toLowerCase().trim();
  if (!valid.includes(p)) p = '1y';
  let clean = ticker.toUpperCase().trim();
  if (CRYPTO_SHORTCUTS.includes(clean)) clean = `${clean}-USD`;
  const r = await fetchChart(clean, p);
  const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter(
    (v): v is number => v != null,
  );
  if (closes.length < 2) {
    return { error: `Žádná historická data pro '${clean}' za období '${p}'.` };
  }
  const start = closes[0];
  const end = closes[closes.length - 1];
  return {
    ticker: clean,
    period: p,
    start_price: Math.round(start * 100) / 100,
    end_price: Math.round(end * 100) / 100,
    performance_percent: Math.round(((end - start) / start) * 10000) / 100,
    period_high: Math.round(Math.max(...closes) * 100) / 100,
    period_low: Math.round(Math.min(...closes) * 100) / 100,
    data_points: closes.length,
  };
}

// odstraní undefined hodnoty (ekvivalent filtrování None v core.py)
function clean48(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null));
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'get_stock_price':
      return getStockPrice(String(args.ticker ?? ''));
    case 'get_crypto_price':
      return getCryptoPrice(String(args.symbol ?? ''));
    case 'get_market_summary':
      return getMarketSummary();
    case 'get_historical_performance':
      return getHistoricalPerformance(
        String(args.ticker ?? ''),
        args.period ? String(args.period) : '1y',
      );
    default:
      return { error: `Neznámá funkce: ${name}` };
  }
}

// ── Volání Gemini generateContent ─────────────────────────────────────
async function callGemini(
  model: string,
  apiKey: string,
  contents: GeminiContent[],
  systemInstruction: string,
): Promise<Response> {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        tools: TOOLS,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
    },
  );
}

// hlavní smyčka: pošle dotaz, vyřídí případná volání funkcí, vrátí text
async function runConversation(
  model: string,
  apiKey: string,
  contents: GeminiContent[],
  systemInstruction: string,
): Promise<{ text: string; status: number }> {
  const maxIterations = 5;
  for (let i = 0; i < maxIterations; i++) {
    const resp = await callGemini(model, apiKey, contents, systemInstruction);
    if (!resp.ok) {
      return { text: '', status: resp.status };
    }
    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    if (parts.length === 0) {
      return {
        text: '⚠️ Odpověď byla zablokována bezpečnostním filtrem modelu Gemini.',
        status: 200,
      };
    }

    const functionCalls = parts.filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      const text = parts
        .filter((p) => p.text)
        .map((p) => p.text)
        .join('\n');
      return {
        text: text || 'Omlouvám se, nepodařilo se mi vygenerovat odpověď.',
        status: 200,
      };
    }

    // přidej modelův krok s function_call do historie
    contents.push({ role: 'model', parts });

    // vykonej všechna volání a vrať výsledky modelu
    const responseParts: GeminiPart[] = [];
    for (const p of functionCalls) {
      const fc = p.functionCall!;
      const result = await executeTool(fc.name, fc.args ?? {});
      responseParts.push({
        functionResponse: { name: fc.name, response: { result } },
      });
    }
    contents.push({ role: 'user', parts: responseParts });
  }
  return {
    text: 'Omlouvám se, dotaz se nepodařilo dokončit (příliš mnoho kroků).',
    status: 200,
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const { message, history } = (await request.json()) as {
      message: string;
      history: Array<{ role: string; content: string }>;
    };

    if (!message?.trim()) return json({ error: 'Empty message' }, 400);

    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!apiKey) return json({ error: 'API key not configured' }, 500);

    const systemInstruction = buildSystemInstruction();

    // historie → Gemini formát
    const contents: GeminiContent[] = (history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    // primární model
    let result = await runConversation(PRIMARY_MODEL, apiKey, contents, systemInstruction);

    // fallback při 429 (quota) — 1:1 logika z core.py
    if (result.status === 429) {
      result = await runConversation(FALLBACK_MODEL, apiKey, contents, systemInstruction);
      if (result.status === 429) {
        return json({ response: '⏳ Momentálně je velká zátěž. Zkuste to prosím za minutu.' });
      }
    }

    if (result.status !== 200) {
      return json({ response: '⚠️ Chyba při komunikaci s modelem. Zkuste to prosím později.' });
    }

    return json({ response: result.text });
  } catch (error) {
    console.error('Chat API error:', error);
    return json({ response: '⚠️ Nastala neočekávaná chyba. Zkuste to prosím později.' });
  }
};
