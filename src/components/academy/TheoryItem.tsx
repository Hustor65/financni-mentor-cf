import React, { useId, useState } from 'react';
import type { TheoryCard } from '../../data/topicContent';
import { Icon } from '../Icon';

/**
 * TheoryItem — jedna teorie-karta s rozbalovacím vysvětlením („Číst více“).
 *
 * `p` je vždy viditelný náhled, `more[]` je delší pokračování, které se po
 * kliknutí plynule odhalí. Každá karta drží vlastní stav (rozbaleno/sbaleno),
 * takže se rozbalují nezávisle na sobě.
 *
 * Animace = „CSS grid trick“ (grid-template-rows 0fr → 1fr) — funguje napříč
 * prohlížeči, bez JS výpočtů výšky a bez knihovny. Panel zůstává v DOM
 * (žádné display:none/hidden), jen se vizuálně sbalí — kvůli přístupnosti.
 */
export const TheoryItem: React.FC<{ card: TheoryCard; index: number }> = ({ card, index }) => {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const hasMore = (card.more?.length ?? 0) > 0;

  return (
    <div className="glass-panel reveal" style={{ padding: '1rem 1.3rem', ['--reveal-i' as string]: index }}>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#E2E8F0', fontSize: '0.95rem', margin: '0 0 0.3rem' }}>
        {card.h}
      </p>
      <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.75, margin: 0 }}>
        {card.p}
      </p>

      {hasMore && (
        <>
          {/* Rozbalovací panel — grid trick (0fr ⇄ 1fr). Zůstává v DOM. */}
          <div className={`theory-more ${open ? 'is-open' : ''}`} id={bodyId} role="region" aria-hidden={!open}>
            <div className="theory-more__inner">
              {card.more!.map((para, i) => (
                <p key={i} className="theory-more__p">
                  {para}
                </p>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="theory-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(o => !o)}
          >
            <span>{open ? 'Méně' : 'Číst více'}</span>
            <Icon
              name="chevron-down"
              size={16}
              aria-hidden
              className={`theory-toggle__chevron ${open ? 'is-open' : ''}`}
            />
          </button>
        </>
      )}
    </div>
  );
};
