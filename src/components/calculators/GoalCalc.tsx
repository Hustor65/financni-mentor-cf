import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { compoundInterest, czNum } from '../../utils/calculators';
import { NumberField } from '../NumberField';

/**
 * Obrácená kalkulačka složeného úročení — z cíle spočítá měsíční vklad.
 * PMT = FV / ( ((1+r)^n − 1)/r × (1+r) )  [anuita-due, vklad na začátku měsíce]
 */
export const GoalCalc = () => {
  const [goal, setGoal] = useState(1_000_000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(7);

  const { monthly, invested, gain } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = Math.max(1, years * 12);
    const m = r === 0 ? goal / n : goal / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const monthlyRounded = Math.max(0, Math.ceil(m));
    const inv = monthlyRounded * n;
    return { monthly: monthlyRounded, invested: inv, gain: Math.max(0, goal - inv) };
  }, [goal, years, rate]);

  // Graf jako výuka: jak hodnota roste k cíli (markLine = cíl, markPoint = konec).
  const option = useMemo(() => {
    const rows = compoundInterest(monthly, rate, years, 0);
    const xLabels = rows.map(r => (r.year === 0 ? 'start' : r.year < 5 ? `${r.year} r.` : `${r.year} let`));
    const balance = rows.map(r => r.invested);
    const deposits = rows.map(r => r.noInvest);
    return {
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      grid: { left: 8, right: 16, top: 18, bottom: 42, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(58,181,224,0.45)', width: 1, type: 'dashed' } },
        backgroundColor: 'rgba(11,22,41,0.92)', borderColor: 'rgba(58,181,224,0.35)', borderWidth: 1, padding: [8, 12],
        textStyle: { color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
        extraCssText: 'backdrop-filter: blur(14px); border-radius: 12px;',
        valueFormatter: (v: number | string) => `${czNum(v)} Kč`,
      },
      legend: {
        data: ['Hodnota', 'Vloženo'], bottom: 2, left: 'center', icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, textStyle: { color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 11 },
      },
      xAxis: {
        type: 'category', data: xLabels, boundaryGap: false, axisTick: { show: false },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
      },
      yAxis: {
        type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Vloženo', type: 'line', smooth: true, showSymbol: false, data: deposits, z: 2,
          lineStyle: { color: '#64748b', width: 1.6, type: 'dashed' }, itemStyle: { color: '#64748b' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(100,116,139,0.16)' }, { offset: 1, color: 'rgba(100,116,139,0)' }] } },
        },
        {
          name: 'Hodnota', type: 'line', smooth: true, showSymbol: false, data: balance, z: 4,
          lineStyle: { color: '#10b981', width: 2.6, shadowColor: 'rgba(16,185,129,0.55)', shadowBlur: 14 }, itemStyle: { color: '#10b981' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.5)' }, { offset: 0.55, color: 'rgba(16,185,129,0.14)' }, { offset: 1, color: 'rgba(16,185,129,0)' }] } },
          markLine: {
            symbol: 'none', silent: true,
            lineStyle: { color: 'rgba(58,181,224,0.6)', type: 'dashed', width: 1.4 },
            label: { show: true, position: 'insideStartTop', color: '#3ab5e0', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, fontWeight: 600, formatter: `Cíl  ${czNum(goal)} Kč` },
            data: [{ yAxis: goal }],
          },
          markPoint: {
            symbol: 'circle', symbolSize: 10,
            itemStyle: { color: '#10b981', borderColor: '#ffffff', borderWidth: 2, shadowColor: 'rgba(16,185,129,0.8)', shadowBlur: 18 },
            label: { show: true, position: 'top', distance: 10, fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(2,44,34,0.85)', padding: [4, 8], borderRadius: 6, formatter: `${czNum(balance[balance.length - 1] || 0)} Kč` },
            data: [{ type: 'max' }],
          },
        },
      ],
    };
  }, [monthly, rate, years, goal]);

  return (
    <div>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#E2E8F0', fontSize: '0.95rem', margin: '0 0 0.9rem' }}>
        Mám cíl — kolik musím odkládat měsíčně?
      </p>
      <div className="calc-form">
        <NumberField label="Cílová částka" suffix="Kč" value={goal} onChange={setGoal}
          min={10000} sliderMin={100000} sliderMax={10000000} step={50000} />
        <NumberField label="Za kolik let" suffix="let" value={years} onChange={setYears}
          min={1} max={60} sliderMin={1} sliderMax={40} step={1} />
        <NumberField label="Roční výnos" suffix="%" value={rate} onChange={setRate}
          min={0} max={100} sliderMin={1} sliderMax={15} step={0.5} decimals={1} />
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          Měsíčně odkládat
        </div>
        <div className="grad-text--green" style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
          {czNum(monthly)} Kč
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          Celkem vložíš <strong style={{ color: '#E2E8F0' }}>{czNum(invested)} Kč</strong>,
          výnosy ti přidají <strong style={{ color: 'var(--lg-green-500)' }}>{czNum(gain)} Kč</strong>.
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Suspense fallback={<div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Načítám graf…</div>}>
          <ReactECharts option={option} style={{ height: 260 }} opts={{ renderer: 'canvas' }} />
        </Suspense>
      </div>
    </div>
  );
};
