/**
 * Klient pro tržní data (/api/market). Když API selže (výpadek Wi‑Fi, limit
 * Yahoo), sáhne po uloženém snímku z /snapshot — obrazovka Trhy tak funguje
 * i offline, jen to o sobě řekne.
 */

export type RangeId = '1mo' | '6mo' | '1y' | '5y' | 'max';

export const RANGES: { id: RangeId; label: string; periodsPerYear: number }[] = [
  { id: '1mo', label: '1 M', periodsPerYear: 252 },
  { id: '6mo', label: '6 M', periodsPerYear: 252 },
  { id: '1y', label: '1 R', periodsPerYear: 252 },
  { id: '5y', label: '5 let', periodsPerYear: 52 },
  { id: 'max', label: 'Vše', periodsPerYear: 12 },
];

export interface Instrument {
  ticker: string;
  name: string;
  /** jednou větou, co to je — pro začátečníky */
  about: string;
}

export const WATCHLIST: { group: string; items: Instrument[] }[] = [
  {
    group: 'Indexy',
    items: [
      { ticker: '^GSPC', name: 'S&P 500', about: '500 největších amerických firem v jednom čísle. Nejsledovanější měřítko akciového trhu.' },
      { ticker: '^IXIC', name: 'Nasdaq Composite', about: 'Americký index s převahou technologických firem — kolísá víc než S&P 500.' },
      { ticker: '^GDAXI', name: 'DAX', about: '40 největších německých firem. Barometr evropské ekonomiky.' },
    ],
  },
  {
    group: 'ETF',
    items: [
      { ticker: 'VWCE.DE', name: 'Vanguard All‑World', about: 'ETF na akcie celého světa (přes 3 500 firem). Oblíbený základ dlouhodobého portfolia.' },
      { ticker: 'CSPX.L', name: 'iShares S&P 500', about: 'ETF, které kopíruje index S&P 500 a dividendy samo reinvestuje.' },
    ],
  },
  {
    group: 'Akcie',
    items: [
      { ticker: 'CEZ.PR', name: 'ČEZ', about: 'Největší česká energetická firma, obchoduje se na pražské burze.' },
      { ticker: 'KOMB.PR', name: 'Komerční banka', about: 'Česká banka z pražské burzy, známá vysokou dividendou.' },
      { ticker: 'AAPL', name: 'Apple', about: 'Výrobce iPhonu — jedna z největších firem světa podle tržní hodnoty.' },
      { ticker: 'NVDA', name: 'Nvidia', about: 'Výrobce čipů pro umělou inteligenci. Příklad akcie s vysokým růstem i kolísáním.' },
      { ticker: 'TSLA', name: 'Tesla', about: 'Výrobce elektromobilů. Učebnicový příklad velmi volatilní akcie.' },
    ],
  },
  {
    group: 'Sektory',
    items: [
      { ticker: 'XLK', name: 'Technologie', about: 'ETF na americké technologické firmy (Apple, Microsoft, Nvidia). Roste rychle, ale umí i prudce padat.' },
      { ticker: 'XLV', name: 'Zdravotnictví', about: 'ETF na americké farmaceutické firmy, nemocnice a výrobce zdravotnické techniky. Léky lidé potřebují i v krizi, proto kolísá méně.' },
      { ticker: 'XLF', name: 'Finance', about: 'ETF na americké banky, pojišťovny a burzy. Daří se jim hlavně při zdravé ekonomice a vyšších úrocích.' },
      { ticker: 'XLE', name: 'Energie', about: 'ETF na americké ropné a plynárenské firmy. Jde nahoru a dolů hlavně s cenou ropy.' },
      { ticker: 'XLY', name: 'Zbytné spotřební zboží', about: 'ETF na firmy, za které lidé utrácejí, když mají peníze navíc: Amazon, Tesla, restaurace, oblečení.' },
      { ticker: 'XLP', name: 'Základní spotřeba', about: 'ETF na výrobce jídla, drogerie a nápojů. Tyhle věci se kupují vždycky, proto patří k nejklidnějším sektorům.' },
      { ticker: 'XLI', name: 'Průmysl', about: 'ETF na americké výrobce strojů, letadel, dopravu a stavebnictví. Kopíruje, jak se daří ekonomice.' },
      { ticker: 'XLU', name: 'Energetika a vodárny', about: 'ETF na americké dodavatele elektřiny, plynu a vody. Stabilní tržby a dividendy, citlivé na úrokové sazby.' },
      { ticker: 'XLB', name: 'Suroviny', about: 'ETF na americké chemičky, těžaře a výrobce materiálů. Závisí na cenách surovin a průmyslové výrobě.' },
      { ticker: 'XLRE', name: 'Nemovitosti', about: 'ETF na americké nemovitostní fondy (kanceláře, sklady, byty). Hodně ho ovlivňují úrokové sazby.' },
      { ticker: 'XLC', name: 'Komunikace a média', about: 'ETF na Google, Metu, Netflix a telekomunikační firmy.' },
    ],
  },
  {
    group: 'Krypto',
    items: [
      { ticker: 'BTC-USD', name: 'Bitcoin', about: 'Největší kryptoměna. Extrémně kolísavá — propady o desítky procent jsou běžné.' },
      { ticker: 'ETH-USD', name: 'Ethereum', about: 'Druhá největší kryptoměna, platforma pro chytré kontrakty.' },
    ],
  },
  {
    group: 'Komodity a měny',
    items: [
      { ticker: 'GC=F', name: 'Zlato', about: 'Cena zlata v dolarech za trojskou unci. Tradiční „bezpečný přístav“.' },
      { ticker: 'EURCZK=X', name: 'Euro / koruna', about: 'Kolik korun stojí jedno euro. Ovlivňuje ceny dovolené i dovozu.' },
      { ticker: 'USDCZK=X', name: 'Dolar / koruna', about: 'Kolik korun stojí jeden dolar — důležité pro každého, kdo investuje v USA.' },
    ],
  },
];

export const ALL_INSTRUMENTS: Instrument[] = WATCHLIST.flatMap(g => g.items);

/** Sektorová ETF (SPDR) — celý americký trh S&P 500 rozdělený do 11 odvětví. */
export const SECTORS: Instrument[] = WATCHLIST.find(g => g.group === 'Sektory')!.items;

/** [čas ms, open, high, low, close, objem] */
export type Candle = [number, number, number, number, number, number];

export interface Series {
  ticker: string;
  name: string;
  currency: string;
  exchange: string;
  range: string;
  points: Candle[];
  timestamp: string;
  /** true = data pochází z uloženého snímku, ne z živého API */
  offline?: boolean;
}

export interface Quote {
  ticker: string;
  price: number;
  change_percent: number;
  currency: string;
  /** název firmy z burzy; chybí u uložených snímků */
  name?: string;
}

const snapshotName = (ticker: string, range: string) =>
  `/snapshot/${ticker.replace(/[^A-Za-z0-9]/g, '_')}_${range}.json`;

// Živé API dostane jen pár vteřin — na přetížené Wi‑Fi je lepší hned ukázat
// uložený snímek než nechat návštěvníka koukat na načítání.
const LIVE_TIMEOUT_MS = 7000;

async function getJson<T>(url: string, signal?: AbortSignal, timeoutMs?: number): Promise<T> {
  const signals = [signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined].filter((x): x is AbortSignal => !!x);
  const resp = await fetch(url, { signal: signals.length ? AbortSignal.any(signals) : undefined });
  if (!resp.ok) throw new Error(String(resp.status));
  const type = resp.headers.get('content-type') ?? '';
  // vite dev bez wrangleru vrací na /api index.html → ber to jako chybu
  if (!type.includes('json')) throw new Error('not json');
  return resp.json() as Promise<T>;
}

export async function fetchSeries(ticker: string, range: string, signal?: AbortSignal): Promise<Series> {
  try {
    return await getJson<Series>(`/api/market?type=series&ticker=${encodeURIComponent(ticker)}&period=${range}`, signal, LIVE_TIMEOUT_MS);
  } catch (err) {
    if (signal?.aborted) throw err;
    // offline záloha: stejné období, případně aspoň rok
    for (const r of [range, '2y', '5y']) {
      try {
        const snap = await getJson<Series>(snapshotName(ticker, r), signal);
        return { ...snap, offline: true };
      } catch { /* zkus další */ }
    }
    throw err;
  }
}

/** Uložený snímek bez pokusu o živá data — historie pro hru stačí a je hned. */
export async function fetchSnapshot(ticker: string, range: string, signal?: AbortSignal): Promise<Series> {
  const snap = await getJson<Series>(snapshotName(ticker, range), signal);
  return { ...snap, offline: true };
}

async function requestQuotes(tickers: string[], signal?: AbortSignal): Promise<{ quotes: Quote[]; offline: boolean }> {
  let live: Quote[] = [];
  try {
    const data = await getJson<{ quotes: Quote[] }>(`/api/market?type=quotes&symbols=${encodeURIComponent(tickers.join(','))}`, signal, LIVE_TIMEOUT_MS);
    live = data.quotes ?? [];
  } catch (err) {
    if (signal?.aborted) throw err;
  }
  if (live.length === tickers.length) return { quotes: live, offline: false };
  // část (nebo všechno) chybí → doplň z uloženého snímku, ať nevypadne třeba kurz dolaru
  const have = new Set(live.map(q => q.ticker));
  try {
    const snap = await getJson<{ quotes: Quote[] }>('/snapshot/quotes.json', signal);
    const filled = snap.quotes.filter(q => tickers.includes(q.ticker) && !have.has(q.ticker));
    return { quotes: [...live, ...filled], offline: live.length === 0 };
  } catch (err) {
    if (live.length) return { quotes: live, offline: false };
    throw err;
  }
}

// Pásek, Přehled, Trhy i Portfolio chtějí kotace ze stejného seznamu. Jeden společný
// dotaz na celý seznam (a jedna odpověď v cache serveru) místo čtyř různých.
const WATCH_TICKERS = ALL_INSTRUMENTS.map(i => i.ticker);
const SHARED_TTL_MS = 60_000;
let shared: { at: number; promise: Promise<{ quotes: Quote[]; offline: boolean }> } | null = null;

export async function fetchQuotes(tickers: string[], signal?: AbortSignal): Promise<{ quotes: Quote[]; offline: boolean }> {
  if (!tickers.every(t => WATCH_TICKERS.includes(t))) return requestQuotes(tickers, signal);
  if (!shared || Date.now() - shared.at > SHARED_TTL_MS) {
    const promise = requestQuotes(WATCH_TICKERS);
    shared = { at: Date.now(), promise };
    // nepovedený pokus si nepamatuj — další volání to zkusí znovu
    promise.then(r => { if (r.offline && shared?.promise === promise) shared.at = Date.now() - SHARED_TTL_MS + 15_000; })
      .catch(() => { if (shared?.promise === promise) shared = null; });
  }
  const all = await shared.promise;
  return { quotes: all.quotes.filter(q => tickers.includes(q.ticker)), offline: all.offline };
}

/** Cena s rozumným počtem desetinných míst (kurzy 3, drobné ceny 2, velká čísla 0). */
export function fmtPrice(v: number, ticker = ''): string {
  if (!Number.isFinite(v)) return '—';
  const digits = ticker.endsWith('=X') ? 3 : Math.abs(v) >= 10000 ? 0 : 2;
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${sign}${Math.abs(v).toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
}
