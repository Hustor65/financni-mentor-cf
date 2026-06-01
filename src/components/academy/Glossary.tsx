import { useState, useMemo } from 'react';
import { GLOSSARY } from '../../data/knowledge';
import { Icon } from '../Icon';
import { useScrollReveal } from '../../hooks/useScrollReveal';

function removeDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
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

  // reveal položek slovníčku — re-scan i po filtrování (search mění seznam)
  useScrollReveal([filtered]);

  return (
    <div>
      <span className="eyebrow">Finanční pojmy</span>
      <p className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Icon name="book-open" size={24} color="#3ab5e0" />
        Finanční slovníček
      </p>
      <p className="section-desc">
        Rychlé, srozumitelné definice nejdůležitějších pojmů. Hledejte podle názvu i obsahu.
      </p>

      {/* Search s ikonou lupy */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '480px' }}>
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
          placeholder="Např. ETF, inflace, dividenda…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Hledat ve slovníčku"
        />
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
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.88rem' }}>
          Žádný pojem neodpovídá hledání. Zkuste jiné slovo, nebo se zeptejte AI Mentora.
        </div>
      )}
    </div>
  );
};
