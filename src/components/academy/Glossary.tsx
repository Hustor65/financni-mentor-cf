import { useId, useMemo, useState } from 'react';
import { GLOSSARY } from '../../data/knowledge';

function removeDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// české skloňování počtu (1 / 2–4 / 5+)
function plural(n: number, forms: [string, string, string]): string {
  if (n === 1) return forms[0];
  if (n >= 2 && n <= 4) return forms[1];
  return forms[2];
}

/** kolik pojmů je vidět, dokud návštěvník nehledá ani si nerozbalí celý seznam */
const PREVIEW = 6;

export const Glossary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputId = useId();
  const listId = useId();

  const filtered = useMemo(() => {
    const base = !search.trim()
      ? GLOSSARY
      : GLOSSARY.filter(g => {
          const q = removeDiacritics(search.trim());
          return removeDiacritics(g.term).includes(q) || removeDiacritics(g.def).includes(q);
        });
    // abecední řazení (jako originál)
    return [...base].sort((a, b) => a.term.localeCompare(b.term, 'cs'));
  }, [search]);

  const searching = search.trim().length > 0;
  const visible = searching || showAll ? filtered : filtered.slice(0, PREVIEW);

  return (
    <section className="ui-sec ak-gloss">
      <h2 className="ui-sec__title">Slovníček</h2>
      <p className="ui-sec__lead">
        Krátké definice pojmů, na které v tématech narazíš. Hledat můžeš v názvu i v textu definice.
      </p>

      <div className="ak-gloss__bar">
        <div className="ui-field ak-gloss__search">
          <label htmlFor={inputId}>Hledat pojem</label>
          <input
            id={inputId}
            type="search"
            placeholder="např. ETF, inflace, dividenda"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <span className="ak-gloss__count num" aria-live="polite">
          {searching
            ? `${filtered.length} ${plural(filtered.length, ['výsledek', 'výsledky', 'výsledků'])}`
            : `${GLOSSARY.length} ${plural(GLOSSARY.length, ['pojem', 'pojmy', 'pojmů'])}`}
        </span>
      </div>

      {visible.length > 0 && (
        <dl className="ak-gloss__list" id={listId}>
          {visible.map(g => (
            <div key={g.term} className="ak-gloss__item">
              <dt>{g.term}</dt>
              <dd>{g.def}</dd>
            </div>
          ))}
        </dl>
      )}

      {!searching && GLOSSARY.length > PREVIEW && (
        <button
          type="button"
          className="btn ak-gloss__toggle"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Zobrazit jen začátek' : `Zobrazit všech ${GLOSSARY.length} ${plural(GLOSSARY.length, ['pojem', 'pojmy', 'pojmů'])}`}
        </button>
      )}

      {filtered.length === 0 && (
        <p className="ui-note ak-gloss__empty" role="status">
          Tomuhle hledání neodpovídá žádný pojem. Zkus kratší slovo, nebo se zeptej mentora.
        </p>
      )}
    </section>
  );
};
