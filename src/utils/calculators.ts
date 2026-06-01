import {
  PENSION_BASE_2026, PENSION_PCT_RATE_2026, PENSION_RED1_2026,
  PENSION_RED2_2026, PENSION_MIN_PCT_2026, TAX_VALUE_TEST_2026,
  TAX_RATE_BASE, DIP_DEDUCT_LIMIT_2026,
} from '../data/constants';

/** Důchodový věk v měsících */
export function czRetirementAgeMonths(birthYear: number): number {
  const extra = Math.max(0, Math.min(Math.floor(birthYear) - 1965, 24));
  return 65 * 12 + extra;
}

/** Výpočtový základ z osobního vyměřovacího základu */
export function czVypocetovyZaklad(ovz: number): number {
  const first = Math.min(ovz, PENSION_RED1_2026);
  const second = Math.max(0, Math.min(ovz, PENSION_RED2_2026) - PENSION_RED1_2026);
  return 0.99 * first + 0.26 * second;
}

export interface PensionResult {
  total: number;
  baseAmount: number;
  percentAmount: number;
  computationBase: number;
}

/** Odhad měsíčního státního starobního důchodu (2026) */
export function czStatePension(ovz: number, yearsInsured: number): PensionResult {
  const vz = czVypocetovyZaklad(Math.max(0, ovz));
  let pct = vz * PENSION_PCT_RATE_2026 * Math.max(0, Math.floor(yearsInsured));
  pct = Math.max(pct, PENSION_MIN_PCT_2026);
  return {
    total: PENSION_BASE_2026 + pct,
    baseAmount: PENSION_BASE_2026,
    percentAmount: pct,
    computationBase: vz,
  };
}

export interface TaxResult {
  gain: number;
  exempt: boolean;
  passedTimeTest: boolean;
  passedValueTest: boolean;
  tax: number;
  netGain: number;
}

/** Odhad daně z prodeje cenných papírů (2026) */
export function czInvestmentTax(
  buy: number, sell: number, annualProceeds: number,
  heldOver3y: boolean, fees = 0, rate = TAX_RATE_BASE,
): TaxResult {
  const gain = Math.max(0, sell - buy - Math.max(0, fees));
  const passedTimeTest = heldOver3y;
  const passedValueTest = annualProceeds <= TAX_VALUE_TEST_2026;
  const exempt = passedTimeTest || passedValueTest;
  const tax = exempt ? 0 : gain * rate;
  return { gain, exempt, passedTimeTest, passedValueTest, tax, netGain: gain - tax };
}

export interface DipResult {
  deductible: number;
  taxSaving: number;
  unused: number;
  netCost: number;
}

/** DIP daňový odpočet (2026) */
export function czDipDeduction(
  dipContrib: number, otherContrib = 0, rate = TAX_RATE_BASE,
): DipResult {
  dipContrib = Math.max(0, dipContrib);
  otherContrib = Math.max(0, otherContrib);
  const eligible = dipContrib + otherContrib;
  const deductible = Math.min(DIP_DEDUCT_LIMIT_2026, eligible);
  const taxSaving = deductible * rate;
  const unused = Math.max(0, DIP_DEDUCT_LIMIT_2026 - eligible);
  const netCost = dipContrib - Math.min(taxSaving, dipContrib * rate);
  return { deductible, taxSaving, unused, netCost };
}

export interface CompoundRow {
  year: number;
  invested: number;
  noInvest: number;
  investedAfterInflation?: number;
  mattressReal?: number;
}

/** Simulace složeného úročení */
export function compoundInterest(
  monthly: number, annualRate: number, years: number, inflation = 0,
): CompoundRow[] {
  const rows: CompoundRow[] = [{ year: 0, invested: 0, noInvest: 0, investedAfterInflation: 0, mattressReal: 0 }];
  const monthlyRate = annualRate / 100 / 12;
  let balance = 0;
  let totalSaved = 0;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = (balance + monthly) * (1 + monthlyRate);
      totalSaved += monthly;
    }
    const inflFactor = inflation > 0 ? Math.pow(1 / (1 + inflation / 100), y) : 1;
    rows.push({
      year: y,
      invested: Math.round(balance),
      noInvest: Math.round(totalSaved),
      investedAfterInflation: inflation > 0 ? Math.round(balance * inflFactor) : undefined,
      mattressReal: inflation > 0 ? Math.round(totalSaved * inflFactor) : undefined,
    });
  }
  return rows;
}

/** Formátování čísla (český styl s mezerami) */
export function czNum(v: number | string): string {
  try {
    return Math.round(Number(v)).toLocaleString('cs-CZ');
  } catch {
    return String(v);
  }
}
