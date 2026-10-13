import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSeries, fetchSnapshot, fmtPct } from '../../utils/market';
import { TRADABLE, instrumentName } from '../../utils/portfolio';
import { updateData, useUserData } from '../../utils/store';

/* ════════════════════════════════════════════════════════════
   Odhadni graf — deset skutečných grafů useknutých v půlce.
   Návštěvník tipuje, kam šla cena dalších 30 obchodních dnů.
   Pointa: z minulého průběhu se budoucí směr poznat nedá.
   ════════════════════════════════════════════════════════════ */

const ROUNDS = 10;
const SHOWN = 90;
const HIDDEN = 30;

interface Round {
  ticker: string;
  /** ceny přepočtené tak, že první zobrazený den = 100 (ať se titul nedá poznat podle ceny) */
  shown: number[];
  hidden: number[];
  from: number;
  to: number;
  /** změna za skryté období v % */
  change: number;
}

async function buildRounds(): Promise<Round[]> {
  const loaded = await Promise.all(TRADABLE.map(i =>
    fetchSnapshot(i.ticker, '2y').catch(() => fetchSeries(i.ticker, '2y')).catch(() => null),
  ));
  // jen tituly s dost dlouhou a čistou řadou → každá hra má plných deset kol
  const usable = loaded.flatMap(series => {
    const pts = (series?.points ?? []).filter(p => p[4] > 0);
    return series && pts.length >= SHOWN + HIDDEN + 5 ? [{ ticker: series.ticker, pts }] : [];
  });
  if (!usable.length) return [];
  const rounds: Round[] = [];
  for (let n = 0; n < ROUNDS; n++) {
    const { ticker, pts } = usable[Math.floor(Math.random() * usable.length)];
    const start = Math.floor(Math.random() * (pts.length - SHOWN - HIDDEN));
    const win = pts.slice(start, start + SHOWN + HIDDEN);
    const base = win[0][4];
    const all = win.map(p => (p[4] / base) * 100);
    const shown = all.slice(0, SHOWN);
    const hidden = all.slice(SHOWN);
    rounds.push({
      ticker, shown, hidden,
      from: win[0][0], to: win[win.length - 1][0],
      change: (hidden[hidden.length - 1] / shown[shown.length - 1] - 1) * 100,
    });
  }
  return rounds;
}

const PAD = 14;
const dateFmt = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });

/** Graf se kreslí v bodech obrazovky (viewBox = změřená velikost plochy), takže vyplní místo,
 *  které mu rozvržení dá, a tahy ani čárkování se nedeformují. */
function Chart({ round, revealed, w: W, h: H }: { round: Round; revealed: boolean; w: number; h: number }) {
  const total = SHOWN + HIDDEN;
  const range = (vals: number[], margin: number) => {
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const span = (hi - lo) || 1;
    return { min: lo - span * margin, max: hi + span * margin };
  };
  // Dokud je budoucnost skrytá, měřítko se řídí jen viditelnou částí — jinak by napovídalo.
  // Kreslí se ale vždy v konečném měřítku a „tipovací“ pohled je jen svislá transformace
  // skupiny → po odpovědi graf plynule přejde do nového měřítka, místo aby přeskočil.
  const ask = range(round.shown, 0.45);
  const full = range([...round.shown, ...round.hidden], 0.08);
  const inner = H - 2 * PAD;
  const yIn = (v: number, r: { min: number; max: number }) => PAD + (1 - (v - r.min) / (r.max - r.min)) * inner;
  const x = (i: number) => (i / (total - 1)) * W;
  const y = (v: number) => yIn(v, full);
  const k = (full.max - full.min) / (ask.max - ask.min);
  const shift = yIn(round.shown[0], ask) - k * y(round.shown[0]);
  const path = (vals: number[], offset: number) =>
    vals.map((v, i) => `${i ? 'L' : 'M'}${x(i + offset).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const cut = x(SHOWN - 1);
  const up = round.change >= 0;
  const last = round.shown[SHOWN - 1];
  const lastY = revealed ? y(last) : yIn(last, ask);

  const cutPct = `${(cut / W) * 100}%`;

  return (
    <>
      <svg className="gg-chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={revealed ? `Cena potom ${up ? 'vzrostla' : 'klesla'} o ${Math.abs(round.change).toFixed(1).replace('.', ',')} %` : 'Graf ceny za 90 obchodních dnů, pokračování je skryté'}>
        <rect x={cut} y="0" width={W - cut} height={H} className="gg-chart__future" />
        <line x1={cut} y1="0" x2={cut} y2={H} className="gg-chart__cut" />
        <g className="gg-chart__move" style={{ transform: `translateY(${lastY}px)` }}>
          <line x1="0" y1="0" x2={W} y2="0" className="gg-chart__level" />
        </g>
        <g className="gg-chart__plot" style={{ transform: revealed ? 'none' : `translateY(${shift}px) scaleY(${k})` }}>
          <path d={path(round.shown, 0)} className="gg-chart__line" />
          <path
            d={path([last, ...round.hidden], SHOWN - 1)} pathLength={1}
            className={`gg-chart__line gg-chart__hidden ${up ? 'is-up' : 'is-down'}${revealed ? ' is-shown' : ''}`}
          />
        </g>
        <g className="gg-chart__move" style={{ transform: `translateY(${lastY}px)` }}>
          <circle cx={cut} cy="0" r="9" className="gg-chart__halo" />
          <circle cx={cut} cy="0" r="5" className="gg-chart__dot" />
        </g>
      </svg>
      <span className={`gg-stage__q${revealed ? ' is-gone' : ''}`} style={{ left: cutPct }} aria-hidden="true">?</span>
      <span className="gg-stage__cap gg-stage__cap--past" aria-hidden="true">90 obchodních dnů</span>
      <span className="gg-stage__cap" style={{ left: cutPct }} aria-hidden="true">dalších 30</span>
    </>
  );
}

export const GuessGame: React.FC = () => {
  const { guessBest } = useUserData();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]); // true = tip „nahoru“

  const request = useRef(0);

  const load = useCallback(() => {
    const id = ++request.current;
    buildRounds()
      .then(r => { if (id === request.current) { if (r.length === ROUNDS) setRounds(r); else setFailed(true); } })
      .catch(() => { if (id === request.current) setFailed(true); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Hra se má vejít na obrazovku i s tlačítky: když po načtení přečnívá, posuň ji pod horní lištu.
  // velikost plochy grafu v bodech obrazovky; graf se vykreslí až po prvním změření
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null);
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return undefined;
    const watch = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      if (w > 0 && h > 0) setStage(s => (s && s.w === w && s.h === h ? s : { w, h }));
    });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  const root = useRef<HTMLDivElement>(null);
  const ready = rounds !== null;
  useEffect(() => {
    const el = root.current;
    if (!ready || !el) return;
    const box = el.getBoundingClientRect();
    if (box.bottom <= window.innerHeight && box.top >= 0) return;
    // skokem, ne plynule: hra se právě objevila místo hlášky o načítání, takže není co „odjíždět“
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [ready]);

  const start = () => {
    setRounds(null);
    setFailed(false);
    setIndex(0);
    setAnswers([]);
    load();
  };

  const score = useMemo(
    () => (rounds ? answers.filter((a, i) => a === (rounds[i].change >= 0)).length : 0),
    [answers, rounds],
  );

  if (failed) {
    return (
      <div className="gg gg--msg">
        <p className="ui-note ui-note--warn" role="status">
          <strong>Grafy se nepodařilo načíst.</strong> Zkontroluj připojení a zkus to znovu.
        </p>
        <div><button type="button" className="btn btn--primary" onClick={start}>Zkusit znovu</button></div>
      </div>
    );
  }
  if (!rounds) return <div className="gg gg--msg"><p className="gg__loading" role="status">Chystám deset grafů…</p></div>;

  const count = rounds.length;

  // ── vyhodnocení ──
  if (index >= count) {
    const ups = rounds.filter(r => r.change >= 0).length;
    const half = count / 2;
    const best = Math.max(guessBest, score);
    return (
      <div className="gg gg--result" ref={root}>
        <div className="gg-score">
          <p className="gg-score__num num">
            <span className="sr-only">Trefil jsi </span>{score}<span className="gg-score__of"> z {count}</span>
          </p>
          <div className="gg-score__text">
            <p className="gg-score__verdict">
              {score > half + 1 ? 'Líp než hod mincí' : score < half - 1 ? 'Hůř než hod mincí' : 'Stejně jako hod mincí'}
            </p>
            <p>
              {score > half + 1
                ? 'Nadprůměrný výsledek. Než z něj ale uděláš strategii, zahraj si ještě jednou: u deseti pokusů rozhoduje hlavně štěstí.'
                : score < half - 1
                  ? 'Nic si z toho nedělej, profesionálům to vychází podobně.'
                  : 'A přesně o tom ta hra je.'}
            </p>
          </div>
        </div>

        <div className="gg-dots gg-dots--result" aria-hidden="true">
          {rounds.map((r, i) => <i key={i} className={answers[i] === (r.change >= 0) ? 'is-hit' : 'is-miss'} />)}
        </div>

        <dl className="ui-kpis">
          <div><dt>Hod mincí v průměru</dt><dd>{half.toLocaleString('cs-CZ')} z {count}</dd></div>
          <div><dt>Vždy tipnout „výš“</dt><dd>{ups} z {count}</dd></div>
          <div><dt>Tvůj rekord</dt><dd>{best} z 10</dd></div>
        </dl>

        <div className="ui-prose gg-lesson">
          <h3 className="ui-h3">Co si z toho odnést</h3>
          <p>
            Z toho, jak graf vypadal doteď, se nedá spolehlivě poznat, kam půjde příště. Krátkodobý pohyb cen
            je z velké části náhoda a kdo tvrdí opak, většinou něco prodává.
          </p>
          <p>
            Všimni si čísla u „vždy tipnout výš“. Trhy dlouhodobě častěji rostou, než klesají, proto dlouhodobé
            držení široké skupiny akcií funguje líp než hádání, kdy nakoupit a kdy prodat.
          </p>
        </div>

        <div><button type="button" className="btn btn--primary gg-again" onClick={start}>Hrát znovu</button></div>
      </div>
    );
  }

  const round = rounds[index];
  const answered = answers.length > index;
  const guessUp = answers[index];
  const wentUp = round.change >= 0;
  const correct = answered && guessUp === wentUp;

  const answer = (up: boolean) => {
    if (answered) return;
    const next = [...answers, up];
    setAnswers(next);
    if (next.length === count) {
      const final = next.filter((a, i) => a === (rounds[i].change >= 0)).length;
      // rekord počítáme jen z plné desítky
      if (count === ROUNDS && final > guessBest) updateData({ guessBest: final });
    }
  };

  // Tlačítka odpovědí zůstávají po tipu na místě (jen zešednou a označí tvůj tip),
  // „Další graf“ má vedle nich vlastní stálé místo → mezi otázkou a odhalením nic neposkočí.
  const btnState = (up: boolean) =>
    !answered ? '' : guessUp === up ? ' is-picked' : ' is-idle';

  return (
    <div className="gg" ref={root}>
      <div className="gg-bar">
        <p className="gg-bar__round num">Graf <strong>{index + 1}</strong> z {count}</p>
        <div className="gg-dots" aria-hidden="true">
          {rounds.map((r, i) => (
            <i key={i} className={i < answers.length ? (answers[i] === (r.change >= 0) ? 'is-hit' : 'is-miss') : i === index ? 'is-now' : ''} />
          ))}
        </div>
        <p className="gg-bar__score num">Správně <strong>{score}</strong></p>
      </div>

      <div className="gg-stage" ref={stageRef}>
        {stage && <Chart key={index} round={round} revealed={answered} w={stage.w} h={stage.h} />}
      </div>

      <div className="gg-console">
        <div className="gg-say">
          {answered ? (
            <div className="gg-say__reveal" role="status">
              <p className={`gg-verdict ${correct ? 'is-up' : 'is-down'}`}>{correct ? 'Správně' : 'Vedle'}</p>
              <p>
                Cena {wentUp ? 'vzrostla' : 'klesla'} o{' '}
                <span className={`num ${wentUp ? 'is-up' : 'is-down'}`}>{fmtPct(Math.abs(round.change), 1).replace('+', '')}</span>.
                Byl to <strong>{instrumentName(round.ticker)}</strong>, {dateFmt.format(round.from)} – {dateFmt.format(round.to)}.
              </p>
            </div>
          ) : (
            <p className="gg-say__ask">Kde bude cena za dalších 30 obchodních dnů?</p>
          )}
        </div>

        <div className="gg-answers" role="group" aria-label="Tvůj tip">
          <button type="button" className={`gg-btn gg-btn--up${btnState(true)}`} onClick={() => answer(true)} disabled={answered}>
            <span className="gg-btn__arrow" aria-hidden="true" />Výš než teď
          </button>
          <button type="button" className={`gg-btn gg-btn--down${btnState(false)}`} onClick={() => answer(false)} disabled={answered}>
            <span className="gg-btn__arrow" aria-hidden="true" />Níž než teď
          </button>
        </div>

        <div className="gg-next">
          {answered && (
            <button type="button" className="btn btn--primary" onClick={() => setIndex(i => i + 1)} autoFocus>
              {index + 1 < count ? 'Další graf' : 'Ukázat výsledek'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
