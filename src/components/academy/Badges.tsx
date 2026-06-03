import { Icon } from '../Icon';

interface Milestone {
  need: number;
  icon: string;
  label: string;
  desc: string;
}

const MILESTONES: Milestone[] = [
  { need: 1, icon: 'sparkles', label: 'První krok', desc: 'Máte za sebou první téma' },
  { need: 3, icon: 'target', label: 'Základy zvládnuté', desc: 'Máte hotová 3 témata' },
  { need: 6, icon: 'graduation-cap', label: 'Finanční gramotnost', desc: 'Hotovo — prošli jste všechna témata!' },
];

// česká pluralizace témat: 1 = téma, 2–4 = témata, 5+ = témat (L70)
const pluralTemata = (n: number) => (n === 1 ? 'téma' : n >= 2 && n <= 4 ? 'témata' : 'témat');

/** Odznaky za pokrok ve studiu — vizuální milníky napojené na dokončená témata. */
export const Badges: React.FC<{ completed: number }> = ({ completed }) => (
  <div className="badges-row">
    {MILESTONES.map(m => {
      const earned = completed >= m.need;
      return (
        <div
          key={m.need}
          className={`badge${earned ? ' badge--earned' : ''}`}
          aria-label={`${earned ? 'Získaný odznak' : 'Zamčený odznak'}: ${m.label}. ${earned ? m.desc : `Zbývá ${m.need - completed} ${pluralTemata(m.need - completed)}`}`}
        >
          <span className="badge__icon">
            <Icon name={m.icon} size={22} color={earned ? 'var(--lg-green-500)' : '#475569'} />
          </span>
          <div>
            <div className="badge__label">{m.label}</div>
            <div className="badge__desc">{earned ? m.desc : `Zbývá ${m.need - completed} ${pluralTemata(m.need - completed)}`}</div>
          </div>
        </div>
      );
    })}
  </div>
);
