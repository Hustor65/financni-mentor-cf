import { useEffect, useId, useMemo, useState, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { TradeBox } from '../lab/TradeBox';
import { START_CASH, getData, resetPortfolio, trade, updateData, useUserData } from '../../utils/store';
import { Leaderboard } from '../Leaderboard';
import { TRADABLE, fmtCzk, fmtQty, instrumentName, usePrices, valuePortfolio } from '../../utils/portfolio';
import { fmtDay, fmtPct, typicalAsof } from '../../utils/market';
import { useAccount } from '../../utils/account';
import { CHART, axisLabel, tooltipBase } from '../../utils/chartTheme';
import { ChartSkeleton } from '../ChartSkeleton';
import { usePortfolioHistory } from '../../utils/portfolioHistory';

/* ════════════════════════════════════════════════════════════
   Portfolio na zkoušku — 100 000 virtuálních korun a skutečné
   ceny. Smysl: zažít kolísání a cenu chyb, než půjde o vlastní
   peníze. Titul jde vybrat ze seznamu, nebo zadat jeho ticker.
   ════════════════════════════════════════════════════════════ */

// barvy dílků jen z palety grafů; hotovost má vlastní tlumenou (viz .pp-alloc)
const SHADES = [CHART.cyan, CHART.up, CHART.amber, CHART.violet, CHART.cyanDeep, CHART.text, CHART.down, CHART.axis];
const TICKER_RE = /^[A-Z0-9.^=-]{1,14}$/;
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
/** Na co si začátečník může kliknout hned. */
const QUICK = ['VWCE.DE', 'CSPX.L', 'AAPL', 'NVDA', 'CEZ.PR', 'BTC-USD'];

/** Z toho, co návštěvník napsal (ticker nebo název), udělá ticker. null = nedává smysl. */
function resolveTicker(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const byName = TRADABLE.find(i => i.name.toLowerCase() === t.toLowerCase());
  if (byName) return byName.ticker;
  const up = t.toUpperCase();
  return TICKER_RE.test(up) ? up : null;
}


/** Čára hodnoty portfolia od prvního obchodu; bez dvou dnů historie ukáže jen vysvětlení. */
function HistoryChart({ points }: { points: { t: number; value: number }[] | null }) {
  const option = useMemo(() => {
    if (!points || points.length < 3) return null;
    const up = points[points.length - 1].value >= START_CASH;
    const color = up ? CHART.up : CHART.down;
    return {
      animationDuration: 400,
      grid: { left: 8, right: 12, top: 16, bottom: 4, containLabel: true },
      tooltip: {
        ...tooltipBase, trigger: 'axis',
        formatter: (p: { value: [number, number] }[]) => `${new Date(p[0].value[0]).toLocaleDateString('cs-CZ')}<br/><b>${fmtCzk(p[0].value[1])}</b>`,
      },
      xAxis: { type: 'time', axisLabel: { ...axisLabel, hideOverlap: true, formatter: (v: number) => new Date(v).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }) }, axisLine: { lineStyle: { color: CHART.axisLine } }, splitLine: { show: false } },
      yAxis: {
        type: 'value', scale: true, axisLabel: { ...axisLabel, formatter: (v: number) => `${(v / 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} tis.` },
        splitLine: { lineStyle: { color: CHART.grid } },
      },
      series: [{
        type: 'line', showSymbol: false, smooth: false, lineStyle: { color, width: 2 },
        areaStyle: { color, opacity: 0.1 },
        data: points.map(p => [p.t, Math.round(p.value)]),
        markLine: {
          symbol: 'none', silent: true, lineStyle: { color: CHART.axis, type: 'dashed' },
          label: { color: CHART.axis, formatter: 'Start', fontFamily: CHART.font, position: 'insideEndTop' },
          data: [{ yAxis: START_CASH }],
        },
      }],
    };
  }, [points]);

  if (!option) {
    return (
      <p className="pp-hist__empty">
        Graf vývoje hodnoty se objeví, jakmile budeš mít portfolio aspoň dva dny. Do té doby sleduj změnu za den nahoře.
      </p>
    );
  }
  return (
    <Suspense fallback={<ChartSkeleton height={220} bare />}>
      <ReactECharts option={option} style={{ height: 220 }} opts={{ renderer: 'canvas' }} />
    </Suspense>
  );
}

interface Props {
  /** otevře graf titulu v záložce Grafy */
  onOpenChart: (ticker: string) => void;
}

export const PortfolioView: React.FC<Props> = ({ onOpenChart }) => {
  const { portfolio } = useUserData();
  const { user } = useAccount();
  const [pick, setPick] = useState('VWCE.DE');
  const [query, setQuery] = useState('');
  const [bad, setBad] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const listId = useId();

  const prices = usePrices(Object.keys(portfolio.positions));
  const { holdings, invested, total, day } = valuePortfolio(portfolio, prices.byTicker);
  const profit = total - START_CASH;
  const dayPct = total - day > 0 ? (day / (total - day)) * 100 : 0;
  const history = usePortfolioHistory(portfolio.trades, prices.byTicker, total);
  // datum poslední ceny držených titulů — u denní změny píšeme datum, ne „dnes“
  const dayAsof = typicalAsof(holdings.map(h => prices.byTicker[h.ticker]));
  const allPriced = holdings.every(h => h.value !== null);
  // výkon se hlásí do žebříčku (při přihlášení se uloží k účtu spolu s ostatním postupem)
  useEffect(() => {
    if (!portfolio.trades.length || prices.status !== 'ready' || !allPriced) return;
    const pct = Math.round((total / START_CASH - 1) * 10_000) / 100;
    const prev = getData().pfPct;
    if (prev === null || Math.abs(prev - pct) >= 0.05) updateData({ pfPct: pct });
  }, [total, portfolio.trades.length, prices.status, allPriced]);
  const parts = [
    ...holdings.map((h, i) => ({ key: h.ticker, label: h.name, value: h.value ?? h.cost, color: SHADES[i % SHADES.length] })),
    { key: 'cash', label: 'Hotovost', value: portfolio.cash, color: 'var(--pp-cash)' },
  ].filter(p => p.value > 0);
  const recent = [...portfolio.trades].reverse().slice(0, 8);
  const share = (v: number) => `${Math.round((v / total) * 100)} %`;

  const find = (text: string) => {
    const t = resolveTicker(text);
    setBad(!t && text.trim() !== '');
    if (t) { setPick(t); setQuery(''); }
  };
  const submit = (e: React.FormEvent) => { e.preventDefault(); find(query); };

  const sign = (v: number) => (v >= 0 ? '+' : '−');

  return (
    <div className="pp">
      <div className="pp-summary">
        <p className="ui-hero-num">
          <span className="ui-hero-num__label">Hodnota portfolia</span>
          {fmtCzk(total)}
        </p>
        <dl className="pp-stats">
          <div className={day >= 0 ? 'is-up' : 'is-down'}>
            <dt>Za den{dayAsof ? ` (k ${fmtDay(dayAsof)})` : ''}</dt>
            <dd className="num">{sign(day)}{fmtCzk(Math.abs(day))} <span>{fmtPct(dayPct)}</span></dd>
          </div>
          <div className={profit >= 0 ? 'is-up' : 'is-down'}>
            <dt>Od začátku</dt>
            <dd className="num">{sign(profit)}{fmtCzk(Math.abs(profit))} <span>{fmtPct((profit / START_CASH) * 100)}</span></dd>
          </div>
        </dl>
      </div>

      {prices.status === 'error' && (
        <p className="ui-note ui-note--warn" role="status">Ceny se nepodařilo načíst, pozice ukazuju za nákupní cenu.</p>
      )}

      {portfolio.trades.length > 0 && (
        <section className="pp-hist" aria-label="Vývoj hodnoty portfolia">
          <h3 className="ui-h3">Vývoj hodnoty</h3>
          <HistoryChart points={history} />
        </section>
      )}

      <div className="pp-alloc-wrap">
        <div className="pp-alloc" role="img" aria-label={`Rozložení: ${parts.map(p => `${p.label} ${share(p.value)}`).join(', ')}`}>
          {parts.map(p => <span key={p.key} style={{ flexGrow: p.value, background: p.color }} />)}
        </div>
        <ul className="pp-legend">
          {parts.map(p => (
            <li key={p.key}><i style={{ background: p.color }} aria-hidden="true" />{p.label} <span className="num">{share(p.value)}</span></li>
          ))}
        </ul>
      </div>

      <dl className="ui-kpis">
        <div><dt>V titulech</dt><dd>{fmtCzk(invested)}</dd></div>
        <div><dt>Volná hotovost</dt><dd>{fmtCzk(portfolio.cash)}</dd></div>
        <div><dt>Počet titulů</dt><dd>{holdings.length}</dd></div>
      </dl>

      <div className="ui-split pp-body">
        <section className="pp-buy" aria-label="Nákup">
          <form className="pp-find" onSubmit={submit}>
            <div className="ui-field">
              <label htmlFor={`${listId}-q`}>Ticker nebo název</label>
              <div className="pp-find__row">
                <input
                  id={`${listId}-q`} type="text" list={listId} value={query} autoComplete="off" autoCapitalize="characters"
                  spellCheck={false} placeholder="třeba AAPL, SAP.DE nebo ČEZ" aria-invalid={bad || undefined}
                  onChange={e => { setQuery(e.target.value); setBad(false); }}
                />
                <button type="submit" className="btn btn--ghost" disabled={!query.trim()}>Najít</button>
              </div>
              <datalist id={listId}>
                {TRADABLE.map(i => <option key={i.ticker} value={i.name}>{i.ticker}</option>)}
              </datalist>
            </div>
            {bad && <p className="ui-note ui-note--danger" role="alert">Tohle nevypadá jako ticker. Používej písmena, číslice a tečku, třeba AAPL nebo CEZ.PR.</p>}
            <div className="pp-find__quick" role="group" aria-label="Rychlý výběr">
              {QUICK.map(t => (
                <button key={t} type="button" className={`mx-chip${pick === t ? ' is-on' : ''}`} onClick={() => { setPick(t); setBad(false); }}>
                  {t}
                </button>
              ))}
            </div>
          </form>
          <TradeBox ticker={pick} />
        </section>

        <div className="ui-stack ui-stack--l">
          <section>
            <h3 className="ui-h3">Co držíš</h3>
            {holdings.length ? (
              <div className="ui-table-wrap">
                <table className="ui-table pp-table">
                  <thead>
                    <tr>
                      <th scope="col">Titul</th>
                      <th scope="col">Kusů</th>
                      <th scope="col">Ø nákup</th>
                      <th scope="col">Cena</th>
                      <th scope="col">Za den</th>
                      <th scope="col">Hodnota</th>
                      <th scope="col">Výsledek</th>
                      <th scope="col"><span className="sr-only">Akce</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => {
                      const diff = h.value === null ? null : h.value - h.cost;
                      const cls = diff === null ? '' : diff >= 0 ? 'is-up' : 'is-down';
                      return (
                        <tr key={h.ticker}>
                          <th scope="row">
                            <button type="button" className="pp-name" onClick={() => setPick(h.ticker)} title="Koupit další kusy">
                              {h.name}
                              <small>{h.ticker}</small>
                            </button>
                          </th>
                          <td data-label="Kusů">{fmtQty(h.qty)}</td>
                          <td data-label="Ø nákup">{fmtCzk(h.cost / h.qty, h.cost / h.qty < 100 ? 2 : 0)}</td>
                          <td data-label="Cena">{h.price === null ? '—' : fmtCzk(h.price, h.price < 100 ? 2 : 0)}</td>
                          <td data-label="Za den" className={h.dayPct === null ? '' : h.dayPct >= 0 ? 'is-up' : 'is-down'}>{h.dayPct === null ? '—' : fmtPct(h.dayPct)}</td>
                          <td data-label="Hodnota">{h.value === null ? '—' : fmtCzk(h.value)}</td>
                          <td data-label="Výsledek" className={cls}>
                            {diff === null ? '—' : <>{sign(diff)}{fmtCzk(Math.abs(diff))}<small>{fmtPct((diff / h.cost) * 100, 1)}</small></>}
                          </td>
                          <td>
                            <div className="pp-actions">
                              <button type="button" className="btn btn--ghost btn--small" onClick={() => onOpenChart(h.ticker)}>Graf</button>
                              <button
                                type="button" className="btn btn--ghost btn--small" disabled={h.value === null}
                                onClick={() => { const p = prices.byTicker[h.ticker]; if (p) trade(h.ticker, 'sell', h.qty, p.czk); }}
                              >
                                Prodat
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pp-empty">
                <p><strong>Zatím nic nedržíš.</strong> Začni prvním nákupem:</p>
                <ol>
                  <li>V nákupním formuláři klikni na titul (třeba Vanguard All‑World) nebo napiš jeho ticker.</li>
                  <li>Zadej částku nebo počet kusů a dej Koupit.</li>
                  <li>Za pár dní se vrať a podívej se, co s hodnotou udělal trh.</li>
                </ol>
              </div>
            )}
          </section>

          {recent.length > 0 && (
            <section>
              <h3 className="ui-h3">Poslední obchody</h3>
              <ul className="pp-trades">
                {recent.map(t => (
                  <li key={`${t.t}-${t.ticker}`}>
                    <span className="num pp-trades__when">{dateFmt.format(t.t)}</span>
                    <span>{t.side === 'buy' ? 'Nákup' : 'Prodej'}: {instrumentName(t.ticker, portfolio.positions[t.ticker])}</span>
                    <span className="num">{fmtCzk(t.qty * t.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <Leaderboard initial="portfolio" />

      <div className="pp-foot">
        <p className="ui-small">
          {user
            ? `Portfolio se ukládá k účtu ${user.name}.`
            : 'Portfolio je uložené jen v tomhle prohlížeči. S účtem (ikona vpravo nahoře) se k němu vrátíš odkudkoli.'}
          {' '}Ceny jsou zpožděné a bez poplatků a daní; zahraniční tituly se přepočítávají aktuálním kurzem koruny.
          Jde o cvičení, ne o investiční doporučení.
        </p>
        <div className="ui-cluster">
          {confirmReset ? (
            <>
              <button type="button" className="btn btn--danger btn--small" onClick={() => { resetPortfolio(); setConfirmReset(false); }}>Opravdu smazat a začít znovu</button>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmReset(false)}>Nechat být</button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost btn--small" onClick={() => setConfirmReset(true)} disabled={!portfolio.trades.length}>
              Začít znovu se 100 000 Kč
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
