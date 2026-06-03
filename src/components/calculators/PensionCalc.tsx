import React, { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { czStatePension, czRetirementAgeMonths, czNum } from '../../utils/calculators';
import { PENSION_AVG_WAGE_2026 } from '../../data/constants';
import { NumberField } from '../NumberField';

export const PensionCalc: React.FC = () => {
  const [salary, setSalary] = useState(PENSION_AVG_WAGE_2026);
  const [yearsIns, setYearsIns] = useState(40);
  const [birthYear, setBirthYear] = useState(1990);

  const result = useMemo(() => czStatePension(salary, yearsIns), [salary, yearsIns]);
  const retirementAge = useMemo(() => czRetirementAgeMonths(birthYear), [birthYear]);
  const retYears = Math.floor(retirementAge / 12);
  const retMonths = retirementAge % 12;
  const replacementRatio = salary > 0 ? Math.round((result.total / salary) * 100) : 0;

  const projOption = useMemo(() => {
    const startYear = 2026;
    const projYears = 15;
    const inflRate = 0.03;
    const growthRate = 0.04;
    const years = Array.from({ length: projYears + 1 }, (_, i) => startYear + i);
    const nominal = years.map((_, i) => Math.round(result.total * Math.pow(1 + growthRate, i)));
    const real = years.map((_, i) => Math.round(result.total * Math.pow(1 + growthRate, i) * Math.pow(1 / (1 + inflRate), i)));

    return {
      animationDuration: 1400, animationEasing: 'cubicOut',
      grid: { left: 10, right: 24, top: 30, bottom: 50, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11, 22, 41, 0.92)',
        borderColor: 'rgba(58,181,224,0.35)', borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
      },
      legend: {
        data: ['Důchod nominálně', 'Důchod dnešními penězi'],
        bottom: 6, left: 'center', icon: 'roundRect',
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      xAxis: {
        type: 'category', data: years.map(String), boundaryGap: false,
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
      },
      yAxis: {
        type: 'value', axisLine: { show: false },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Důchod dnešními penězi', type: 'line', smooth: true, showSymbol: false, data: real, z: 2,
          lineStyle: { color: '#3ab5e0', width: 1.8, type: 'dashed' }, itemStyle: { color: '#3ab5e0' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(58,181,224,0.12)' }, { offset: 1, color: 'rgba(58,181,224,0.0)' }] } },
          markPoint: {
            symbol: 'circle', symbolSize: 8,
            itemStyle: { color: '#3ab5e0', borderColor: '#ffffff', borderWidth: 1.5 },
            label: { show: true, position: 'left', distance: 10, fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 700, color: '#3ab5e0', backgroundColor: 'rgba(8,28,46,0.85)', padding: [3, 6], borderRadius: 5, formatter: `reálně ${czNum(real[real.length - 1] || 0)} Kč` },
            data: [{ type: 'max' }],
          },
        },
        {
          name: 'Důchod nominálně', type: 'line', smooth: true, showSymbol: false, data: nominal, z: 3,
          lineStyle: { color: '#10b981', width: 2.6, shadowColor: 'rgba(16,185,129,0.55)', shadowBlur: 14 },
          itemStyle: { color: '#10b981' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.55)' }, { offset: 0.55, color: 'rgba(16,185,129,0.15)' }, { offset: 1, color: 'rgba(16,185,129,0.0)' }] } },
          markPoint: {
            symbol: 'circle', symbolSize: 9,
            itemStyle: { color: '#10b981', borderColor: '#ffffff', borderWidth: 2, shadowColor: 'rgba(16,185,129,0.7)', shadowBlur: 14 },
            label: { show: true, position: 'left', distance: 10, fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(2,44,34,0.85)', padding: [3, 6], borderRadius: 5, formatter: `nominálně ${czNum(nominal[nominal.length - 1] || 0)} Kč` },
            data: [{ type: 'max' }],
          },
        },
      ],
    };
  }, [result.total]);

  return (
    <div>
      <div className="calc-form">
        <NumberField label="Hrubá měsíční mzda" suffix="Kč" value={salary} onChange={setSalary}
          min={0} sliderMin={10000} sliderMax={150000} step={1000} />
        <NumberField label="Roky pojištění" suffix="let" value={yearsIns} onChange={setYearsIns}
          min={0} max={60} sliderMin={15} sliderMax={50} step={1} />
        <NumberField label="Ročník narození" value={birthYear} onChange={setBirthYear}
          min={1940} max={2010} sliderMin={1960} sliderMax={2010} step={1} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1rem 0' }}>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Odhad důchodu</div>
          <div className="grad-text--green" style={{ fontSize: '1.3rem', fontWeight: 700 }}>{czNum(result.total)} Kč</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Náhradový poměr</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: replacementRatio >= 50 ? 'var(--lg-green-500)' : 'var(--lg-cyan-400)' }}>{replacementRatio} %</div>
        </div>
        <div className="glass-panel" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Důchodový věk</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{retYears} let{retMonths > 0 ? ` ${retMonths} m.` : ''}</div>
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        Základní výměra: {czNum(result.baseAmount)} Kč • Procentní výměra: {czNum(result.percentAmount)} Kč
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
        Zjednodušený odhad podle pravidel ČSSZ 2026 — jako osobní vyměřovací základ bereme vaši
        dnešní hrubou mzdu (bez indexace dřívějších výdělků). Skutečný důchod z ČSSZ se může lišit.
      </div>
      <Suspense fallback={<div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Načítám graf…</div>}>
        <ReactECharts option={projOption} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
      </Suspense>
    </div>
  );
};
