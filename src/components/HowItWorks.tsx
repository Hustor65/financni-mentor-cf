import React from 'react';
import { Icon } from './Icon';

/**
 * HowItWorks — krátký onboarding „kde začít" pro nováčka (hlavně studenta).
 * Tři kroky, ať student hned ví, co tu má dělat, místo aby tápal.
 * Decentní panel nad seznamem témat.
 */

const STEPS: { icon: string; title: string; desc: string }[] = [
  { icon: 'book-open', title: 'Vyber si téma', desc: 'Začni Rozpočtem — nebo čímkoli, co tě zajímá. Klidně od úplných základů.' },
  { icon: 'calculator', title: 'Projdi teorii a zkus to', desc: 'Krátké vysvětlení, názorný graf a vlastní kalkulačka na vyzkoušení.' },
  { icon: 'graduation-cap', title: 'Otestuj se kvízem', desc: 'Na konci krátký kvíz — a sbírej svůj postup a odznaky.' },
];

interface Props {
  /** Volitelně: „radši se rovnou zeptat mentora" → přepne na chat. */
  onAskMentor?: () => void;
}

export const HowItWorks: React.FC<Props> = ({ onAskMentor }) => (
  <section
    className="glass-panel"
    aria-label="Jak to funguje"
    style={{ padding: 'var(--space-lg)' }}
  >
    <span className="eyebrow">Nový tady?</span>
    <p className="section-header" style={{ marginTop: 'var(--space-2xs)', marginBottom: 'var(--space-md)' }}>
      Jak to funguje
    </p>
    <ol
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
      }}
    >
      {STEPS.map((s, i) => (
        <li key={s.title} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
          <span
            aria-hidden="true"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--surface-2, #16242f)',
              border: '1px solid var(--border-1, rgba(120,180,210,0.18))',
              color: 'var(--lg-cyan-2, #4cc4e6)',
              flexShrink: 0,
            }}
          >
            <Icon name={s.icon} size={20} aria-hidden />
          </span>
          <div>
            <p style={{ fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
              <span style={{ color: 'var(--lg-cyan-2, #4cc4e6)' }}>{i + 1}.</span> {s.title}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', opacity: 0.7, lineHeight: 1.45 }}>
              {s.desc}
            </p>
          </div>
        </li>
      ))}
    </ol>
    {onAskMentor && (
      <button
        type="button"
        onClick={onAskMentor}
        style={{
          marginTop: 'var(--space-md)',
          background: 'transparent',
          border: 'none',
          color: 'var(--lg-cyan-2, #4cc4e6)',
          font: 'inherit',
          fontWeight: 600,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        Radši si jen popovídat? Zeptej se mentora →
      </button>
    )}
  </section>
);
