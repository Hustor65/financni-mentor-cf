import { useEffect, useId, useState } from 'react';
import { trade, useUserData } from '../../utils/store';
import { ALL_INSTRUMENTS } from '../../utils/market';
import { fmtCzk, fmtQty, instrumentName, isTradable, usePrices } from '../../utils/portfolio';
import { fmtPct } from '../../utils/market';

/**
 * Nákup a prodej „na zkoušku“ — virtuální koruny, skutečné ceny.
 * Zadává se částka v korunách (kusy se dopočítají, i zlomky), nebo přímo počet kusů.
 * Funguje pro libovolný ticker — cenu a název si dohledá u burzy.
 */

const AMOUNTS = [1000, 5000, 20000];
const ALL_TICKERS = new Set(ALL_INSTRUMENTS.map(i => i.ticker));
const parse = (v: string) => Math.max(0, Number(v.replace(/\s/g, '').replace(',', '.')) || 0);

interface Props {
  ticker: string;
  /** odkaz na přehled portfolia (na stránce portfolia se nezobrazuje) */
  showPortfolioLink?: boolean;
}

export const TradeBox: React.FC<Props> = ({ ticker, showPortfolioLink }) => {
  const { portfolio } = useUserData();
  const prices = usePrices([ticker]);
  const [mode, setMode] = useState<'amount' | 'qty'>('amount');
  const [amount, setAmount] = useState('5000');
  const [shares, setShares] = useState('1');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [shownFor, setShownFor] = useState(ticker);
  if (shownFor !== ticker) { setShownFor(ticker); setMessage(null); }

  // potvrzení obchodu po chvíli samo zmizí
  useEffect(() => {
    if (!message?.ok) return;
    const t = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(t);
  }, [message]);

  const held = portfolio.positions[ticker];
  const name = instrumentName(ticker, { name: prices.byTicker[ticker]?.name ?? held?.name });
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
    const known = ALL_TICKERS.has(ticker);
    const notFound = prices.unknown.includes(ticker) || (known && prices.status === 'ready');
    if (!notFound) {
      return <section className="tb tb--info"><p aria-live="polite">Hledám cenu pro {ticker}…</p></section>;
    }
    return (
      <section className="tb tb--info">
        <h3 className="ui-h3">Koupit na zkoušku</h3>
        {known
          ? <p>Pro {name} teď nemám cenu v korunách. Zkus to za chvíli.</p>
          : <p>Ticker <strong>{ticker}</strong> jsem na burze nenašel. Zkontroluj zápis: americké akcie jsou bez přípony (AAPL), pražské mají .PR (CEZ.PR), německé .DE (SAP.DE), londýnské .L.</p>}
      </section>
    );
  }

  const kc = mode === 'amount' ? parse(amount) : parse(shares) * price.czk;
  const qty = mode === 'amount' ? kc / price.czk : parse(shares);

  const buy = (e: React.FormEvent) => {
    e.preventDefault();
    const err = trade(ticker, 'buy', qty, price.czk, price.name);
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
      <div className="tb__quote">
        <div>
          <h3 className="ui-h3">{name} <span className="ui-tag">{ticker}</span></h3>
          <p className="tb__price num">
            {fmtCzk(price.czk, price.czk < 100 ? 2 : 0)}
            <span className={price.change >= 0 ? 'is-up' : 'is-down'}> {fmtPct(price.change)} dnes</span>
          </p>
        </div>
        <p className="tb__cash">Volná hotovost <strong className="num">{fmtCzk(portfolio.cash)}</strong></p>
      </div>
      <form className="tb__form" onSubmit={buy}>
        <div className="tb__mode" role="group" aria-label="Jak zadat velikost nákupu">
          <button type="button" className={`mx-chip${mode === 'amount' ? ' is-on' : ''}`} onClick={() => { setMode('amount'); setMessage(null); }}>Částka v Kč</button>
          <button type="button" className={`mx-chip${mode === 'qty' ? ' is-on' : ''}`} onClick={() => { setMode('qty'); setMessage(null); }}>Počet kusů</button>
        </div>
        <div className="ui-field tb__amount">
          <label htmlFor={inputId}>{mode === 'amount' ? 'Částka v korunách' : 'Počet kusů'}</label>
          <input
            id={inputId} type="text" inputMode="decimal" autoComplete="off"
            value={mode === 'amount' ? amount : shares}
            onChange={e => { (mode === 'amount' ? setAmount : setShares)(e.target.value); setMessage(null); }}
            aria-describedby={calcId} aria-invalid={tooMuch || undefined}
          />
        </div>
        {mode === 'amount' && (
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
        )}
        <div className="tb__actions">
          <button type="submit" className="btn btn--primary" disabled={!(kc > 0) || tooMuch}>Koupit</button>
          {held && <button type="button" className="btn btn--ghost" onClick={sellAll}>Prodat vše</button>}
        </div>
      </form>
      <p id={calcId} className={`tb__calc${tooMuch ? ' is-error' : ''}`}>
        {tooMuch
          ? 'Tolik hotovosti nemáš. Zadej nižší částku.'
          : <>{mode === 'amount'
            ? <>Dostaneš <span className="num">{fmtQty(qty)} ks</span></>
            : <>Zaplatíš <span className="num">{fmtCzk(kc, kc < 100 ? 2 : 0)}</span> za <span className="num">{fmtQty(qty)} ks</span></>} po <span className="num">{fmtCzk(price.czk, price.czk < 100 ? 2 : 0)}</span>
            {price.currency !== 'CZK' && <> (přepočteno z {price.currency} dnešním kurzem)</>}.</>}
        {held && <> Teď držíš <span className="num">{fmtQty(held.qty)} ks</span> v hodnotě <span className="num">{fmtCzk(held.qty * price.czk)}</span>.</>}
      </p>
      <div className="tb__msg" aria-live="polite">
        {message && <p key={message.text} className={`ui-note ${message.ok ? 'ui-note--ok' : 'ui-note--danger'}`}>{message.text}</p>}
      </div>
      {prices.offline && <p className="ui-small">Ceny jsou z uloženého snímku, živá data teď nejsou dostupná.</p>}
      {showPortfolioLink && (
        <p className="tb__link"><a className="text-link" href="#trhy/portfolio">Otevřít moje portfolio na zkoušku</a></p>
      )}
    </section>
  );
};
