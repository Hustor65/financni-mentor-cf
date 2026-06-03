import React, { useRef } from 'react';
import { Icon } from '../Icon';

// label klávesové zkratky podle platformy (⌘K na Macu, jinak Ctrl K)
const CMDK_HINT =
  typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** otevře Command palette (Cmd/Ctrl+K) */
  onOpenCommand?: () => void;
}

const TABS: { id: string; label: string; icon: string; title: string }[] = [
  { id: 'mentor', label: 'Mentor', icon: 'message-circle', title: 'AI Chat' },
  { id: 'temata', label: 'Témata', icon: 'book-open', title: 'Vzdělávací moduly' },
  { id: 'presnost', label: 'Přesnost & důvěra', icon: 'shield-check', title: 'Metodika' },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onOpenCommand }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // APG Tabs pattern: šipky / Home / End přesunou fokus na sousední tab a rovnou
  // ho aktivují (automatická aktivace), s roving tabindexem. Doplňuje role="tab".
  const onTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const last = TABS.length - 1;
    let next: number;
    if (e.key === 'ArrowRight') next = idx === last ? 0 : idx + 1;
    else if (e.key === 'ArrowLeft') next = idx === 0 ? last : idx - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    onTabChange(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <nav className="nav-tabs" role="tablist" aria-label="Hlavní navigace">
      {TABS.map((tab, i) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[i] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            className={`nav-tab${active ? ' nav-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={e => onTabKeyDown(e, i)}
            title={tab.title}
          >
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </button>
        );
      })}
      {onOpenCommand && (
        <button
          type="button"
          className="nav-cmdk"
          onClick={onOpenCommand}
          title={`Rychlé hledání (${CMDK_HINT})`}
          aria-label="Otevřít rychlé hledání"
        >
          <span>Hledat</span>
          <kbd>{CMDK_HINT}</kbd>
        </button>
      )}
    </nav>
  );
};
