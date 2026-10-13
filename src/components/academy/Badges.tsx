import { Icon } from '../Icon';

interface Milestone {
  need: number;
  icon: string;
  label: string;
  desc: string;
}

const MILESTONES: Milestone[] = [
  { need: 1, icon: 'sparkles', label: 'První krok', desc: 'Máš za sebou první téma' },
  { need: 5, icon: 'target', label: 'Základy zvládnuté', desc: 'Máš hotových 5 témat' },
  { need: 15, icon: 'graduation-cap', label: 'Celá akademie', desc: 'Prošel jsi všech 15 témat' },
];

// česká pluralizace témat: 1 = téma, 2–4 = témata, 5+ = témat (L70)
const pluralTemata = (n: number) => (n === 1 ? 'téma' : n >= 2 && n <= 4 ? 'témata' : 'témat');

/** Odznaky za pokrok ve studiu — vizuální milníky napojené na dokončená témata. */
export const Badges: React.FC<{ completed: number }> = ({ completed }) => (
  <div className="ak-badges">
    {MILESTONES.map(m => {
      const earned = completed >= m.need;
      const desc = earned ? m.desc : `Zbývá ${m.need - completed} ${pluralTemata(m.need - completed)}`;
      return (
        <div
          key={m.need}
          className={`ak-badge${earned ? ' is-earned' : ''}`}
          aria-label={`${earned ? 'Získaný odznak' : 'Zamčený odznak'}: ${m.label}. ${desc}`}
        >
          <span className="ak-badge__icon"><Icon name={m.icon} size={22} aria-hidden /></span>
          <div>
            <div className="ak-badge__label">{m.label}</div>
            <div className="ak-badge__desc num">{desc}</div>
          </div>
        </div>
      );
    })}
  </div>
);
