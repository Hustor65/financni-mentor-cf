import { Icon } from '../Icon';

interface Product {
  name: string;
  liquidity: string;
  yield: string;
  tax: string;
  horizon: string;
  forWhom: string;
}

// Ilustrativní přehled — obecné informace, ne investiční doporučení.
interface ProductRow extends Product {
  featured?: boolean;
}

const PRODUCTS: ProductRow[] = [
  { name: 'Spořicí účet', liquidity: 'Vysoká — kdykoli', yield: '~1–4 % p.a.', tax: 'Daň 15 % z úroků', horizon: 'Krátkodobý', forWhom: 'Pohotovostní rezerva' },
  { name: 'ETF (akcie)', liquidity: 'Vysoká — prodej během dní', yield: '~7 % p.a.*', tax: 'Po 3 letech držby osvobozeno', horizon: 'Dlouhodobý (5+ let)', forWhom: 'Růst majetku', featured: true },
  { name: 'Penzijní spoření', liquidity: 'Nízká — výběr až v 60', yield: '~2–5 % p.a.', tax: 'Příspěvek státu + daňový odpočet', horizon: 'Do důchodu', forWhom: 'Důchodová rezerva' },
  { name: 'DIP', liquidity: 'Nízká — 10 let a min. 60 let věku', yield: 'Dle zvoleného nástroje', tax: 'Odpočet až 48 000 Kč/rok', horizon: 'Dlouhodobý', forWhom: 'Daňová úspora + důchod' },
];

const COLS: { key: keyof Product; label: string }[] = [
  { key: 'liquidity', label: 'Likvidita' },
  { key: 'yield', label: 'Výnos' },
  { key: 'tax', label: 'Daně / výhody' },
  { key: 'horizon', label: 'Horizont' },
  { key: 'forWhom', label: 'Vhodné pro' },
];

/** Přehledové srovnání hlavních typů produktů (ilustrativní, ne doporučení). */
export const ProductComparison: React.FC = () => (
  <div>
    <span className="eyebrow">Orientační srovnání</span>
    <p className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <Icon name="scale" size={24} color="#3ab5e0" />
      Srovnání produktů
    </p>
    <p className="section-desc">
      Rychlá orientace, kam peníze patří podle cíle a horizontu. Obecné informace, ne investiční doporučení.
    </p>

    <div className="compare-grid">
      {PRODUCTS.map(p => (
        <div
          key={p.name}
          className={`glass-panel compare-card${p.featured ? ' compare-card--featured' : ' glass-panel--sunken'}`}
        >
          {p.featured && <span className="compare-card__tag">Nejčastější volba</span>}
          <div className="compare-card__name">{p.name}</div>
          <dl className="compare-card__list">
            {COLS.map(c => (
              <div key={c.key} className="compare-card__row">
                <dt>{c.label}</dt>
                <dd>{p[c.key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>

    <p className="data-note" style={{ marginTop: '0.9rem' }}>
      * Historický průměr globálních akcií; minulé výnosy nezaručují budoucí. Hodnota investice kolísá.
    </p>
  </div>
);
