import { useEffect, useState } from 'react';
import { ALL_INSTRUMENTS, fetchQuotes } from './market';
import type { Instrument, Quote } from './market';
import type { Portfolio } from './store';

/**
 * Ceny pro portfolio na zkoušku. Účet je vedený v korunách, takže dolarové
 * a eurové tituly přepočítáváme aktuálním kurzem — stejně jako u skutečného
 * brokera se tak do výsledku promítá i pohyb měny.
 */

const FX: Record<string, string> = { USD: 'USDCZK=X', EUR: 'EURCZK=X' };

/** Indexy a měnové páry se koupit nedají — index kopíruje ETF. */
export const isTradable = (ticker: string) => !ticker.startsWith('^') && !ticker.endsWith('=X');
export const TRADABLE: Instrument[] = ALL_INSTRUMENTS.filter(i => isTradable(i.ticker));
export const instrumentName = (ticker: string) => ALL_INSTRUMENTS.find(i => i.ticker === ticker)?.name ?? ticker;

export interface Price {
  /** cena za kus v korunách */
  czk: number;
  /** cena v měně burzy */
  native: number;
  currency: string;
  change: number;
}

export interface Prices {
  byTicker: Record<string, Price>;
  /** true = uložený snímek, ne živá data */
  offline: boolean;
  status: 'loading' | 'ready' | 'error';
}

function toPrices(quotes: Quote[]): Record<string, Price> {
  const raw = Object.fromEntries(quotes.map(q => [q.ticker, q]));
  const out: Record<string, Price> = {};
  for (const q of quotes) {
    if (!isTradable(q.ticker) || !(q.price > 0)) continue;
    const rate = q.currency === 'CZK' ? 1 : raw[FX[q.currency]]?.price;
    if (!rate) continue; // měnu neumíme převést → titul nenabídneme
    out[q.ticker] = { czk: q.price * rate, native: q.price, currency: q.currency, change: q.change_percent };
  }
  return out;
}

// jedna sdílená odpověď pro Trhy i Portfolio; po minutě se obnoví
const TTL_MS = 60_000;
let cache: { at: number; value: Prices } | null = null;
let pending: Promise<Prices> | null = null;

function loadPrices(): Promise<Prices> {
  if (cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.value);
  pending ??= fetchQuotes(ALL_INSTRUMENTS.map(i => i.ticker))
    .then(r => {
      const value: Prices = { byTicker: toPrices(r.quotes), offline: r.offline, status: 'ready' };
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => { pending = null; });
  return pending;
}

const LOADING: Prices = { byTicker: {}, offline: false, status: 'loading' };

export function usePrices(): Prices {
  const [prices, setPrices] = useState<Prices>(() => cache?.value ?? LOADING);
  useEffect(() => {
    let alive = true;
    const run = () => loadPrices()
      .then(p => { if (alive) setPrices(p); })
      .catch(() => { if (alive) setPrices(p => (p.status === 'ready' ? p : { ...LOADING, status: 'error' })); });
    run();
    const timer = setInterval(run, TTL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, []);
  return prices;
}

export interface Holding {
  ticker: string;
  name: string;
  qty: number;
  cost: number;
  /** aktuální hodnota v Kč; null, když cenu neznáme */
  value: number | null;
}

export function valuePortfolio(p: Portfolio, prices: Record<string, Price>) {
  const holdings: Holding[] = Object.entries(p.positions).map(([ticker, pos]) => ({
    ticker, name: instrumentName(ticker), qty: pos.qty, cost: pos.cost,
    value: prices[ticker] ? pos.qty * prices[ticker].czk : null,
  })).sort((a, b) => (b.value ?? b.cost) - (a.value ?? a.cost));
  // titul bez známé ceny počítáme za nákupní cenu, ať součet neuskočí
  const invested = holdings.reduce((sum, h) => sum + (h.value ?? h.cost), 0);
  return { holdings, invested, total: p.cash + invested };
}

export const fmtCzk = (v: number, digits = 0) =>
  `${v.toLocaleString('cs-CZ', { minimumFractionDigits: digits, maximumFractionDigits: digits })} Kč`;

export const fmtQty = (v: number) =>
  v.toLocaleString('cs-CZ', { maximumFractionDigits: v >= 100 ? 1 : v >= 1 ? 3 : 5 });
