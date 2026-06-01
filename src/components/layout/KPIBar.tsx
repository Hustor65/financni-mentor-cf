import React, { useEffect, useState } from 'react';
import { Icon } from '../Icon';

interface KPIBarProps {
  conversationCount: number;
  sessionStart: number;
  knowledgeScore: number;
  modelName: string;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return '1 min';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export const KPIBar: React.FC<KPIBarProps> = ({
  conversationCount, sessionStart, knowledgeScore, /* modelName intentionally unused */
}) => {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const update = () => setElapsedSec(Math.floor((Date.now() - sessionStart) / 1000));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [sessionStart]);

  return (
    <>
      {/* Nadpis řádku — návštěvník hned ví, že čísla níže jsou jeho osobní statistiky. */}
      <div className="kpi-section reveal" style={{ ['--reveal-i' as string]: 0 }}>
        <span className="eyebrow">Přehled relace</span>
        <p className="kpi-section-header">
          <Icon name="bar-chart-3" size={22} className="kpi-section-icon" aria-hidden={true} />
          <span>Vaše statistiky</span>
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>

      {/* KPI 1 — Konverzací */}
      <div className="kpi-card reveal" style={{ ['--reveal-i' as string]: 1 }}>
        <span className="kpi-icon" style={{ ['--icon-glow' as string]: 'rgba(58,181,224,0.4)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="#3ab5e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div className="kpi-value">{conversationCount}</div>
        <div className="kpi-label">Konverzací</div>
      </div>

      {/* KPI 2 — Délka Session */}
      <div className="kpi-card reveal" style={{ ['--reveal-i' as string]: 2 }}>
        <span className="kpi-icon" style={{ ['--icon-glow' as string]: 'rgba(245,158,11,0.4)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div className="kpi-value">{formatElapsed(elapsedSec)}</div>
        <div className="kpi-label">Délka Session</div>
      </div>

      {/* KPI 3 — Znalostní Skóre */}
      <div className="kpi-card reveal" style={{ ['--reveal-i' as string]: 3 }}>
        <span className="kpi-icon" style={{ ['--icon-glow' as string]: 'rgba(16,185,129,0.4)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        </span>
        <div className="kpi-value">{knowledgeScore}%</div>
        <div className="kpi-label">Znalostní Skóre</div>
      </div>

      {/* KPI 4 — AI Model Status */}
      <div className="kpi-card reveal" style={{ ['--reveal-i' as string]: 4 }}>
        <span className="kpi-icon" style={{ ['--icon-glow' as string]: 'rgba(139,92,246,0.4)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
            fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
          </svg>
        </span>
        <div className="kpi-value" style={{ fontSize: '1.5rem' }}>
          <span className="status-dot" />Online
        </div>
        <div className="kpi-label">AI Model Status</div>
      </div>

      </div>
    </>
  );
};
