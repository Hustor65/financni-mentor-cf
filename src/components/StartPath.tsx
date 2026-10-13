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
  label: string;
  path: string[]; // pořadí topicId
}

const PROFILES: Profile[] = [
  { id: 'ss', label: 'Jsem na střední', path: ['rozpocet', 'scamy', 'jak-na-to', 'dluhy', 'slozene-uroceni'] },
  { id: 'vs', label: 'Vysoká nebo mám brigádu', path: ['dane-brigada', 'rozpocet', 'dluhy', 'jak-na-to', 'slozene-uroceni', 'akcie-etf'] },
  { id: 'penize', label: 'Chci zvládnout peníze a nedělat chyby', path: ['rozpocet', 'scamy', 'dluhy', 'jak-na-to'] },
  { id: 'invest', label: 'Chci pochopit investování', path: ['slozene-uroceni', 'riziko', 'akcie-etf', 'inflace', 'dane-dip'] },
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
      <section className="ui-panel ak-path" aria-label="Kde začít">
        <div className="ak-path__intro">
          <h2 className="ui-h3">Nevíš, kde začít?</h2>
          <p className="ak-path__lead">
            Vyber, co tě nejvíc vystihuje, a poskládám ti pořadí témat. Ostatní zůstanou přístupná.
          </p>
        </div>
        <div className="ak-path__profiles">
          {PROFILES.map(p => (
            <button key={p.id} type="button" className="btn ak-path__profile" onClick={() => pick(p.id)}>
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
  const doneCount = profile.path.filter(id => completed.has(id)).length;

  return (
    <section className="ui-panel ak-path ak-path--chosen" aria-label="Tvoje doporučená cesta">
      <div className="ak-path__head">
        <div>
          <h2 className="ui-h3">{allDone ? 'Celou cestu máš za sebou' : `Tvoje cesta: ${profile.label.toLowerCase()}`}</h2>
          <p className="ak-path__lead num">
            {allDone
              ? 'Vyber si další témata níže, nebo zkus jinou cestu.'
              : `Hotovo ${doneCount} z ${profile.path.length}. Témata můžeš brát i v jiném pořadí.`}
            {' '}
            <button type="button" className="text-link" onClick={reset}>Změnit</button>
          </p>
        </div>
        {!allDone && (
          <button type="button" className="btn btn--primary" onClick={() => onOpenTopic(next)}>
            {completed.has(profile.path[0]) ? 'Pokračovat' : 'Začít'}: {titleOf(next)}
          </button>
        )}
      </div>

      <ol className="ak-path__steps">
        {profile.path.map((id, i) => {
          const isDone = completed.has(id);
          const isNext = id === next && !isDone;
          return (
            <li key={id}>
              <button
                type="button"
                className={`ak-path__step${isDone ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}
                aria-current={isNext ? 'step' : undefined}
                onClick={() => onOpenTopic(id)}
              >
                <span className="ak-path__num num" aria-hidden="true">
                  {isDone ? <Icon name="check-circle" size={16} /> : i + 1}
                </span>
                <span>{titleOf(id)}</span>
                {isDone && <span className="sr-only">(hotovo)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
