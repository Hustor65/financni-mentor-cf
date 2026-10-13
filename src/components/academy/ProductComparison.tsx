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
  { name: 'Spořicí účet', liquidity: 'Vysoká — peníze máš hned', yield: '~1–4 % ročně', tax: 'Daň 15 % z úroků', horizon: 'Krátkodobý', forWhom: 'Pohotovostní rezerva' },
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
  <section className="ui-sec ak-compare">
    <h2 className="ui-sec__title">Srovnání produktů</h2>
    <p className="ui-sec__lead">
      Kam peníze patří podle cíle a toho, kdy je budeš potřebovat. Jde o obecné informace, ne o investiční doporučení.
    </p>

    <div className="ui-table-wrap">
      <table className="ui-table ak-compare__table">
        <thead>
          <tr>
            <th scope="col">Produkt</th>
            {COLS.map(c => <th key={c.key} scope="col">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {PRODUCTS.map(p => (
            <tr key={p.name}>
              <th scope="row">
                {p.name}
                {p.featured && <span className="ui-tag ui-tag--accent ak-compare__tag">Nejčastější volba</span>}
              </th>
              {COLS.map(c => <td key={c.key} data-label={c.label}>{p[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p className="ui-small ak-compare__note">
      * Orientační historický průměr globálních akcií. Minulé výnosy nezaručují budoucí a hodnota investice v čase kolísá.
    </p>
  </section>
);
