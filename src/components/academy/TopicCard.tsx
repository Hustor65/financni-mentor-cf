import React from 'react';
import type { Topic } from '../../data/topics';
import { Icon } from '../Icon';

interface TopicCardProps {
  topic: Topic;
  onClick: (id: string) => void;
  completed?: boolean;
  /** doporučené další téma (první nedokončené na dané úrovni) */
  start?: boolean;
  /** získané body a maximum za hry v tématu */
  points: number;
  max: number;
}

export const TopicCard: React.FC<TopicCardProps> = ({ topic, onClick, completed, start, points, max }) => (
  <button
    type="button"
    className={`ak-card${completed ? ' is-done' : ''}${start ? ' is-next' : ''}`}
    onClick={() => onClick(topic.id)}
  >
    <span className="ak-card__icon"><Icon name={topic.icon} size={22} aria-hidden /></span>
    <span className="ak-card__body">
      <span className="ak-card__title">{topic.title}</span>
      <span className="ak-card__summary">{topic.summary}</span>
      <span className="ak-card__points num">
        <span className="ui-progress" aria-hidden="true"><span style={{ width: `${(points / max) * 100}%` }} /></span>
        {points} z {max} bodů
      </span>
    </span>
    {completed ? (
      <span className="ak-card__state is-done"><Icon name="check-circle" size={16} aria-hidden /> Hotovo</span>
    ) : start ? (
      <span className="ak-card__state is-next">Další na řadě <Icon name="arrow-right" size={16} aria-hidden /></span>
    ) : null}
  </button>
);
