import React from 'react';
import { CONTENT_LAST_UPDATED } from '../../data/constants';
import { NAV } from '../../data/nav';
import type { TabId } from '../../data/nav';

/** External resource links (open in a new tab). */
const RESOURCE_LINKS: { href: string; label: string }[] = [
  { href: 'https://www.cnb.cz/cs/dohled-financni-trh/ochrana-spotrebitele/', label: 'ČNB: ochrana spotřebitele' },
  { href: 'https://financnigramotnost.gov.cz/', label: 'Finanční gramotnost (MF ČR)' },
  { href: 'https://www.investopedia.com/', label: 'Investopedia' },
  { href: 'https://www.portu.cz/magazin/', label: 'Portu Magazín' },
];

export const Footer: React.FC<{ onNavigate: (tab: TabId) => void }> = ({ onNavigate }) => (
  <footer className="sh-foot">
    <div className="sh-foot__inner">
      <div className="sh-foot__main">
        <div className="sh-foot__about">
          <p className="sh-foot__brand">Finanční mentor</p>
          <p className="sh-foot__desc">
            Vzdělávací web o penězích a investování pro studenty i pro ty, kdo už investují.
            Nic neprodáváme a neradíme, kam dát peníze.
          </p>
        </div>

        <nav className="sh-foot__col" aria-label="Patička">
          <h2>Na webu</h2>
          <ul>
            {NAV.slice(1).map(item => (
              <li key={item.id}>
                <a href={`#${item.id}`} onClick={e => { e.preventDefault(); onNavigate(item.id); }}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sh-foot__col">
          <h2>Zdroje</h2>
          <ul>
            {RESOURCE_LINKS.map(({ href, label }) => (
              <li key={href}>
                <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="sh-foot__credit">
          <h2>Návrh a vývoj</h2>
          <a className="sh-foot__maker" href="https://simonweby.cz" target="_blank" rel="noopener noreferrer">simonweby.cz</a>
          <a className="sh-foot__mail" href="mailto:jakub.simon65@gmail.com">jakub.simon65@gmail.com</a>
        </div>
      </div>

      <p className="sh-foot__legal" role="note">
        <strong>Není investiční doporučení.</strong>{' '}
        Obsah slouží ke vzdělávání, není investičním doporučením ani poradenstvím podle zákona
        č. 256/2004 Sb. a nezohledňuje tvoji osobní situaci. Hodnota investice kolísá a může klesnout
        i pod vloženou částku; minulé výnosy nezaručují budoucí. U opcí a dalších derivátů můžeš přijít
        o celý vklad i o víc. Před rozhodnutím zvaž konzultaci s poradcem s licencí ČNB.
      </p>

      <p className="sh-foot__meta">
        <span>© 2026 Finanční mentor</span>
        <span>Tržní data: Yahoo Finance, zpožděná</span>
        <span>Obsah aktualizován {CONTENT_LAST_UPDATED}</span>
      </p>
    </div>
  </footer>
);
