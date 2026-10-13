import { useId, useState } from 'react';
import type { QuizQuestion } from '../../data/topics';
import { body } from '../../data/play';
import { PLAY_MAX } from '../../utils/store';
import { Pips } from './SortGame';

interface QuizProps {
  questions: QuizQuestion[];
  /** zavolá se, když návštěvník trefí aspoň potřebný počet otázek */
  onComplete?: () => void;
  /** výsledek dohraného kola v bodech */
  onScore?: (points: number) => void;
}

/** Kvíz po jedné otázce: po kliknutí se odpověď hned vyhodnotí a vysvětlí. */
export const Quiz: React.FC<QuizProps> = ({ questions, onComplete, onScore }) => {
  // answers[i] = zvolená možnost u i-té otázky
  const [answers, setAnswers] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const uid = useId();

  // prázdný kvíz by se sám označil za zvládnutý (0 z 0) → defenzivně nic nevykresluj (L49)
  if (!questions.length) return null;

  const total = questions.length;
  // Téma se počítá jako zvládnuté, když trefíš většinu (~60 %).
  // Nechceme trestat za jednu chybu — klidně to jde zkoušet víckrát.
  const need = Math.ceil(total * 0.6);
  const correct = answers.filter((a, i) => a === questions[i].correct).length;
  const points = Math.round((correct / total) * PLAY_MAX.quiz);
  const passed = correct >= need;

  const restart = () => { setAnswers([]); setIndex(0); };

  if (index >= total) {
    const feedback = correct === total
      ? { title: 'Všechno správně', text: 'Téma máš hotové. Můžeš pokračovat dalším tématem.' }
      : passed
        ? { title: 'Téma máš hotové', text: 'Plný počet bodů získáš, když kvíz projdeš bez chyby.' }
        : {
            title: correct > 0 ? 'Ještě to chce jeden pokus' : 'Tentokrát to nevyšlo',
            text: `Ke splnění potřebuješ aspoň ${need} z ${total}. Vrať se k teorii a zkus to znovu.`,
          };
    return (
      <div className="ak-play__result" role="status" aria-live="polite">
        <p className={`ui-hero-num${passed ? ' is-passed' : ''}`}>
          <span className="ui-hero-num__label">Správné odpovědi</span>
          {correct} z {total}
        </p>
        <div className="ak-play__verdict">
          <p className="ui-h3">{feedback.title} · +{points} {body(points)}</p>
          <p className="ak-play__verdict-text">{feedback.text}</p>
          <button type="button" className={`btn${passed ? '' : ' btn--primary'}`} onClick={restart}>
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const picked = answers[index];
  const answered = picked !== undefined;
  const right = picked === q.correct;
  const labelId = `${uid}-q`;

  const choose = (option: number) => {
    if (answered) return;
    setAnswers(prev => [...prev, option]);
  };
  const next = () => {
    if (index + 1 >= total) {
      onScore?.(points);
      if (passed) onComplete?.();
    }
    setIndex(index + 1);
  };

  return (
    <div className="ak-quiz">
      <p className="ak-play__lead">
        Ke splnění stačí {need} z {total} správně. Zkoušet to můžeš, kolikrát chceš.
      </p>
      <Pips total={total} index={index} marks={answers.map((a, i) => a === questions[i].correct)} />

      <h3 className="ak-quiz__question" id={labelId} key={index}>{q.q}</h3>

      <div className="ui-choices" role="group" aria-labelledby={labelId}>
        {q.options.map((opt, oi) => {
          const isPicked = picked === oi;
          const isCorrect = oi === q.correct;
          let cls = 'ui-choice';
          if (answered) {
            cls += ' is-locked';
            if (isCorrect) cls += ' is-correct';
            else if (isPicked) cls += ' is-wrong';
          }
          return (
            <button
              key={oi} type="button" className={cls}
              aria-disabled={answered} aria-pressed={answered ? isPicked : undefined}
              onClick={() => choose(oi)}
            >
              <span className="ui-choice__mark" aria-hidden="true">{'ABCD'[oi]}</span>
              <span className="ak-quiz__opt">{opt}</span>
              {answered && isCorrect && <span className="ui-tag ui-tag--ok">Správně</span>}
              {answered && isPicked && !isCorrect && <span className="ui-tag ui-tag--danger">Tvoje odpověď</span>}
            </button>
          );
        })}
      </div>

      <div className="ak-play__feedback" role="status" aria-live="polite">
        {answered && (
          <>
            <p className={`ui-note ${right ? 'ui-note--ok' : 'ui-note--danger'}`}>
              <strong>{right ? 'Správně.' : 'Vedle.'}</strong> {q.explain}
            </p>
            <button type="button" className="btn btn--primary" onClick={next} autoFocus>
              {index + 1 >= total ? 'Vyhodnotit' : 'Další otázka'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
