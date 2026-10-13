import { useSyncExternalStore } from 'react';
import type { Level } from '../data/levels';

/**
 * Postup návštěvníka — úroveň, hotová témata, portfolio na zkoušku a nejlepší
 * skóre ve hře. Žije v localStorage; když je návštěvník přihlášený, stejná data
 * se ukládají i k jeho účtu (viz utils/account.ts).
 */

export const START_CASH = 100_000;

export interface Position {
  qty: number;
  /** kolik korun pozice celkem stála */
  cost: number;
}

export interface Trade {
  /** čas ms */
  t: number;
  ticker: string;
  side: 'buy' | 'sell';
  qty: number;
  /** cena za kus v korunách v okamžiku obchodu */
  price: number;
}

export interface Portfolio {
  cash: number;
  positions: Record<string, Position>;
  trades: Trade[];
}

export interface UserData {
  level: Level;
  completed: string[];
  portfolio: Portfolio;
  /** nejlepší výsledek ve hře Odhadni graf (z 10) */
  guessBest: number;
}

const KEY = 'fm-data';
const MAX_TRADES = 200;

export const emptyPortfolio = (): Portfolio => ({ cash: START_CASH, positions: {}, trades: [] });

const defaults = (): UserData => ({ level: 'start', completed: [], portfolio: emptyPortfolio(), guessBest: 0 });

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Z čehokoli (localStorage, odpověď serveru) udělá platná data. */
export function sanitize(raw: unknown): UserData {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  if (r.level === 'pro') d.level = 'pro';
  if (Array.isArray(r.completed)) d.completed = [...new Set(r.completed.filter((x): x is string => typeof x === 'string'))].slice(0, 200);
  d.guessBest = Math.min(10, Math.max(0, Math.round(num(r.guessBest, 0))));

  const p = r.portfolio as Record<string, unknown> | undefined;
  if (p && typeof p === 'object') {
    d.portfolio.cash = Math.max(0, num(p.cash, START_CASH));
    if (p.positions && typeof p.positions === 'object') {
      for (const [ticker, pos] of Object.entries(p.positions as Record<string, Record<string, unknown>>)) {
        const qty = num(pos?.qty, 0);
        if (qty > 0) d.portfolio.positions[ticker] = { qty, cost: Math.max(0, num(pos?.cost, 0)) };
      }
    }
    if (Array.isArray(p.trades)) {
      d.portfolio.trades = (p.trades as Record<string, unknown>[])
        .filter(t => t && typeof t.ticker === 'string' && (t.side === 'buy' || t.side === 'sell'))
        .map(t => ({ t: num(t.t, 0), ticker: t.ticker as string, side: t.side as Trade['side'], qty: num(t.qty, 0), price: num(t.price, 0) }))
        .slice(-MAX_TRADES);
    }
  }
  return d;
}

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
    // starší verze webu ukládala úroveň a témata zvlášť
    return sanitize({
      level: localStorage.getItem('fm-level'),
      completed: JSON.parse(localStorage.getItem('fm-completed-topics') ?? '[]'),
    });
  } catch {
    return defaults();
  }
}

let state: UserData = typeof window === 'undefined' ? defaults() : load();
const listeners = new Set<() => void>();

function commit(next: UserData) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* soukromé okno — nevadí */ }
  listeners.forEach(fn => fn());
}

export const getData = (): UserData => state;

export function updateData(patch: Partial<UserData> | ((d: UserData) => Partial<UserData>)) {
  commit({ ...state, ...(typeof patch === 'function' ? patch(state) : patch) });
}

export const replaceData = (next: UserData) => commit(next);

/** Smaže postup v tomhle prohlížeči (odhlášení, režim stánku). */
export const resetData = () => commit(defaults());

export function subscribeData(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const useUserData = (): UserData => useSyncExternalStore(subscribeData, getData);

/** true = návštěvník tu ještě nic neudělal (není co slučovat s účtem) */
export const isPristine = (d: UserData) =>
  d.completed.length === 0 && d.portfolio.trades.length === 0 && d.guessBest === 0;

/** Sloučí postup z prohlížeče s postupem z účtu — nic hotového se neztratí. */
export function mergeData(local: UserData, remote: UserData): UserData {
  return {
    level: isPristine(local) ? remote.level : local.level,
    completed: [...new Set([...remote.completed, ...local.completed])],
    // portfolia sčítat nejde; platí to z účtu, pokud se v něm už obchodovalo
    portfolio: remote.portfolio.trades.length ? remote.portfolio : local.portfolio,
    guessBest: Math.max(local.guessBest, remote.guessBest),
  };
}

/* ── Portfolio na zkoušku ─────────────────────────────────── */

/** Koupí/prodá `qty` kusů za `priceCzk` Kč za kus. Vrací text chyby, nebo null. */
export function trade(ticker: string, side: 'buy' | 'sell', qty: number, priceCzk: number): string | null {
  if (!(qty > 0) || !(priceCzk > 0)) return 'Zadej kladnou částku.';
  const p = state.portfolio;
  const total = qty * priceCzk;
  const pos = p.positions[ticker];
  const positions = { ...p.positions };
  let cash = p.cash;

  if (side === 'buy') {
    if (total > cash + 0.005) return 'Na tenhle nákup nemáš dost hotovosti.';
    cash -= total;
    positions[ticker] = { qty: (pos?.qty ?? 0) + qty, cost: (pos?.cost ?? 0) + total };
  } else {
    if (!pos || qty > pos.qty + 1e-9) return 'Tolik kusů nedržíš.';
    const left = pos.qty - qty;
    cash += total;
    if (left < 1e-9) delete positions[ticker];
    else positions[ticker] = { qty: left, cost: pos.cost * (left / pos.qty) };
  }

  const trades = [...p.trades, { t: Date.now(), ticker, side, qty, price: priceCzk }].slice(-MAX_TRADES);
  updateData({ portfolio: { cash: Math.max(0, cash), positions, trades } });
  return null;
}

export const resetPortfolio = () => updateData({ portfolio: emptyPortfolio() });
