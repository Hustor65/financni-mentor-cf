import { useMemo, useState, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { ChartSkeleton } from '../ChartSkeleton';
import { NumberField } from '../NumberField';
import { CHART, tooltipBase, axisLabel } from '../../utils/chartTheme';
import { dcf } from '../../utils/finance';

/* ════════════════════════════════════════════════════════════
   DCF — vnitřní hodnota akcie z budoucích cash flow.
   Hlavní poučení je citlivostní tabulka: malá změna předpokladů
   pohne výsledkem o desítky procent.
   ════════════════════════════════════════════════════════════ */

const fmt = (v: number, d = 0) => v.toLocaleString('cs-CZ', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Z Trhů přijde název a cena akcie (sessionStorage); platí jen pro tohle jedno otevření. */
function fromMarket(): { name: string; price: number } | null {
  try {
    const raw = sessionStorage.getItem('fm-dcf');
    if (!raw) return null;
    sessionStorage.removeItem('fm-dcf');
    const v = JSON.parse(raw) as { name?: unknown; price?: unknown };
    return typeof v.name === 'string' && typeof v.price === 'number' && v.price > 0 ? { name: v.name, price: v.price } : null;
  } catch { return null; }
}

export const DcfCalc: React.FC = () => {
  const [imported] = useState(fromMarket);
  const [fcf, setFcf] = useState(6);
  const [growth, setGrowth] = useState(9);
  const [years, setYears] = useState(10);
  const [terminal, setTerminal] = useState(2.5);
  const [discount, setDiscount] = useState(9);
  const [price, setPrice] = useState(() => (imported ? Math.round(imported.price * 100) / 100 : 150));

  const result = useMemo(() => dcf(fcf, growth, years, terminal, discount), [fcf, growth, years, terminal, discount]);
  const margin = price > 0 && result.valid ? (result.value / price - 1) * 100 : null;
  const terminalShare = result.value > 0 ? (result.terminalPv / result.value) * 100 : 0;

  // citlivost: diskontní sazba (řádky) × růst (sloupce)
  const sensitivity = useMemo(() => {
    const growths = [growth - 3, growth, growth + 3];
    const discounts = [discount - 1.5, discount, discount + 1.5];
    return {
      growths,
      rows: discounts.map(d => ({ discount: d, values: growths.map(g => dcf(fcf, g, years, terminal, d)) })),
    };
  }, [fcf, growth, years, terminal, discount]);

  const option = useMemo(() => ({
    aria: { enabled: true },
    animationDuration: 400,
    animationDurationUpdate: 200,
    grid: { left: 8, right: 16, top: 20, bottom: 30, containLabel: true },
    tooltip: {
      ...tooltipBase, trigger: 'axis', axisPointer: { type: 'shadow' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any[]) => {
        const i = params[0]?.dataIndex ?? 0;
        if (i === result.years.length) return `<b>Pokračující hodnota</b><br/>Všechny roky po ${result.years.length}. roce dohromady, přepočtené na dnešek: <b>${fmt(result.terminalPv, 1)}</b>`;
        const y = result.years[i];
        return `<b>${y.year}. rok</b><br/>Cash flow na akcii: ${fmt(y.fcf, 2)}<br/>Dnešní hodnota: <b>${fmt(y.pv, 2)}</b>`;
      },
    },
    xAxis: {
      type: 'category', data: [...result.years.map(y => `${y.year}.`), 'Dál'],
      axisLine: { lineStyle: { color: CHART.axisLine } }, axisTick: { show: false }, axisLabel,
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { ...axisLabel, formatter: (v: number) => fmt(v, v < 10 && v % 1 ? 1 : 0) },
      splitLine: { lineStyle: { color: CHART.grid } },
    },
    series: [{
      type: 'bar', barWidth: '58%',
      data: [
        ...result.years.map(y => ({ value: y.pv, itemStyle: { color: CHART.cyanDeep, borderRadius: [3, 3, 0, 0] } })),
        { value: result.terminalPv, itemStyle: { color: CHART.up, borderRadius: [3, 3, 0, 0] } },
      ],
    }],
  }), [result]);

  const above = margin != null && margin >= 0;

  return (
    <div className="lab">
      {imported && (
        <p className="ui-note" role="status">
          Počítáš akcii <strong>{imported.name}</strong>. Cenu na burze jsem předvyplnil ({fmt(imported.price, 2)}).
          Volný cash flow na akcii a očekávaný růst najdeš ve výsledcích firmy, tady jsou jen příklady, které si přepiš.
        </p>
      )}
      <div className="ui-split">
        <div className="ui-stack lab-inputs">
          <NumberField label="Volný cash flow na akcii (dnes)" value={fcf} onChange={setFcf} min={0} sliderMin={0} sliderMax={50} step={0.5} decimals={1} />
          <NumberField label="Růst v příštích letech" suffix="%" value={growth} onChange={setGrowth} min={-20} max={60} sliderMin={0} sliderMax={30} step={0.5} decimals={1} />
          <NumberField label="Jak dlouho tak poroste" suffix="let" value={years} onChange={setYears} min={1} max={20} sliderMin={3} sliderMax={15} step={1} />
          <NumberField label="Věčný růst potom" suffix="%" value={terminal} onChange={setTerminal} min={0} max={6} sliderMin={0} sliderMax={5} step={0.25} decimals={2} />
          <NumberField label="Diskontní sazba (požadovaný výnos)" suffix="%" value={discount} onChange={setDiscount} min={1} max={30} sliderMin={4} sliderMax={16} step={0.25} decimals={2} />
          <NumberField label="Cena akcie na burze" value={price} onChange={setPrice} min={0} sliderMin={0} sliderMax={1000} step={5} />
        </div>

        <div className="ui-stack ui-stack--l lab-result" aria-live="polite">
          {!result.valid ? (
            <p className="ui-note ui-note--warn" role="status">
              <strong>Diskontní sazba musí být vyšší než věčný růst.</strong> Jinak by firma měla
              nekonečnou hodnotu. Zvyš sazbu, nebo sniž věčný růst.
            </p>
          ) : (
            <>
              <div className="ui-stack">
                <p className="ui-hero-num">
                  <span className="ui-hero-num__label">Vnitřní hodnota akcie podle modelu</span>
                  {fmt(result.value, 1)}
                </p>
                <dl className="ui-kpis">
                  <div>
                    <dt>{above ? 'Nad cenou na burze o' : 'Pod cenou na burze o'}</dt>
                    <dd className={above ? 'is-up' : 'is-down'}>{margin == null ? '—' : `${fmt(Math.abs(margin))} %`}</dd>
                  </div>
                  <div><dt>Cena na burze</dt><dd>{fmt(price, price % 1 ? 1 : 0)}</dd></div>
                  <div><dt>Podíl vzdálené budoucnosti</dt><dd>{fmt(terminalShare)} %</dd></div>
                </dl>
              </div>

              <div className="lab-chart">
                <h3 className="ui-h3">Dnešní hodnota cash flow po letech</h3>
                <Suspense fallback={<ChartSkeleton height={280} bare />}>
                  <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
                </Suspense>
              </div>

              <p className="ui-note">
                Akcie je podíl na firmě a firma má hodnotu podle peněz, které v budoucnu vydělá. DCF ty
                peníze odhadne a přepočítá na dnešek, protože koruna za deset let má menší cenu než koruna teď.
                Zelený sloupec je všechno po {years}. roce a tvoří <strong>{fmt(terminalShare)} %</strong> celé
                hodnoty. Většina ceny tedy stojí na odhadu velmi vzdálené budoucnosti.
              </p>

              <section>
                <h3 className="ui-h3">Co když se spleteš v předpokladech</h3>
                <p className="ui-small">Hodnota akcie pro jiný růst (sloupce) a jinou diskontní sazbu (řádky).</p>
                <div className="ui-table-wrap">
                  <table className="ui-table lab-sens">
                    <thead>
                      <tr>
                        <th scope="col">Sazba / růst</th>
                        {sensitivity.growths.map(g => <th scope="col" key={g}>{fmt(g, 1)} %</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.rows.map(r => (
                        <tr key={r.discount}>
                          <th scope="row">{fmt(r.discount, 1)} %</th>
                          {r.values.map((v, i) => {
                            const base = r.discount === discount && sensitivity.growths[i] === growth;
                            return (
                              <td key={i} className={`${base ? 'is-base ' : ''}${v.valid && v.value >= price ? 'is-up' : 'is-down'}`}>
                                {v.valid ? fmt(v.value, 0) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <p className="ui-small lab-assume">
                Zelená čísla vycházejí nad dnešní cenou, červená pod ní; zvýrazněné pole je tvoje zadání.
                Model je jen tak dobrý jako jeho vstupy: stejná firma může vyjít levně i draze podle toho,
                jaký růst a sazbu zadáš. Proto se s DCF pracuje jako s rozmezím, ne s jedním číslem.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
