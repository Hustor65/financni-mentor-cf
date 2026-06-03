import React from 'react';
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

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onOpenCommand }) => (
  <nav className="nav-tabs" role="tablist" aria-label="Hlavní navigace">
    {TABS.map(tab => {
      const active = activeTab === tab.id;
      return (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={active}
          aria-controls={`panel-${tab.id}`}
          className={`nav-tab${active ? ' nav-tab--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
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
