import { useState } from 'react';
import { TOPICS } from '../data/topics';
import { Icon } from './Icon';

/**
 * StartPath — personalizovaný start „Kde mám začít?". Z deep-researche:
 * diferencovaná/personalizovaná výuka funguje líp než one-size-fits-all
 * (Hernández 2022), a onboarding 1 otázkou → doporučená cesta (Brilliant/NN-g).
 * Student vybere, co ho vystihuje, a dostane doporučenou trasu témat; volba se
 * pamatuje (localStorage), cesta sleduje, co už má dokončené.
 */

interface Profile {
  id: string;
  icon: string;
  label: string;
  path: string[]; // pořadí topicId
}

const PROFILES: Profile[] = [
  { id: 'ss', icon: 'book-open', label: 'Jsem na střední', path: ['rozpocet', 'scamy', 'jak-na-to', 'dluhy', 'slozene-uroceni'] },
  { id: 'vs', icon: 'graduation-cap', label: 'Vysoká nebo mám brigádu', path: ['dane-brigada', 'rozpocet', 'dluhy', 'jak-na-to', 'slozene-uroceni', 'akcie-etf'] },
  { id: 'penize', icon: 'coins', label: 'Chci zvládnout peníze a nedělat chyby', path: ['rozpocet', 'scamy', 'dluhy', 'jak-na-to'] },
  { id: 'invest', icon: 'trending-up', label: 'Chci pochopit investování', path: ['slozene-uroceni', 'riziko', 'akcie-etf', 'inflace', 'dane-dip'] },
];

const STORAGE_KEY = 'fm-start-profile';
const titleOf = (id: string) => TOPICS.find(t => t.id === id)?.title ?? id;

interface Props {
  onOpenTopic: (id: string) => void;
  completed: Set<string>;
}

export const StartPath: React.FC<Props> = ({ onOpenTopic, completed }) => {
  const [profileId, setProfileId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const pick = (id: string) => {
    setProfileId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };
  const reset = () => {
    setProfileId(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const profile = PROFILES.find(p => p.id === profileId);

  // ── Výběr profilu ──
  if (!profile) {
    return (
      <section className="glass-panel" aria-label="Kde začít" style={{ padding: 'var(--space-lg)' }}>
        <span className="eyebrow">Kde mám začít?</span>
        <p className="section-header" style={{ margin: 'var(--space-2xs) 0' }}>Najdi si svou cestu</p>
        <p style={{ opacity: 0.75, margin: '0 0 var(--space-md)', lineHeight: 1.5 }}>
          Vyber, co tě nejvíc vystihuje, a doporučím ti, čím začít a jak pokračovat. Témata zůstanou
          klidně přístupná i mimo cestu — tohle je jen kompas.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 'var(--space-sm)' }}>
          {PROFILES.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', textAlign: 'left',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md, 10px)',
                border: '1px solid var(--border-1, rgba(120,180,210,0.25))',
                background: 'var(--surface-1, #11202c)', color: 'inherit', font: 'inherit',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Icon name={p.icon} size={24} color="var(--lg-cyan-2, #4cc4e6)" aria-hidden />
              {p.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ── Doporučená cesta ──
  const next = profile.path.find(id => !completed.has(id)) ?? profile.path[0];
  const allDone = profile.path.every(id => completed.has(id));

  return (
    <section className="glass-panel" aria-label="Tvoje doporučená cesta" style={{ padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon name={profile.icon} size={15} color="var(--lg-cyan-2, #4cc4e6)" aria-hidden /> Tvoje cesta
          </span>
          <p className="section-header" style={{ margin: 'var(--space-2xs) 0 0' }}>
            {allDone ? 'Prošel jsi celou cestu!' : 'Začni a pokračuj takhle'}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{ background: 'none', border: 'none', color: 'var(--lg-cyan-2, #4cc4e6)', font: 'inherit', fontWeight: 600, cursor: 'pointer', padding: 0 }}
        >
          změnit
        </button>
      </div>

      <ol style={{ margin: 'var(--space-md) 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2xs)' }}>
        {profile.path.map((id, i) => {
          const isDone = completed.has(id);
          const isNext = id === next && !isDone;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onOpenTopic(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', textAlign: 'left',
                  padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md, 10px)',
                  border: isNext ? '1px solid var(--lg-cyan-2, #4cc4e6)' : '1px solid var(--border-1, rgba(120,180,210,0.18))',
                  background: isNext ? 'rgba(76,196,230,0.1)' : 'transparent',
                  color: 'inherit', font: 'inherit', cursor: 'pointer',
                  opacity: isDone ? 0.6 : 1,
                }}
              >
                <span style={{ width: 22, fontWeight: 700, color: isDone ? 'var(--lg-green-500, #10B981)' : 'var(--lg-cyan-2, #4cc4e6)' }}>
                  {isDone ? '✓' : i + 1 + '.'}
                </span>
                <span style={{ fontWeight: isNext ? 700 : 600, textDecoration: isDone ? 'line-through' : 'none' }}>{titleOf(id)}</span>
                {isNext && <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--lg-cyan-2, #4cc4e6)', fontWeight: 700 }}>začni tady</span>}
              </button>
            </li>
          );
        })}
      </ol>

      {!allDone && (
        <button type="button" className="btn btn--primary" onClick={() => onOpenTopic(next)} style={{ marginTop: 'var(--space-md)' }}>
          {completed.has(profile.path[0]) ? 'Pokračovat' : 'Začít'}: {titleOf(next)} →
        </button>
      )}
    </section>
  );
};
