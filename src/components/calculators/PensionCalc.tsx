import React, { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { czStatePension, czRetirementAgeMonths } from '../../utils/calculators';
import { PENSION_AVG_WAGE_2026 } from '../../data/constants';
import { CHART } from '../../utils/chartTheme';
import { NumberField } from '../NumberField';
import { kc, pct, moneyLineChart, CHART_HEIGHT, CHART_STYLE } from './shared';

const PROJ_YEARS = 15;
const PROJ_START = 2026;
const PROJ_GROWTH = 0.04;   // roční valorizace důchodu
const PROJ_INFLATION = 0.03;

export const PensionCalc: React.FC = () => {
  const [salary, setSalary] = useState(PENSION_AVG_WAGE_2026);
  const [yearsIns, setYearsIns] = useState(40);
  const [birthYear, setBirthYear] = useState(1990);

  const result = useMemo(() => czStatePension(salary, yearsIns), [salary, yearsIns]);
  const retirementAge = useMemo(() => czRetirementAgeMonths(birthYear), [birthYear]);
  const retYears = Math.floor(retirementAge / 12);
  const retMonths = retirementAge % 12;
  // Poměr má smysl jen pro mzdu v podporovaném rozsahu (>= sliderMin). Pod ním
  // (zadáno ručně textem) by spodní hranice důchodu dala nesmyslné % (mzda 100 →
  // 5 670 %), proto zobrazíme „—“.
  const replacementRatio = salary >= 10000 ? Math.round((result.total / salary) * 100) : null;

  const projOption = useMemo(() => {
    const years = Array.from({ length: PROJ_YEARS + 1 }, (_, i) => PROJ_START + i);
    const nominal = years.map((_, i) => Math.round(result.total * Math.pow(1 + PROJ_GROWTH, i)));
    const real = years.map((_, i) => Math.round(result.total * Math.pow(1 + PROJ_GROWTH, i) * Math.pow(1 / (1 + PROJ_INFLATION), i)));
    return moneyLineChart({
      labels: years.map(String),
      lines: [
        { name: 'Důchod v korunách', data: nominal, color: CHART.up, main: true },
        { name: 'V dnešních cenách', data: real, color: CHART.cyan, dashed: true },
      ],
    });
  }, [result.total]);

  return (
    <div className="tl-calc">
      <div className="tl-calc__grid">
        <div className="tl-inputs">
          <NumberField label="Hrubá měsíční mzda" suffix="Kč" value={salary} onChange={setSalary}
            min={0} max={1000000} sliderMin={10000} sliderMax={150000} step={1000} />
          <NumberField label="Doba pojištění" suffix="let" value={yearsIns} onChange={setYearsIns}
            min={0} max={60} sliderMin={15} sliderMax={50} step={1} />
          <NumberField label="Ročník narození" plain value={birthYear} onChange={setBirthYear}
            min={1940} max={2010} sliderMin={1960} sliderMax={2010} step={1} />
        </div>

        <div className="tl-out">
          <p className="ui-hero-num tl-hero">
            <span className="ui-hero-num__label">Odhad státního důchodu měsíčně</span>
            {kc(result.total)}
          </p>
          <dl className="ui-kpis">
            <div>
              <dt>Náhradový poměr</dt>
              <dd className={replacementRatio !== null && replacementRatio >= 50 ? 'is-up' : undefined}>
                {replacementRatio !== null ? pct(replacementRatio, 0) : '—'}
                <small>tolik z dnešní mzdy ti zůstane</small>
              </dd>
            </div>
            <div>
              <dt>Důchodový věk</dt>
              <dd>{retYears} let{retMonths > 0 ? ` a ${retMonths} měs.` : ''}</dd>
            </div>
            <div>
              <dt>Základní výměra</dt>
              <dd>{kc(result.baseAmount)}</dd>
            </div>
            <div>
              <dt>Procentní výměra</dt>
              <dd>{kc(result.percentAmount)}</dd>
            </div>
          </dl>
          <div className="tl-chart">
            <p className="tl-chart__cap">Jak by důchod rostl v prvních {PROJ_YEARS} letech</p>
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} bare />}>
              <ReactECharts option={projOption} style={CHART_STYLE} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>
          <div className="tl-read">
            <p>
              Důchod se skládá ze základní výměry, kterou dostane každý, a z procentní výměry podle výdělku a
              odpracovaných let.{' '}
              {replacementRatio !== null
                ? <>Ze mzdy {kc(salary)} ti stát nahradí zhruba {pct(replacementRatio, 0)}. Zbytek je na tobě.</>
                : <>Zadej mzdu aspoň 10 000 Kč a ukážeme, jakou její část ti důchod nahradí.</>}
            </p>
            <p className="ui-small">
              Zjednodušený odhad podle pravidel ČSSZ pro rok 2026. Jako osobní vyměřovací základ bereme tvoji dnešní
              hrubou mzdu, bez indexace dřívějších výdělků. Graf počítá s valorizací {pct(PROJ_GROWTH * 100, 0)} a
              inflací {pct(PROJ_INFLATION * 100, 0)} ročně. Skutečný důchod se může lišit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
