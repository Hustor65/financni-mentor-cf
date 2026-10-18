import { useEffect, useState } from 'react';
import { ALL_INSTRUMENTS, fetchQuotes } from './market';
import type { Instrument, Quote } from './market';
import type { Portfolio } from './store';

/**
 * Ceny pro portfolio na zkoušku. Účet je vedený v korunách, takže dolarové
 * a eurové tituly přepočítáváme aktuálním kurzem — stejně jako u skutečného
 * brokera se tak do výsledku promítá i pohyb měny.
 */

/** Jak dlouho platí načtené ceny, než se zeptáme znovu. */
const TTL_MS = 60_000;

/** Indexy a měnové páry se koupit nedají — index kopíruje ETF. */
export const isTradable = (ticker: string) => !ticker.startsWith('^') && !ticker.endsWith('=X');
export const TRADABLE: Instrument[] = ALL_INSTRUMENTS.filter(i => isTradable(i.ticker));
export const instrumentName = (ticker: string, held?: { name?: string }) =>
  ALL_INSTRUMENTS.find(i => i.ticker === ticker)?.name ?? held?.name ?? ticker;

export interface Price {
  /** cena za kus v korunách */
  czk: number;
  /** cena v měně burzy */
  native: number;
  currency: string;
  /** denní změna v % */
  change: number;
  /** název z burzy (jen u titulů mimo náš seznam) */
  name?: string;
  /** kdy burza naposledy obchodovala (ms) */
  asof?: number;
}

export interface Prices {
  byTicker: Record<string, Price>;
  /** tickery, které burza nezná (jen u vlastního zadání) */
  unknown: string[];
  /** true = uložený snímek, ne živá data */
  offline: boolean;
  status: 'loading' | 'ready' | 'error';
}

/** Yahoo vrací londýnské ceny v pencích („GBp“) — počítáme je jako libry. */
function normalizeCurrency(currency: string, price: number): { currency: string; price: number } {
  if (currency === 'GBp' || currency === 'GBX') return { currency: 'GBP', price: price / 100 };
  return { currency: currency.toUpperCase(), price };
}

const fxSymbol = (currency: string) => `${currency}CZK=X`;

function toPrices(quotes: Quote[]): Record<string, Price> {
  const raw = Object.fromEntries(quotes.map(q => [q.ticker, q]));
  const out: Record<string, Price> = {};
  for (const q of quotes) {
    if (!isTradable(q.ticker) || !(q.price > 0)) continue;
    const { currency, price } = normalizeCurrency(q.currency, q.price);
    const rate = currency === 'CZK' ? 1 : raw[fxSymbol(currency)]?.price;
    if (!rate) continue; // měnu neumíme převést → titul nenabídneme
    out[q.ticker] = { czk: price * rate, native: price, currency, change: q.change_percent, name: q.name, asof: q.asof };
  }
  return out;
}

/** Tituly mimo náš seznam: jedna dávka pro cizí tickery a pak kurzy jejich měn. */
async function loadExtra(tickers: string[]): Promise<{ prices: Record<string, Price>; unknown: string[] }> {
  const first = await fetchQuotes(tickers).catch(() => null);
  const quotes = first?.quotes ?? [];
  const currencies = new Set(quotes.map(q => normalizeCurrency(q.currency, q.price).currency).filter(c => c && c !== 'CZK'));
  const fx = currencies.size ? (await fetchQuotes([...currencies].map(fxSymbol)).catch(() => null))?.quotes ?? [] : [];
  const prices = toPrices([...quotes, ...fx]);
  return { prices, unknown: tickers.filter(t => !quotes.some(q => q.ticker === t)) };
}

// jedna sdílená odpověď pro Trhy i Portfolio; po minutě se obnoví
let cache: { at: number; value: Prices } | null = null;
let pending: Promise<Prices> | null = null;

function loadPrices(): Promise<Prices> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  pending ??= fetchQuotes(ALL_INSTRUMENTS.map(i => i.ticker))
    .then(r => {
      const value: Prices = { byTicker: toPrices(r.quotes), unknown: [], offline: r.offline, status: 'ready' };
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => { pending = null; });
  return pending;
}

const LOADING: Prices = { byTicker: {}, unknown: [], offline: false, status: 'loading' };

/**
 * Ceny titulů z našeho seznamu + (volitelně) libovolných dalších tickerů,
 * třeba držených mimo seznam nebo právě hledaného v nákupním formuláři.
 */
export function usePrices(extra: string[] = []): Prices {
  const [base, setBase] = useState<Prices>(() => cache?.value ?? LOADING);
  const [more, setMore] = useState<{ key: string; prices: Record<string, Price>; unknown: string[] }>({ key: '', prices: {}, unknown: [] });
  const wanted = [...new Set(extra.filter(t => isTradable(t) && !ALL_INSTRUMENTS.some(i => i.ticker === t)))].sort();
  const key = wanted.join(',');

  useEffect(() => {
    let alive = true;
    const run = () => loadPrices()
      .then(p => { if (alive) setBase(p); })
      .catch(() => { if (alive) setBase(p => (p.status === 'ready' ? p : { ...LOADING, status: 'error' })); });
    run();
    const timer = setInterval(run, TTL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const run = () => loadExtra(key.split(','))
      .then(r => { if (alive) setMore({ key, prices: r.prices, unknown: r.unknown }); });
    run();
    const timer = setInterval(run, TTL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [key]);

  if (!key) return base;
  const fresh = more.key === key;
  return {
    ...base,
    byTicker: { ...base.byTicker, ...(fresh ? more.prices : {}) },
    unknown: fresh ? more.unknown : [],
  };
}

export interface Holding {
  ticker: string;
  name: string;
  qty: number;
  cost: number;
  /** aktuální hodnota v Kč; null, když cenu neznáme */
  value: number | null;
  /** cena za kus v Kč; null, když ji neznáme */
  price: number | null;
  /** denní změna ceny v % */
  dayPct: number | null;
}

export function valuePortfolio(p: Portfolio, prices: Record<string, Price>) {
  const holdings: Holding[] = Object.entries(p.positions).map(([ticker, pos]) => {
    const price = prices[ticker];
    return {
      ticker, name: instrumentName(ticker, pos), qty: pos.qty, cost: pos.cost,
      value: price ? pos.qty * price.czk : null,
      price: price?.czk ?? null,
      dayPct: price?.change ?? null,
    };
  }).sort((a, b) => (b.value ?? b.cost) - (a.value ?? a.cost));
  // titul bez známé ceny počítáme za nákupní cenu, ať součet neuskočí
  const invested = holdings.reduce((sum, h) => sum + (h.value ?? h.cost), 0);
  // dnešní změna: hodnota teď minus hodnota podle včerejší zavírací ceny
  const day = holdings.reduce((sum, h) => (h.value === null || h.dayPct === null ? sum : sum + (h.value - h.value / (1 + h.dayPct / 100))), 0);
  return { holdings, invested, total: p.cash + invested, day };
}

export const fmtCzk = (v: number, digits = 0) =>
  `${v.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits })} Kč`;

export const fmtQty = (v: number) =>
  v.toLocaleString('cs-CZ', { maximumFractionDigits: v >= 100 ? 1 : v >= 1 ? 3 : 5 });
