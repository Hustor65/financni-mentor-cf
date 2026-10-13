import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { compoundInterest } from '../../utils/calculators';
import { CHART } from '../../utils/chartTheme';
import { NumberField } from '../NumberField';
import { kc, pct, yearsText, moneyLineChart, CHART_HEIGHT, CHART_STYLE } from './shared';

export const CompoundInterestCalc = () => {
  const [monthly, setMonthly] = useState(1000);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(30);
  const [inflation, setInflation] = useState(3);

  const data = useMemo(() => compoundInterest(monthly, rate, years, inflation), [monthly, rate, years, inflation]);
  const hasInfl = inflation > 0;

  // první rok, kdy má portfolio hodnotu aspoň 1,5násobku vkladů
  const turnIdx = useMemo(() => {
    const i = data.findIndex(r => r.noInvest > 0 && r.invested / r.noInvest >= 1.5);
    return i === -1 ? null : i;
  }, [data]);

  const option = useMemo(() => moneyLineChart({
    labels: data.map(r => (r.year === 0 ? 'Dnes' : yearsText(r.year))),
    markIndex: turnIdx,
    lines: [
      { name: 'Investováno', data: data.map(r => r.invested), color: CHART.up, main: true },
      ...(hasInfl ? [{ name: 'Po inflaci', data: data.map(r => r.investedAfterInflation ?? null), color: CHART.cyan, dashed: true }] : []),
      { name: 'Jen spořeno', data: data.map(r => r.noInvest), color: CHART.axis, dashed: true },
      ...(hasInfl ? [{ name: 'Pod polštářem', data: data.map(r => r.mattressReal ?? null), color: CHART.down }] : []),
    ],
  }), [data, hasInfl, turnIdx]);

  const lastRow = data[data.length - 1];
  const finalValue = lastRow?.invested ?? 0;
  const finalDeposits = lastRow?.noInvest ?? 0;
  const gain = Math.max(0, finalValue - finalDeposits);
  const multiple = finalDeposits > 0 ? (finalValue / finalDeposits).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) : '—';
  const realValue = lastRow?.investedAfterInflation;
  const gainShare = finalValue > 0 ? Math.round((gain / finalValue) * 100) : 0;

  return (
    <div className="tl-calc">
      <div className="tl-calc__grid">
        <div className="tl-inputs">
          <NumberField label="Měsíční vklad" suffix="Kč" value={monthly} onChange={setMonthly}
            min={0} max={200000} sliderMin={500} sliderMax={50000} step={500} />
          <NumberField label="Roční výnos" suffix="%" value={rate} onChange={setRate}
            min={0} max={20} sliderMin={1} sliderMax={15} step={0.5} decimals={1} />
          <NumberField label="Doba spoření" suffix="let" value={years} onChange={setYears}
            min={1} max={60} sliderMin={1} sliderMax={50} step={1} />
          <NumberField label="Inflace" suffix="%" value={inflation} onChange={setInflation}
            min={0} max={20} sliderMin={0} sliderMax={10} step={0.5} decimals={1} />
        </div>

        <div className="tl-out">
          <p className="ui-hero-num tl-hero">
            <span className="ui-hero-num__label">Za {yearsText(years)} můžeš mít</span>
            {kc(finalValue)}
          </p>
          <dl className="ui-kpis">
            <div>
              <dt>Vložíš celkem</dt>
              <dd>{kc(finalDeposits)}</dd>
            </div>
            <div>
              <dt>Výnosy navíc</dt>
              <dd className="is-up">+{kc(gain)}<small>{multiple}× vklad</small></dd>
            </div>
            {hasInfl && realValue != null && (
              <div>
                <dt>V dnešních cenách</dt>
                <dd>{kc(realValue)}<small>po inflaci {pct(inflation)}</small></dd>
              </div>
            )}
          </dl>
          <div className="tl-chart">
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} bare />}>
              <ReactECharts option={option} style={CHART_STYLE} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>
          <div className="tl-read">
            <p>
              Když budeš {yearsText(years)} odkládat {kc(monthly)} měsíčně při výnosu {pct(rate)} ročně,
              vložíš {kc(finalDeposits)} a {gainShare > 0 ? <>výnosy přidají dalších {kc(gain)} — to je {pct(gainShare, 0)} výsledku.</> : <>výnosy nepřidají nic.</>}
              {turnIdx != null && <> Svislá čára v grafu označuje rok, kdy má portfolio poprvé hodnotu aspoň 1,5násobku vkladů ({turnIdx}.{'\u00a0'}rok).</>}
            </p>
            <p className="ui-small">
              Orientační výpočet: výnos je každý rok stejný, vklad jde na začátku měsíce, bez poplatků a daní.
              Skutečné trhy kolísají a žádný výnos není zaručený.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
