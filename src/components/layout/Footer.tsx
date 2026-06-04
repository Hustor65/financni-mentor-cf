import React from 'react';
import { Icon } from '../Icon';
import { CONTENT_LAST_UPDATED } from '../../data/constants';

/** Non-clickable platform capabilities (display-only labels, NOT routed). */
const PLATFORM_ITEMS: { icon: string; label: string }[] = [
  { icon: 'message-circle', label: 'AI Mentor' },
  { icon: 'graduation-cap', label: 'Akademie' },
  { icon: 'bar-chart-3', label: 'Simulátor' },
  { icon: 'target', label: 'Profil investora' },
];

/** External resource links (open in a new tab). */
const RESOURCE_LINKS: { href: string; label: string }[] = [
  { href: 'https://www.cnb.cz/cs/dohled-financni-trh/ochrana-spotrebitele/', label: 'ČNB — Ochrana spotřebitele' },
  { href: 'https://www.investopedia.com/', label: 'Investopedia' },
  { href: 'https://www.portu.cz/magazin/', label: 'Portu Magazín' },
  { href: 'https://www.finance.cz/', label: 'Finance.cz' },
];

export const Footer: React.FC = () => (
  <footer className="site-footer">
    <div className="footer-inner">

      {/* ── Top: brand + structured link columns ── */}
      <div className="footer-top">

        {/* Brand block */}
        <div className="footer-brand">
          <div className="footer-brand-name">
            <span className="brand-dot" aria-hidden="true" /> Nachytej AI
          </div>
          <p className="footer-brand-desc">
            Edukativní AI platforma pro finanční gramotnost. Pomáháme lidem porozumět světu financí
            pomocí moderních technologií.
          </p>
          <span className="footer-edu-badge">
            <Icon name="sparkles" size={13} color="var(--lg-cyan-400)" aria-hidden />
            Vzdělávání, ne investiční doporučení
          </span>
        </div>

        {/* Link region */}
        <nav className="footer-links" aria-label="Patička">

          {/* Platforma — display-only labels (no routing) */}
          <div className="footer-col">
            <h4 className="footer-col__title">Platforma</h4>
            <ul className="footer-col__list">
              {PLATFORM_ITEMS.map(({ icon, label }) => (
                <li key={label}>
                  <span className="footer-item footer-item--static">
                    <Icon name={icon} size={14} className="footer-item__icon" aria-hidden />
                    <span className="footer-item__label">{label}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Zdroje — external links */}
          <div className="footer-col">
            <h4 className="footer-col__title">Zdroje</h4>
            <ul className="footer-col__list">
              {RESOURCE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    className="footer-item footer-item--link"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="footer-item__label">{label}</span>
                    <Icon name="arrow-right" size={13} className="footer-item__arrow" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontakt */}
          <div className="footer-col">
            <h4 className="footer-col__title">Kontakt</h4>
            <ul className="footer-col__list">
              <li>
                <a className="footer-item footer-item--link" href="mailto:jakub.simon65@gmail.com">
                  <Icon name="mail" size={14} className="footer-item__icon" aria-hidden />
                  <span className="footer-item__label">jakub.simon65@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>

        </nav>
      </div>

      {/* ── Disclaimer — elegant amber compliance note (slim left accent rule) ── */}
      <aside className="footer-disclaimer" role="note">
        <span className="footer-disclaimer__icon" aria-hidden="true">
          <Icon name="alert-triangle" size={18} />
        </span>
        <div className="footer-disclaimer__body">
          <p className="footer-disclaimer__lead">
            <strong>Není investiční doporučení.</strong>{' '}
            Obsah slouží výhradně ke vzdělávání a nepředstavuje investiční doporučení ani
            poradenství ve smyslu zákona č. 256/2004 Sb. Nezohledňuje tvoji osobní situaci.
          </p>
          <p>
            Investování s sebou nese riziko. Hodnota investice v čase kolísá a může klesnout
            i pod vloženou částku; minulé výnosy nezaručují budoucí. Vyšší očekávaný výnos
            znamená vyšší riziko. Před rozhodnutím zvaž konzultaci s poradcem
            s licencí ČNB. Metodiku a zdroje najdeš v sekci „Jak hlídáme přesnost“.
          </p>
        </div>
      </aside>

      {/* ── Bottom bar: trust chip + copyright + content freshness ── */}
      <div className="footer-bottom">
        <span className="footer-trust-chip">
          <Icon name="shield-check" size={13} color="var(--lg-cyan-400)" className="footer-trust-chip__icon" aria-hidden />
          Reference: ČNB — ochrana spotřebitele
        </span>
        <div className="footer-bottom__meta">
          <span className="footer-copy">© 2026 Nachytej AI. Všechna práva vyhrazena.</span>
          <span className="footer-copy footer-copy--dim">Obsah aktualizován: {CONTENT_LAST_UPDATED}</span>
        </div>
      </div>

    </div>
  </footer>
);
