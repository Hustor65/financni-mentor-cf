import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { compoundInterest, czNum } from '../../utils/calculators';
import { NumberField } from '../NumberField';

export const CompoundInterestCalc = () => {
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(30);
  const [inflation, setInflation] = useState(3);

  const data = useMemo(() => compoundInterest(monthly, rate, years, inflation), [monthly, rate, years, inflation]);

  const option = useMemo(() => {
    const xLabels = data.map(r => {
      if (r.year === 0) return 'Dnes';
      if (r.year === 1) return '1 rok';
      if (r.year < 5) return `${r.year} roky`;
      return `${r.year} let`;
    });
    const invested = data.map(r => r.invested);
    const noInvest = data.map(r => r.noInvest);
    const afterInfl = data.map(r => r.investedAfterInflation ?? null);
    const mattress = data.map(r => r.mattressReal ?? null);
    const hasInfl = inflation > 0;

    // break-even: kde investice přerostou pouhé spoření 1.5× (1:1 s app.py)
    let breakEvenIdx: number | null = null;
    for (let i = 0; i < invested.length; i++) {
      if (noInvest[i] > 0 && invested[i] / noInvest[i] >= 1.5) {
        breakEvenIdx = i;
        break;
      }
    }

    return {
      aria: { enabled: true }, // ECharts vygeneruje textový popis grafu pro čtečky (canvas je jinak neviditelný)
      animationDuration: 1400,
      animationEasing: 'cubicOut',
      grid: { left: 10, right: 24, top: 30, bottom: 50, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(58,181,224,0.45)', width: 1, type: 'dashed' } },
        backgroundColor: 'rgba(11, 22, 41, 0.92)',
        borderColor: 'rgba(58,181,224,0.35)', borderWidth: 1, padding: [10, 14],
        textStyle: { color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
        extraCssText: 'backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: 12px; box-shadow: 0 18px 50px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const byName: Record<string, number> = {};
          params.forEach(p => { byName[p.seriesName] = p.value; });
          const fmt = (v: number | undefined) => (v == null ? '—' : `${czNum(v)} Kč`);
          let html = `<div style="font-family:Inter,sans-serif;padding:2px;min-width:210px;">`;
          html += `<div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">${params[0]?.axisValue ?? ''}</div>`;
          const rows: [string, string, string, number | undefined][] = [
            ['#10b981', 'Investováno', '#e2e8f0', byName['Investováno']],
          ];
          if (hasInfl) rows.push(['#3ab5e0', 'Po inflaci', '#cbd5e1', byName['Po inflaci']]);
          rows.push(['#475569', 'Jen spořeno', '#94a3b8', byName['Jen spořeno']]);
          if (hasInfl) rows.push(['#ef4444', 'Pod polštářem', '#fca5a5', byName['Pod polštářem']]);
          for (const [sw, label, vc, val] of rows) {
            html += `<div style="display:flex;justify-content:space-between;gap:18px;padding:3px 0;"><span style="color:#cbd5e1;font-weight:600;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${sw};margin-right:8px;vertical-align:middle;"></span>${label}</span><span style="color:${vc};font-weight:600;font-variant-numeric:tabular-nums;">${fmt(val)}</span></div>`;
          }
          return html + '</div>';
        },
      },
      legend: {
        data: ['Investováno', hasInfl ? 'Po inflaci' : '', 'Jen spořeno', hasInfl ? 'Pod polštářem' : ''].filter(Boolean),
        bottom: 6, left: 'center', icon: 'roundRect', itemWidth: 10, itemHeight: 10,
        textStyle: { color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 11 },
        inactiveColor: '#334155',
      },
      xAxis: {
        type: 'category', data: xLabels, boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
      },
      yAxis: {
        type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Jen spořeno', type: 'line', smooth: true, showSymbol: false, sampling: 'lttb', data: noInvest, z: 2,
          lineStyle: { color: '#64748b', width: 1.6, type: 'dashed' }, itemStyle: { color: '#64748b' },
          emphasis: { focus: 'series', lineStyle: { width: 2 } },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(100,116,139,0.18)' }, { offset: 1, color: 'rgba(100,116,139,0.0)' }] } },
        },
        {
          name: 'Investováno', type: 'line', smooth: true, showSymbol: false, sampling: 'lttb', data: invested, z: 4,
          lineStyle: { color: '#10b981', width: 2.6, shadowColor: 'rgba(16,185,129,0.55)', shadowBlur: 14 },
          itemStyle: { color: '#10b981' },
          emphasis: { focus: 'series', lineStyle: { width: 3.2 } },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.55)' }, { offset: 0.55, color: 'rgba(16,185,129,0.15)' }, { offset: 1, color: 'rgba(16,185,129,0.0)' }] } },
          markPoint: {
            symbol: 'circle', symbolSize: 10,
            itemStyle: { color: '#10b981', borderColor: '#ffffff', borderWidth: 2, shadowColor: 'rgba(16,185,129,0.8)', shadowBlur: 18 },
            label: { show: true, position: 'top', distance: 12, fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, color: '#10b981', backgroundColor: 'rgba(2,44,34,0.85)', padding: [4, 8], borderRadius: 6, formatter: `Konečná hodnota  ${czNum(invested[invested.length - 1] || 0)} Kč` },
            data: [{ type: 'max' }],
          },
          ...(breakEvenIdx != null ? {
            markLine: {
              symbol: 'none', silent: true,
              lineStyle: { color: 'rgba(58,181,224,0.55)', type: 'dotted', width: 1.2 },
              label: { show: true, position: 'insideEndTop', color: '#3ab5e0', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, fontWeight: 600, formatter: 'tady už výnosy táhnou víc než vklady' },
              data: [{ xAxis: breakEvenIdx }],
            },
          } : {}),
        },
        ...(hasInfl ? [{
          name: 'Po inflaci', type: 'line' as const, smooth: true, showSymbol: false, sampling: 'lttb' as const, data: afterInfl, z: 3,
          lineStyle: { color: '#3ab5e0', width: 1.8, type: 'dashed' as const, shadowColor: 'rgba(58,181,224,0.35)', shadowBlur: 8 }, itemStyle: { color: '#3ab5e0' },
          emphasis: { focus: 'series' as const, lineStyle: { width: 2.4 } },
          areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(58,181,224,0.12)' }, { offset: 1, color: 'rgba(58,181,224,0.0)' }] } },
        }, {
          name: 'Pod polštářem', type: 'line' as const, smooth: true, showSymbol: false, sampling: 'lttb' as const, data: mattress, z: 1,
          lineStyle: { color: '#ef4444', width: 1.6 }, itemStyle: { color: '#ef4444' },
          emphasis: { focus: 'series' as const, lineStyle: { width: 2.2 } },
          areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.20)' }, { offset: 1, color: 'rgba(239,68,68,0.0)' }] } },
        }] : []),
      ],
    };
  }, [data, inflation]);

  // delta-strip: konečné hodnoty + výnos navíc / násobek
  const lastRow = data[data.length - 1];
  const finalValue = lastRow?.invested ?? 0;
  const finalDeposits = lastRow?.noInvest ?? 0;
  const gain = Math.max(0, finalValue - finalDeposits);
  const multiple = finalDeposits > 0 ? (finalValue / finalDeposits).toFixed(1) : '—';

  return (
    <div>
      <div className="calc-form">
        <NumberField label="Měsíční vklad" suffix="Kč" value={monthly} onChange={setMonthly}
          min={0} sliderMin={500} sliderMax={50000} step={500} />
        <NumberField label="Roční výnos" suffix="%" value={rate} onChange={setRate}
          min={0} max={100} sliderMin={1} sliderMax={15} step={0.5} decimals={1} />
        <NumberField label="Doba spoření" suffix="let" value={years} onChange={setYears}
          min={1} max={80} sliderMin={1} sliderMax={50} step={1} />
        <NumberField label="Inflace" suffix="%" value={inflation} onChange={setInflation}
          min={0} max={100} sliderMin={0} sliderMax={10} step={0.5} decimals={1} />
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.25rem', lineHeight: 1.6 }}>
        Graf ukazuje, jak by tvoje pravidelné vklady mohly růst, kdybys je investoval — a o kolik
        bys přišel, kdyby peníze jen ležely stranou. Jde o orientační odhad, ne o příslib výnosu.
      </p>
      <div style={{ marginTop: '1rem' }}>
        <Suspense fallback={<ChartSkeleton height={320} />}>
          <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
        </Suspense>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '1rem' }}>
        <div className="glass-panel" style={{ padding: '0.9rem 0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Hodnota portfolia</div>
          <div className="grad-text--green" style={{ fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{czNum(finalValue)} Kč</div>
        </div>
        <div className="glass-panel" style={{ padding: '0.9rem 0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Vloženo celkem</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{czNum(finalDeposits)} Kč</div>
        </div>
        <div className="glass-panel" style={{ padding: '0.9rem 0.75rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Z toho výnosy</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--lg-cyan-400)', fontVariantNumeric: 'tabular-nums' }}>+{czNum(gain)} Kč</div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{multiple}× vklad</div>
        </div>
      </div>
    </div>
  );
};
