import { useState, useMemo, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { CHART } from '../../utils/chartTheme';
import { NumberField } from '../NumberField';
import { kc, pct, yearsText, moneyLineChart, CHART_HEIGHT, CHART_STYLE } from '../calculators/shared';

/* ════════════════════════════════════════════════════════════
   Interaktivní nástroje k tématům Akademie (akcie-etf, inflace, riziko).
   Stejná stavba jako kalkulačky: zadání vlevo, výsledek vpravo.
   ════════════════════════════════════════════════════════════ */

// ── akcie-etf: tři základní nástroje vedle sebe ──
const INSTRUMENTS: { name: string; what: string; ret: string; risk: string }[] = [
  { name: 'Akcie', what: 'Podíl v jedné firmě', ret: 'Vysoký', risk: 'Vysoké' },
  { name: 'Dluhopisy', what: 'Půjčka státu nebo firmě', ret: 'Nižší', risk: 'Nízké' },
  { name: 'ETF', what: 'Koš stovek akcií najednou', ret: 'Tržní', risk: 'Rozložené' },
];

export const StocksComparison: React.FC = () => (
  <div className="tl-calc">
    <p className="ui-h3">Tři základní stavební kameny</p>
    <div className="ui-table-wrap tl-compare">
      <table className="ui-table">
        <thead>
          <tr>
            <th scope="col">Nástroj</th>
            <th scope="col">Co kupuješ</th>
            <th scope="col">Výnos</th>
            <th scope="col">Riziko</th>
          </tr>
        </thead>
        <tbody>
          {INSTRUMENTS.map(i => (
            <tr key={i.name}>
              <th scope="row">{i.name}</th>
              <td>{i.what}</td>
              <td>{i.ret}</td>
              <td>{i.risk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="tl-read">
      <p>
        Tržní výnos znamená, že ETF kopíruje vývoj celého trhu. Rozložené riziko znamená, že peníze jsou
        rozprostřené do desítek až stovek firem, takže pád jedné z nich bolí méně.
      </p>
    </div>
  </div>
);

// ── inflace: kolik zbude z úspor, které jen leží ──
const INVEST_RATE = 7; // % ročně, srovnávací investice

export const InflationTool: React.FC = () => {
  const [amount, setAmount] = useState(100000);
  const [infl, setInfl] = useState(3);
  const [years, setYears] = useState(20);

  const rows = useMemo(() => {
    const out: { year: number; invested: number; afterInfl: number; noInvest: number; mattress: number }[] = [];
    let inv = amount;
    const mr = INVEST_RATE / 100 / 12;
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
  const lost = amount - realFinal;
  const lostShare = amount > 0 ? (lost / amount) * 100 : 0;
  const last = rows[rows.length - 1];

  const option = useMemo(() => moneyLineChart({
    labels: rows.map(r => (r.year === 0 ? 'Dnes' : yearsText(r.year))),
    lines: [
      { name: 'Pod polštářem', data: rows.map(r => r.mattress), color: CHART.down, main: true },
      { name: 'Bez investice', data: rows.map(r => r.noInvest), color: CHART.axis, dashed: true },
      { name: 'Investováno', data: rows.map(r => r.invested), color: CHART.up },
      { name: 'Po inflaci', data: rows.map(r => r.afterInfl), color: CHART.cyan, dashed: true },
    ],
  }), [rows]);

  return (
    <div className="tl-calc">
      <p className="ui-h3 tl-calc__title">Jak inflace ukrajuje z úspor</p>
      <div className="tl-calc__grid">
        <div className="tl-inputs">
          <NumberField label="Částka" suffix="Kč" value={amount} onChange={setAmount}
            min={0} max={10000000} sliderMin={1000} sliderMax={500000} step={1000} />
          <NumberField label="Inflace" suffix="%" value={infl} onChange={setInfl}
            min={0} max={20} sliderMin={1} sliderMax={8} step={0.5} decimals={1} />
          <NumberField label="Doba" suffix="let" value={years} onChange={setYears}
            min={1} max={60} sliderMin={5} sliderMax={40} step={1} />
        </div>

        <div className="tl-out">
          <p className="ui-hero-num tl-hero">
            <span className="ui-hero-num__label">Za {yearsText(years)} si za ně koupíš tolik, co dnes za</span>
            {kc(realFinal)}
          </p>
          <dl className="ui-kpis">
            <div>
              <dt>Ztráta kupní síly</dt>
              <dd className="is-down">−{kc(lost)}<small>{pct(lostShare, 0)} hodnoty</small></dd>
            </div>
            <div>
              <dt>Kdyby byly investované</dt>
              <dd className="is-up">{kc(last?.invested ?? 0)}<small>při výnosu {pct(INVEST_RATE, 0)} ročně</small></dd>
            </div>
            <div>
              <dt>Investice v dnešních cenách</dt>
              <dd>{kc(last?.afterInfl ?? 0)}</dd>
            </div>
          </dl>
          <div className="tl-chart">
            <Suspense fallback={<ChartSkeleton height={CHART_HEIGHT} bare />}>
              <ReactECharts option={option} style={CHART_STYLE} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>
          <div className="tl-read">
            <p>
              Na účtu bude pořád {kc(amount)}, jenže při inflaci {pct(infl)} ročně za ně za {yearsText(years)} pořídíš
              jen to, co dnes za {kc(realFinal)}. Investované peníze by inflaci dohnaly a ještě něco přidaly.
            </p>
            <p className="ui-small">
              Počítáme se stejnou inflací každý rok a se stálým výnosem investice {pct(INVEST_RATE, 0)} ročně, bez
              poplatků a daní. Inflace v Česku bývá dlouhodobě kolem 2–3 %.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── riziko: tři profily a příklad rozložení ──
type Profile = 'Konzervativní' | 'Vyvážený' | 'Dynamický';

const PROFILES: { id: Profile; hint: string }[] = [
  { id: 'Konzervativní', hint: 'Propad o 10 % mi nedá spát.' },
  { id: 'Vyvážený', hint: 'Výkyvy snesu, když vím, že jsou dočasné.' },
  { id: 'Dynamický', hint: 'Propad o 30 % přečkám, mám na to roky.' },
];

export const RiskProfile: React.FC = () => {
  const [profile, setProfile] = useState<Profile>('Vyvážený');
  const alloc: Record<string, [number, number, number]> = {
    'Konzervativní': [30, 50, 20],
    'Vyvážený': [60, 30, 10],
    'Dynamický': [85, 12, 3],
  };
  const labels: [string, string][] = [
    ['Akcie a ETF', 'stocks'],
    ['Dluhopisy', 'bonds'],
    ['Hotovost a rezerva', 'cash'],
  ];
  const current = alloc[profile];
  const summary: Record<string, string> = {
    'Konzervativní': 'Konzervativní profil dává přednost klidu před výnosem. Větší podíl dluhopisů a hotovosti tlumí výkyvy.',
    'Vyvážený': 'Vyvážený profil hledá rozumný kompromis mezi růstem a klidným spánkem.',
    'Dynamický': 'Dynamický profil sází na dlouhodobý růst a snese i hlubší propady cestou za vyšším výnosem.',
  };

  return (
    <div className="tl-calc">
      <p className="ui-h3 tl-calc__title">Najdi svůj investiční profil</p>
      <div className="tl-calc__grid">
        <fieldset className="tl-fieldset">
          <legend className="tl-fieldset__legend">Jak snášíš výkyvy hodnoty?</legend>
          <div className="ui-choices">
            {PROFILES.map(p => (
              <label key={p.id} className={`ui-choice${profile === p.id ? ' is-selected' : ''}`}>
                <input type="radio" name="risk-profile" checked={profile === p.id} onChange={() => setProfile(p.id)} />
                <span className="tl-choice__text">
                  <strong>{p.id}</strong>
                  <span>{p.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="tl-out" aria-live="polite">
          <p className="ui-hero-num tl-hero">
            <span className="ui-hero-num__label">{profile} profil: podíl akcií a ETF</span>
            {pct(current[0], 0)}
          </p>
          <div className="tl-bars">
            {labels.map(([lab, kind], i) => (
              <div key={lab} className="tl-bars__row">
                <span className="tl-bars__label">{lab}</span>
                <span className="tl-bars__val">{pct(current[i], 0)}</span>
                <div className="tl-bars__track" role="progressbar" aria-valuenow={current[i]} aria-valuemin={0} aria-valuemax={100} aria-label={lab}>
                  <span className={`tl-bars__fill tl-bars__fill--${kind}`} style={{ width: `${current[i]}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tl-read">
            <p>{summary[profile]}</p>
            <p className="ui-small">
              Jde o příklad rozložení, ne o doporučení. Záleží i na tom, na jak dlouho investuješ a jakou máš rezervu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
