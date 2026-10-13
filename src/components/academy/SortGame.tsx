import { useState } from 'react';
import type { SortSet } from '../../data/play';
import { body } from '../../data/play';
import { PLAY_MAX, recordScore } from '../../utils/store';

/**
 * SortGame — třídění tvrzení do dvou hromádek. Kartičky jdou po jedné,
 * po každé volbě se hned ukáže, kam patřila a proč.
 */
export const SortGame: React.FC<{ topicId: string; set: SortSet }> = ({ topicId, set }) => {
  const total = set.cards.length;
  // picks[i] = zvolená strana u i-té kartičky
  const [picks, setPicks] = useState<(0 | 1)[]>([]);
  const [index, setIndex] = useState(0);

  const finished = index >= total;
  const card = set.cards[index];
  const pick = picks[index];
  const answered = pick !== undefined;
  const hits = picks.filter((p, i) => p === set.cards[i].side).length;
  const points = Math.round((hits / total) * PLAY_MAX.sort);

  const choose = (side: 0 | 1) => {
    if (answered) return;
    setPicks(prev => [...prev, side]);
  };
  const next = () => {
    if (index + 1 >= total) recordScore(topicId, 'sort', points);
    setIndex(index + 1);
  };
  const restart = () => { setPicks([]); setIndex(0); };

  if (finished) {
    return (
      <div className="ak-play__result" role="status" aria-live="polite">
        <p className={`ui-hero-num${hits === total ? ' is-passed' : ''}`}>
          <span className="ui-hero-num__label">Správně zařazeno</span>
          {hits} z {total}
        </p>
        <div className="ak-play__verdict">
          <p className="ui-h3">+{points} {body(points)}</p>
          <p className="ak-play__verdict-text">
            {hits === total
              ? 'Všechno sedí. Pokračuj ke kvízu.'
              : 'Počítá se nejlepší pokus, takže si to klidně dej znovu.'}
          </p>
          <button type="button" className="btn" onClick={restart}>Hrát znovu</button>
        </div>
      </div>
    );
  }

  const right = answered && pick === card.side;

  return (
    <div className="ak-sort">
      <p className="ak-play__lead">{set.lead}</p>
      <Pips total={total} index={index} marks={picks.map((p, i) => p === set.cards[i].side)} />

      <p className="ak-sort__card" key={index}>{card.text}</p>

      <div className="ak-sort__sides">
        {set.sides.map((label, i) => {
          const side = i as 0 | 1;
          let cls = 'btn ak-sort__side';
          if (answered && side === card.side) cls += ' is-correct';
          else if (answered && side === pick) cls += ' is-wrong';
          return (
            <button
              key={label} type="button" className={cls}
              aria-disabled={answered} aria-pressed={answered ? side === pick : undefined}
              onClick={() => choose(side)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="ak-play__feedback" role="status" aria-live="polite">
        {answered && (
          <>
            <p className={`ui-note ${right ? 'ui-note--ok' : 'ui-note--danger'}`}>
              <strong>{right ? 'Správně.' : `Vedle, patří to pod „${set.sides[card.side]}“.`}</strong> {card.why}
            </p>
            <button type="button" className="btn btn--primary" onClick={next} autoFocus>
              {index + 1 >= total ? 'Vyhodnotit' : 'Další kartička'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/** Tečky postupu: hotové kroky se obarví podle výsledku, aktuální je zvýrazněný. */
export const Pips: React.FC<{ total: number; index: number; marks: boolean[] }> = ({ total, index, marks }) => (
  <div className="ak-pips">
    <span className="ui-steps">{Math.min(index + 1, total)} / {total}</span>
    <span className="ak-pips__row" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`ak-pip${i === index ? ' is-now' : ''}${marks[i] === true ? ' is-ok' : marks[i] === false ? ' is-miss' : ''}`}
        />
      ))}
    </span>
  </div>
);
