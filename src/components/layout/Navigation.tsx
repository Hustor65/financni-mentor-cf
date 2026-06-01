import React from 'react';
import { Icon } from '../Icon';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS: { id: string; label: string; icon: string; title: string }[] = [
  { id: 'mentor', label: 'Mentor', icon: 'message-circle', title: 'AI Chat' },
  { id: 'temata', label: 'Témata', icon: 'book-open', title: 'Vzdělávací moduly' },
  { id: 'presnost', label: 'Přesnost & důvěra', icon: 'shield-check', title: 'Metodika' },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => (
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
  </nav>
);
