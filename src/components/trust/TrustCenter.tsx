import React from 'react';
import { DATA_SOURCES, CONTENT_LAST_UPDATED } from '../../data/constants';
import { HallucinationDemo } from './HallucinationDemo';

export const TrustCenter: React.FC = () => (
  <div>
    {/* ── ČÁST 1: Interaktivní demo halucinace ── */}
    <HallucinationDemo />

    {/* ── ČÁST 2: Centrum důvěry ── */}
    <div className="spacer-xl" />

    <p className="section-header">Důvěra a metodika — bereme to vážně</p>
    <p className="section-desc">
      Ve financích je přesnost a transparentnost základ.
      Tady přesně vidíte, odkud bereme čísla a proč jsme nezávislí.
    </p>

    {/* Právní upozornění a rizika jsou v zápatí stránky — zde je už neopakujeme. */}

    {/* Nezávislost — plná šířka */}
    <div className="glass-panel glass-panel--elevated glass-panel--accent-green reveal" style={{ marginBottom: '1rem', ['--reveal-i' as string]: 0 }}>
      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          color: '#10B981',
          margin: '0 0 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem',
        }}
      >
        <span style={{ display: 'inline-flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        Nezávislost — učíme, neprodáváme
      </p>
      <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
        Nejsme napojení na žádného brokera ani fond a obsah nepíšeme proto, abychom vám prodali konkrétní produkt.
        Cílem je <strong style={{ color: '#E2E8F0' }}>nezávislé vzdělávání</strong> — žádné skryté provize za to,
        kam vás pošleme. Když zmíníme produkt, je to pro ilustraci, ne jako reklama.
      </p>
    </div>

    {/* Zdroje a metodika — plná šířka */}
    <div
      className="glass-panel glass-panel--sunken glass-panel--accent-cyan reveal"
      style={{ marginTop: '1rem', padding: '1.25rem 1.5rem', ['--reveal-i' as string]: 1 }}
    >
      <p
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          color: '#3ab5e0',
          margin: '0 0 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1rem',
        }}
      >
        <span style={{ display: 'inline-flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </span>
        Zdroje a metodika
      </p>

      <ul style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.9rem', paddingLeft: '1.1rem' }}>
        {DATA_SOURCES.map((ds) => (
          <li key={ds.name} style={{ marginBottom: '0.45rem' }}>
            <a
              href={ds.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3ab5e0', textDecoration: 'none', fontWeight: 600 }}
            >
              {ds.name}
            </a>
            <span style={{ color: '#64748B' }}> — {ds.use}</span>
          </li>
        ))}
      </ul>

      <p style={{ color: '#94A3B8', fontSize: '0.82rem', lineHeight: 1.7, margin: '0 0 0.6rem' }}>
        Číselné výpočty stojí na <strong style={{ color: '#E2E8F0' }}>exaktní matematice v Pythonu</strong>{' '}
        a oficiálních parametrech (ČNB, ČSSZ, ČSÚ) — žádné „tipování" jazykového modelu.
        Vzdělávací obsah průběžně revidujeme a aktualizujeme.
      </p>

      <p style={{ color: '#64748B', fontSize: '0.78rem', lineHeight: 1.6, margin: 0 }}>
        Našli jste nepřesnost? Napište na{' '}
        <a href="mailto:jakub.simon65@gmail.com" style={{ color: '#3ab5e0', textDecoration: 'none' }}>
          jakub.simon65@gmail.com
        </a>{' '}
        — opravu zveřejníme. &nbsp;·&nbsp; Obsah naposledy aktualizován:{' '}
        <strong style={{ color: '#94A3B8' }}>{CONTENT_LAST_UPDATED}</strong>.
      </p>
    </div>
  </div>
);
