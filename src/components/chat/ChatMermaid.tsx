import { useEffect, useRef, useState } from 'react';
import { ChartSkeleton } from '../ChartSkeleton';
import { CHART } from '../../utils/chartTheme';

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

// Mermaid má globální/singletonový stav — souběžné render() z VÍCE instancí (např. dva
// ```mermaid bloky v jedné odpovědi mentora) se navzájem rozhodí. Serializujeme je
// modulovou frontou, ať render() běží jeden po druhém napříč všemi instancemi (M21).
let renderChain: Promise<unknown> = Promise.resolve();
function serialRender(doRender: () => Promise<{ svg: string }>): Promise<{ svg: string }> {
  const run = renderChain.then(doRender);
  renderChain = run.then(() => undefined, () => undefined); // řetěz pokračuje i po chybě
  return run;
}

export const ChatMermaid: React.FC<{ code: string }> = ({ code }) => {
  const [state, setState] = useState<{ svg?: string; failed?: boolean }>({});
  const reqRef = useRef(0);

  useEffect(() => {
    const myReq = ++reqRef.current;
    let cancelled = false;
    // M20: při změně kódu zahoď předchozí `failed`, ať během streamu nebliká raw zdroj
    // místo diagramu (raw zdroj se ukáže až když poslední/ustálený kód selže).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(s => (s.failed ? {} : s));
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
              fontFamily: CHART.font,
              flowchart: { useMaxWidth: true, curve: 'basis' },
              themeVariables: {
                background: 'transparent',
                primaryColor: CHART.tooltipBg,
                primaryBorderColor: CHART.cyan,
                primaryTextColor: CHART.text,
                lineColor: CHART.axis,
                secondaryColor: CHART.tooltipBg,
                tertiaryColor: CHART.tooltipBg,
                textColor: CHART.text,
                edgeLabelBackground: CHART.tooltipBg,
                fontFamily: CHART.font,
              },
            });
            initialized = true;
          }
          const out = await serialRender(() => mermaid.render('mmd-' + ++seq, code));
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

  if (state.svg) return <div className="mn-figure mn-figure--diagram" dangerouslySetInnerHTML={{ __html: state.svg }} />;
  // když se diagram nepodaří vykreslit, ukážeme radši jeho zdroj než věčný zástupný obrys
  if (state.failed) return <pre className="mn-figure mn-figure--src">{code.trim()}</pre>;
  return <div className="mn-figure"><ChartSkeleton height={200} label="Připravuji diagram" bare /></div>;
};
