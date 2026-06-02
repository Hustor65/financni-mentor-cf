import { lazy, Suspense, useMemo } from 'react';

// Lazy jako v TopicTools — ECharts se nestáhne, dokud mentor nepošle první graf.
const ReactECharts = lazy(() => import('echarts-for-react'));

/* ════════════════════════════════════════════════════════════
   ChatChart — renderer pro ```echarts bloky v odpovědích mentora.
   Model posílá JEN data + osy + název; tmavý brand-styl (paleta,
   tooltip, mřížka, fonty) doplníme tady. Díky tomu zůstává systémový
   prompt malý a každý graf automaticky ladí se zbytkem aplikace.
   ════════════════════════════════════════════════════════════ */

// cyan-first paleta, sladěná s kalkulačkami (TopicTools / CompoundInterestCalc)
const PALETTE = ['#3ab5e0', '#10B981', '#F59E0B', '#a78bfa', '#fb7185', '#64748b'];

const AXIS = {
  axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
  axisTick: { show: false },
  axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
  splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
// Nastyluje osu (jednu i pole os) brand vzhledem, data modelu nechá být.
function styleAxis(axis: any): any {
  if (!axis) return undefined;
  const one = (a: any) => ({ ...AXIS, ...a, axisLabel: { ...AXIS.axisLabel, ...(a?.axisLabel ?? {}) } });
  return Array.isArray(axis) ? axis.map(one) : one(axis);
}

// Vezme „holý" option od modelu a doplní tmavý styl. Tooltip je VŽDY náš
// (model nesmí podstrčit vlastní HTML formatter). Pie nemá osy ani mřížku.
function withTheme(model: any): any {
  const isPie = Array.isArray(model.series) && model.series.some((s: any) => s?.type === 'pie');

  const title =
    model.title != null
      ? {
          left: 'center',
          top: 6,
          textStyle: { color: '#e2e8f0', fontFamily: 'Space Grotesk, sans-serif', fontSize: 14, fontWeight: 600 },
          subtextStyle: { color: '#64748b', fontSize: 11 },
          ...(typeof model.title === 'object' ? model.title : { text: String(model.title) }),
        }
      : undefined;

  return {
    color: PALETTE,
    backgroundColor: 'transparent',
    animationDuration: 700,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: 'Inter, sans-serif', color: '#cbd5e1' },
    ...model,
    // ── naše přepisy (vyhrávají nad modelem) ──
    tooltip: {
      trigger: isPie ? 'item' : 'axis',
      backgroundColor: 'rgba(11,22,41,0.92)',
      borderColor: 'rgba(58,181,224,0.35)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
      extraCssText: 'backdrop-filter: blur(14px); border-radius: 12px; box-shadow: 0 18px 50px -10px rgba(0,0,0,0.6);',
    },
    title,
    legend: model.legend
      ? {
          bottom: 0,
          left: 'center',
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 11 },
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

const WRAP: React.CSSProperties = {
  margin: '0.85rem 0',
  padding: '0.6rem 0.5rem 0.35rem',
  borderRadius: '14px',
  background: 'rgba(11,22,41,0.35)',
  border: '1px solid rgba(58,181,224,0.18)',
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

export const ChatChart: React.FC<{ code: string }> = ({ code }) => {
  // Během streamu je JSON neúplný → JSON.parse spadne; ukazujeme jemný
  // placeholder, dokud nedorazí uzavírací ``` a option se nedá načíst.
  const option = useMemo(() => {
    try {
      const parsed = JSON.parse(code);
      if (!parsed || typeof parsed !== 'object' || !parsed.series) return null;
      return withTheme(parsed);
    } catch {
      return null;
    }
  }, [code]);

  if (!option) {
    return <div style={PENDING}>📊 Připravuji graf…</div>;
  }

  return (
    <div style={WRAP}>
      <Suspense fallback={<div style={PENDING}>Načítám graf…</div>}>
        <ReactECharts option={option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'canvas' }} />
      </Suspense>
    </div>
  );
};
