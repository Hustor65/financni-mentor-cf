import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ChartSkeleton } from '../ChartSkeleton';
import { CHART, axisLabel, tooltipBase } from '../../utils/chartTheme';

// Lazy jako v TopicTools — ECharts se nestáhne, dokud mentor nepošle první graf.
const ReactECharts = lazy(() => import('echarts-for-react'));

/* ════════════════════════════════════════════════════════════
   ChatChart — renderer pro ```echarts bloky v odpovědích mentora.
   Model posílá JEN data + osy + název; vzhled (paleta, tooltip,
   mřížka, písmo) doplníme tady ze sdíleného chartTheme. Díky tomu zůstává systémový
   prompt malý a každý graf automaticky ladí se zbytkem aplikace.
   ════════════════════════════════════════════════════════════ */

const PALETTE = [CHART.cyan, CHART.up, CHART.amber, CHART.violet, CHART.down, CHART.axis];

// čísla česky: mezera mezi tisíci, desetinná čárka
const czNum = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('cs-CZ') : String(v ?? ''));

const AXIS = {
  axisLine: { lineStyle: { color: CHART.axisLine } },
  axisTick: { show: false },
  axisLabel,
  splitLine: { lineStyle: { color: CHART.grid, type: 'dashed' } },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
// Nastyluje osu (jednu i pole os) brand vzhledem, data modelu nechá být.
function styleAxis(axis: any): any {
  if (!axis) return undefined;
  const one = (a: any) => ({
    ...AXIS,
    ...a,
    axisLabel: { ...AXIS.axisLabel, ...(a?.type === 'value' ? { formatter: czNum } : {}), ...(a?.axisLabel ?? {}) },
  });
  return Array.isArray(axis) ? axis.map(one) : one(axis);
}

// Vezme „holý“ option od modelu a doplní tmavý styl. Tooltip je VŽDY náš
// (model nesmí podstrčit vlastní HTML formatter). Pie nemá osy ani mřížku.
function withTheme(model: any): any {
  const isPie = Array.isArray(model.series) && model.series.some((s: any) => s?.type === 'pie');

  const title =
    model.title != null
      ? {
          left: 'center',
          top: 6,
          textStyle: { color: CHART.text, fontFamily: CHART.font, fontSize: 14, fontWeight: 600 },
          subtextStyle: { color: CHART.axis, fontSize: 12 },
          ...(typeof model.title === 'object' ? model.title : { text: String(model.title) }),
        }
      : undefined;

  return {
    color: PALETTE,
    backgroundColor: 'transparent',
    animationDuration: 700,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: CHART.font, color: CHART.text },
    ...model,
    // ── naše přepisy (vyhrávají nad modelem) ──
    tooltip: { ...tooltipBase, trigger: isPie ? 'item' : 'axis', valueFormatter: czNum },
    title,
    legend: model.legend
      ? {
          bottom: 0,
          left: 'center',
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 },
          ...(typeof model.legend === 'object' ? model.legend : {}),
        }
      : undefined,
    grid: isPie
      ? undefined
      : { left: 8, right: 18, top: title ? 46 : 16, bottom: model.legend ? 30 : 8, containLabel: true, ...(model.grid ?? {}) },
    xAxis: isPie ? undefined : styleAxis(model.xAxis),
    yAxis: isPie ? undefined : styleAxis(model.yAxis),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const ChatChart: React.FC<{ code: string }> = ({ code }) => {
  // Debounce: během streamu se `code` mění po každém chunku. Renderujeme až
  // když se ustálí — a když je finální JSON vadný, ukážeme zdroj místo
  // věčného „Připravuji graf…“ (stejný princip jako ChatMermaid).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [state, setState] = useState<{ option?: any; failed?: boolean }>({});
  const reqRef = useRef(0);

  useEffect(() => {
    const myReq = ++reqRef.current;
    const timer = setTimeout(() => {
      try {
        const parsed = JSON.parse(code);
        if (!parsed || typeof parsed !== 'object' || !parsed.series) throw new Error('chybí series');
        if (myReq === reqRef.current) setState({ option: withTheme(parsed) });
      } catch {
        if (myReq === reqRef.current) setState({ failed: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [code]);

  if (state.option) {
    return (
      <div className="mn-figure">
        <Suspense fallback={<ChartSkeleton height={280} bare />}>
          <ReactECharts option={state.option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'canvas' }} />
        </Suspense>
      </div>
    );
  }
  if (state.failed) {
    // když se graf nepodaří sestavit, ukážeme radši zdroj než věčný zástupný obrys
    return <pre className="mn-figure mn-figure--src">{code.trim()}</pre>;
  }
  return <div className="mn-figure"><ChartSkeleton height={280} label="Připravuji graf" bare /></div>;
};
