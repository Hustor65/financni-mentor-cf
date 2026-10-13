import { useMemo, useState, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { NumberField } from '../NumberField';
import { CHART, tooltipBase, axisLabel } from '../../utils/chartTheme';
import { blackScholes, legPayoff } from '../../utils/finance';
import type { OptionLeg } from '../../utils/finance';

/* ════════════════════════════════════════════════════════════
   Opční laboratoř — výplatní diagram strategie při expiraci,
   teoretická cena dnes (Black–Scholes) a řecká písmena.
   Vše na 1 akcii podkladu (skutečný kontrakt bývá na 100 kusů).
   ════════════════════════════════════════════════════════════ */

interface Strategy {
  id: string;
  name: string;
  /** strike jako násobek ceny podkladu */
  legs: { type: OptionLeg['type']; k: number; qty: number }[];
  view: string;
  text: string;
}

const STRATEGIES: Strategy[] = [
  {
    id: 'long-call', name: 'Koupený call', legs: [{ type: 'call', k: 1, qty: 1 }],
    view: 'Čekáš růst',
    text: 'Platíš prémii za právo koupit akcii za strike. Když cena vyroste, vyděláváš neomezeně; když ne, přijdeš nanejvýš o prémii. Čas hraje proti tobě — opce každý den ztrácí hodnotu.',
  },
  {
    id: 'long-put', name: 'Koupený put', legs: [{ type: 'put', k: 1, qty: 1 }],
    view: 'Čekáš pokles',
    text: 'Platíš prémii za právo prodat akcii za strike. Vyděláváš, když cena klesne pod strike o víc, než kolik stála prémie. Ztráta je omezená na prémii.',
  },
  {
    id: 'covered-call', name: 'Krytý call', legs: [{ type: 'stock', k: 1, qty: 1 }, { type: 'call', k: 1.08, qty: -1 }],
    view: 'Čekáš klid nebo mírný růst',
    text: 'Držíš akcii a vypíšeš na ni call. Inkasuješ prémii, ale vzdáváš se zisku nad strikem. Proti propadu akcie tě prémie chrání jen o svou výši.',
  },
  {
    id: 'protective-put', name: 'Ochranný put', legs: [{ type: 'stock', k: 1, qty: 1 }, { type: 'put', k: 0.92, qty: 1 }],
    view: 'Držíš akcii a bojíš se propadu',
    text: 'Pojistka na akcii, kterou držíš. Put ti zaručí prodejní cenu, takže ztráta má dno. Platíš za to prémii — stejně jako u pojistky ji většinou „propálíš“.',
  },
  {
    id: 'bull-spread', name: 'Bull call spread', legs: [{ type: 'call', k: 0.97, qty: 1 }, { type: 'call', k: 1.08, qty: -1 }],
    view: 'Čekáš mírný růst',
    text: 'Koupíš call s nižším strikem a prodáš call s vyšším. Prodaný call ti zlevní vstup, ale zastropuje zisk. Zisk i ztráta jsou předem omezené.',
  },
  {
    id: 'straddle', name: 'Straddle', legs: [{ type: 'call', k: 1, qty: 1 }, { type: 'put', k: 1, qty: 1 }],
    view: 'Čekáš velký pohyb, nevíš kam',
    text: 'Koupíš call i put se stejným strikem. Vyděláš, když se cena výrazně pohne kterýmkoli směrem. Když zůstane na místě, ztrácíš obě prémie — je to sázka na volatilitu.',
  },
  {
    id: 'iron-condor', name: 'Iron condor',
    legs: [{ type: 'put', k: 0.85, qty: 1 }, { type: 'put', k: 0.93, qty: -1 }, { type: 'call', k: 1.07, qty: -1 }, { type: 'call', k: 1.15, qty: 1 }],
    view: 'Čekáš, že se nic nestane',
    text: 'Vypíšeš put a call kolem aktuální ceny a dál od ní si koupíš ochranu. Inkasuješ prémii a vyděláš, když cena zůstane v pásmu. Zisk i ztráta jsou omezené.',
  },
];

const LEG_LABEL: Record<OptionLeg['type'], string> = { call: 'Call', put: 'Put', stock: 'Akcie' };
const fmt = (v: number, d = 2) => v.toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (v: number, d = 2) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v), d)}`;

export const OptionsLab: React.FC = () => {
  const [strategyId, setStrategyId] = useState('long-call');
  const [spot, setSpot] = useState(100);
  const [vol, setVol] = useState(25);
  const [days, setDays] = useState(60);
  const [rate, setRate] = useState(4);
  // ruční úprava striků: klíč = `${strategyId}:${index nohy}`
  const [strikeEdits, setStrikeEdits] = useState<Record<string, number>>({});

  const strategy = STRATEGIES.find(s => s.id === strategyId)!;

  const model = useMemo(() => {
    const t = days / 365;
    const sigma = vol / 100;
    const r = rate / 100;
    const legs = strategy.legs.map((l, i) => {
      const strike = strikeEdits[`${strategy.id}:${i}`] ?? Math.round(spot * l.k);
      const leg: OptionLeg = { type: l.type, strike, qty: l.qty };
      const quote = l.type === 'stock' ? null : blackScholes(l.type, spot, strike, t, sigma, r);
      return { leg, premium: quote?.price ?? 0, quote };
    });

    // čistá cena opcí: + = platíš (debet), − = dostáváš (kredit)
    const cost = legs.reduce((sum, l) => sum + l.leg.qty * l.premium, 0);
    const greeks = legs.reduce((g, l) => {
      if (!l.quote) return { ...g, delta: g.delta + l.leg.qty };
      return {
        delta: g.delta + l.leg.qty * l.quote.delta,
        gamma: g.gamma + l.leg.qty * l.quote.gamma,
        theta: g.theta + l.leg.qty * l.quote.theta,
        vega: g.vega + l.leg.qty * l.quote.vega,
      };
    }, { delta: 0, gamma: 0, theta: 0, vega: 0 });

    const atExpiry = (s: number) => legs.reduce((sum, l) => sum + legPayoff(l.leg, l.premium, s, spot), 0);
    const today = (s: number) => legs.reduce((sum, l) => {
      if (l.leg.type === 'stock') return sum + l.leg.qty * (s - spot);
      return sum + l.leg.qty * (blackScholes(l.leg.type, s, l.leg.strike, t, sigma, r).price - l.premium);
    }, 0);

    const lo = spot * 0.55;
    const hi = spot * 1.45;
    const N = 180;
    const xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
    const expiry = xs.map(atExpiry);
    const now = xs.map(today);

    // body zvratu: kde výplata při expiraci protne nulu
    const breakevens: number[] = [];
    for (let i = 1; i < xs.length; i++) {
      if ((expiry[i - 1] < 0 && expiry[i] >= 0) || (expiry[i - 1] >= 0 && expiry[i] < 0)) {
        const ratio = Math.abs(expiry[i - 1]) / (Math.abs(expiry[i - 1]) + Math.abs(expiry[i]));
        breakevens.push(xs[i - 1] + (xs[i] - xs[i - 1]) * ratio);
      }
    }

    // max zisk / ztráta: zlomy výplaty jsou jen ve stricích; za posledním strikem rozhoduje sklon
    const strikes = legs.filter(l => l.leg.type !== 'stock').map(l => l.leg.strike);
    const probes = [0, ...strikes].map(atExpiry);
    const slopeUp = legs.reduce((s, l) => s + (l.leg.type === 'put' ? 0 : l.leg.qty), 0);
    const maxProfit = slopeUp > 1e-9 ? Infinity : Math.max(...probes);
    const maxLoss = slopeUp < -1e-9 ? -Infinity : Math.min(...probes);

    return { legs, cost, greeks, xs, expiry, now, breakevens, maxProfit, maxLoss };
  }, [strategy, spot, vol, days, rate, strikeEdits]);

  const option = useMemo(() => ({
    aria: { enabled: true },
    animationDuration: 400,
    animationDurationUpdate: 200,
    grid: { left: 8, right: 20, top: 24, bottom: 62, containLabel: true },
    tooltip: {
      ...tooltipBase, trigger: 'axis',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        const i = params[0]?.dataIndex ?? 0;
        return `<div style="font-weight:700;margin-bottom:4px">Cena akcie ${fmt(model.xs[i], 0)}</div>`
          + `<div>Při expiraci: <b>${signed(model.expiry[i])}</b></div>`
          + `<div style="color:${CHART.axis}">Dnes (teoreticky): ${signed(model.now[i])}</div>`;
      },
    },
    legend: {
      bottom: 0, left: 'center', itemWidth: 16, itemHeight: 2, icon: 'rect',
      textStyle: { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 },
      data: ['Při expiraci', 'Dnes'],
    },
    xAxis: {
      type: 'value', min: Math.round(model.xs[0]), max: Math.round(model.xs[model.xs.length - 1]),
      name: 'Cena akcie při expiraci', nameLocation: 'middle', nameGap: 28,
      nameTextStyle: { color: CHART.axis, fontFamily: CHART.font, fontSize: 12 },
      axisLine: { lineStyle: { color: CHART.axisLine } }, axisTick: { show: false },
      axisLabel: { ...axisLabel, showMinLabel: false, showMaxLabel: false, formatter: (v: number) => fmt(v, 0) }, splitLine: { show: false },
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { ...axisLabel, formatter: (v: number) => signed(v, 0) },
      splitLine: { lineStyle: { color: CHART.grid } },
    },
    series: [
      {
        name: 'Při expiraci', type: 'line', data: model.xs.map((x, i) => [x, model.expiry[i]]), showSymbol: false,
        lineStyle: { width: 2.4, color: CHART.text }, itemStyle: { color: CHART.text },
        markLine: {
          symbol: 'none', silent: true,
          data: [
            { yAxis: 0, lineStyle: { color: 'rgba(220,230,242,0.45)', type: 'solid', width: 1 }, label: { show: false } },
            {
              xAxis: spot,
              lineStyle: { color: CHART.cyan, type: 'dashed', width: 1 },
              label: { formatter: 'cena dnes', color: CHART.cyan, fontFamily: CHART.font, fontSize: 11, position: 'insideEndTop' },
            },
          ],
        },
      },
      // zisková a ztrátová plocha zvlášť (zelená nad nulou, červená pod ní)
      {
        name: 'zisk', type: 'line', data: model.xs.map((x, i) => [x, Math.max(0, model.expiry[i])]), showSymbol: false, silent: true,
        lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(16,185,129,0.22)' }, tooltip: { show: false },
      },
      {
        name: 'ztráta', type: 'line', data: model.xs.map((x, i) => [x, Math.min(0, model.expiry[i])]), showSymbol: false, silent: true,
        lineStyle: { opacity: 0 }, areaStyle: { color: 'rgba(240,97,122,0.22)' }, tooltip: { show: false },
      },
      {
        name: 'Dnes', type: 'line', data: model.xs.map((x, i) => [x, model.now[i]]), showSymbol: false,
        lineStyle: { width: 1.5, type: 'dashed', color: CHART.axis }, itemStyle: { color: CHART.axis },
      },
    ],
  }), [model, spot]);

  const { cost, greeks, breakevens, maxProfit, maxLoss } = model;

  return (
    <div className="lab">
      <div className="ui-split">
        <div className="ui-stack lab-inputs">
          <div className="ui-field">
            <label htmlFor="opt-strategy">Strategie</label>
            <select id="opt-strategy" value={strategyId} onChange={e => setStrategyId(e.target.value)}>
              {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <small>Hodí se, když: {strategy.view.charAt(0).toLowerCase() + strategy.view.slice(1)}.</small>
          </div>

          <NumberField label="Cena akcie dnes" value={spot} onChange={setSpot} min={1} sliderMin={10} sliderMax={500} step={1} />
          <NumberField label="Volatilita (ročně)" suffix="%" value={vol} onChange={setVol} min={1} max={200} sliderMin={5} sliderMax={90} step={1} />
          <NumberField label="Do expirace" suffix="dní" value={days} onChange={setDays} min={1} max={1095} sliderMin={1} sliderMax={365} step={1} />
          <NumberField label="Bezriziková sazba" suffix="%" value={rate} onChange={setRate} min={0} max={30} sliderMin={0} sliderMax={10} step={0.25} decimals={2} />

          <div className="lab-legs">
            <h3 className="ui-h3">Z čeho se strategie skládá</h3>
            <p className="ui-small">Na jednu akcii. Strike si můžeš přepsat.</p>
            <table className="ui-table lab-legs__table">
              <thead>
                <tr><th scope="col">Pozice</th><th scope="col">Strike</th><th scope="col">Cena</th></tr>
              </thead>
              <tbody>
                {model.legs.map((l, i) => (
                  <tr key={i}>
                    <th scope="row">
                      <span className={l.leg.qty > 0 ? 'is-up' : 'is-down'}>{l.leg.qty > 0 ? 'Koupeno' : 'Vypsáno'}</span>
                      <span className="lab-legs__type">{LEG_LABEL[l.leg.type]}</span>
                    </th>
                    <td>
                      {l.leg.type === 'stock' ? '—' : (
                        <input
                          className="ui-input lab-legs__strike" type="number" min={1} step={1} value={l.leg.strike}
                          aria-label={`Strike: ${LEG_LABEL[l.leg.type]} ${i + 1}`}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v) && v > 0) setStrikeEdits(s => ({ ...s, [`${strategy.id}:${i}`]: v }));
                          }}
                        />
                      )}
                    </td>
                    <td>{l.leg.type === 'stock' ? fmt(spot) : fmt(l.premium)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ui-stack ui-stack--l lab-result" aria-live="polite">
          <div className="ui-stack">
            <p className="ui-hero-num">
              <span className="ui-hero-num__label">{cost >= 0 ? 'Za opce dnes zaplatíš' : 'Za opce dnes dostaneš'}</span>
              {fmt(Math.abs(cost))}
            </p>
            <dl className="ui-kpis">
              <div>
                <dt>Nejvyšší zisk</dt>
                <dd className="is-up">{maxProfit === Infinity ? 'neomezený' : signed(maxProfit)}</dd>
              </div>
              <div>
                <dt>Nejvyšší ztráta</dt>
                <dd className="is-down">{maxLoss === -Infinity ? 'neomezená' : signed(maxLoss)}</dd>
              </div>
              <div>
                <dt>{breakevens.length > 1 ? 'Body zvratu' : 'Bod zvratu'}</dt>
                <dd>{breakevens.length ? breakevens.map(b => fmt(b, 1)).join(' a ') : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="lab-chart">
            <h3 className="ui-h3">Zisk nebo ztráta podle ceny akcie</h3>
            <Suspense fallback={<ChartSkeleton height={340} bare />}>
              <ReactECharts option={option} style={{ height: 340 }} opts={{ renderer: 'canvas' }} />
            </Suspense>
          </div>

          <p className="ui-note"><strong>{strategy.name}.</strong> {strategy.text}</p>

          <section aria-label="Řecká písmena">
            <h3 className="ui-h3">Jak citlivá je pozice</h3>
            <dl className="ui-kpis lab-greeks">
              <div>
                <dt>Delta</dt>
                <dd>{signed(greeks.delta)}<small>Změna hodnoty, když akcie vyroste o 1.</small></dd>
              </div>
              <div>
                <dt>Gamma</dt>
                <dd>{signed(greeks.gamma, 4)}<small>O kolik se při tom změní sama delta.</small></dd>
              </div>
              <div>
                <dt>Theta za den</dt>
                <dd>{signed(greeks.theta, 3)}<small>Co pozice ztratí nebo získá tím, že uplyne den.</small></dd>
              </div>
              <div>
                <dt>Vega</dt>
                <dd>{signed(greeks.vega, 3)}<small>Změna hodnoty, když volatilita vyroste o 1 procentní bod.</small></dd>
              </div>
            </dl>
          </section>

          <p className="ui-small lab-assume">
            Ceny počítá model Black–Scholes pro evropské opce bez dividend. Skutečný trh se liší (dividendy,
            americké opce, rozdílná volatilita pro různé striky). Vypsané opce mohou znamenat ztrátu
            vyšší, než kolik jsi vložil.
          </p>
        </div>
      </div>
    </div>
  );
};
