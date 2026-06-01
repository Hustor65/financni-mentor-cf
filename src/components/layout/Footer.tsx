import React from 'react';
import { CONTENT_LAST_UPDATED } from '../../data/constants';

export const Footer: React.FC = () => (
  <footer className="site-footer">
    <div className="footer-top">

      {/* Brand */}
      <div className="footer-brand">
        <div className="footer-brand-name">
          <span className="brand-dot" /> Nachytej AI
        </div>
        <p className="footer-brand-desc">
          Edukativní AI platforma pro finanční gramotnost. Pomáháme lidem porozumět světu financí
          pomocí moderních technologií.
        </p>
      </div>

      {/* Columns */}
      <div className="footer-links">

        {/* Platforma */}
        <div className="footer-col">
          <h4>Platforma</h4>
          <ul>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                AI Mentor
              </span>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Akademie
              </span>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Simulátor
              </span>
            </li>
            <li>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Profil investora
              </span>
            </li>
          </ul>
        </div>

        {/* Zdroje */}
        <div className="footer-col">
          <h4>Zdroje</h4>
          <ul>
            <li>
              <a href="https://www.cnb.cz/cs/dohled-financni-trh/ochrana-spotrebitele/" target="_blank" rel="noopener noreferrer">
                ČNB — Ochrana spotřebitele
              </a>
            </li>
            <li>
              <a href="https://www.investopedia.com/" target="_blank" rel="noopener noreferrer">
                Investopedia
              </a>
            </li>
            <li>
              <a href="https://www.portu.cz/magazin/" target="_blank" rel="noopener noreferrer">
                Portu Magazín
              </a>
            </li>
            <li>
              <a href="https://www.finance.cz/" target="_blank" rel="noopener noreferrer">
                Finance.cz
              </a>
            </li>
          </ul>
        </div>

        {/* Kontakt */}
        <div className="footer-col">
          <h4>Kontakt</h4>
          <ul>
            <li>
              <a href="mailto:jakub.simon65@gmail.com"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                jakub.simon65@gmail.com
              </a>
            </li>
          </ul>
        </div>

      </div>
    </div>

    {/* Disclaimer — prominent amber trust box */}
    <div className="footer-disclaimer" role="note">
      <span className="footer-disclaimer__icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </span>
      <div className="footer-disclaimer__body">
        <p className="footer-disclaimer__lead">
          <strong>Není investiční doporučení.</strong>{' '}
          Obsah slouží výhradně ke vzdělávání a nepředstavuje investiční doporučení ani
          poradenství ve smyslu zákona č. 256/2004 Sb. Nezohledňuje vaši osobní situaci.
        </p>
        <p>
          Investování s sebou nese riziko. Hodnota investice v čase kolísá a může klesnout
          i pod vloženou částku; minulé výnosy nezaručují budoucí. Vyšší očekávaný výnos
          znamená vyšší riziko. Před rozhodnutím zvažte konzultaci s poradcem
          s licencí ČNB. Metodiku a zdroje najdete v sekci „Jak hlídáme přesnost".
        </p>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="footer-bottom">
      <span className="footer-copy">© 2026 Nachytej AI. Všechna práva vyhrazena.</span>
      <span className="footer-copy" style={{ opacity: 0.7 }}>Obsah aktualizován: {CONTENT_LAST_UPDATED}</span>
    </div>
  </footer>
);
