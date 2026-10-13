import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { compoundInterest } from '../../utils/calculators';
import { CHART } from '../../utils/chartTheme';
import { NumberField } from '../NumberField';
import { kc, pct, yearsText, moneyLineChart, CHART_HEIGHT, CHART_STYLE } from './shared';

/**
 * Obrácená kalkulačka složeného úročení — z cíle spočítá měsíční vklad.
 * PMT = FV / ( ((1+r)^n − 1)/r × (1+r) )  [anuita-due, vklad na začátku měsíce]
 */
export const GoalCalc = () => {
  const [goal, setGoal] = useState(60_000);
  const [years, setYears] = useState(2);
  const [rate, setRate] = useState(7);

  const { monthly, invested, gain } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = Math.max(1, years * 12);
    const m = r === 0 ? goal / n : goal / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const monthlyRounded = Math.max(0, Math.ceil(m));
    const inv = monthlyRounded * n;
    // Výnos počítáme z REÁLNÉ budoucí hodnoty zaokrouhleného vkladu (ne z cíle),
    // aby „vložíš + výnosy“ = skutečně naspořená částka (= konec grafu). Při ceil
    // vkladu totiž FV mírně přesáhne cíl, takže gain = goal − inv by byl podhodnocený.
    const realFV = r === 0 ? inv : monthlyRounded * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    return { monthly: monthlyRounded, invested: inv, gain: Math.max(0, Math.round(realFV) - inv) };
  }, [goal, years, rate]);

  // Graf: jak hodnota roste k cíli (vodorovná čára = cíl).
  const option = useMemo(() => {
    const rows = compoundInterest(monthly, rate, years, 0);
    return moneyLineChart({
      labels: rows.map(r => (r.year === 0 ? 'Dnes' : yearsText(r.year))),
      target: { value: goal, label: `Cíl ${kc(goal)}` },
      lines: [
        { name: 'Hodnota', data: rows.map(r => r.invested), color: CHART.up, main: true },
        { name: 'Vloženo', data: rows.map(r => r.noInvest), color: CHART.axis, dashed: true },
      ],
    });
  }, [monthly, rate, years, goal]);

  return (
    <div className="tl-calc">
      <p className="ui-h3 tl-calc__title">Kolik odkládat na svůj cíl</p>
      <div className="tl-calc__grid">
        <div className="tl-inputs">
          <NumberField label="Cílová částka" suffix="Kč" value={goal} onChange={setGoal}
            min={10000} max={100000000} sliderMin={10000} sliderMax={5000000} step={10000} />
          <NumberField label="Za kolik let" suffix="let" value={years} onChange={setYears}
            min={1} max={60} sliderMin={1} sliderMax={40} step={1} />
          <NumberField label="Roční výnos" suffix="%" value={rate} onChange={setRate}
            min={0} max={20} sliderMin={1} sliderMax={15} step={0.5} decimals={1} />
        </div>

        <div className="tl-out">
          <p className="ui-hero-num tl-hero" aria-live="polite">
            <span className="ui-hero-num__label">Měsíčně odkládej</span>
            {kc(monthly)}
          </p>
          <dl className="ui-kpis">
            <div>
              <dt>Vložíš celkem</dt>
              <dd>{kc(invested)}</dd>
            </div>
            <div>
              <dt>Výnosy přidají</dt>
              <dd className="is-up">+{kc(gain)}</dd>
            </div>
            <div>
              <dt>Na konci budeš mít</dt>
              <dd>{kc(invested + gain)}</dd>
            </div>
          </dl>
          <div className="tl-chart">
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} bare />}>
              <ReactECharts option={option} style={CHART_STYLE} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>
          <div className="tl-read">
            <p>
              Na {kc(goal)} za {yearsText(years)} stačí při výnosu {pct(rate)} ročně odkládat {kc(monthly)} měsíčně.
              Čím delší doba, tím větší část cíle za tebe odpracují výnosy.
            </p>
            <p className="ui-small">
              Vklad je zaokrouhlený na celé koruny nahoru, proto výsledek cíl o něco přesáhne. Počítáme se stálým
              výnosem, bez poplatků, daní a inflace. Skutečný výnos kolísá a není zaručený.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
