import React from 'react';
import type { Topic } from '../../data/topics';
import { Icon } from '../Icon';

interface TopicCardProps {
  topic: Topic;
  onClick: (id: string) => void;
  completed?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onClick, completed }) => {
  const live = topic.status === 'live';
  return (
    <div
      className="glass-panel glass-panel--interactive topic-card"
      onClick={() => live && onClick(topic.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && live && onClick(topic.id)}
      aria-label={`Otevřít téma: ${topic.title}`}
      style={{ opacity: live ? 1 : 0.55, cursor: live ? 'pointer' : 'default' }}
    >
      {/* hlavička: ikona + (badge) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <Icon name={topic.icon} size={26} color={live ? '#3ab5e0' : '#475569'} />
        {completed ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--lg-green-500)', fontSize: '0.75rem', fontWeight: 700 }}>
            <Icon name="check-circle" size={15} color="var(--lg-green-500)" /> Hotovo
          </span>
        ) : live ? (
          <span style={{ color: '#3ab5e0', fontSize: '0.78rem', fontWeight: 600 }}>Otevřít →</span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>
            <Icon name="lock" size={13} color="#64748B" /> Brzy
          </span>
        )}
      </div>

      <div className="topic-card__title">{topic.title}</div>
      <div className="topic-card__summary">{topic.summary}</div>
    </div>
  );
};
