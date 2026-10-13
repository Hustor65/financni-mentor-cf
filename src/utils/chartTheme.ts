/** Sdílené barvy a písmo pro ECharts — jedno místo, ať grafy drží s design systémem. */
export const CHART = {
  font: "'Hanken Grotesk Variable', system-ui, sans-serif",
  up: '#10b981',
  down: '#f0617a',
  cyan: '#3ab5e0',
  cyanDeep: '#2596be',
  amber: '#e8a020',
  violet: '#9d8cf5',
  text: '#dce6f2',
  axis: '#7f93b0',
  grid: 'rgba(148, 170, 200, 0.10)',
  axisLine: 'rgba(148, 170, 200, 0.22)',
  tooltipBg: '#0c1a30',
  tooltipBorder: 'rgba(58, 181, 224, 0.35)',
} as const;

export const tooltipBase = {
  backgroundColor: CHART.tooltipBg,
  borderColor: CHART.tooltipBorder,
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: CHART.text, fontFamily: CHART.font, fontSize: 12 },
  extraCssText: 'border-radius: 8px; box-shadow: 0 14px 40px -12px rgba(0,0,0,0.7);',
} as const;

export const axisLabel = { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 } as const;
