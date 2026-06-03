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
  { name: 'Spořicí účet', liquidity: 'Vysoká — peníze máte hned', yield: '~1–4 % ročně', tax: 'Daň 15 % z úroků', horizon: 'Krátkodobý', forWhom: 'Pohotovostní rezerva' },
  { name: 'ETF (akcie)', liquidity: 'Vysoká — prodej do několika dní', yield: '~7 % ročně*', tax: 'Po 3 letech držby osvobozeno', horizon: 'Dlouhodobý (5+ let)', forWhom: 'Růst majetku', featured: true },
  { name: 'Penzijní spoření', liquidity: 'Nízká — výběr až v 60 letech', yield: '~2–5 % ročně', tax: 'Státní příspěvek a daňový odpočet', horizon: 'Do důchodu', forWhom: 'Důchodová rezerva' },
  { name: 'DIP (dlouhodobý investiční produkt)', liquidity: 'Nízká — minimálně 10 let a věk 60+', yield: 'Podle zvoleného nástroje', tax: 'Odpočet až 48 000 Kč ročně', horizon: 'Dlouhodobý', forWhom: 'Daňová úspora a důchod' },
];

const COLS: { key: keyof Product; label: string }[] = [
  { key: 'liquidity', label: 'Likvidita' },
  { key: 'yield', label: 'Výnos' },
  { key: 'tax', label: 'Daně a výhody' },
  { key: 'horizon', label: 'Horizont' },
  { key: 'forWhom', label: 'Vhodné pro' },
];

/** Přehledové srovnání hlavních typů produktů (ilustrativní, ne doporučení). */
export const ProductComparison: React.FC = () => (
  <div>
    <span className="eyebrow">Orientační srovnání</span>
    <h2 className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <Icon name="scale" size={24} color="#3ab5e0" aria-hidden />
      Srovnání produktů
    </h2>
    <p className="section-desc">
      Rychlá orientace, kam peníze patří podle vašeho cíle a časového horizontu. Jde o obecné informace, ne o investiční doporučení.
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
      * Orientační historický průměr globálních akcií. Minulé výnosy nezaručují ty budoucí a hodnota investice v čase kolísá.
    </p>
  </div>
);
