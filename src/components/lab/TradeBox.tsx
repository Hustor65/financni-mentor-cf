import { useEffect, useId, useState } from 'react';
import { trade, useUserData } from '../../utils/store';
import { fmtCzk, fmtQty, instrumentName, isTradable, usePrices } from '../../utils/portfolio';

/**
 * Nákup a prodej „na zkoušku“ — virtuální koruny, skutečné ceny.
 * Zadává se částka v korunách, kusy se dopočítají (i zlomky kusu).
 */

const AMOUNTS = [1000, 5000, 20000];

interface Props {
  ticker: string;
  /** odkaz na přehled portfolia (na stránce portfolia se nezobrazuje) */
  showPortfolioLink?: boolean;
}

export const TradeBox: React.FC<Props> = ({ ticker, showPortfolioLink }) => {
  const { portfolio } = useUserData();
  const prices = usePrices();
  const [amount, setAmount] = useState('5000');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [shownFor, setShownFor] = useState(ticker);
  if (shownFor !== ticker) { setShownFor(ticker); setMessage(null); }

  // potvrzení obchodu po chvíli samo zmizí
  useEffect(() => {
    if (!message?.ok) return;
    const t = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(t);
  }, [message]);

  const name = instrumentName(ticker);
  const uid = useId();
  const inputId = `${uid}-amount`;
  const calcId = `${uid}-calc`;

  if (!isTradable(ticker)) {
    if (!ticker.startsWith('^')) return null;
    return (
      <section className="tb tb--info">
        <h3 className="ui-h3">Koupit na zkoušku</h3>
        <p>
          Index je jen číslo, samotný se koupit nedá. Kopírují ho ale ETF — v seznamu titulů
          najdeš třeba iShares S&P 500 nebo Vanguard All‑World.
        </p>
      </section>
    );
  }

  const price = prices.byTicker[ticker];
  if (!price) {
    // vlastní ticker mimo seznam nebo ještě načítáme
    return prices.status === 'loading' ? null : (
      <section className="tb tb--info">
        <h3 className="ui-h3">Koupit na zkoušku</h3>
        <p>Na zkoušku jde nakoupit jen tituly z našeho seznamu. Pro tenhle teď nemám cenu v korunách.</p>
      </section>
    );
  }

  const kc = Math.max(0, Number(amount.replace(/\s/g, '').replace(',', '.')) || 0);
  const qty = kc / price.czk;
  const held = portfolio.positions[ticker];

  const buy = (e: React.FormEvent) => {
    e.preventDefault();
    const err = trade(ticker, 'buy', qty, price.czk);
    setMessage(err ? { ok: false, text: err } : { ok: true, text: `Koupeno: ${fmtQty(qty)} ks ${name} za ${fmtCzk(kc)}.` });
  };

  const sellAll = () => {
    if (!held) return;
    const value = held.qty * price.czk;
    const err = trade(ticker, 'sell', held.qty, price.czk);
    const diff = value - held.cost;
    setMessage(err ? { ok: false, text: err } : {
      ok: true,
      text: `Prodáno za ${fmtCzk(value)}, ${diff >= 0 ? 'zisk' : 'ztráta'} ${fmtCzk(Math.abs(diff))}.`,
    });
  };

  const tooMuch = kc > portfolio.cash;

  return (
    <section className="tb">
      <div className="tb__head">
        <h3 className="ui-h3">Koupit na zkoušku</h3>
        <p className="tb__cash">Volná hotovost <strong className="num">{fmtCzk(portfolio.cash)}</strong></p>
      </div>
      <form className="tb__form" onSubmit={buy}>
        <div className="ui-field tb__amount">
          <label htmlFor={inputId}>Částka v korunách</label>
          <input
            id={inputId} type="text" inputMode="decimal" value={amount} autoComplete="off"
            onChange={e => { setAmount(e.target.value); setMessage(null); }}
            aria-describedby={calcId} aria-invalid={tooMuch || undefined}
          />
        </div>
        <div className="tb__quick" role="group" aria-label="Rychlá částka">
          {AMOUNTS.map(a => (
            <button
              key={a} type="button" className={`mx-chip${kc === a ? ' is-on' : ''}`}
              onClick={() => { setAmount(String(a)); setMessage(null); }}
            >
              {a.toLocaleString('cs-CZ')} Kč
            </button>
          ))}
        </div>
        <div className="tb__actions">
          <button type="submit" className="btn btn--primary" disabled={!(kc > 0) || tooMuch}>Koupit</button>
          {held && <button type="button" className="btn btn--ghost" onClick={sellAll}>Prodat vše</button>}
        </div>
      </form>
      <p id={calcId} className={`tb__calc${tooMuch ? ' is-error' : ''}`}>
        {tooMuch
          ? 'Tolik hotovosti nemáš. Zadej nižší částku.'
          : <>Dostaneš <span className="num">{fmtQty(qty)} ks</span> po <span className="num">{fmtCzk(price.czk, price.czk < 100 ? 2 : 0)}</span>
            {price.currency !== 'CZK' && <> (přepočteno z {price.currency} dnešním kurzem)</>}.</>}
        {held && <> Teď držíš <span className="num">{fmtQty(held.qty)} ks</span> v hodnotě <span className="num">{fmtCzk(held.qty * price.czk)}</span>.</>}
      </p>
      <div className="tb__msg" aria-live="polite">
        {message && <p key={message.text} className={`ui-note ${message.ok ? 'ui-note--ok' : 'ui-note--danger'}`}>{message.text}</p>}
      </div>
      {prices.offline && <p className="ui-small">Ceny jsou z uloženého snímku, živá data teď nejsou dostupná.</p>}
      {showPortfolioLink && (
        <p className="tb__link"><a className="text-link" href="#nastroje/portfolio">Otevřít moje portfolio na zkoušku</a></p>
      )}
    </section>
  );
};
