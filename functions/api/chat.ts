/**
 * Cloudflare Pages Function — Chat API
 * 1:1 port jádra `core.py` (FinanceMentorBot) do TypeScriptu.
 *
 * Obsahuje:
 *  - kompletní systémové instrukce (10 guardrails) jako v core.py
 *  - Function Calling nad živými daty z Yahoo Finance
 *    (get_stock_price, get_crypto_price, get_market_summary, get_historical_performance)
 *  - poskytovatelé: OpenAI (OPENAI_API_KEY, hlavní) → řetěz Gemini modelů (MODEL_CHAIN, záloha)
 *    Když OpenAI selže nebo klíč chybí, odpoví Gemini; chybí-li klíč Gemini, jede jen OpenAI.
 */

import { limited } from '../../src/server/limits';

interface Env {
  DB?: D1Database;
  /** celkový počet dotazů na mentora za 24 hodin (výchozí CHAT_DAILY_CAP_DEFAULT) */
  CHAT_DAILY_CAP?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  /** modely OpenAI oddělené čárkou, zkouší se popořadě (výchozí OPENAI_MODELS níže) */
  OPENAI_MODEL?: string;
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

// Modely se zkouší v tomto pořadí; další přijde na řadu, když předchozí nic
// neodeslal (429 = vyčerpaná kvóta, 503 = přetížení, prázdná/blokovaná odpověď).
// Nejnovější flash je první, ale na bezplatném tarifu mívá nízkou denní kvótu
// a bývá přetížený (10/2026: 3.8-flash vracel 503) — proto za ním stojí
// gemini-2.5-flash s výrazně vyšší kvótou, který web spolehlivě utáhne.
const MODEL_CHAIN = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

// ── Systémové instrukce (1:1 s core.py) ───────────────────────────────
function buildSystemInstruction(): string {
  const today = new Date().toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return (
    `Jsi finanční AI mentor — striktně vzdělávací asistent pro finanční gramotnost. ` +
    `Dnešní datum je ${today}. ` +
    'Tvé chování se musí bezpodmínečně řídit těmito pravidly:\n\n' +

    '1. ČASOVÝ KONTEXT A DATA: Aktuální rok je 2026. ' +
    'MÁŠ K DISPOZICI NÁSTROJE pro načtení živých tržních dat z Yahoo Finance. ' +
    'Když se uživatel zeptá na aktuální cenu, výkonnost nebo stav trhů, ' +
    'VŽDY použij příslušný nástroj (get_stock_price, get_crypto_price, ' +
    'get_market_summary, get_historical_performance) místo odhadování.\n\n' +

    '2. ZÁKAZ HALUCINACÍ: Nikdy si nevymýšlej ceny, kurzy, inflaci ani úrokové sazby. ' +
    'Pokud nástroj vrátí chybu nebo data nejsou k dispozici, upřímně to přiznej.\n\n' +

    '3. ZÁKAZ INVESTIČNÍCH RAD: Nikdy nesmíš poskytovat konkrétní doporučení, ' +
    'co má uživatel koupit, prodat nebo držet. Nejsi finanční poradce. ' +
    'Můžeš ale ukázat data a vysvětlit finanční pojmy a teorii.\n\n' +

    '4. SPRÁVNÁ REAKCE: Prezentuj reálná data z nástrojů a doplň je vzdělávacím ' +
    'vysvětlením — co znamená poměr P/E (cena k zisku), tržní kapitalizace, diverzifikace atd. ' +
    'Pro hlubší analýzu odkaž na TradingView, Yahoo Finance, CoinMarketCap.\n\n' +

    '5. TÓN KOMUNIKACE: Tvoje publikum jsou hlavně STUDENTI (zhruba 15–25 let), kteří se ve ' +
    'financích teprve učí a často s nimi začínají od nuly. Komunikuj s uživatelem přátelským, ' +
    'vstřícným TYKÁNÍM (např. „ty“, „tvůj“, „můžeš“) — jako starší kamarád, který tomu rozumí. ' +
    'Vykání nepoužívej. Buď povzbudivý a nikoho neshazuj za „hloupou“ otázku — žádná otázka není ' +
    'hloupá. Odpovídej vždy česky, srozumitelně a bez zbytečného odborného žargonu; když musíš ' +
    'použít odborný pojem (např. likvidita, volatilita), hned ho krátce vysvětli vlastními slovy ' +
    'a ideálně na příkladu ze života studenta (brigáda, první výplata, spoření na cestu).\n\n' +

    '6. FORMÁTOVÁNÍ: Data prezentuj přehledně. Emoji ani jiné obrázkové znaky ' +
    'nepoužívej vůbec. O sobě mluv v mužském rodě („rád ti to vysvětlím“). Čísla formátuj s mezerami jako oddělovači ' +
    'tisíců (např. 1 234 567) a používej desetinnou čárku, ne tečku.\n\n' +

    "7. OVĚŘENÝ KONTEXT (GROUNDING): Před dotazem uživatele můžeš dostat blok " +
    "'OVĚŘENÝ KONTEXT' z naší vlastní databáze (lekce Akademie, Slovníček, daňová a " +
    'důchodová pravidla). Faktická tvrzení — definice, čísla, daňová a důchodová pravidla ' +
    '— opírej PŘEDNOSTNĚ o tento kontext nebo o data z nástrojů. Nevymýšlej si je z hlavy.\n\n' +

    '8. CITACE ZDROJŮ: Když v odpovědi použiješ informaci z OVĚŘENÉHO KONTEXTU, na konci ' +
    "odpovědi přidej řádek začínající 'Zdroje:' a vyjmenuj použité zdroje přesně tak, jak " +
    "jsou uvedené v hranatých závorkách (např. 'Akademie → lekce 2: Akcie, dluhopisy, ETF' " +
    "nebo 'Slovníček → ETF'). Pokud jsi z kontextu nečerpal, řádek se zdroji neuváděj.\n\n" +

    '8b. FORMA: Nepoužívej emoji ani jiné obrázkové znaky. Uživateli tykej a piš v druhé osobě ' +
    'tak, aby věta seděla komukoli (žádné tvary s lomítkem typu „kupoval/a“ — raději ' +
    '„když koupíš“). Každý zdroj v řádku Zdroje odděl středníkem a opiš ho doslova, nic si ' +
    'k němu nedomýšlej.\n\n' +

    '9. MIMO ROZSAH: Pokud kontext téma nepokrývá a nejde o obecně známý vzdělávací pojem, ' +
    'raději přiznej, že to přesně nevíš, a nasměruj uživatele na příslušnou lekci či ' +
    'kalkulačku v aplikaci nebo na poradce s licencí ČNB. Lepší upřímné „to přesně nevím“ ' +
    'než nepřesnost nebo smyšlené číslo.\n\n' +

    '10. VÝPOČTY: Konkrétní propočty (kolik si naspořím, jaká bude daň, důchod, DIP) nepočítej ' +
    'zpaměti — vždy uživatele odkaž na interaktivní kalkulačky v sekci Témata, kde počítá ' +
    'přesný vzorec. Předejdeš tak početní chybě.\n\n' +

    '11. GRAFY A DIAGRAMY: Když to pomůže pochopení, MŮŽEŠ do odpovědi vložit JEDEN vizuál ' +
    'jako kódový blok. Podle obsahu vyber typ:\n' +
    '— ČÍSLA (vývoj v čase, porovnání hodnot, rozložení portfolia, složené úročení) → blok ' +
    '"echarts" s platným JSON (ECharts option): typ jen "line", "bar" nebo "pie"; české popisky; ' +
    'čísla bez uvozovek; posílej jen title, osy a series (barvy a tmavý styl doplní aplikace).\n' +
    '— PROCES / VZTAH / „jak to funguje krok za krokem“ (cesta pokynu na burzu, koloběh peněz, ' +
    'vznik ETF, vztah pojmů) → blok "mermaid" s diagramem flowchart. PREFERUJ směr shora dolů ' +
    '("flowchart TB"), ať se diagram vejde čitelně do úzkého sloupce chatu (LR jen u 2–3 uzlů). ' +
    'Krátké české popisky uzlů v hranatých závorkách, vztahy šipkami, akci napiš na šipku.\n' +
    'SPOLEČNÁ PRAVIDLA: čísla buď z nástrojů (živá data), nebo to v názvu/textu označ jako ' +
    'ILUSTRACI (nevymýšlej si „reálná“ čísla); vizuál je doplněk, ne náhrada vysvětlení; ' +
    'maximálně jeden na odpověď; přesný osobní propočet patří do kalkulaček (bod 10). ' +
    'Formáty přesně takto:\n' +
    '```echarts\n' +
    '{"title":{"text":"Síla složeného úročení (ilustrace, 7 % p.a.)"},"xAxis":{"type":"category",' +
    '"data":["0","5","10","15","20 let"]},"yAxis":{"type":"value"},"series":[{"type":"line",' +
    '"data":[100000,140255,196715,275903,386968]}]}\n' +
    '```\n' +
    'nebo\n' +
    '```mermaid\n' +
    'flowchart TB\n' +
    '  U["Investor"] -->|"pokyn k nákupu"| B["Broker"]\n' +
    '  B -->|"předá pokyn"| E["Burza"]\n' +
    '  E -->|"spáruje s prodávajícím"| V["Vypořádání"]\n' +
    '  V -->|"akcie na účet"| U\n' +
    '```'
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
  // Timeout, ať zaseknutý Yahoo request nezablokuje celý tool-call ani market summary
  // (12 paralelních fetchů) až do platformního wall-clock limitu. (M3)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });
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
  } catch {
    return null; // timeout / abort / síťová chyba → null (volající to ošetří)
  } finally {
    clearTimeout(timer);
  }
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
    // pozor: pctChange je změna vůči PŘEDCHOZÍ DENNÍ ZAVÍRAČCE (z 1d svíčky), ne
    // skutečná trailing-24h změna → pole jmenujeme jako u akcií, ne „24h“ (M2)
    change_percent: pctChange(m),
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

// ── Volání Gemini streamGenerateContent (SSE) ─────────────────────────
async function callGeminiStream(
  model: string,
  apiKey: string,
  contents: GeminiContent[],
  systemInstruction: string,
  connectTimeoutMs = 30000,
): Promise<Response> {
  // Timeout jen na NAVÁZÁNÍ spojení (zaseknutý connect). Po příchodu hlaviček časovač
  // zrušíme → tělo se streamuje bez limitu (ať nesekneme legitimně dlouhou odpověď). (M3)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), connectTimeoutMs);
  try {
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: TOOLS,
          // 2048 bylo málo pro odpověď s ECharts/Mermaid blokem + prózou → uřízlo se to.
          // 8192 dá komfort; finishReason MAX_TOKENS navíc hlídáme níže. (M1)
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

// ── OpenAI Chat Completions (SSE) ─────────────────────────────────────
// Rychlý a levný model; s nástroji (ceny, grafy) vyžaduje u řady gpt-5 reasoning_effort "none".
const OPENAI_MODELS = ['gpt-5.4-mini', 'gpt-5.4-nano'];

/** Deklarace nástrojů ve formátu Gemini (typy velkými písmeny) → JSON Schema pro OpenAI. */
function toJsonSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toJsonSchema);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([k, v]) => [
        k,
        k === 'type' && typeof v === 'string' ? v.toLowerCase() : toJsonSchema(v),
      ]),
    );
  }
  return node;
}

const OPENAI_TOOLS = TOOLS[0].functionDeclarations.map((f) => ({
  type: 'function',
  function: { name: f.name, description: f.description, parameters: toJsonSchema(f.parameters) },
}));

type OpenAIMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | null; tool_calls?: unknown[] }
  | { role: 'tool'; tool_call_id: string; content: string };

async function streamConversationOpenAI(
  model: string,
  apiKey: string,
  messages: OpenAIMessage[],
  write: (text: string) => void | Promise<void>,
  connectTimeoutMs = 30000,
): Promise<{ ok: boolean; status: number; streamed: boolean }> {
  const maxIterations = 5;
  let streamed = false;

  for (let i = 0; i < maxIterations; i++) {
    // timeout jen na navázání spojení, tělo se pak streamuje bez limitu (jako u Gemini)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), connectTimeoutMs);
    let resp: Response;
    try {
      resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          tools: OPENAI_TOOLS,
          stream: true,
          max_completion_tokens: 4000,
          ...(model.startsWith('gpt-5') ? { reasoning_effort: 'none' } : {}),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok || !resp.body) {
      console.error(`OpenAI ${model}: HTTP ${resp.status}`);
      return { ok: false, status: resp.status, streamed };
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    const calls: { id: string; name: string; args: string }[] = [];
    let finishReason: string | undefined;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let json: {
          choices?: Array<{
            delta?: { content?: string | null; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> };
            finish_reason?: string | null;
          }>;
        };
        try { json = JSON.parse(payload); } catch { continue; }
        const choice = json.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta;
        if (delta?.content) {
          await write(delta.content);
          streamed = true;
          text += delta.content;
        }
        for (const tc of delta?.tool_calls ?? []) {
          const slot = (calls[tc.index] ??= { id: '', name: '', args: '' });
          if (tc.id) slot.id = tc.id;
          if (tc.function?.name) slot.name += tc.function.name;
          if (tc.function?.arguments) slot.args += tc.function.arguments;
        }
      }
    }

    const toolCalls = calls.filter(Boolean);
    if (toolCalls.length === 0) {
      if (finishReason === 'length' && streamed) {
        await write('\n\n_(Odpověď byla zkrácena — došel limit délky. Zkus dotaz rozdělit na menší části.)_');
      }
      return { ok: true, status: 200, streamed };
    }

    messages.push({
      role: 'assistant',
      content: text || null,
      tool_calls: toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: c.args || '{}' } })),
    });
    for (const c of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.args || '{}'); } catch { /* prázdné argumenty */ }
      const result = await executeTool(c.name, args);
      messages.push({ role: 'tool', tool_call_id: c.id, content: JSON.stringify(result) });
    }
  }

  await write('\n\n_(Odpověď se nepodařilo dokončit — dotaz vyžadoval příliš mnoho kroků. Zkus ho prosím položit jednodušeji.)_');
  return { ok: true, status: 200, streamed };
}

// hlavní smyčka pro streaming: streamuje finální text klientovi přes `write`,
// vyřídí případná volání funkcí (ta se NEstreamují) a pokračuje, dokud nepřijde
// finální textová odpověď. Vrací {ok, status, streamed}; streamed=false + !ok
// znamená, že se ještě nic neodeslalo → je bezpečné zkusit fallback model.
async function streamConversation(
  model: string,
  apiKey: string,
  contents: GeminiContent[],
  systemInstruction: string,
  write: (text: string) => void | Promise<void>,
  connectTimeoutMs?: number,
): Promise<{ ok: boolean; status: number; streamed: boolean }> {
  const maxIterations = 5;
  let streamed = false;

  for (let i = 0; i < maxIterations; i++) {
    const resp = await callGeminiStream(model, apiKey, contents, systemInstruction, connectTimeoutMs);
    if (!resp.ok || !resp.body) {
      return { ok: false, status: resp.status, streamed };
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const modelParts: GeminiPart[] = [];
    const functionCalls: NonNullable<GeminiPart['functionCall']>[] = [];
    let finishReason: string | undefined; // MAX_TOKENS apod. → odpověď byla zkrácena (M1)

    // SSE: řádky ve tvaru "data: {...}"
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let json: { candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }> };
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        if (json.candidates?.[0]?.finishReason) finishReason = json.candidates[0].finishReason;
        const parts = json.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
          if (p.text) {
            await write(p.text);
            streamed = true;
            modelParts.push({ text: p.text });
          } else if (p.functionCall) {
            functionCalls.push(p.functionCall);
            modelParts.push({ functionCall: p.functionCall });
          }
        }
      }
    }

    // žádné volání funkcí → finální text je odstreamovaný, končíme
    if (functionCalls.length === 0) {
      // Gemini narazil na limit délky → odpověď je uříznutá (možná i uprostřed
      // echarts/mermaid bloku). Dej to najevo místo tichého konce. (M1)
      if (finishReason === 'MAX_TOKENS' && streamed) {
        await write('\n\n_(Odpověď byla zkrácena — došel limit délky. Zkus dotaz rozdělit na menší části.)_');
      }
      return { ok: true, status: 200, streamed };
    }

    // jinak vykonej tool cally a pokračuj další iterací
    contents.push({ role: 'model', parts: modelParts });
    const responseParts: GeminiPart[] = [];
    for (const fc of functionCalls) {
      const result = await executeTool(fc.name, fc.args ?? {});
      responseParts.push({
        functionResponse: { name: fc.name, response: { result } },
      });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  await write('\n\n_(Odpověď se nepodařilo dokončit — dotaz vyžadoval příliš mnoho kroků. Zkus ho prosím položit jednodušeji.)_');
  return { ok: true, status: 200, streamed };
}

/**
 * Omezení vstupu (viz onRequestPost): délka zprávy, počet a délka položek historie.
 * Zpráva z webu obsahuje i ověřený kontext z databáze (až několik tisíc znaků, viz utils/api.ts),
 * proto ne menší strop než 8000 — jinak se odmítnou i běžné dotazy.
 */
const MAX_MESSAGE_CHARS = 8000;
const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_CHARS = 6000;

/**
 * Limity dotazů na mentora — každý dotaz stojí peníze za tokeny. Tři vrstvy:
 *  - na návštěvníka (anonymní ID z prohlížeče, na stánku se mění s každým resetem),
 *  - na IP adresu (hodinový limit a denní podíl ze stropu; platí bez ohledu na ID návštěvníka,
 *    takže střídání vymyšlených ID ho neobejde; celá veletržní hala sdílí jednu IP, proto ne přísněji),
 *  - celkový denní strop, který ochrání rozpočet před jakýmkoli zneužitím.
 * ID jde obejít smazáním úložiště; proto nejsou jediná pojistka a celkový strop je nejdůležitější.
 */
const VISITOR_PER_HOUR = 25;
const VISITOR_PER_DAY = 60;
const IP_PER_HOUR = 300;
/** Podíl jedné IP na celkovém denním stropu: jeden zdroj nemůže mentora vypnout všem ostatním. */
const IP_SHARE_OF_CAP = 0.4;
const CHAT_DAILY_CAP_DEFAULT = 2500;

/** Vrací text pro návštěvníka, když je limit vyčerpán; jinak null. Při chybě databáze nepustí chat zbytečně do kolen. */
async function chatLimitMessage(db: D1Database, request: Request, env: Env): Promise<string | null> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  const rawId = request.headers.get('X-Visitor') ?? '';
  // bez platného ID počítáme návštěvníka podle IP (přísněji, než by jinak platilo)
  const visitor = /^[a-f0-9]{32}$/.test(rawId) ? rawId : `ip-${ip}`;
  const cap = Number(env.CHAT_DAILY_CAP) > 0 ? Number(env.CHAT_DAILY_CAP) : CHAT_DAILY_CAP_DEFAULT;
  try {
    if (await limited(db, `chat:v:${visitor}:h`, VISITOR_PER_HOUR, 3600)) {
      return 'Mentor má pro jednoho návštěvníka limit dotazů za hodinu a ty jsi ho využil. Zkus to prosím za chvíli. Akademie, grafy a nástroje fungují dál.';
    }
    if (await limited(db, `chat:v:${visitor}:d`, VISITOR_PER_DAY, 86_400)) {
      return 'Dnešní limit dotazů na mentora je pro tebe vyčerpaný. Zítra bude zase k dispozici. Akademie, grafy a nástroje fungují dál.';
    }
    if (await limited(db, `chat:ip:${ip}:h`, IP_PER_HOUR, 3600) || await limited(db, `chat:ip:${ip}:d`, Math.floor(cap * IP_SHARE_OF_CAP), 86_400)) {
      return 'Z téhle sítě teď přišlo příliš mnoho dotazů na mentora. Zkus to prosím za chvíli.';
    }
    if (await limited(db, 'chat:global', cap, 86_400)) {
      return 'Mentor má dnes hodně dotazů a denní limit je vyčerpaný. Zkus to prosím zítra. Akademie, grafy a nástroje fungují dál.';
    }
  } catch (error) {
    console.error('Chat: počítadlo limitů selhalo, dotaz propouštím', error);
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  let message: string;
  let history: Array<{ role: string; content: string }>;
  try {
    ({ message, history } = (await request.json()) as {
      message: string;
      history: Array<{ role: string; content: string }>;
    });
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Vstupy hlídáme tvrdě: chat je brána k placenému API, takže nepustíme ani dlouhé zprávy,
  // ani nekonečnou historii, ani cizí role (system/tool) vložené z prohlížeče.
  if (typeof message !== 'string' || !message.trim()) return json({ error: 'Empty message' }, 400);
  if (message.length > MAX_MESSAGE_CHARS) return json({ error: 'Message too long' }, 413);
  history = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_ITEMS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_HISTORY_CHARS) }));

  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) return json({ error: 'API key not configured' }, 500);

  if (env.DB) {
    const blocked = await chatLimitMessage(env.DB, request, env);
    if (blocked) return new Response(JSON.stringify({ error: 'rate_limited', message: blocked }), {
      status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '600' },
    });
  }

  const systemInstruction = buildSystemInstruction();

  // historie → Gemini formát
  const contents: GeminiContent[] = (history ?? []).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  // totéž pro OpenAI (system + střídání user/assistant)
  const openaiMessages: OpenAIMessage[] = [
    { role: 'system', content: systemInstruction },
    ...(history ?? []).map((m): OpenAIMessage => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: message },
  ];

  // Pořadí pokusů: modely OpenAI (je-li klíč), potom řetěz Gemini. Další přijde na řadu,
  // když předchozí nic neodeslal. Model, za kterým je ještě záloha, má na navázání spojení 8 s.
  type Attempt = { label: string; run: (write: (t: string) => void, last: boolean) => Promise<{ ok: boolean; status: number; streamed: boolean }> };
  const attempts: Attempt[] = [];
  if (openaiKey) {
    const models = (env.OPENAI_MODEL ? env.OPENAI_MODEL.split(',').map(m => m.trim()).filter(Boolean) : OPENAI_MODELS);
    for (const model of models) {
      attempts.push({
        label: `openai:${model}`,
        // čistá kopie konverzace pro každý pokus
        run: (write, last) => streamConversationOpenAI(model, openaiKey, openaiMessages.map(m => ({ ...m })), write, last ? 30000 : 8000),
      });
    }
  }
  if (geminiKey) {
    for (const model of MODEL_CHAIN) {
      attempts.push({
        label: `gemini:${model}`,
        run: (write, last) => streamConversation(model, geminiKey, contents.map(c => ({ ...c, parts: [...c.parts] })), systemInstruction, write, last ? 30000 : 8000),
      });
    }
  }

  // Streamuj odpověď klientovi jako text/plain. Tool-calling kola se nestreamují
  // (potřebujeme z nich celá volání funkcí); streamuje se až finální text modelu.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        let result = { ok: false, status: 0, streamed: false };
        // Druhé kolo: když všechny modely narazí na limit (víc lidí naráz), chvíli
        // počkej a zkus celý řetěz ještě jednou, než to vzdáš.
        for (let round = 0; round < 2 && !result.streamed; round++) {
        if (round === 1) {
          if (result.status !== 429 && result.status !== 503) break;
          await new Promise(resolve => setTimeout(resolve, 3500));
        }
        for (let i = 0; i < attempts.length && !result.streamed; i++) {
          const last = i === attempts.length - 1;
          try {
            result = await attempts[i].run(write, last);
            if (result.streamed) console.log(`Chat: odpověděl ${attempts[i].label}`);
          } catch (error) {
            console.error(`Chat: ${attempts[i].label} selhal`, error);
            // text už odešel → nezačínej jiným modelem znovu, jen přiznej nedokončenou odpověď
            result = { ok: false, status: 0, streamed: result.streamed };
            if (last && round === 1) throw error;
          }
        }
        }

        if (!result.streamed) {
          // ani jeden model nic neodeslal → srozumitelná hláška místo prázdna
          write(
            result.status === 429
              ? 'Mentor má teď hodně dotazů naráz. Zkus to prosím za chvilku znovu.'
              : 'Odpověď se teď nepodařilo vygenerovat. Zkus dotaz přeformulovat nebo ho poslat znovu.',
          );
        } else if (!result.ok) {
          // něco se odeslalo, ale stream skončil chybou (např. selhání po tool-callu)
          // → neukončuj tiše, dej najevo, že odpověď není kompletní
          write('\n\n_Odpověď se nepodařilo dokončit. Zkus dotaz prosím poslat znovu._');
        }
      } catch (error) {
        console.error('Chat API error:', error);
        try {
          write('Něco se nepovedlo. Zkus to prosím za chvíli znovu.');
        } catch {
          /* stream už mohl být uzavřen */
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
};
