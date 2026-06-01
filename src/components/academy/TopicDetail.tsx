import React from 'react';
import { ACADEMY_LESSONS } from '../../data/knowledge';
import { TOPICS, INFLATION_QUIZ, PENSION_QUIZ } from '../../data/topics';
import type { QuizQuestion } from '../../data/topics';
import { TOPIC_THEORY, TOPIC_TOOL_LABEL } from '../../data/topicContent';
import { Quiz } from './Quiz';
import { Icon } from '../Icon';
import { CompoundInterestCalc } from '../calculators/CompoundInterestCalc';
import { GoalCalc } from '../calculators/GoalCalc';
import { PensionCalc } from '../calculators/PensionCalc';
import { TaxCalc } from '../calculators/TaxCalc';
import { StocksComparison, InflationTool, RiskProfile } from './TopicTools';

interface TopicDetailProps {
  topicId: string;
  onBack: () => void;
  onComplete?: (id: string) => void;
  onAskMentor?: (title: string) => void;
}

// Mapování témat na kvíz (1:1 s app.py _render_topic_module dispatch)
const TOPIC_QUIZ: Record<string, QuizQuestion[]> = {
  'slozene-uroceni': ACADEMY_LESSONS.find(l => l.id === 'proc-investovat')?.quiz ?? [],
  'akcie-etf': ACADEMY_LESSONS.find(l => l.id === 'akcie-dluhopisy-etf')?.quiz ?? [],
  'inflace': INFLATION_QUIZ,
  'duchod': PENSION_QUIZ,
  'dane-dip': ACADEMY_LESSONS.find(l => l.id === 'jak-zacit-cr')?.quiz ?? [],
  'riziko': ACADEMY_LESSONS.find(l => l.id === 'riziko-vynos-diverzifikace')?.quiz ?? [],
};

// ── Section label (ikona + text) ──
function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.9rem',
        color: '#E2E8F0',
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.05rem',
        fontWeight: 700,
      }}
    >
      <Icon name={icon} size={18} color="#3ab5e0" />
      <span>{label}</span>
    </div>
  );
}

export const TopicDetail: React.FC<TopicDetailProps> = ({ topicId, onBack, onComplete, onAskMentor }) => {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return null;

  const theory = TOPIC_THEORY[topicId] ?? [];
  const quizData = TOPIC_QUIZ[topicId] ?? [];
  const toolLabel = TOPIC_TOOL_LABEL[topicId];

  // Interaktivní nástroj dle tématu (1:1 dispatch z app.py)
  const renderTool = () => {
    switch (topicId) {
      case 'slozene-uroceni': return (<><CompoundInterestCalc /><div className="spacer-lg" /><GoalCalc /></>);
      case 'akcie-etf': return <StocksComparison />;
      case 'inflace': return <InflationTool />;
      case 'duchod': return <PensionCalc />;
      case 'dane-dip': return <TaxCalc />;
      case 'riziko': return <RiskProfile />;
      default: return null;
    }
  };
  const tool = renderTool();

  return (
    <div>
      {/* ← Zpět */}
      <button className="btn" onClick={onBack} style={{ marginBottom: '1.5rem' }}>
        ← Zpět na témata
      </button>

      {/* Nadpis tématu (1:1: ikona + titulek) */}
      <p
        className="section-header"
        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}
      >
        <Icon name={topic.icon} size={28} color="#3ab5e0" />
        {topic.title}
      </p>

      {/* ── TEORIE (3 karty, přesné texty z originálu) ── */}
      {theory.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel icon="book-open" label="Teorie" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {theory.map((b, i) => (
              <div key={i} className="glass-panel reveal" style={{ padding: '1rem 1.3rem', ['--reveal-i' as string]: i }}>
                <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#E2E8F0', fontSize: '0.95rem', margin: '0 0 0.3rem' }}>
                  {b.h}
                </p>
                <p style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.75, margin: 0 }}>
                  {b.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INTERAKTIVNÍ NÁSTROJ ── */}
      {tool && (
        <div style={{ marginBottom: '1.5rem' }}>
          {toolLabel && <SectionLabel icon={toolLabel.icon} label={toolLabel.label} />}
          <div className="glass-panel reveal" style={{ padding: '1.5rem' }}>
            {tool}
          </div>
        </div>
      )}

      {/* ── KVÍZ ── */}
      {quizData.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionLabel icon="circle-check" label="Ověřte si pochopení" />
          <div className="glass-panel--sunken reveal" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--glass-border)' }}>
            <Quiz questions={quizData} onComplete={() => onComplete?.(topicId)} />
          </div>
        </div>
      )}

      {/* ── Nerozumíte? → AI Mentor (1:1) ── */}
      <div
        className="glass-panel glass-panel--elevated reveal"
        style={{ padding: '0.9rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.7rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
      >
        <Icon name="message-circle" size={22} color="#3ab5e0" />
        <span style={{ color: '#94A3B8', fontSize: '0.88rem', lineHeight: 1.6, flex: 1, minWidth: '220px' }}>
          <strong style={{ color: '#E2E8F0' }}>Nerozumíte?</strong> Zeptejte se AI Mentora — vysvětlí
          vám téma vlastními slovy a zodpoví doplňující otázky.
        </span>
        {onAskMentor && (
          <button className="btn btn--primary" onClick={() => onAskMentor(topic.title)}>
            Zeptat se Mentora
          </button>
        )}
      </div>

      {/* ── Zpět dole (1:1) ── */}
      <div style={{ marginTop: '1.5rem' }}>
        <button className="btn btn--block" onClick={onBack}>
          ← Zpět na všechna témata
        </button>
      </div>
    </div>
  );
};
