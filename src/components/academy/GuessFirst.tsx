import { useId, useState } from 'react';
import type { Guess } from '../../data/play';
import { body } from '../../data/play';
import { PLAY_MAX, recordScore } from '../../utils/store';
import { kc, pct, yearsText } from '../calculators/shared';

/**
 * GuessFirst — „Tipni si“. Než se návštěvník pustí do teorie, odhadne na
 * posuvníku jedno číslo a hned uvidí, jak daleko byl. Omyl v odhadu je
 * nejlepší důvod číst dál, proto body dostane i ten, kdo se netrefí.
 */

const show = (v: number, unit: Guess['unit']): string => {
  if (unit === 'Kč') return kc(v);
  if (unit === '%') return pct(v, 0);
  if (unit === 'let') return yearsText(v);
  return `${v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}krát`;
};

/** Body podle toho, o kolik procent se odhad liší od výsledku. */
function grade(value: number, answer: number): { points: number; verdict: string } {
  const off = Math.abs(value - answer) / Math.max(Math.abs(answer), 1e-9);
  if (off <= 0.1) return { points: PLAY_MAX.tip, verdict: 'Skoro přesně' };
  if (off <= 0.25) return { points: 15, verdict: 'Hodně blízko' };
  if (off <= 0.5) return { points: 10, verdict: 'Řádově to sedí' };
  return { points: 5, verdict: 'Tohle překvapí skoro každého' };
}

export const GuessFirst: React.FC<{ topicId: string; guess: Guess }> = ({ topicId, guess }) => {
  const { min, max, step, answer, unit } = guess;
  // jezdec začíná na kraji: střed stupnice by sám napovídal
  const [value, setValue] = useState(min);
  const [touched, setTouched] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const id = useId();

  const result = grade(value, answer);
  const at = (v: number) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;

  const reveal = () => {
    setRevealed(true);
    recordScore(topicId, 'tip', result.points);
  };
  const retry = () => { setRevealed(false); setTouched(false); setValue(min); };

  return (
    <div className="ak-tip">
      <p className="ak-play__q" id={`${id}-q`}>{guess.q}</p>

      {!revealed ? (
        <>
          <p className="ui-hero-num ak-tip__value" aria-hidden="true">
            <span className="ui-hero-num__label">Tvůj odhad</span>
            {show(value, unit)}
          </p>
          <input
            type="range" className="ak-range" min={min} max={max} step={step} value={value}
            aria-labelledby={`${id}-q`} aria-valuetext={show(value, unit)}
            style={{ '--fill': at(value) } as React.CSSProperties}
            onChange={e => { setValue(Number(e.target.value)); setTouched(true); }}
          />
          <div className="ak-range__ends num" aria-hidden="true">
            <span>{show(min, unit)}</span>
            <span>{show(max, unit)}</span>
          </div>
          <div className="ak-play__actions">
            <button type="button" className="btn btn--primary" onClick={reveal} disabled={!touched}>
              Ukázat výsledek
            </button>
            {!touched && <span className="ak-play__hint">Nejdřív posuň jezdcem na svůj odhad.</span>}
          </div>
        </>
      ) : (
        <div role="status" aria-live="polite">
          <dl className="ui-kpis ak-tip__kpis">
            <div>
              <dt>Tvůj odhad</dt>
              <dd>{show(value, unit)}</dd>
            </div>
            <div>
              <dt>Správně</dt>
              <dd className="is-accent">{show(answer, unit)}</dd>
            </div>
            <div>
              <dt>{result.verdict}</dt>
              <dd>+{result.points} {body(result.points)}</dd>
            </div>
          </dl>
          {/* obě hodnoty na jedné ose, aby byl rozdíl vidět na první pohled */}
          <div className="ak-tip__axis" aria-hidden="true">
            <span className="ak-tip__mark ak-tip__mark--guess" style={{ left: at(value) }} />
            <span className="ak-tip__mark ak-tip__mark--answer" style={{ left: at(answer) }} />
          </div>
          <p className="ui-note ak-play__note">{guess.reveal}</p>
          <div className="ak-play__actions">
            <button type="button" className="btn" onClick={retry}>Zkusit jiný odhad</button>
          </div>
        </div>
      )}
    </div>
  );
};
