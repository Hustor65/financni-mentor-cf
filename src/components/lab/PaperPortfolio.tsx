import { useState } from 'react';
import { TradeBox } from './TradeBox';
import { Select } from '../Select';
import { START_CASH, resetPortfolio, trade, useUserData } from '../../utils/store';
import { TRADABLE, fmtCzk, fmtQty, instrumentName, usePrices, valuePortfolio } from '../../utils/portfolio';
import { WATCHLIST, fmtPct } from '../../utils/market';
import { useAccount } from '../../utils/account';
import { CHART } from '../../utils/chartTheme';

/* ════════════════════════════════════════════════════════════
   Portfolio na zkoušku — 100 000 virtuálních korun a skutečné
   ceny. Smysl: zažít kolísání a poplatek za chyby, než půjde
   o vlastní peníze.
   ════════════════════════════════════════════════════════════ */

// barvy dílků jen z palety grafů; hotovost má vlastní tlumenou (viz .pp-alloc)
const SHADES = [CHART.cyan, CHART.up, CHART.amber, CHART.violet, CHART.cyanDeep, CHART.text, CHART.down, CHART.axis];
// nabídka nákupu po skupinách z obrazovky Trhy (indexy a kurzy koupit nejde)
const PICK_OPTIONS = WATCHLIST.flatMap(g =>
  g.items.filter(i => TRADABLE.includes(i)).map(i => ({ value: i.ticker, label: i.name, hint: i.ticker, group: g.group })),
);
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export const PaperPortfolio: React.FC = () => {
  const { portfolio } = useUserData();
  const { user } = useAccount();
  const prices = usePrices();
  const [pick, setPick] = useState(TRADABLE[0].ticker);
  const [confirmReset, setConfirmReset] = useState(false);

  const { holdings, total } = valuePortfolio(portfolio, prices.byTicker);
  const profit = total - START_CASH;
  const parts = [
    ...holdings.map((h, i) => ({ key: h.ticker, label: h.name, value: h.value ?? h.cost, color: SHADES[i % SHADES.length] })),
    { key: 'cash', label: 'Hotovost', value: portfolio.cash, color: 'var(--pp-cash)' },
  ].filter(p => p.value > 0);
  const recent = [...portfolio.trades].reverse().slice(0, 8);

  const invested = total - portfolio.cash;
  const share = (v: number) => `${Math.round((v / total) * 100)} %`;

  return (
    <div className="pp">
      <div className="pp-summary">
        <p className="ui-hero-num">
          <span className="ui-hero-num__label">Hodnota portfolia</span>
          {fmtCzk(total)}
        </p>
        <p className={`pp-profit ${profit >= 0 ? 'is-up' : 'is-down'}`}>
          <span className="num">{profit >= 0 ? '+' : '−'}{fmtCzk(Math.abs(profit))}</span>
          <span className="num pp-profit__pct">{fmtPct((profit / START_CASH) * 100)}</span>
          <span className="pp-profit__label">od začátku se 100 000 Kč</span>
        </p>
      </div>

      {prices.status === 'error' && (
        <p className="ui-note ui-note--warn" role="status">Ceny se nepodařilo načíst, pozice ukazuju za nákupní cenu.</p>
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
          <div className="ui-field">
            <label htmlFor="pp-pick">Co chceš koupit</label>
            <Select id="pp-pick" value={pick} onChange={setPick} options={PICK_OPTIONS} />
          </div>
          <TradeBox ticker={pick} />
        </section>

        <div className="ui-stack ui-stack--l">
          <section>
            <h3 className="ui-h3">Co držíš</h3>
            {holdings.length ? (
              <div className="ui-table-wrap">
                <table className="ui-table pp-table">
                  <thead>
                    <tr><th scope="col">Titul</th><th scope="col">Kusů</th><th scope="col">Nákup</th><th scope="col">Teď</th><th scope="col">Výsledek</th><th scope="col"><span className="sr-only">Akce</span></th></tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => {
                      const diff = h.value === null ? null : h.value - h.cost;
                      return (
                        <tr key={h.ticker}>
                          <th scope="row"><a className="text-link" href={`#trhy/${h.ticker}`}>{h.name}</a></th>
                          <td>{fmtQty(h.qty)}</td>
                          <td>{fmtCzk(h.cost)}</td>
                          <td>{h.value === null ? '—' : fmtCzk(h.value)}</td>
                          <td className={diff === null ? '' : diff >= 0 ? 'is-up' : 'is-down'}>
                            {diff === null ? '—' : fmtPct((diff / h.cost) * 100, 1)}
                          </td>
                          <td>
                            <button
                              type="button" className="btn btn--ghost btn--small" disabled={h.value === null}
                              onClick={() => { const p = prices.byTicker[h.ticker]; if (p) trade(h.ticker, 'sell', h.qty, p.czk); }}
                            >
                              Prodat
                            </button>
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
                  <li>V nabídce „Co chceš koupit“ si vyber titul. Na začátek třeba Vanguard All‑World.</li>
                  <li>Zadej částku a dej Koupit.</li>
                  <li>Za pár dní se vrať a podívej se, co s hodnotou udělal trh.</li>
                </ol>
                <p>Nakupovat jde i přímo u grafu v <a className="text-link" href="#trhy">Trzích</a>.</p>
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
                    <span>{t.side === 'buy' ? 'Nákup' : 'Prodej'}: {instrumentName(t.ticker)}</span>
                    <span className="num">{fmtCzk(t.qty * t.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

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
