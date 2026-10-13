import { CHART, tooltipBase, axisLabel } from '../../utils/chartTheme';

/* Společné formáty čísel a stavba čárového grafu pro základní kalkulačky.
   Jedno místo, aby všechny grafy měly stejné osy, popisky a animace. */

const NBSP = ' ';
const cs = (v: number, digits = 0) =>
  v.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** „1 250 000 Kč“; od miliardy výš zkráceně („1,82 mld. Kč“), aby se číslo vešlo. */
export function kc(v: number): string {
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `${cs(v / 1e12, 2)}${NBSP}bil.${NBSP}Kč`;
  if (a >= 1e9) return `${cs(v / 1e9, 2)}${NBSP}mld.${NBSP}Kč`;
  return `${cs(Math.round(v))}${NBSP}Kč`;
}

/** „7,5 %“ */
export function pct(v: number, digits = 1): string {
  return Number.isFinite(v) ? `${cs(v, digits)}${NBSP}%` : '—';
}

/** „1 rok“, „3 roky“, „20 let“ */
export function yearsText(n: number): string {
  const word = n === 1 ? 'rok' : n >= 2 && n <= 4 ? 'roky' : 'let';
  return `${cs(n)}${NBSP}${word}`;
}

/** popisek osy s penězi: „250 tis.“, „1,2 mil.“ */
export function axisMoney(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e12) return `${cs(v / 1e12, 1)}${NBSP}bil.`;
  if (a >= 1e9) return `${cs(v / 1e9, 1)}${NBSP}mld.`;
  if (a >= 1e6) return `${cs(v / 1e6, 1)}${NBSP}mil.`;
  if (a >= 1e3) return `${cs(v / 1e3, 1)}${NBSP}tis.`;
  return cs(v);
}

function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface ChartLine {
  name: string;
  data: (number | null)[];
  color: string;
  /** hlavní řada: silnější čára a výplň pod ní */
  main?: boolean;
  dashed?: boolean;
}

interface TipParam {
  seriesName: string;
  value: number | null | undefined;
  color: string;
  axisValueLabel?: string;
  name?: string;
}

interface LineChartInput {
  labels: string[];
  lines: ChartLine[];
  /** vodorovná čára s popiskem (např. cíl) */
  target?: { value: number; label: string };
  /** svislá čára bez popisku (index na ose X) */
  markIndex?: number | null;
}

export const CHART_HEIGHT = 320;
export const CHART_STYLE = { height: CHART_HEIGHT } as const;

/** Čárový graf peněz v čase — jednotná podoba pro všechny základní kalkulačky. */
export function moneyLineChart({ labels, lines, target, markIndex }: LineChartInput) {
  const label = { ...axisLabel, fontSize: 12 };
  return {
    aria: { enabled: true }, // textový popis grafu pro čtečky (canvas je jinak neviditelný)
    animationDuration: 400,
    animationDurationUpdate: 180,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    textStyle: { fontFamily: CHART.font },
    grid: { left: 4, right: 16, top: 16, bottom: 58, containLabel: true },
    tooltip: {
      ...tooltipBase,
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', lineStyle: { color: CHART.axisLine, width: 1 } },
      formatter: (params: TipParam[]) => {
        const head = params[0]?.axisValueLabel ?? params[0]?.name ?? '';
        const rows = [...params]
          .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity))
          .map(p => {
            const val = p.value == null ? '—' : kc(p.value);
            return `<div style="display:flex;justify-content:space-between;gap:20px;padding:2px 0;">`
              + `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.color};margin-right:8px;"></span>${p.seriesName}</span>`
              + `<span style="color:#fff;font-weight:600;font-variant-numeric:tabular-nums;">${val}</span></div>`;
          })
          .join('');
        return `<div style="min-width:200px;font-size:13px;"><div style="margin-bottom:6px;color:${CHART.axis};">${head}</div>${rows}</div>`;
      },
    },
    legend: {
      data: lines.map(l => l.name),
      bottom: 0,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 16,
      textStyle: { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 },
      inactiveColor: 'rgba(127, 147, 176, 0.4)',
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: CHART.axisLine } },
      axisTick: { show: false },
      axisLabel: { ...label, hideOverlap: true, margin: 12 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...label, formatter: axisMoney },
      splitLine: { lineStyle: { color: CHART.grid } },
    },
    series: lines.map((l, i) => ({
      name: l.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      data: l.data,
      z: l.main ? 5 : 2,
      itemStyle: { color: l.color },
      lineStyle: { color: l.color, width: l.main ? 2.6 : 1.8, type: l.dashed ? 'dashed' : 'solid' },
      emphasis: { focus: 'series' },
      ...(l.main ? {
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: hexA(l.color, 0.32) }, { offset: 1, color: hexA(l.color, 0) }],
          },
        },
      } : {}),
      ...(i === 0 && (target || markIndex != null) ? {
        markLine: {
          symbol: 'none',
          silent: true,
          animation: false,
          lineStyle: { color: CHART.axis, type: 'dashed', width: 1 },
          label: target
            ? { show: true, position: 'insideStartTop', color: CHART.text, fontFamily: CHART.font, fontSize: 12, formatter: target.label }
            : { show: false },
          data: [
            ...(target ? [{ yAxis: target.value }] : []),
            ...(markIndex != null ? [{ xAxis: markIndex, label: { show: false } }] : []),
          ],
        },
      } : {}),
    })),
  };
}
