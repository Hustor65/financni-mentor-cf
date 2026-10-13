import { useEffect, useState } from 'react';
import { ALL_INSTRUMENTS, fetchQuotes, fmtPrice, fmtPct } from '../../utils/market';
import type { Quote } from '../../utils/market';

const TAPE = ['^GSPC', '^IXIC', '^GDAXI', 'VWCE.DE', 'CEZ.PR', 'AAPL', 'NVDA', 'BTC-USD', 'ETH-USD', 'GC=F', 'EURCZK=X', 'USDCZK=X'];
const nameOf = (t: string) => ALL_INSTRUMENTS.find(i => i.ticker === t)?.name ?? t;

/** Běžící pásek s kotacemi — klik otevře titul v Trzích. Při reduced-motion stojí a dá se posouvat. */
export const MarketTape: React.FC<{ onOpen: (ticker: string) => void }> = ({ onOpen }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => fetchQuotes(TAPE).then(r => { if (alive) setQuotes(r.quotes); }).catch(() => { /* pásek se prostě nezobrazí */ });
    load();
    const timer = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  if (!quotes.length) return <div className="tape tape--empty" aria-hidden="true" />;

  const row = (hidden: boolean) => (
    <ul className="tape__row" aria-hidden={hidden || undefined}>
      {quotes.map(q => (
        <li key={q.ticker}>
          <button type="button" onClick={() => onOpen(q.ticker)} tabIndex={hidden ? -1 : 0}>
            <span className="tape__name">{nameOf(q.ticker)}</span>
            <span className="num">{fmtPrice(q.price, q.ticker)}</span>
            <span className={`num ${q.change_percent >= 0 ? 'is-up' : 'is-down'}`}>{fmtPct(q.change_percent)}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="tape" role="region" aria-label="Aktuální ceny na trzích">
      <div className="tape__track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
};
