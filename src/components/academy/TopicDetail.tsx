import React from 'react';
import { ACADEMY_LESSONS } from '../../data/knowledge';
import { TOPICS, ROZPOCET_QUIZ, SCAMY_QUIZ, BRIGADA_QUIZ, DLUHY_QUIZ, JAKNATO_QUIZ, INFLATION_QUIZ, PENSION_QUIZ, RIZIKO_CISLA_QUIZ, OCENENI_QUIZ, TECHNICKA_QUIZ, OPCE_QUIZ } from '../../data/topics';
import type { QuizQuestion } from '../../data/topics';
import { TOPIC_THEORY, TOPIC_TOOL_LABEL } from '../../data/topicContent';
import { Quiz } from './Quiz';
import { TheoryItem } from './TheoryItem';
import { Icon } from '../Icon';
import { CompoundInterestCalc } from '../calculators/CompoundInterestCalc';
import { GoalCalc } from '../calculators/GoalCalc';
import { PensionCalc } from '../calculators/PensionCalc';
import { TaxCalc } from '../calculators/TaxCalc';
import { StocksComparison, InflationTool, RiskProfile } from './TopicTools';
import { ScamCheck } from './ScamCheck';
import { DebtCheck } from './DebtCheck';
import { BudgetSim } from './BudgetSim';
import { OptionsLab } from '../lab/OptionsLab';
import { MonteCarloSim } from '../lab/MonteCarloSim';
import { DcfCalc } from '../lab/DcfCalc';

interface TopicDetailProps {
  topicId: string;
  onBack: () => void;
  onComplete?: (id: string) => void;
  onAskMentor?: (title: string) => void;
  /** otevře obrazovku Trhy (téma Čtení grafů) */
  onOpenMarket?: () => void;
}

// Mapování témat na kvíz (1:1 s app.py _render_topic_module dispatch)
const TOPIC_QUIZ: Record<string, QuizQuestion[]> = {
  'rozpocet': ROZPOCET_QUIZ,
  'scamy': SCAMY_QUIZ,
  'dane-brigada': BRIGADA_QUIZ,
  'dluhy': DLUHY_QUIZ,
  'jak-na-to': JAKNATO_QUIZ,
  'slozene-uroceni': ACADEMY_LESSONS.find(l => l.id === 'proc-investovat')?.quiz ?? [],
  'akcie-etf': ACADEMY_LESSONS.find(l => l.id === 'akcie-dluhopisy-etf')?.quiz ?? [],
  'inflace': INFLATION_QUIZ,
  'duchod': PENSION_QUIZ,
  'dane-dip': ACADEMY_LESSONS.find(l => l.id === 'jak-zacit-cr')?.quiz ?? [],
  'riziko': ACADEMY_LESSONS.find(l => l.id === 'riziko-vynos-diverzifikace')?.quiz ?? [],
  'riziko-v-cislech': RIZIKO_CISLA_QUIZ,
  'oceneni-akcii': OCENENI_QUIZ,
  'technicka-analyza': TECHNICKA_QUIZ,
  'opce': OPCE_QUIZ,
};

const SECTION = { theory: 'ak-teorie', tool: 'ak-nastroj', quiz: 'ak-kviz' } as const;

// Skok na část stránky. Kotvy v adrese použít nejde — hash patří směrování.
const jumpTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
};

export const TopicDetail: React.FC<TopicDetailProps> = ({ topicId, onBack, onComplete, onAskMentor, onOpenMarket }) => {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return null;

  const theory = TOPIC_THEORY[topicId] ?? [];
  const quizData = TOPIC_QUIZ[topicId] ?? [];
  const toolLabel = TOPIC_TOOL_LABEL[topicId];

  // další téma na stejné úrovni (v pořadí, v jakém jsou v Akademii)
  const levelTopics = TOPICS.filter(t => t.level === topic.level);
  const nextTopic = levelTopics[levelTopics.findIndex(t => t.id === topicId) + 1];

  // Interaktivní nástroj dle tématu (1:1 dispatch z app.py)
  const renderTool = () => {
    switch (topicId) {
      case 'rozpocet': return <BudgetSim />;
      case 'scamy': return <ScamCheck />;
      case 'dluhy': return <DebtCheck />;
      case 'slozene-uroceni': return (<><CompoundInterestCalc /><hr className="ui-divide" /><GoalCalc /></>);
      case 'akcie-etf': return <StocksComparison />;
      case 'inflace': return <InflationTool />;
      case 'duchod': return <PensionCalc />;
      case 'dane-dip': return <TaxCalc />;
      case 'riziko': return <RiskProfile />;
      case 'riziko-v-cislech': return <MonteCarloSim />;
      case 'oceneni-akcii': return <DcfCalc />;
      case 'opce': return <OptionsLab />;
      default: return null;
    }
  };
  const tool = renderTool();
  // Čtení grafů nemá vlastní nástroj — posílá do Trhů
  const marketTask = topicId === 'technicka-analyza';
  const hasTool = tool !== null || marketTask;

  const parts: { id: string; label: string }[] = [];
  if (theory.length > 0) parts.push({ id: SECTION.theory, label: 'Teorie' });
  if (hasTool) parts.push({ id: SECTION.tool, label: 'Vyzkoušej si' });
  if (quizData.length > 0) parts.push({ id: SECTION.quiz, label: 'Ověř si' });

  return (
    <article className="ak-topic">
      <button type="button" className="back-link" onClick={onBack}>
        <Icon name="arrow-right" size={16} aria-hidden className="ak-flip" />
        Akademie
      </button>

      <header className="page-head">
        <h1 className="page-title">{topic.title}</h1>
        <p className="page-lead">{topic.summary}</p>
      </header>

      {parts.length > 1 && (
        <nav className="ak-toc" aria-label="Na této stránce">
          <ol>
            {parts.map((p, i) => (
              <li key={p.id}>
                <button type="button" className="ak-toc__link" onClick={() => jumpTo(p.id)}>
                  <span className="ak-toc__num num" aria-hidden="true">{i + 1}</span>
                  {p.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* ── Teorie ── */}
      {theory.length > 0 && (
        <section className="ui-sec ak-sec" id={SECTION.theory} tabIndex={-1} aria-labelledby={`${SECTION.theory}-h`}>
          <h2 className="ui-sec__title" id={`${SECTION.theory}-h`}>Teorie</h2>
          <div className="ak-theory-list">
            {theory.map((b, i) => (
              <TheoryItem key={i} card={b} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Interaktivní nástroj: jeden panel, obsah dodává nástroj ── */}
      {hasTool && (
        <section className="ui-sec ak-sec" id={SECTION.tool} tabIndex={-1} aria-labelledby={`${SECTION.tool}-h`}>
          <h2 className="ui-sec__title" id={`${SECTION.tool}-h`}>{toolLabel?.label ?? 'Vyzkoušej si to'}</h2>
          {marketTask ? (
            <div className="ak-task">
              <p className="ui-prose">
                V Trzích si otevři libovolný titul, přepni na svíčky a zapínej postupně průměr 50,
                průměr 200, objem a RSI. Pod grafem se ti ke každému z nich objeví vysvětlení
                spočítané z aktuálních dat.
              </p>
              <button type="button" className="btn btn--primary" onClick={onOpenMarket}>Otevřít Trhy</button>
            </div>
          ) : (
            <div className="ui-panel ak-tool">{tool}</div>
          )}
        </section>
      )}

      {/* ── Kvíz ── */}
      {quizData.length > 0 && (
        <section className="ui-sec ak-sec" id={SECTION.quiz} tabIndex={-1} aria-labelledby={`${SECTION.quiz}-h`}>
          <h2 className="ui-sec__title" id={`${SECTION.quiz}-h`}>Ověř si, co víš</h2>
          <div className="ui-panel ak-quiz-panel">
            <Quiz key={topicId} questions={quizData} onComplete={() => onComplete?.(topicId)} />
          </div>
        </section>
      )}

      {/* ── Co dál ── */}
      <footer className="ak-foot">
        <div className="ak-foot__ask">
          <p className="ak-foot__text">
            <strong>Něco ti není jasné?</strong> Mentor ti téma vysvětlí jinými slovy a odpoví na doplňující otázky.
          </p>
          {onAskMentor && (
            <button type="button" className="btn" onClick={() => onAskMentor(topic.title)}>
              Zeptat se mentora
            </button>
          )}
        </div>
        <div className="ak-foot__nav">
          <button type="button" className="text-link" onClick={onBack}>Všechna témata</button>
          {nextTopic && (
            <a className="ak-foot__next" href={`#akademie/${nextTopic.id}`}>
              <span className="ak-foot__next-label">Další téma</span>
              <span className="ak-foot__next-title">
                {nextTopic.title}
                <Icon name="arrow-right" size={18} aria-hidden />
              </span>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
};
