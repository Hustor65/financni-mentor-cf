import { useMemo, useState, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { NumberField } from '../NumberField';
import { Segmented } from '../Segmented';
import { CHART, tooltipBase, axisLabel } from '../../utils/chartTheme';
import { monteCarlo } from '../../utils/finance';
import { czNum } from '../../utils/calculators';

/* ════════════════════════════════════════════════════════════
   Monte Carlo — místo jedné hladké křivky 800 možných budoucností.
   Ukazuje rozptyl výsledků: pesimistický, střední a optimistický
   scénář a pravděpodobnost, že dosáhneš cíle.
   ════════════════════════════════════════════════════════════ */

const PORTFOLIOS = [
  { id: 'opatrne', label: 'Opatrné', mean: 4, volatility: 6, note: 'převaha dluhopisů' },
  { id: 'vyvazene', label: 'Vyvážené', mean: 6, volatility: 11, note: 'akcie a dluhopisy napůl' },
  { id: 'akciove', label: 'Akciové', mean: 8, volatility: 16, note: 'globální akcie' },
];

const pct = (v: number) => `${Math.round(v * 100)} %`;

export const MonteCarloSim: React.FC = () => {
  const [initial, setInitial] = useState(50000);
  const [monthly, setMonthly] = useState(3000);
  const [years, setYears] = useState(20);
  const [mean, setMean] = useState(8);
  const [volatility, setVolatility] = useState(16);
  const [goal, setGoal] = useState(2000000);

  const preset = PORTFOLIOS.find(p => p.mean === mean && p.volatility === volatility)?.id ?? '';
  const sim = useMemo(
    () => monteCarlo({ initial, monthly, years, mean, volatility, goal }),
    [initial, monthly, years, mean, volatility, goal],
  );

  const option = useMemo(() => {
    const labels = sim.p50.map((_, y) => (y === 0 ? 'Dnes' : `${y}`));
    return {
      aria: { enabled: true },
      animationDuration: 400,
      animationDurationUpdate: 200,
      grid: { left: 8, right: 20, top: 20, bottom: 44, containLabel: true },
      tooltip: {
        ...tooltipBase, trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const y = params[0]?.dataIndex ?? 0;
          const row = (l: string, v: number, c: string) =>
            `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="color:${c}">${l}</span><b style="font-variant-numeric:tabular-nums">${czNum(v)} Kč</b></div>`;
          return `<div style="font-weight:700;margin-bottom:4px">${y === 0 ? 'Dnes' : `Po ${y} letech`}</div>`
            + row('Optimisticky (1 z 10)', sim.p90[y], CHART.up)
            + row('Střední scénář', sim.p50[y], CHART.text)
            + row('Pesimisticky (1 z 10)', sim.p10[y], CHART.down)
            + row('Vloženo', sim.deposits[y], CHART.axis);
        },
      },
      xAxis: {
        type: 'category', data: labels, boundaryGap: false,
        name: 'Roky', nameLocation: 'middle', nameGap: 28,
        nameTextStyle: { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 },
        axisLine: { lineStyle: { color: CHART.axisLine } }, axisTick: { show: false }, axisLabel,
      },
      yAxis: {
        type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { ...axisLabel, formatter: (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('cs-CZ')} mil.` : `${czNum(v / 1000)} tis.`) },
        splitLine: { lineStyle: { color: CHART.grid } },
      },
      series: [
        // jednotlivé simulace — tenké, ať je vidět, že každá cesta je jiná
        ...sim.samples.map((path, i) => ({
          name: `s${i}`, type: 'line', data: path, showSymbol: false, silent: true, smooth: 0.2,
          lineStyle: { color: 'rgba(58,181,224,0.22)', width: 1 }, tooltip: { show: false },
        })),
        // pásmo 10.–90. percentil (spodní průhledná vrstva + rozdíl nad ní)
        { name: 'p10', type: 'line', data: sim.p10, stack: 'band', showSymbol: false, lineStyle: { opacity: 0 }, silent: true },
        {
          name: 'pásmo', type: 'line', data: sim.p90.map((v, i) => v - sim.p10[i]), stack: 'band', showSymbol: false,
          lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(58,181,224,0.14)' }, silent: true,
        },
        {
          name: 'Vloženo', type: 'line', data: sim.deposits, showSymbol: false,
          lineStyle: { color: CHART.axis, width: 1.4, type: 'dashed' }, itemStyle: { color: CHART.axis },
        },
        {
          name: 'Střední scénář', type: 'line', data: sim.p50, showSymbol: false,
          lineStyle: { color: CHART.up, width: 2.6 }, itemStyle: { color: CHART.up },
          // čára cíle zůstává v sérii vždy (jen bez dat), ať ji graf při vynulování cíle umí smazat
          markLine: {
            symbol: 'none', silent: true, lineStyle: { color: CHART.amber, type: 'dashed', width: 1 },
            label: { formatter: 'cíl', color: CHART.amber, fontFamily: CHART.font, fontSize: 12, position: 'insideEndTop' },
            data: goal > 0 ? [{ yAxis: goal }] : [],
          },
        },
      ],
    };
  }, [sim, goal]);

  const last = sim.p50.length - 1;

  const hasGoal = sim.goalProbability != null && goal > 0;
  const portfolio = PORTFOLIOS.find(p => p.id === preset);

  return (
    <div className="lab">
      <div className="ui-split">
        <div className="ui-stack lab-inputs">
          <div className="ui-field">
            <span id="mc-portfolio">Typ portfolia</span>
            <Segmented
              label="Typ portfolia" value={preset} size="md"
              options={PORTFOLIOS.map(p => ({ value: p.id, label: p.label }))}
              onChange={id => { const p = PORTFOLIOS.find(x => x.id === id)!; setMean(p.mean); setVolatility(p.volatility); }}
            />
            <small>{portfolio ? `${portfolio.label}: ${portfolio.note}.` : 'Vlastní nastavení výnosu a volatility.'}</small>
          </div>
          <NumberField label="Počáteční vklad" suffix="Kč" value={initial} onChange={setInitial} min={0} sliderMin={0} sliderMax={1000000} step={10000} />
          <NumberField label="Měsíční vklad" suffix="Kč" value={monthly} onChange={setMonthly} min={0} sliderMin={0} sliderMax={30000} step={500} />
          <NumberField label="Horizont" suffix="let" value={years} onChange={setYears} min={1} max={50} sliderMin={1} sliderMax={40} step={1} />
          <NumberField label="Očekávaný výnos" suffix="%" value={mean} onChange={setMean} min={0} max={30} sliderMin={0} sliderMax={15} step={0.5} decimals={1} />
          <NumberField label="Volatilita" suffix="%" value={volatility} onChange={setVolatility} min={0} max={100} sliderMin={0} sliderMax={40} step={1} />
          <NumberField label="Cíl" suffix="Kč" value={goal} onChange={setGoal} min={0} sliderMin={0} sliderMax={10000000} step={100000} />
        </div>

        <div className="ui-stack ui-stack--l lab-result" aria-live="polite">
          <div className="ui-stack">
            <p className="ui-hero-num">
              <span className="ui-hero-num__label">Střední scénář po {last} {last === 1 ? 'roce' : 'letech'}</span>
              {czNum(sim.p50[last])} Kč
            </p>
            <dl className="ui-kpis lab-kpis-3">
              <div><dt>Pesimisticky (1 z 10)</dt><dd className="is-down">{czNum(sim.p10[last])} Kč</dd></div>
              <div><dt>Optimisticky (1 z 10)</dt><dd className="is-up">{czNum(sim.p90[last])} Kč</dd></div>
              <div><dt>Vložíš celkem</dt><dd>{czNum(sim.deposits[last])} Kč</dd></div>
              <div><dt>Šance, že dosáhneš cíle</dt><dd className="is-accent">{hasGoal ? pct(sim.goalProbability ?? 0) : '—'}</dd></div>
              <div><dt>Šance, že skončíš pod vklady</dt><dd>{pct(sim.lossProbability)}</dd></div>
            </dl>
          </div>

          <div className="lab-chart">
            <h3 className="ui-h3">800 možných průběhů</h3>
            <Suspense fallback={<ChartSkeleton height={340} bare />}>
              <ReactECharts option={option} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>

          <p className="ui-note">
            Kalkulačka složeného úročení kreslí jednu hladkou křivku, jako by trh rostl každý rok stejně.
            Ve skutečnosti kolísá. Světlé pásmo pokrývá 8 z 10 simulací, tenké čáry jsou jednotlivé průběhy
            a zelená čára je střed: polovina simulací skončila nad ní, polovina pod ní.
          </p>

          <p className="ui-small lab-assume">
            Model předpokládá, že výnosy mají normální rozdělení. Skutečné trhy mívají prudší propady,
            než model čeká. Výsledky jsou nominální, bez inflace a poplatků.
          </p>
        </div>
      </div>
    </div>
  );
};
