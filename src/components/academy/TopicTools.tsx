import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { czNum } from '../../utils/calculators';
import { NumberField } from '../NumberField';

/* ════════════════════════════════════════════════════════════
   Topic-specific interaktivní nástroje — 1:1 přepis z app.py
   (_topic_stocks / _topic_inflation / _topic_risk)
   ════════════════════════════════════════════════════════════ */

// ── akcie-etf: Porovnání nástrojů (3 karty Výnos/Riziko) ──
export const StocksComparison: React.FC = () => {
  const data: [string, string, string, string][] = [
    ['Akcie', 'Vysoký', 'Vysoké', '#10B981'],
    ['Dluhopisy', 'Nižší', 'Nízké', '#3ab5e0'],
    ['ETF', 'Tržní', 'Rozložené', '#F59E0B'],
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
      {data.map(([name, vyn, riz, color]) => (
        <div
          key={name}
          className="glass-panel glass-panel--elevated"
          style={{ padding: '1rem', textAlign: 'center' }}
        >
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color, fontSize: '1rem' }}>{name}</div>
          <div style={{ color: '#64748B', fontSize: '0.72rem', marginTop: '0.6rem' }}>Výnos</div>
          <div style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 600 }}>{vyn}</div>
          <div style={{ color: '#64748B', fontSize: '0.72rem', marginTop: '0.4rem' }}>Riziko</div>
          <div style={{ color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 600 }}>{riz}</div>
        </div>
      ))}
    </div>
  );
};

// ── inflace: graf „Jak inflace ukrajuje" + hláška ──
export const InflationTool: React.FC = () => {
  const [amount, setAmount] = useState(100000);
  const [infl, setInfl] = useState(3);
  const [years, setYears] = useState(20);

  const rows = useMemo(() => {
    const out: { year: number; invested: number; afterInfl: number; noInvest: number; mattress: number }[] = [];
    let inv = amount;
    const mr = 0.07 / 12;
    for (let y = 0; y <= years; y++) {
      if (y > 0) for (let m = 0; m < 12; m++) inv = inv * (1 + mr);
      const defl = Math.pow(1 + infl / 100, y);
      out.push({
        year: y,
        invested: Math.round(inv),
        afterInfl: Math.round(inv / defl),
        noInvest: amount,
        mattress: Math.round(amount / defl),
      });
    }
    return out;
  }, [amount, infl, years]);

  const realFinal = Math.round(amount / Math.pow(1 + infl / 100, years));

  const option = useMemo(() => {
    const xLabels = rows.map(r => (r.year === 0 ? 'start' : r.year === 1 ? '1 rok' : r.year < 5 ? `${r.year} roky` : `${r.year} let`));
    return {
      aria: { enabled: true }, // textový popis grafu pro čtečky (canvas je jinak neviditelný)
      animationDuration: 1400, animationEasing: 'cubicOut',
      grid: { left: 10, right: 24, top: 30, bottom: 50, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: 'rgba(58,181,224,0.45)', width: 1, type: 'dashed' } },
        backgroundColor: 'rgba(11, 22, 41, 0.92)', borderColor: 'rgba(58,181,224,0.35)', borderWidth: 1, padding: [10, 14],
        textStyle: { color: '#e2e8f0', fontFamily: 'Inter, sans-serif' },
        extraCssText: 'backdrop-filter: blur(14px); border-radius: 12px; box-shadow: 0 18px 50px -10px rgba(0,0,0,0.6);',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const by: Record<string, number> = {};
          params.forEach(p => { by[p.seriesName] = p.value; });
          let h = `<div style="font-family:Inter,sans-serif;padding:2px;min-width:210px;"><div style="font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">${params[0]?.axisValue ?? ''}</div>`;
          const r: [string, string, string, number][] = [
            ['#10b981', 'Investováno', '#e2e8f0', by['Investováno']],
            ['#3ab5e0', 'Po inflaci', '#cbd5e1', by['Po inflaci']],
            ['#475569', 'Bez investice', '#94a3b8', by['Bez investice']],
            ['#ef4444', 'Pod polštářem', '#fca5a5', by['Pod polštářem']],
          ];
          for (const [sw, l, vc, v] of r) h += `<div style="display:flex;justify-content:space-between;gap:18px;padding:3px 0;"><span style="color:#cbd5e1;font-weight:600;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${sw};margin-right:8px;vertical-align:middle;"></span>${l}</span><span style="color:${vc};font-weight:600;font-variant-numeric:tabular-nums;">${v == null ? '—' : czNum(v) + ' Kč'}</span></div>`;
          return h + '</div>';
        },
      },
      legend: {
        data: ['Investováno', 'Po inflaci', 'Bez investice', 'Pod polštářem'],
        bottom: 6, left: 'center', icon: 'roundRect', itemWidth: 10, itemHeight: 10,
        textStyle: { color: '#94a3b8', fontFamily: 'Inter, sans-serif', fontSize: 11 }, inactiveColor: '#334155',
      },
      xAxis: {
        type: 'category', data: xLabels, boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.25)' } }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
      },
      yAxis: {
        type: 'value', axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#64748b', fontFamily: 'Space Grotesk, sans-serif', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.08)', type: 'dashed' } },
      },
      series: [
        { name: 'Bez investice', type: 'line', smooth: true, showSymbol: false, data: rows.map(r => r.noInvest), z: 2, lineStyle: { color: '#64748b', width: 1.6, type: 'dashed' }, itemStyle: { color: '#64748b' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(100,116,139,0.18)' }, { offset: 1, color: 'rgba(100,116,139,0.0)' }] } } },
        { name: 'Investováno', type: 'line', smooth: true, showSymbol: false, data: rows.map(r => r.invested), z: 4, lineStyle: { color: '#10b981', width: 2.6, shadowColor: 'rgba(16,185,129,0.55)', shadowBlur: 14 }, itemStyle: { color: '#10b981' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.55)' }, { offset: 0.55, color: 'rgba(16,185,129,0.15)' }, { offset: 1, color: 'rgba(16,185,129,0.0)' }] } } },
        { name: 'Po inflaci', type: 'line', smooth: true, showSymbol: false, data: rows.map(r => r.afterInfl), z: 3, lineStyle: { color: '#3ab5e0', width: 1.8, type: 'dashed' }, itemStyle: { color: '#3ab5e0' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(58,181,224,0.12)' }, { offset: 1, color: 'rgba(58,181,224,0.0)' }] } } },
        { name: 'Pod polštářem', type: 'line', smooth: true, showSymbol: false, data: rows.map(r => r.mattress), z: 1, lineStyle: { color: '#ef4444', width: 1.6 }, itemStyle: { color: '#ef4444' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(239,68,68,0.20)' }, { offset: 1, color: 'rgba(239,68,68,0.0)' }] } } },
      ],
    };
  }, [rows]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <NumberField label="Částka" suffix="Kč" value={amount} onChange={setAmount}
          min={0} sliderMin={1000} sliderMax={500000} step={10000} />
        <NumberField label="Inflace" suffix="%" value={infl} onChange={setInfl}
          min={0} max={100} sliderMin={1} sliderMax={8} step={0.5} decimals={1} />
        <NumberField label="Roky" suffix="let" value={years} onChange={setYears}
          min={1} max={80} sliderMin={5} sliderMax={40} step={1} />
      </div>
      <Suspense fallback={<ChartSkeleton height={300} />}>
        <ReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'canvas' }} />
      </Suspense>
      <div style={{ borderLeft: '3px solid #EF4444', padding: '0.6rem 0.75rem', marginTop: '0.4rem', background: 'rgba(239,68,68,0.05)', borderRadius: '0 8px 8px 0' }}>
        <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
          Z <strong style={{ color: '#E2E8F0' }}>{czNum(amount)} Kč</strong> pod polštářem zbude při {infl}% inflaci za {years} let reálně jen <strong style={{ color: '#EF4444' }}>{czNum(realFinal)} Kč</strong> v dnešní kupní síle. Investice (zelená čára) inflaci naopak poráží.
        </span>
      </div>
    </div>
  );
};

// ── riziko: Najděte svůj profil (radio + bary) ──
export const RiskProfile: React.FC = () => {
  const [profile, setProfile] = useState<'Konzervativní' | 'Vyvážený' | 'Dynamický'>('Vyvážený');
  const alloc: Record<string, [number, number, number]> = {
    'Konzervativní': [30, 50, 20],
    'Vyvážený': [60, 30, 10],
    'Dynamický': [85, 12, 3],
  };
  const labels: [string, string][] = [
    ['Akcie / ETF', '#10B981'],
    ['Dluhopisy', '#3ab5e0'],
    ['Hotovost / rezerva', '#F59E0B'],
  ];
  const current = alloc[profile];

  return (
    <div>
      {/* radio horizontal */}
      <div style={{ marginBottom: '0.5rem', color: '#E2E8F0', fontSize: '0.9rem', fontWeight: 500 }}>
        Jak snášíte výkyvy hodnoty?
      </div>
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['Konzervativní', 'Vyvážený', 'Dynamický'] as const).map(p => (
          <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: profile === p ? '#E2E8F0' : '#94A3B8', fontSize: '0.88rem' }}>
            <input type="radio" name="risk-profile" checked={profile === p} onChange={() => setProfile(p)} style={{ accentColor: 'var(--lg-cyan-500)' }} />
            {p}
          </label>
        ))}
      </div>

      {/* bary */}
      <div className="glass-panel glass-panel--sunken" style={{ padding: '1rem 1.2rem', marginTop: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
        {labels.map(([lab, color], i) => (
          <div key={lab} style={{ marginBottom: i < 2 ? '0.6rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#E2E8F0', marginBottom: '3px' }}>
              <span>{lab}</span><span>{current[i]} %</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${current[i]}%`, height: '100%', background: color, borderRadius: '5px', transition: 'width 300ms ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
