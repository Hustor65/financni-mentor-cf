import { useEffect, useMemo, useState } from 'react';
import { TOPICS } from '../../data/topics';
import { TOOLS } from '../tools/registry';
import { ALL_INSTRUMENTS, fetchQuotes, fetchSeries, fmtPrice, fmtPct } from '../../utils/market';
import type { Quote, Series } from '../../utils/market';
import type { Level } from '../../data/levels';
import type { TabId } from '../../data/nav';
// QR kód je potřeba jen na stánku → vlastní chunk
import { TakeHome } from '../kiosk/TakeHome';
import { useAccount } from '../../utils/account';
import { KIOSK } from '../../utils/kiosk';
import { START_CASH, totalPoints, useUserData } from '../../utils/store';
import { body } from '../../data/play';
import { TRADABLE, fmtCzk, usePrices, valuePortfolio } from '../../utils/portfolio';

/* ════════════════════════════════════════════════════════════
   Přehled — „pracovní stůl“ pod hero: čtyři části webu vedle sebe,
   každá s něčím skutečným (další téma, živý graf a dnešní pohyby,
   nástroj podle úrovně, dotaz pro mentora).
   ════════════════════════════════════════════════════════════ */

const WATCH = ALL_INSTRUMENTS.map(i => i.ticker);
const MOVERS = 4;
const nameOf = (t: string) => ALL_INSTRUMENTS.find(i => i.ticker === t)?.name ?? t;

const ASK: Record<Level, string[]> = {
  start: ['Co je to ETF?', 'Kolik si mám odkládat z brigády?', 'Jak poznám podvodnou investici?'],
  pro: ['Jak funguje krytý call?', 'Co mi říká P/E 35 u technologické firmy?', 'Proč v krizi rostou korelace?'],
};

/** hlavní nástroj úrovně: začátečník hraje, pokročilý obchoduje nanečisto */
const FEATURED: Record<Level, string> = { start: 'odhadni-graf', pro: 'portfolio' };

interface Props {
  level: Level;
  completed: Set<string>;
  onNavigate: (tab: TabId) => void;
  onOpenTopic: (id: string) => void;
  onOpenTool: (id: string) => void;
  onOpenMarket: (ticker: string) => void;
  onAskMentor: (prompt: string) => void;
  onOpenAccount: () => void;
}

/** Souřadnice čáry grafu v pevném rámu 600 × 150 (SVG se roztáhne na šířku buňky). */
function linePath(values: number[], W = 600, H = 150) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (v: number) => H - 6 - ((v - min) / span) * (H - 12);
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * W).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
  return { d, W, H, y };
}

/** Plošný graf z čistého SVG — na přehledu nechceme tahat celé ECharts. */
function AreaChart({ values }: { values: number[] }) {
  const { d, W, H, y } = linePath(values);
  const base = y(values[0]);
  return (
    <svg className="hm-chart__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="hm-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.26" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill="url(#hm-chart-fill)" />
      {/* výchozí hodnota před rokem: podle ní se pozná, jestli je trh výš, nebo níž */}
      <line className="hm-chart__base" x1="0" x2={W} y1={base} y2={base} vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const monthYear = (ms: number) => new Date(ms).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });

/* ── Nástroj pro začátečníka: hra Odhadni graf ─────────────── */

function GuessFeature({ closes, onOpen }: { closes: number[]; onOpen: () => void }) {
  const { guessBest } = useUserData();
  // ukázka principu hry: skutečný graf (S&P 500, starší půlrok) useknutý v půlce
  const cut = closes.length > 160 ? closes.slice(20, 110) : [];
  return (
    <div className="hm-feature hm-feature--split">
      <div className="hm-feature__text">
        <h3 className="hm-feature__title">Odhadni graf</h3>
        <p className="hm-feature__lead">
          Deset skutečných grafů useknutých v půlce. Tipni si, jestli cena půjde nahoru, nebo dolů,
          a zjisti, jak těžké je trh předvídat.
        </p>
        <div className="hm-feature__actions">
          <button type="button" className="btn btn--primary" onClick={onOpen}>
            {guessBest ? 'Hrát znovu' : 'Zahrát si'}
          </button>
          <span className="hm-feature__fact num">
            {guessBest ? <>Tvůj rekord: <strong>{guessBest} z 10</strong></> : 'Deset kol, asi dvě minuty'}
          </span>
        </div>
      </div>
      <button type="button" className="hm-guess" onClick={onOpen} aria-label="Otevřít hru Odhadni graf">
        <span className="hm-guess__known">
          {cut.length > 1 && (
            <svg viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true">
              <path d={linePath(cut).d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </span>
        <span className="hm-guess__hidden" aria-hidden="true">?</span>
      </button>
    </div>
  );
}

/* ── Nástroj pro pokročilého: portfolio na zkoušku ─────────── */

function PortfolioFeature({ onOpen }: { onOpen: () => void }) {
  const { portfolio } = useUserData();
  const prices = usePrices();
  const { holdings, total } = valuePortfolio(portfolio, prices.byTicker);
  const started = portfolio.trades.length > 0 || holdings.length > 0;
  const gain = total - START_CASH;
  const gainPct = (gain / START_CASH) * 100;
  const sign = gain > 0 ? '+' : gain < 0 ? '−' : '';

  if (!started) {
    return (
      <div className="hm-feature">
        <h3 className="hm-feature__title">Portfolio na zkoušku</h3>
        <p className="hm-feature__lead">
          Virtuální peníze, skutečné ceny. Nakup akcie, ETF nebo krypto a sleduj, jak by sis vedl,
          aniž bys riskoval korunu.
        </p>
        <dl className="ui-kpis hm-kpis">
          <div><dt>K dispozici</dt><dd>{fmtCzk(START_CASH)}</dd></div>
          <div><dt>Titulů na výběr</dt><dd>{TRADABLE.length}</dd></div>
          <div><dt>Ceny</dt><dd>skutečné<small>v korunách, zpožděné</small></dd></div>
        </dl>
        <div className="hm-feature__actions">
          <button type="button" className="btn btn--primary" onClick={onOpen}>Postavit portfolio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hm-feature">
      <h3 className="hm-feature__title">Tvoje portfolio na zkoušku</h3>
      <dl className="ui-kpis hm-kpis">
        <div><dt>Hodnota</dt><dd>{fmtCzk(total)}</dd></div>
        <div>
          <dt>Od začátku</dt>
          <dd className={gain > 0 ? 'is-up' : gain < 0 ? 'is-down' : undefined}>
            {sign}{fmtCzk(Math.abs(gain))}
            <small>{fmtPct(gainPct)}</small>
          </dd>
        </div>
        <div>
          <dt>Hotovost</dt>
          <dd>{fmtCzk(portfolio.cash)}<small>{holdings.length} {holdings.length >= 1 && holdings.length <= 4 ? 'pozice' : 'pozic'}</small></dd>
        </div>
      </dl>
      {holdings.length > 0 && (
        <ul className="hm-holdings">
          {holdings.slice(0, 3).map(h => (
            <li key={h.ticker}>
              <span>{h.name}</span>
              <span className="num">{fmtCzk(h.value ?? h.cost)}</span>
              <span className="num hm-holdings__share">{fmtPct(((h.value ?? h.cost) / total) * 100, 0).replace('+', '')}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="hm-feature__actions">
        <button type="button" className="btn btn--primary" onClick={onOpen}>Otevřít portfolio</button>
        {prices.status === 'error' && <span className="hm-feature__fact">Ceny se nepodařilo načíst, počítám s nákupními.</span>}
        {prices.status === 'ready' && prices.offline && <span className="hm-feature__fact">Počítám s uloženými cenami.</span>}
      </div>
    </div>
  );
}

export const Home: React.FC<Props> = ({ level, completed, onNavigate, onOpenTopic, onOpenTool, onOpenMarket, onAskMentor, onOpenAccount }) => {
  const { user } = useAccount();
  const [index, setIndex] = useState<Series | null>(null);
  const [quotes, setQuotes] = useState<{ list: Quote[]; offline: boolean } | null>(null);
  const [failed, setFailed] = useState({ chart: false, quotes: false });
  const [question, setQuestion] = useState('');

  useEffect(() => {
    let alive = true;
    fetchSeries('^GSPC', '1y')
      .then(s => { if (alive) setIndex(s); })
      .catch(() => { if (alive) setFailed(f => ({ ...f, chart: true })); });
    fetchQuotes(WATCH)
      .then(r => { if (alive) setQuotes({ list: r.quotes, offline: r.offline }); })
      .catch(() => { if (alive) setFailed(f => ({ ...f, quotes: true })); });
    return () => { alive = false; };
  }, []);

  const levelTopics = useMemo(() => TOPICS.filter(t => t.level === level), [level]);
  const done = levelTopics.filter(t => completed.has(t.id)).length;
  const points = totalPoints(useUserData().scores);
  const open = levelTopics.filter(t => !completed.has(t.id));
  const next = open[0];
  const after = open.slice(1, 5);

  const featured = FEATURED[level];
  const moreTools = TOOLS.filter(t => t.level === level && t.id !== featured).slice(0, level === 'start' ? 4 : 2);

  const closes = useMemo(() => index?.points.map(p => p[4]) ?? [], [index]);
  const hasChart = closes.length > 1;
  const last = closes[closes.length - 1];
  const change = hasChart ? (last / closes[0] - 1) * 100 : 0;

  // dnešní největší pohyby mezi sledovanými tituly, bez ohledu na směr
  const movers = useMemo(
    () => [...(quotes?.list ?? [])]
      .filter(q => Number.isFinite(q.change_percent))
      .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
      .slice(0, MOVERS),
    [quotes],
  );

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) onAskMentor(question.trim());
  };

  return (
    <>
      <div className="hm-desk">
        {/* ── Akademie ── */}
        <section className="hm-cell hm-cell--academy" aria-labelledby="hm-academy">
          <header className="hm-cell__head">
            <h2 id="hm-academy">Akademie</h2>
            <button type="button" className="text-link" onClick={() => onNavigate('akademie')}>Všechna témata</button>
          </header>

          <div className="hm-progress">
            <p className="num"><strong>{done} z {levelTopics.length}</strong> témat hotovo · {points} {body(points)}</p>
            <div
              className="ui-progress" role="progressbar" aria-label="Dokončená témata"
              aria-valuemin={0} aria-valuemax={levelTopics.length} aria-valuenow={done}
            >
              <span style={{ width: `${(done / Math.max(1, levelTopics.length)) * 100}%` }} />
            </div>
          </div>

          {next ? (
            <>
              <div className="hm-feature">
                <h3 className="hm-feature__title">{next.title}</h3>
                <p className="hm-feature__lead">{next.summary}</p>
                <div className="hm-feature__actions">
                  <button type="button" className="btn btn--primary" onClick={() => onOpenTopic(next.id)}>
                    {done ? 'Pokračovat tímhle tématem' : 'Začít prvním tématem'}
                  </button>
                </div>
              </div>
              {after.length > 0 && (
                <ul className="hm-rows hm-cell__end" aria-label="Další témata v pořadí">
                  {after.map(t => (
                    <li key={t.id}>
                      <button type="button" className="hm-row" onClick={() => onOpenTopic(t.id)}>
                        <span className="hm-row__num num">{levelTopics.indexOf(t) + 1}</span>
                        <span className="hm-row__label">{t.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="hm-feature">
              <h3 className="hm-feature__title">Tuhle úroveň máš hotovou</h3>
              <p className="hm-feature__lead">
                {level === 'start'
                  ? 'Všechna témata pro začátečníky jsou za tebou. Nahoře si přepni na „Už něco umím“ a pokračuj opcemi a oceňováním akcií.'
                  : 'Prošel jsi všechna pokročilá témata. Slovníček a nástroje ti zůstávají po ruce.'}
              </p>
              <div className="hm-feature__actions">
                <button type="button" className="btn" onClick={() => onNavigate('akademie')}>Projít si témata znovu</button>
              </div>
            </div>
          )}
        </section>

        {/* ── Trhy ── */}
        <section className="hm-cell hm-cell--markets" aria-labelledby="hm-markets">
          <header className="hm-cell__head">
            <h2 id="hm-markets">Trhy</h2>
            <button type="button" className="text-link" onClick={() => onNavigate('trhy')}>
              {level === 'pro' ? 'Svíčky, průměry a RSI' : 'Všechny grafy'}
            </button>
          </header>

          <button
            type="button" className={`hm-chart ${change >= 0 ? 'is-up' : 'is-down'}`}
            onClick={() => onOpenMarket('^GSPC')} aria-label="Otevřít graf indexu S&P 500"
          >
            <span className="hm-chart__head">
              <span className="hm-chart__name">S&P 500</span>
              {hasChart ? (
                <>
                  <span className="hm-chart__value num">{fmtPrice(last)}</span>
                  <span className="hm-chart__chg num">{fmtPct(change, 1)} za rok</span>
                </>
              ) : (
                <span className="hm-chart__value hm-chart__value--wait">{failed.chart ? 'Graf se nepodařilo načíst' : 'Načítám…'}</span>
              )}
            </span>
            <span className="hm-chart__plot">{hasChart && <AreaChart values={closes} />}</span>
            <span className="hm-chart__axis">
              <span>{hasChart && index ? monthYear(index.points[0][0]) : ''}</span>
              <span>{hasChart ? 'dnes' : ''}</span>
            </span>
          </button>

          <div className="hm-movers hm-cell__end">
            <h3 className="hm-sub">
              Dnes se nejvíc hýbe
              {quotes?.offline && <span className="hm-sub__note">uložená data</span>}
            </h3>
            <ul className="hm-quotes">
              {movers.map(q => (
                <li key={q.ticker}>
                  <button type="button" onClick={() => onOpenMarket(q.ticker)}>
                    <span className="hm-quotes__name">{nameOf(q.ticker)}</span>
                    <span className="num">{fmtPrice(q.price, q.ticker)}</span>
                    <span className={`num ${q.change_percent >= 0 ? 'is-up' : 'is-down'}`}>{fmtPct(q.change_percent)}</span>
                  </button>
                </li>
              ))}
              {!movers.length && failed.quotes && <li className="hm-quotes__fail">Ceny se teď nepodařilo načíst. Zkus to za chvíli v Trzích.</li>}
            </ul>
          </div>
        </section>

        {/* ── Nástroje ── */}
        <section className="hm-cell hm-cell--tools" aria-labelledby="hm-tools">
          <header className="hm-cell__head">
            <h2 id="hm-tools">Nástroje</h2>
            <button type="button" className="text-link" onClick={() => onNavigate('nastroje')}>Všech {TOOLS.length} nástrojů</button>
          </header>

          {level === 'pro'
            ? <PortfolioFeature onOpen={() => onOpenMarket('portfolio')} />
            : <GuessFeature closes={closes} onOpen={() => onOpenTool(featured)} />}

          <ul className="hm-rows hm-rows--pair hm-cell__end" aria-label="Další nástroje">
            {moreTools.map(t => (
              <li key={t.id}>
                <button type="button" className="hm-row hm-row--tall" onClick={() => onOpenTool(t.id)}>
                  <span className="hm-row__label">{t.name}</span>
                  <span className="hm-row__hint">{t.lead}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Mentor ── */}
        <section className="hm-cell hm-cell--mentor" aria-labelledby="hm-mentor">
          <header className="hm-cell__head">
            <h2 id="hm-mentor">AI mentor</h2>
            <button type="button" className="text-link" onClick={() => onNavigate('mentor')}>Otevřít chat</button>
          </header>

          <form className="hm-ask" onSubmit={ask}>
            <label htmlFor="home-ask">Zeptej se na cokoli kolem peněz. Vysvětlí, dohledá cenu, nakreslí graf. Neradí, kam s penězi.</label>
            <div className="hm-ask__box">
              <textarea
                id="home-ask" rows={3} value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="Třeba: proč všichni mluví o ETF?"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) ask(e); }}
              />
              <button type="submit" className="btn btn--primary" disabled={!question.trim()}>Zeptat se</button>
            </div>
          </form>

          <div className="hm-cell__end">
            <h3 className="hm-sub">Nebo začni jednou z těchhle</h3>
            <ul className="hm-rows">
              {ASK[level].map(q => (
                <li key={q}>
                  <button type="button" className="hm-row" onClick={() => onAskMentor(q)}>
                    <span className="hm-row__label">{q}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── Stánek: web do kapsy. Jinde: nabídka účtu, dokud ho návštěvník nemá. ── */}
      {KIOSK ? (
        <TakeHome />
      ) : !user && (
        <section className="hm-take" aria-labelledby="hm-take">
          <div className="hm-take__text">
            <h2 id="hm-take">Vrať se, kdy budeš chtít</h2>
            <p>
              S účtem se ti hotová témata, portfolio na zkoušku i skóre uloží a najdeš je na telefonu
              i na počítači. Stačí přezdívka a heslo.
            </p>
          </div>
          <button type="button" className="btn btn--primary" onClick={onOpenAccount}>Vytvořit účet</button>
        </section>
      )}
    </>
  );
};
