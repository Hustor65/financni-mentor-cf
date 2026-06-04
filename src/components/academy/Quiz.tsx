import { useState } from 'react';
import type { QuizQuestion } from '../../data/topics';
import { Icon } from '../Icon';

interface QuizProps {
  questions: QuizQuestion[];
  onComplete?: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  // answers[i] = selected option index, or null if not answered yet
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  // prázdný kvíz by se po „Vyhodnotit“ sám označil za 100% zvládnutý (0===0) a zavolal
  // onComplete bez jediné odpovědi → defenzivně nic nevykresluj (L49)
  if (!questions.length) return null;

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
    // Téma se počítá jako zvládnuté (→ Znalostní Skóre), když trefíš většinu (~60 %).
    // Nechceme trestat za jednu chybu — klidně to jde zkoušet víckrát.
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
    if (correctCount >= Math.ceil(questions.length * 0.6)) onComplete?.();
  };

  const correct = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0;
  const total = questions.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // feedback: ikona + text (SVG místo emoji). Práh „zvládnuto“ je ~60 %, takže
  // od 60 % už chválíme; pod prahem jen povzbudíme, ať to zkusí znovu.
  const feedback = submitted
    ? pct === 100
      ? { icon: 'circle-check', text: `Výborně! ${correct}/${total} správně (${pct} %)`, color: 'var(--lg-green-500)' }
      : pct >= 60
        ? { icon: 'target', text: `Hezky! Téma máš zvládnuté. ${correct}/${total} správně (${pct} %)`, color: 'var(--lg-green-500)' }
        : { icon: 'book-open', text: `Skoro! Zkus to ještě jednou. ${correct}/${total} správně (${pct} %)`, color: 'var(--text-secondary)' }
    : null;

  return (
    <div>
      {/* Section label — eyebrow style */}
      <div className="eyebrow eyebrow--cyan" style={{ marginBottom: '0.75rem' }}>
        <Icon name="circle-check" size={15} color="var(--lg-cyan-400)" />
        <span>Ověř si pochopení</span>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
        Stačí, když odpovíš správně na většinu — klidně to zkoušej víckrát.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((q, qi) => {
          const userAns = answers[qi];
          return (
            <div key={qi}>
              {/* Question */}
              <div
                id={`quiz-q-${qi}-label`}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  color: 'var(--text-primary)',
                  marginBottom: '0.75rem',
                  lineHeight: 1.5,
                }}
              >
                {qi + 1}. {q.q}
              </div>

              {/* Options */}
              <div role="radiogroup" aria-labelledby={`quiz-q-${qi}-label`} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {q.options.map((opt, oi) => {
                  let cls = 'quiz-option';
                  const isSelected = userAns === oi;
                  const isCorrect = oi === q.correct;

                  if (submitted && isCorrect) cls += ' quiz-option--correct';
                  else if (submitted && isSelected && !isCorrect) cls += ' quiz-option--wrong';

                  return (
                    <label
                      key={oi}
                      className={cls}
                      style={{
                        cursor: submitted ? 'default' : 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="radio"
                        name={`quiz-q-${qi}`}
                        checked={isSelected}
                        onChange={() => handleSelect(qi, oi)}
                        disabled={submitted}
                        style={{
                          accentColor: 'var(--lg-cyan-500)',
                          width: '16px',
                          height: '16px',
                          flexShrink: 0,
                          cursor: submitted ? 'default' : 'pointer',
                        }}
                      />
                      <span style={{ flex: 1 }}>{opt}</span>
                      {submitted && isCorrect && (
                        <Icon name="check-circle" size={17} color="var(--lg-green-500)" />
                      )}
                      {submitted && isSelected && !isCorrect && (
                        <Icon name="alert-triangle" size={16} color="#ef4444" />
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Per-question explanation after submit */}
              {submitted && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    borderLeft: `3px solid ${answers[qi] === q.correct ? 'var(--lg-green-500)' : '#ef4444'}`,
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(148,163,184,0.04)',
                    borderRadius: '0 4px 4px 0',
                  }}
                >
                  <span style={{ marginTop: '1px', flexShrink: 0 }}>
                    <Icon
                      name={answers[qi] === q.correct ? 'check-circle' : 'alert-triangle'}
                      size={15}
                      color={answers[qi] === q.correct ? 'var(--lg-green-500)' : '#ef4444'}
                    />
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', lineHeight: 1.55 }}>
                    {answers[qi] === q.correct ? 'Správně:' : 'Správná odpověď:'} <strong style={{ color: 'var(--text-primary)' }}>{q.options[q.correct]}</strong> — {q.explain}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit / Score */}
      {!submitted ? (
        <button
          className="btn btn--primary btn--block"
          style={{ marginTop: '1.5rem' }}
          onClick={handleSubmit}
          disabled={answers.some(a => a === null)}
        >
          Vyhodnotit kvíz
        </button>
      ) : (
        <div
          className="glass-panel--elevated"
          role="status"
          aria-live="polite"
          style={{
            marginTop: '1.5rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            fontWeight: 700,
            fontSize: '1rem',
            color: feedback!.color,
          }}
        >
          <Icon name={feedback!.icon} size={20} color={feedback!.color} />
          {feedback!.text}
        </div>
      )}
      {submitted && (
        <button
          className="btn btn--block"
          style={{ marginTop: '0.75rem' }}
          onClick={() => { setAnswers(questions.map(() => null)); setSubmitted(false); }}
        >
          Zkusit znovu
        </button>
      )}
    </div>
  );
};
