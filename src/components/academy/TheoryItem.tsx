import React, { useId, useState } from 'react';
import type { TheoryCard } from '../../data/topicContent';
import { Icon } from '../Icon';

/**
 * TheoryItem — jeden oddíl teorie s rozbalovacím vysvětlením („Číst více“).
 *
 * `p` je vždy viditelný úvod, `more[]` je delší pokračování, které se po
 * kliknutí odhalí na místě. Každý oddíl drží vlastní stav, takže se rozbalují
 * nezávisle na sobě.
 *
 * Animace = „CSS grid trick“ (grid-template-rows 0fr → 1fr) — bez JS výpočtů
 * výšky. Panel zůstává v DOM, jen se vizuálně sbalí.
 */
export const TheoryItem: React.FC<{ card: TheoryCard; index: number }> = ({ card, index }) => {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const hasMore = (card.more?.length ?? 0) > 0;

  return (
    <article className="ak-theory" data-index={index}>
      <h3 className="ak-theory__title">{card.h}</h3>
      <div className="ui-prose ak-theory__body">
        <p>{card.p}</p>

        {hasMore && (
          <>
            <div className={`ak-more${open ? ' is-open' : ''}`} id={bodyId} role="region" aria-hidden={!open}>
              <div className="ak-more__inner">
                {card.more!.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </div>

            <button
              type="button"
              className="ak-more__toggle"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen(o => !o)}
            >
              <span>{open ? 'Sbalit' : 'Číst více'}</span>
              <Icon name="chevron-down" size={16} aria-hidden className={`ak-more__chevron${open ? ' is-open' : ''}`} />
            </button>
          </>
        )}
      </div>
    </article>
  );
};
