// Czech financial system parameters 2026
// Sources: ČSSZ, EY, Finanční správa, MF ČR

// ── Pension 2026 ──
export const PENSION_BASE_2026 = 4900;
export const PENSION_PCT_RATE_2026 = 0.01495;
export const PENSION_RED1_2026 = 21546;
export const PENSION_RED2_2026 = 195868;
export const PENSION_MIN_PCT_2026 = 770;
export const PENSION_AVG_WAGE_2026 = 48967;

export const PENSION_HISTORY: Record<number, number> = {
  2008: 9638, 2010: 10123, 2012: 10778, 2014: 11075, 2016: 11460,
  2018: 12418, 2020: 14479, 2022: 18061, 2024: 20680, 2026: 21800,
};

// ── Tax 2026 ──
export const TAX_TIME_TEST_YEARS = 3;
export const TAX_VALUE_TEST_2026 = 100_000;
export const TAX_RATE_BASE = 0.15;
export const TAX_RATE_HIGH = 0.23;
export const TAX_HIGH_THRESHOLD_2026 = 1_762_812;
export const TAX_REPORT_EXEMPT_2026 = 5_000_000;
export const DIP_DEDUCT_LIMIT_2026 = 48_000;
export const DIP_EMPLOYER_LIMIT_2026 = 50_000;

// ── Content ──
export const CONTENT_LAST_UPDATED = '29. května 2026';
export const NEWSLETTER_FALLBACK_EMAIL = 'jakub.simon65@gmail.com';

// ── Data Sources ──
export const DATA_SOURCES = [
  { name: 'Česká národní banka (ČNB)', use: 'Ochrana spotřebitele, finanční gramotnost, regulace trhu', url: 'https://www.cnb.cz/cs/o_cnb/financni-a-ekonomicka-gramotnost/' },
  { name: 'Český statistický úřad (ČSÚ)', use: 'Inflace, vývoj průměrných mezd', url: 'https://csu.gov.cz/' },
  { name: 'ČSSZ / MPSV', use: 'Parametry starobního důchodu 2026, valorizace, statistika', url: 'https://www.cssz.cz/' },
  { name: 'ESMA / MiFID II', use: 'Rozdíl mezi vzděláváním a investičním doporučením', url: 'https://www.esma.europa.eu/' },
  { name: 'Ministerstvo financí ČR', use: 'Daně z investic, DIP, Národní strategie finančního vzdělávání', url: 'https://financnigramotnost.gov.cz/' },
];
