import { TOPICS, TOPIC_GROUPS } from '../../data/topics';
import { LEVELS } from '../../data/levels';
import type { Level } from '../../data/levels';
import { Segmented } from '../Segmented';
import { TopicCard } from './TopicCard';
import { StartPath } from '../StartPath';
import { Glossary } from './Glossary';
import { ProductComparison } from './ProductComparison';
import { Badges } from './Badges';
import { body, rankOf, RANKS, topicMax } from '../../data/play';
import { topicPoints, totalPoints, useUserData } from '../../utils/store';

interface Props {
  level: Level;
  onLevelChange: (level: Level) => void;
  completed: Set<string>;
  onOpenTopic: (id: string) => void;
}

// česká pluralizace: 1 téma, 2–4 témata, 5+ témat
const temata = (n: number) => (n === 1 ? 'téma' : n >= 2 && n <= 4 ? 'témata' : 'témat');

export const Academy: React.FC<Props> = ({ level, onLevelChange, completed, onOpenTopic }) => {
  const groups = TOPIC_GROUPS.filter(g => g.level === level);
  const levelTopics = TOPICS.filter(t => t.level === level);
  const done = levelTopics.filter(t => completed.has(t.id)).length;
  const firstOpen = levelTopics.find(t => !completed.has(t.id))?.id;
  const pct = levelTopics.length ? Math.round((done / levelTopics.length) * 100) : 0;

  const { scores } = useUserData();
  const points = totalPoints(scores);
  const rank = rankOf(points);
  const toNext = rank.next ? rank.next.from - points : 0;
  const rankPct = rank.next
    ? ((points - rank.current.from) / (rank.next.from - rank.current.from)) * 100
    : 100;

  return (
    <div>
      <header className="page-head page-head--split">
        <div>
          <h1 className="page-title">Akademie</h1>
          <p className="page-lead">
Každé téma má krátkou teorii, hry na vyzkoušení a tři otázky na konec. Za hry sbíráš body.
            {' '}{LEVELS.find(l => l.id === level)!.lead}
          </p>
        </div>
        <div className="ak-level">
          <Segmented
            label="Úroveň" value={level} size="md"
            options={LEVELS.map(l => ({ value: l.id, label: l.label }))}
            onChange={v => onLevelChange(v as Level)}
          />
          <p className="ak-level__progress num">
            {done} z {levelTopics.length} {temata(levelTopics.length)} hotovo
          </p>
          <div className="ui-progress" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
        </div>
      </header>

      <section className="ak-rank" aria-label="Tvoje úroveň a body">
        <div className="ak-rank__main">
          <p className="ui-hero-num num">
            <span className="ui-hero-num__label">Úroveň {rank.index + 1} z {RANKS.length}: {rank.current.label}</span>
            {points} {body(points)}
          </p>
          <div className="ak-rank__next">
            <div
              className="ui-progress" role="progressbar" aria-label="Postup k další úrovni"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rankPct)}
            >
              <span style={{ width: `${rankPct}%` }} />
            </div>
            <p className="ak-rank__hint num">
              {rank.next
                ? `Do úrovně „${rank.next.label}“ ${toNext >= 2 && toNext <= 4 ? 'zbývají' : 'zbývá'} ${toNext} ${body(toNext)}.`
                : 'Máš nejvyšší úroveň.'}
            </p>
          </div>
        </div>
        <Badges completed={completed.size} />
      </section>

      {level === 'start' && <StartPath onOpenTopic={onOpenTopic} completed={completed} />}

      {groups.map(g => {
        const topics = TOPICS.filter(t => t.group === g.id);
        return (
          <section key={g.id} className="ui-sec ak-group">
            <h2 className="ui-sec__title">{g.title}</h2>
            <p className="ui-sec__lead">{g.lead}</p>
            <div className={`ak-cards${topics.length === 4 ? ' ak-cards--4' : ''}`}>
              {topics.map(topic => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onClick={onOpenTopic}
                  completed={completed.has(topic.id)}
                  start={topic.id === firstOpen}
                  points={topicPoints(scores[topic.id])}
                  max={topicMax(topic.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <Glossary />
      {level === 'start' && <ProductComparison />}
    </div>
  );
};
