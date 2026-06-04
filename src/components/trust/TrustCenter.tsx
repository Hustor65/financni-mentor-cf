import React from 'react';
import { DATA_SOURCES, CONTENT_LAST_UPDATED } from '../../data/constants';
import { HallucinationDemo } from './HallucinationDemo';

export const TrustCenter: React.FC = () => (
  <div>
    {/* ── ČÁST 1: Interaktivní demo halucinace ── */}
    <HallucinationDemo />

    {/* ── ČÁST 2: Centrum důvěry ── */}
    <div style={{ height: 'var(--section-gap)' }} />

    <span className="eyebrow eyebrow--cyan">Přesnost a důvěra</span>
    <p className="section-header">Důvěra a metodika — bereme ji vážně</p>
    <p className="section-desc">
      Ve financích jsou přesnost a transparentnost základ.
      Tady jasně uvidíš, odkud bereme čísla a proč jsme nezávislí.
    </p>

    {/* Právní upozornění a rizika jsou v zápatí stránky — zde je už neopakujeme. */}

    {/* Nezávislost — editorial fact-box (levý zelený okraj) */}
    <div className="fact-box fact-box--green reveal" style={{ marginBottom: '1rem', ['--reveal-i' as string]: 0 }}>
      <p className="fact-box__title fact-box__title--green">
        <span style={{ display: 'inline-flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        Nezávislost — vzděláváme, neprodáváme
      </p>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, margin: 0 }}>
        Nejsme napojení na žádného brokera ani fond a obsah nepíšeme proto, abychom ti prodali konkrétní produkt.
        (Broker = firma, přes kterou nakupuješ a prodáváš cenné papíry.)
        Cílem je <strong style={{ color: '#FFFFFF' }}>nezávislé vzdělávání</strong> — žádné skryté provize za to,
        kam tě nasměrujeme. Když zmíníme konkrétní produkt, je to jen pro ilustraci, ne jako reklama.
      </p>
    </div>

    {/* Zdroje a metodika — editorial fact-box (levý azurový okraj) */}
    <div
      className="fact-box fact-box--cyan reveal"
      style={{ marginTop: '1rem', ['--reveal-i' as string]: 1 }}
    >
      <p className="fact-box__title fact-box__title--cyan">
        <span style={{ display: 'inline-flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </span>
        Zdroje a metodika
      </p>

      <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 0.9rem', paddingLeft: '1.1rem' }}>
        {DATA_SOURCES.map((ds) => (
          <li key={ds.name} style={{ marginBottom: '0.45rem' }}>
            <a
              href={ds.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--lg-cyan-400)', textDecoration: 'none', fontWeight: 600 }}
            >
              {ds.name}
            </a>
            <span style={{ color: 'var(--text-muted)' }}> — {ds.use}</span>
          </li>
        ))}
      </ul>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 0.6rem' }}>
        Číselné výpočty stojí na <strong style={{ color: '#FFFFFF' }}>přesné matematice</strong> (počítané v Pythonu){' '}
        a na oficiálních parametrech (ČNB, ČSSZ, ČSÚ) — žádné „tipování“ ze strany jazykového modelu.
        Vzdělávací obsah pravidelně kontrolujeme a aktualizujeme.
      </p>

      <p className="data-note" style={{ margin: 0 }}>
        Našel jsi nepřesnost? Napiš nám na{' '}
        <a href="mailto:jakub.simon65@gmail.com" style={{ color: 'var(--lg-cyan-400)', textDecoration: 'none' }}>
          jakub.simon65@gmail.com
        </a>{' '}
        — opravíme to a opravu zveřejníme. (Obsah naposledy aktualizován:{' '}
        <strong>{CONTENT_LAST_UPDATED}</strong>.)
      </p>
    </div>
  </div>
);
