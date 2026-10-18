import { useEffect, useMemo, useState } from 'react';
import { fetchSeries } from './market';
import type { Series } from './market';
import type { Trade } from './store';
import { START_CASH } from './store';
import type { Price } from './portfolio';

/**
 * Vývoj hodnoty portfolia v čase — dopočítaný zpětně z nákupů a prodejů a denních cen
 * za poslední rok. Kurz koruny se bere dnešní (stejně jako v celém portfoliu), takže jde
 * o orientační čáru, ne o účetnictví.
 */

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// jedna řada na titul; opakované zobrazení portfolia se neptá znovu
const cache = new Map<string, Promise<Series | null>>();
function loadSeries(ticker: string): Promise<Series | null> {
  let p = cache.get(ticker);
  if (!p) {
    p = fetchSeries(ticker, '1y').catch(() => null);
    cache.set(ticker, p);
    p.then(r => { if (!r) cache.delete(ticker); });
  }
  return p;
}

export interface HistoryPoint { t: number; value: number }

export function usePortfolioHistory(trades: Trade[], prices: Record<string, Price>, total: number): HistoryPoint[] | null {
  const key = [...new Set(trades.map(t => t.ticker))].sort().join(',');
  const [loaded, setLoaded] = useState<{ key: string; series: Record<string, Series> } | null>(null);
  // poslední bod grafu = „teď“ (čas načtení stránky stačí)
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!key) return;
    let alive = true;
    Promise.all(key.split(',').map(async t => [t, await loadSeries(t)] as const)).then(all => {
      if (!alive) return;
      const series: Record<string, Series> = {};
      for (const [t, s] of all) if (s) series[t] = s;
      setLoaded({ key, series });
    });
    return () => { alive = false; };
  }, [key]);

  return useMemo(() => {
    if (!key || !loaded || loaded.key !== key || !trades.length) return null;
    const tickers = key.split(',');
    if (tickers.some(t => !loaded.series[t] || !prices[t])) return null;

    // denní zavírací ceny a přepočet na koruny (dnešní cena v Kč / poslední cena v řadě)
    const closes: Record<string, Map<string, number>> = {};
    const factor: Record<string, number> = {};
    for (const t of tickers) {
      const pts = loaded.series[t].points;
      closes[t] = new Map(pts.map(p => [dayKey(p[0]), p[4]]));
      factor[t] = prices[t].czk / pts[pts.length - 1][4];
    }

    const sorted = [...trades].sort((a, b) => a.t - b.t);
    const first = dayKey(sorted[0].t);
    const days = [...new Set(tickers.flatMap(t => [...closes[t].keys()]))].filter(d => d >= first).sort();
    if (days.length < 2) return null;

    const qty: Record<string, number> = {};
    const last: Record<string, number> = {};
    let cash = START_CASH;
    let i = 0;
    const out: HistoryPoint[] = [{ t: Date.parse(first) - 86_400_000, value: START_CASH }];
    for (const d of days) {
      while (i < sorted.length && dayKey(sorted[i].t) <= d) {
        const tr = sorted[i++];
        const sign = tr.side === 'buy' ? 1 : -1;
        qty[tr.ticker] = (qty[tr.ticker] ?? 0) + sign * tr.qty;
        cash -= sign * tr.qty * tr.price;
        // do první známé ceny v řadě platí cena obchodu
        if (last[tr.ticker] === undefined) last[tr.ticker] = tr.price / factor[tr.ticker];
      }
      let value = cash;
      for (const t of tickers) {
        const c = closes[t].get(d);
        if (c !== undefined) last[t] = c;
        if (qty[t] && last[t] !== undefined) value += qty[t] * last[t] * factor[t];
      }
      out.push({ t: Date.parse(d), value });
    }
    out.push({ t: now, value: total });
    return out;
  }, [key, loaded, trades, prices, total, now]);
}
