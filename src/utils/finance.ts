/**
 * Finanční matematika pro pokročilé nástroje: indikátory nad cenovou řadou,
 * statistiky výkonnosti, oceňování opcí (Black–Scholes), Monte Carlo a DCF.
 * Čisté funkce bez závislostí — dají se testovat samostatně.
 */

// ── Indikátory ──────────────────────────────────────────────

/** Klouzavý průměr (SMA). Prvních `period − 1` hodnot je null (není z čeho počítat). */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** RSI (Wilderovo vyhlazení). 0–100; nad 70 „překoupeno“, pod 30 „přeprodáno“. */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

// ── Statistiky výkonnosti ───────────────────────────────────

export interface SeriesStats {
  /** celková změna za období v % */
  change: number;
  /** anualizovaná volatilita v % (směrodatná odchylka výnosů) */
  volatility: number;
  /** největší propad z vrcholu v % (záporné číslo) */
  maxDrawdown: number;
  high: number;
  low: number;
}

/** @param periodsPerYear 252 pro denní data, 52 pro týdenní, 12 pro měsíční */
export function seriesStats(closes: number[], periodsPerYear: number): SeriesStats {
  const first = closes[0];
  const last = closes[closes.length - 1];
  const rets: number[] = [];
  let peak = first;
  let maxDd = 0;
  let high = first;
  let low = first;
  for (let i = 1; i < closes.length; i++) {
    rets.push(Math.log(closes[i] / closes[i - 1]));
    if (closes[i] > peak) peak = closes[i];
    maxDd = Math.min(maxDd, closes[i] / peak - 1);
    high = Math.max(high, closes[i]);
    low = Math.min(low, closes[i]);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(1, rets.length);
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  return {
    change: (last / first - 1) * 100,
    volatility: Math.sqrt(variance * periodsPerYear) * 100,
    maxDrawdown: maxDd * 100,
    high,
    low,
  };
}

// ── Opce: Black–Scholes ─────────────────────────────────────

/** Distribuční funkce N(0,1) — Abramowitz–Stegun 7.1.26 (chyba < 1e-7). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

const normPdf = (x: number) => 0.3989422804014327 * Math.exp((-x * x) / 2);

export type OptionType = 'call' | 'put';

export interface OptionQuote {
  price: number;
  delta: number;
  gamma: number;
  /** změna ceny opce za jeden den */
  theta: number;
  /** změna ceny opce při růstu volatility o 1 procentní bod */
  vega: number;
}

/**
 * Evropská opce bez dividend.
 * @param s cena podkladu, @param k strike, @param t čas do expirace v letech,
 * @param sigma roční volatilita (0.25 = 25 %), @param r bezriziková sazba (0.04 = 4 %)
 */
export function blackScholes(type: OptionType, s: number, k: number, t: number, sigma: number, r: number): OptionQuote {
  if (t <= 0 || sigma <= 0 || s <= 0 || k <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, s - k) : Math.max(0, k - s);
    const itm = type === 'call' ? s > k : s < k;
    return { price: intrinsic, delta: itm ? (type === 'call' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0 };
  }
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(s / k) + (r + (sigma * sigma) / 2) * t) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const disc = Math.exp(-r * t);
  const gamma = normPdf(d1) / (s * sigma * sqrtT);
  const vega = (s * normPdf(d1) * sqrtT) / 100;
  if (type === 'call') {
    return {
      price: s * normCdf(d1) - k * disc * normCdf(d2),
      delta: normCdf(d1),
      gamma,
      theta: (-(s * normPdf(d1) * sigma) / (2 * sqrtT) - r * k * disc * normCdf(d2)) / 365,
      vega,
    };
  }
  return {
    price: k * disc * normCdf(-d2) - s * normCdf(-d1),
    delta: normCdf(d1) - 1,
    gamma,
    theta: (-(s * normPdf(d1) * sigma) / (2 * sqrtT) + r * k * disc * normCdf(-d2)) / 365,
    vega,
  };
}

/** Jedna „noha“ opční strategie. `qty` > 0 = koupeno, < 0 = vypsáno (prodáno). */
export interface OptionLeg {
  type: OptionType | 'stock';
  strike: number;
  qty: number;
}

/** Zisk/ztráta nohy při expiraci na 1 akcii podkladu (prémie = cena zaplacená při vstupu). */
export function legPayoff(leg: OptionLeg, premium: number, spotAtExpiry: number, entrySpot: number): number {
  if (leg.type === 'stock') return leg.qty * (spotAtExpiry - entrySpot);
  const intrinsic = leg.type === 'call'
    ? Math.max(0, spotAtExpiry - leg.strike)
    : Math.max(0, leg.strike - spotAtExpiry);
  return leg.qty * (intrinsic - premium);
}

// ── Monte Carlo ─────────────────────────────────────────────

/** Deterministický PRNG — stejný seed = stejná simulace (výsledek „neposkakuje“). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MonteCarloResult {
  /** percentily hodnoty portfolia po letech: index 0 = dnes */
  p10: number[];
  p50: number[];
  p90: number[];
  /** pár ukázkových cest pro ilustraci (každá má years + 1 bodů) */
  samples: number[][];
  deposits: number[];
  /** podíl simulací, které skončily pod součtem vkladů */
  lossProbability: number;
  /** podíl simulací, které dosáhly cíle (když je zadán) */
  goalProbability: number | null;
}

/**
 * Simulace pravidelného investování s náhodnými ročními výnosy
 * (geometrický Brownův pohyb, měsíční krok).
 */
export function monteCarlo(opts: {
  initial: number; monthly: number; years: number;
  /** očekávaný roční výnos v % */ mean: number;
  /** roční volatilita v % */ volatility: number;
  goal?: number; runs?: number; seed?: number;
}): MonteCarloResult {
  const { initial, monthly, mean, volatility, goal } = opts;
  const years = Math.max(1, Math.floor(opts.years));
  const runs = opts.runs ?? 800;
  const rand = mulberry32(opts.seed ?? 0x51f15e);
  const mu = mean / 100;
  const sigma = volatility / 100;
  const dt = 1 / 12;
  const drift = (mu - (sigma * sigma) / 2) * dt;
  const shock = sigma * Math.sqrt(dt);
  // Box–Muller
  const gauss = () => {
    let u = 0;
    while (u === 0) u = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };

  const byYear: number[][] = Array.from({ length: years + 1 }, () => []);
  const samples: number[][] = [];
  let losses = 0;
  let hits = 0;
  const totalDeposits = initial + monthly * 12 * years;

  for (let run = 0; run < runs; run++) {
    let value = initial;
    const path = [value];
    byYear[0].push(value);
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        value = (value + monthly) * Math.exp(drift + shock * gauss());
      }
      byYear[y].push(value);
      path.push(value);
    }
    if (run < 14) samples.push(path);
    if (value < totalDeposits) losses++;
    if (goal != null && value >= goal) hits++;
  }

  const pct = (arr: number[], p: number) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  };

  return {
    p10: byYear.map(a => pct(a, 0.1)),
    p50: byYear.map(a => pct(a, 0.5)),
    p90: byYear.map(a => pct(a, 0.9)),
    samples,
    deposits: byYear.map((_, y) => initial + monthly * 12 * y),
    lossProbability: losses / runs,
    goalProbability: goal != null ? hits / runs : null,
  };
}

// ── DCF ─────────────────────────────────────────────────────

export interface DcfResult {
  /** projekce volného cash flow na akcii po letech + její současná hodnota */
  years: { year: number; fcf: number; pv: number }[];
  pvSum: number;
  terminalPv: number;
  /** vnitřní hodnota na akcii */
  value: number;
  valid: boolean;
}

/**
 * Dvoufázový model diskontovaných cash flow.
 * @param fcf dnešní volný cash flow na akcii, @param growth růst v 1. fázi (%),
 * @param years délka 1. fáze, @param terminalGrowth věčný růst po ní (%),
 * @param discount požadovaná výnosnost / diskontní sazba (%)
 */
export function dcf(fcf: number, growth: number, years: number, terminalGrowth: number, discount: number): DcfResult {
  const g = growth / 100;
  const tg = terminalGrowth / 100;
  const d = discount / 100;
  const n = Math.max(1, Math.floor(years));
  const rows: DcfResult['years'] = [];
  let cf = fcf;
  let pvSum = 0;
  for (let y = 1; y <= n; y++) {
    cf *= 1 + g;
    const pv = cf / Math.pow(1 + d, y);
    pvSum += pv;
    rows.push({ year: y, fcf: cf, pv });
  }
  // Gordonův vzorec dává smysl jen když diskont > věčný růst
  const valid = d > tg;
  const terminalPv = valid ? ((cf * (1 + tg)) / (d - tg)) / Math.pow(1 + d, n) : 0;
  return { years: rows, pvSum, terminalPv, value: pvSum + terminalPv, valid };
}
