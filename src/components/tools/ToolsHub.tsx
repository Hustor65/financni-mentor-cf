import { TOOLS } from './registry';
import { TOPICS } from '../../data/topics';
import { Icon } from '../Icon';
import type { Level } from '../../data/levels';

interface Props {
  level: Level;
  toolId: string | null;
  onOpenTool: (id: string | null) => void;
  onOpenTopic: (id: string) => void;
}

const GROUPS: { level: Level; title: string; own: string; other: string }[] = [
  {
    level: 'start',
    title: 'Základní kalkulačky a cvičení',
    own: 'Pro úroveň Začínám. Každý nástroj zabere pár minut a nic k němu nepotřebuješ.',
    other: 'Jednodušší nástroje na rychlý přepočet a procvičení základů.',
  },
  {
    level: 'pro',
    title: 'Pro pokročilé',
    own: 'Pro úroveň Už něco umím. Simulace a modely, které počítají s rizikem.',
    other: 'Na později, až budou základy sedět: simulace, opce a oceňování akcií.',
  },
];

/** druh nástroje — krátké slovo, podle kterého se v seznamu dá orientovat */
const KIND: Record<string, string> = {
  'odhadni-graf': 'Hra',
  rozpocet: 'Cvičení',
  podvod: 'Cvičení',
  dluh: 'Cvičení',
  'rizikovy-profil': 'Dotazník',
  portfolio: 'Simulace',
  opce: 'Simulace',
  'monte-carlo': 'Simulace',
};
const kindOf = (id: string) => KIND[id] ?? 'Kalkulačka';

export const ToolsHub: React.FC<Props> = ({ level, toolId, onOpenTool, onOpenTopic }) => {
  const tool = TOOLS.find(t => t.id === toolId);

  if (tool) {
    const topic = TOPICS.find(t => t.id === tool.topic);
    return (
      <div className="tl-page">
        <button type="button" className="back-link" onClick={() => onOpenTool(null)}>
          <Icon name="arrow-right" size={16} aria-hidden className="tl-back-icon" />
          Všechny nástroje
        </button>
        <header className="page-head">
          <h1 className="page-title tl-page__title">{tool.name}</h1>
          <p className="page-lead">{tool.lead}</p>
        </header>
        <div className="ui-panel tl-tool">{tool.render()}</div>
        {topic && (
          <p className="tl-related">
            Teorii k tomuhle nástroji najdeš v tématu{' '}
            <button type="button" className="text-link" onClick={() => onOpenTopic(topic.id)}>{topic.title}</button>.
          </p>
        )}
      </div>
    );
  }

  // úroveň návštěvníka jde první
  const groups = level === 'pro' ? [...GROUPS].reverse() : GROUPS;

  return (
    <div className="tl-hub">
      <header className="page-head">
        <h1 className="page-title">Nástroje</h1>
        <p className="page-lead">
          Kalkulačky a simulace, do kterých dosadíš vlastní čísla. Všechno se počítá u tebe v prohlížeči.
        </p>
      </header>
      {groups.map(g => {
        const tools = TOOLS.filter(t => t.level === g.level);
        const own = g.level === level;
        return (
          <section key={g.level} className={`ui-sec tl-group${own ? ' is-own' : ''}`}>
            <h2 className="ui-sec__title">{g.title}</h2>
            <p className="ui-sec__lead">{own ? g.own : g.other}</p>
            <ul className="tl-list">
              {tools.map(t => (
                <li key={t.id}>
                  <button type="button" className="tl-row" onClick={() => onOpenTool(t.id)}>
                    <span className="tl-row__icon"><Icon name={t.icon} size={20} aria-hidden /></span>
                    <span className="tl-row__name">{t.name}</span>
                    <span className="tl-row__lead">{t.lead}</span>
                    <span className="tl-row__kind">{kindOf(t.id)}</span>
                    <Icon name="arrow-right" size={18} aria-hidden className="tl-row__go" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
