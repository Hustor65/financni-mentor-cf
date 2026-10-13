import { useId, useState } from 'react';
import type { QuizQuestion } from '../../data/topics';

interface QuizProps {
  questions: QuizQuestion[];
  onComplete?: () => void;
}

// 1 otázku, 2–4 otázky, 5+ otázek
const otazky = (n: number) => (n === 1 ? 'otázku' : n >= 2 && n <= 4 ? 'otázky' : 'otázek');

export const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  // answers[i] = selected option index, or null if not answered yet
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();

  // prázdný kvíz by se po „Vyhodnotit“ sám označil za 100% zvládnutý (0===0) a zavolal
  // onComplete bez jediné odpovědi → defenzivně nic nevykresluj (L49)
  if (!questions.length) return null;

  const total = questions.length;
  // Téma se počítá jako zvládnuté (→ Znalostní Skóre), když trefíš většinu (~60 %).
  // Nechceme trestat za jednu chybu — klidně to jde zkoušet víckrát.
  const need = Math.ceil(total * 0.6);

  const handleSelect = (qi: number, optIdx: number) => {
    if (submitted) return;
    setAnswers(prev => {
      const next = [...prev];
      next[qi] = optIdx;
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
    if (correctCount >= need) onComplete?.();
  };

  const handleRetry = () => {
    setAnswers(questions.map(() => null));
    setSubmitted(false);
  };

  const correct = submitted ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const missing = answers.filter(a => a === null).length;
  const passed = correct >= need;

  const feedback = !submitted
    ? null
    : correct === total
      ? { title: 'Všechno správně', text: 'Téma máš hotové. Můžeš pokračovat dalším tématem.' }
      : passed
        ? { title: 'Téma máš hotové', text: 'U otázky, která nevyšla, si přečti vysvětlení. Pak můžeš pokračovat dalším tématem.' }
        : {
            title: correct > 0 ? 'Ještě to chce jeden pokus' : 'Tentokrát to nevyšlo',
            text: `Ke splnění potřebuješ aspoň ${need} z ${total}. Projdi si vysvětlení u otázek, případně se vrať k teorii, a zkus to znovu.`,
          };

  return (
    <div className="ak-quiz">
      <p className="ak-quiz__lead">
        Ke splnění stačí {need} z {total} správně. Zkoušet to můžeš, kolikrát chceš.
      </p>

      {questions.map((q, qi) => {
        const userAns = answers[qi];
        const labelId = `${uid}-q-${qi}`;
        const right = userAns === q.correct;
        return (
          <div key={qi} className="ak-quiz__q">
            <h3 className="ak-quiz__question" id={labelId}>
              <span className="ak-quiz__num num" aria-hidden="true">{qi + 1}</span>
              <span>{q.q}</span>
            </h3>

            <div className="ui-choices" role="radiogroup" aria-labelledby={labelId}>
              {q.options.map((opt, oi) => {
                const isSelected = userAns === oi;
                const isCorrect = oi === q.correct;
                let cls = 'ui-choice';
                if (submitted) {
                  cls += ' is-locked';
                  if (isCorrect) cls += ' is-correct';
                  else if (isSelected) cls += ' is-wrong';
                } else if (isSelected) cls += ' is-selected';

                return (
                  <label key={oi} className={cls}>
                    <input
                      type="radio"
                      name={`${uid}-q-${qi}`}
                      checked={isSelected}
                      onChange={() => handleSelect(qi, oi)}
                      disabled={submitted}
                    />
                    <span className="ak-quiz__opt">{opt}</span>
                    {submitted && isCorrect && <span className="ui-tag ui-tag--ok">Správně</span>}
                    {submitted && isSelected && !isCorrect && <span className="ui-tag ui-tag--danger">Tvoje odpověď</span>}
                  </label>
                );
              })}
            </div>

            {submitted && (
              <p className={`ui-note ${right ? 'ui-note--ok' : 'ui-note--danger'} ak-quiz__explain`}>
                <strong>{right ? 'Správně.' : 'Vedle.'}</strong> {q.explain}
              </p>
            )}
          </div>
        );
      })}

      <hr className="ui-divide" />

      {!submitted ? (
        <div className="ak-quiz__submit">
          <button type="button" className="btn btn--primary" onClick={handleSubmit} disabled={missing > 0}>
            Vyhodnotit odpovědi
          </button>
          <span className="ak-quiz__hint num" aria-live="polite">
            {missing > 0 ? `Zbývá odpovědět na ${missing} ${otazky(missing)}.` : 'Všechno zodpovězeno.'}
          </span>
        </div>
      ) : (
        <div className="ak-quiz__result" role="status" aria-live="polite">
          <p className={`ui-hero-num${passed ? ' is-passed' : ''}`}>
            <span className="ui-hero-num__label">Správné odpovědi</span>
            {correct} z {total}
          </p>
          <div className="ak-quiz__verdict">
            <p className="ui-h3">{feedback!.title}</p>
            <p className="ak-quiz__verdict-text">{feedback!.text}</p>
            <button type="button" className={`btn${passed ? '' : ' btn--primary'}`} onClick={handleRetry}>
              Zkusit znovu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
