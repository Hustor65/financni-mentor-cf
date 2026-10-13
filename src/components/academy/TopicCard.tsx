import React from 'react';
import type { Topic } from '../../data/topics';
import { Icon } from '../Icon';

interface TopicCardProps {
  topic: Topic;
  onClick: (id: string) => void;
  completed?: boolean;
  /** doporučené další téma (první nedokončené na dané úrovni) */
  start?: boolean;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onClick, completed, start }) => (
  <button
    type="button"
    className={`ak-card${completed ? ' is-done' : ''}${start ? ' is-next' : ''}`}
    onClick={() => onClick(topic.id)}
  >
    <span className="ak-card__icon"><Icon name={topic.icon} size={22} aria-hidden /></span>
    <span className="ak-card__body">
      <span className="ak-card__title">{topic.title}</span>
      <span className="ak-card__summary">{topic.summary}</span>
    </span>
    {completed ? (
      <span className="ak-card__state is-done"><Icon name="check-circle" size={16} aria-hidden /> Hotovo</span>
    ) : start ? (
      <span className="ak-card__state is-next">Další na řadě <Icon name="arrow-right" size={16} aria-hidden /></span>
    ) : null}
  </button>
);
