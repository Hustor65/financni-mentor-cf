import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════════════
   ChatMermaid — renderer pro ```mermaid bloky: procesní diagramy,
   vztahy a koloběhy (např. cesta pokynu uživatel → broker → burza).
   Mermaid se stahuje lazy (dynamic import) až s prvním diagramem,
   stejně jako ECharts u grafů — nezatěžuje úvodní bundle.

   Pozn.: během streamu se `code` mění po každém chunku. Mermaid má
   globální stav a souběžné mermaid.render() se navzájem rozhodí
   (diagram pak zamrzne na placeholderu). Proto render DEBOUNCEujeme —
   spustí se až když se kód na chvíli ustálí → vždy jen jeden render.
   ════════════════════════════════════════════════════════════ */

let initialized = false; // mermaid.initialize stačí jednou za session
let seq = 0; // unikátní id pro každý render (mermaid.render ho vyžaduje)

const WRAP: React.CSSProperties = {
  margin: '0.85rem 0',
  padding: '0.9rem 0.6rem',
  borderRadius: '14px',
  background: 'rgba(11,22,41,0.35)',
  border: '1px solid rgba(58,181,224,0.18)',
  textAlign: 'center',
  overflowX: 'auto',
};

const PENDING: React.CSSProperties = {
  margin: '0.85rem 0',
  padding: '1.25rem',
  borderRadius: '14px',
  background: 'rgba(11,22,41,0.22)',
  border: '1px dashed rgba(148,163,184,0.25)',
  color: '#64748b',
  fontSize: '0.85rem',
  textAlign: 'center',
};

// Když se diagram nepodaří vykreslit, ukážeme radši jeho zdroj než věčný spinner.
const FALLBACK: React.CSSProperties = {
  margin: '0.85rem 0',
  padding: '0.85rem 1rem',
  borderRadius: '14px',
  background: 'rgba(11,22,41,0.35)',
  border: '1px solid rgba(148,163,184,0.18)',
  color: '#94a3b8',
  fontSize: '0.78rem',
  whiteSpace: 'pre-wrap',
  overflowX: 'auto',
  fontFamily: "'Space Grotesk', ui-monospace, monospace",
};

export const ChatMermaid: React.FC<{ code: string }> = ({ code }) => {
  const [state, setState] = useState<{ svg?: string; failed?: boolean }>({});
  const reqRef = useRef(0);

  useEffect(() => {
    const myReq = ++reqRef.current;
    let cancelled = false;
    // Počkej, až se kód ustálí (≈ konec streamu daného bloku), pak teprve renderuj.
    const timer = setTimeout(() => {
      (async () => {
        try {
          const mermaid = (await import('mermaid')).default;
          if (!initialized) {
            mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'strict', // popisky se escapují → bezpečné i s textem od uživatele
              theme: 'base',
              fontFamily: 'Inter, sans-serif',
              flowchart: { useMaxWidth: true, curve: 'basis' },
              themeVariables: {
                background: 'transparent',
                primaryColor: '#0e1d33',
                primaryBorderColor: '#3ab5e0',
                primaryTextColor: '#e2e8f0',
                lineColor: '#5fb8d6',
                secondaryColor: '#13241d',
                tertiaryColor: '#1a1330',
                textColor: '#cbd5e1',
                edgeLabelBackground: '#0b1629',
                fontFamily: 'Inter, sans-serif',
              },
            });
            initialized = true;
          }
          const out = await mermaid.render('mmd-' + ++seq, code);
          if (!cancelled && myReq === reqRef.current) setState({ svg: out.svg });
        } catch {
          if (!cancelled && myReq === reqRef.current) setState({ failed: true });
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  if (state.svg) return <div style={WRAP} dangerouslySetInnerHTML={{ __html: state.svg }} />;
  if (state.failed) return <pre style={FALLBACK}>{code.trim()}</pre>;
  return <div style={PENDING}>🔄 Připravuji diagram…</div>;
};
