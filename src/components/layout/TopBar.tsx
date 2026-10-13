import { useEffect, useState } from 'react';
import { Icon } from '../Icon';
import { Segmented } from '../Segmented';
import { LEVELS } from '../../data/levels';
import type { Level } from '../../data/levels';
import { NAV } from '../../data/nav';
import type { TabId } from '../../data/nav';
import { useAccount } from '../../utils/account';

// Nápověda klávesové zkratky: ⌘K na Macu, Ctrl K jinde, na dotykových zařízeních žádná
// (není tam klávesnice, na které by se dala zmáčknout).
const CMDK_HINT: string | null = (() => {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return null;
  if (window.matchMedia?.('(hover: none), (pointer: coarse)').matches) return null;
  return /mac/i.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';
})();

interface Props {
  active: TabId;
  onNavigate: (tab: TabId) => void;
  level: Level;
  onLevelChange: (level: Level) => void;
  onOpenCommand: () => void;
  onOpenAccount: () => void;
}

export const TopBar: React.FC<Props> = ({ active, onNavigate, level, onLevelChange, onOpenCommand, onOpenAccount }) => {
  const { user } = useAccount();
  // nad hero je lišta průhledná, po odscrollování (a na ostatních stránkách) plná
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const solid = scrolled || active !== 'prehled';

  const link = (item: (typeof NAV)[number], withIcon: boolean) => (
    <a
      key={item.id}
      href={item.id === 'prehled' ? '#' : `#${item.id}`}
      className="topnav__link"
      aria-current={active === item.id ? 'page' : undefined}
      onClick={e => { e.preventDefault(); onNavigate(item.id); }}
    >
      {withIcon && <Icon name={item.icon} size={22} aria-hidden />}
      <span>{item.label}</span>
    </a>
  );

  return (
    <>
      <header className={`topbar sh-bar${solid ? ' is-solid' : ''}`}>
        <a href="#" className="brand" onClick={e => { e.preventDefault(); onNavigate('prehled'); }}>
          <svg className="brand__mark" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <rect width="26" height="26" rx="6" fill="var(--accent)" />
            <path d="M6 17.5 11 12l3.5 3L20 8.5" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Finanční mentor</span>
        </a>

        <nav className="topnav" aria-label="Hlavní navigace">
          {NAV.slice(1).map(item => link(item, false))}
        </nav>

        <div className="topbar__tools">
          <Segmented
            label="Tvoje úroveň" value={level} size="sm"
            options={LEVELS.map(l => ({ value: l.id, label: l.label }))}
            onChange={v => onLevelChange(v as Level)}
          />
          <button type="button" className="topbar__search" onClick={onOpenCommand} aria-label="Otevřít hledání">
            <Icon name="search" size={17} aria-hidden />
            <span>Hledat</span>
            {CMDK_HINT && <kbd>{CMDK_HINT}</kbd>}
          </button>
          <button
            type="button" className={`topbar__account${user ? ' is-in' : ''}`} onClick={onOpenAccount}
            aria-label={user ? `Účet ${user.name}` : 'Přihlásit se nebo vytvořit účet'}
          >
            <Icon name="user" size={17} aria-hidden />
            <span>{user ? user.name : 'Účet'}</span>
          </button>
        </div>
      </header>

      {/* telefon: hlavní sekce dole po ruce */}
      <nav className="bottomnav sh-tabs" aria-label="Hlavní navigace dole">
        {NAV.slice(0, 5).map(item => link(item, true))}
      </nav>
    </>
  );
};
