import React from 'react';
import type { Topic } from '../../data/topics';
import { Icon } from '../Icon';

interface TopicCardProps {
  topic: Topic;
  onClick: (id: string) => void;
  completed?: boolean;
  /** „Začni tady" — doporučené první téma pro nováčka (student). */
  start?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onClick, completed, start }) => {
  const live = topic.status === 'live';
  return (
    <div
      className={`glass-panel glass-panel--interactive topic-card${completed ? ' topic-card--done' : ''}`}
      onClick={() => live && onClick(topic.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && live && onClick(topic.id)}
      aria-label={`Otevřít téma: ${topic.title}`}
      style={{ opacity: live ? 1 : 0.6, cursor: live ? 'pointer' : 'default' }}
    >
      {/* hlavička: ikona v akcentu + status mini-pill */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <Icon name={topic.icon} size={26} color={live ? '#3ab5e0' : '#556070'} />
        {completed ? (
          <span className="topic-pill topic-pill--done">
            <Icon name="check-circle" size={14} color="var(--lg-green-500)" /> Hotovo
          </span>
        ) : live ? (
          start ? (
            <span className="topic-pill topic-pill--open" style={{ background: 'var(--lg-cyan-2, #4cc4e6)', color: '#06141c', fontWeight: 700 }}>✨ Začni tady</span>
          ) : (
            <span className="topic-pill topic-pill--open">Otevřít →</span>
          )
        ) : (
          <span className="topic-pill topic-pill--soon">
            <Icon name="lock" size={12} color="var(--accent-trust)" /> Brzy
          </span>
        )}
      </div>

      <div className="topic-card__title">{topic.title}</div>
      <div className="topic-card__summary">{topic.summary}</div>
    </div>
  );
};
