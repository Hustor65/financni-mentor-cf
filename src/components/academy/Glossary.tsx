import { useState, useMemo } from 'react';
import { GLOSSARY } from '../../data/knowledge';
import { Icon } from '../Icon';

function removeDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// české skloňování počtu (1 / 2–4 / 5+)
function plural(n: number, forms: [string, string, string]): string {
  if (n === 1) return forms[0];
  if (n >= 2 && n <= 4) return forms[1];
  return forms[2];
}

export const Glossary: React.FC = () => {
  const [search, setSearch] = useState('');

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

  // (reveal karet řeší jediná instance useScrollReveal v App.tsx přes MutationObserver — M36)

  return (
    <div>
      <span className="eyebrow">Finanční pojmy</span>
      <p className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Icon name="book-open" size={24} color="#3ab5e0" />
        Finanční slovníček
      </p>
      <p className="section-desc">
        Rychlé a srozumitelné definice nejdůležitějších finančních pojmů. Hledat můžete podle názvu i podle obsahu definice.
      </p>

      {/* Search s ikonou lupy + počítadlo (vyplní řádek do plné šířky) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '480px' }}>
          <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            type="text"
            placeholder="Hledat pojem… (např. ETF, inflace, dividenda)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Hledat ve slovníčku"
          />
        </div>
        <span aria-live="polite" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
          {search.trim()
            ? `${filtered.length} ${plural(filtered.length, ['výsledek', 'výsledky', 'výsledků'])}`
            : `Celkem ${GLOSSARY.length} ${plural(GLOSSARY.length, ['pojem', 'pojmy', 'pojmů'])} ve slovníčku`}
        </span>
      </div>

      {/* 2-sloupcová mřížka karet */}
      <div className="glossary-grid">
        {filtered.map((g, i) => (
          <div key={g.term} className="glossary-card glass-panel glass-panel--sunken reveal" style={{ ['--reveal-i' as string]: i % 4 }}>
            <div className="glossary-card__term">
              <span className="glossary-card__dot" />
              {g.term}
            </div>
            <div className="glossary-card__def">{g.def}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div role="status" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.88rem' }}>
          Tomuto hledání neodpovídá žádný pojem. Zkuste jiné nebo kratší slovo — anebo se rovnou zeptejte AI Mentora.
        </div>
      )}
    </div>
  );
};
