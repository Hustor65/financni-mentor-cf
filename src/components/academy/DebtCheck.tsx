import { useState } from 'react';

/**
 * DebtCheck — interaktivní „Vyplatí se ten dluh?“ cvičení k tématu Dluhy.
 * Student dostane reálné situace a rozhoduje, jestli dluh/splátky dávají smysl.
 * Feedback + vysvětlení po každé volbě (research: rozhodnutí + reflexe učí líp
 * než pasivní text). Trénuje rozdíl mezi „dobrým“ a „špatným“ dluhem.
 */

interface Scenario {
  text: string;
  worth: boolean; // true = dluh tu dává rozumný smysl
  explain: string;
}

const SCENARIOS: Scenario[] = [
  {
    text: 'Nový telefon za 6 000 Kč. Na hotovost máš. Prodejce nabízí 24 splátek po 350 Kč (celkem 8 400 Kč).',
    worth: false,
    explain: 'Na splátky zaplatíš o 2 400 Kč víc za něco, na co máš. Když máš hotovost, skoro vždy se vyplatí zaplatit rovnou.',
  },
  {
    text: 'Rekvalifikační kurz za 15 000 Kč, který ti reálně zvedne plat, na půjčku s nízkým RPSN, kterou v pohodě splatíš.',
    worth: true,
    explain: 'Tohle je „dobrý dluh“ — investice do sebe, co ti vydělá víc, než stojí. Pokud splátky utáhneš, dává smysl.',
  },
  {
    text: 'Boty za 2 000 Kč přes „kup teď, zaplať za 30 dní“. Máš teď jiné výdaje a nejsi si jistý, že za měsíc peníze budeš mít.',
    worth: false,
    explain: 'BNPL na zbytnou věc, k tomu nejistota, že zaplatíš včas = past. Při zpoždění přijdou poplatky. Co si nemůžeš dovolit teď, nekupuj na dluh.',
  },
  {
    text: 'Na kreditce utratíš 4 000 Kč a celou částku splatíš do data splatnosti (v bezúročném období).',
    worth: true,
    explain: 'Když splatíš celou částku včas, je odklad zdarma — to je kreditka použitá správně. Past nastává, až když nesplatíš celé a naskočí úrok.',
  },
  {
    text: 'Gauč za 15 000 Kč na splátky s RPSN 38 %, i když ten tvůj starý pořád funguje.',
    worth: false,
    explain: 'Drahý úvěr (RPSN 38 %) na zbytnou věc, kterou nutně nepotřebuješ. Radši našetři — ušetříš tisíce na úrocích.',
  },
  {
    text: 'Rychlá půjčka s RPSN 80 % na dovolenou, na kterou teď nemáš.',
    worth: false,
    explain: 'Drahý dluh na spotřebu, co za chvíli „není“. RPSN 80 % je extrémní past. Dovolená počká, až si na ni našetříš.',
  },
];

export const DebtCheck: React.FC = () => {
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const s = SCENARIOS[i];
  const correct = guess !== null && guess === s.worth;

  const answer = (g: boolean) => {
    if (guess !== null) return;
    setGuess(g);
    if (g === s.worth) setScore(v => v + 1);
  };
  const next = () => {
    if (i + 1 >= SCENARIOS.length) { setDone(true); return; }
    setI(i + 1);
    setGuess(null);
  };
  const restart = () => { setI(0); setGuess(null); setScore(0); setDone(false); };

  const answered = i + (guess !== null ? 1 : 0);
  const options: { value: boolean; label: string }[] = [
    { value: true, label: 'Dává smysl' },
    { value: false, label: 'Radši ne' },
  ];

  const scoreboard = (
    <dl className="ui-kpis">
      <div>
        <dt>Správně</dt>
        <dd className={score > 0 ? 'is-up' : undefined}>{score}</dd>
      </div>
      <div>
        <dt>Vedle</dt>
        <dd>{answered - score}</dd>
      </div>
    </dl>
  );

  if (done) {
    const pct = Math.round((score / SCENARIOS.length) * 100);
    const good = score >= Math.ceil(SCENARIOS.length * 0.6);
    return (
      <div className="tl-quiz tl-quiz--end" role="status" aria-live="polite">
        <p className="ui-steps">Hotovo, {SCENARIOS.length} z {SCENARIOS.length}</p>
        <p className="ui-hero-num tl-hero">
          <span className="ui-hero-num__label">Tvůj výsledek</span>
          {score} z {SCENARIOS.length}
        </p>
        <p className={`ui-note ${good ? 'ui-note--ok' : 'ui-note--warn'}`}>
          <strong>{good ? 'Dobrý dluh od pasti rozeznáš.' : 'Ještě trénuj, drahý dluh se umí dobře schovat.'}</strong>{' '}
          Správně máš {pct}{'\u00a0'}% odpovědí. {good ? 'Rozhoduje, co za dluh získáš a kolik tě stojí.' : 'Ptej se vždycky na dvě věci: co za dluh získáš a kolik přeplatíš (RPSN).'}
        </p>
        <div className="tl-quiz__actions">
          <button type="button" className="btn btn--primary" onClick={restart}>Zkusit znovu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tl-ex">
      <div className="tl-quiz tl-quiz--run">
        <div className="tl-quiz__side">
          <div className="tl-quiz__head">
            <span className="ui-steps">Situace {i + 1} z {SCENARIOS.length}</span>
            <div className="ui-progress" aria-hidden="true"><span style={{ width: `${(answered / SCENARIOS.length) * 100}%` }} /></div>
          </div>
          {scoreboard}
        </div>
        <div className="tl-quiz__main">
          <p className="tl-quiz__prompt">{s.text}</p>

          <ul className="ui-choices">
            {options.map(o => {
              const isAnswer = guess !== null && o.value === s.worth;
              const isMiss = guess !== null && guess === o.value && !isAnswer;
              return (
                <li key={o.label}>
                  <button
                    type="button"
                    className={`ui-choice${isAnswer ? ' is-correct' : ''}${isMiss ? ' is-wrong' : ''}`}
                    aria-disabled={guess !== null}
                    onClick={() => answer(o.value)}
                  >
                    <span className="tl-choice__text">{o.label}</span>
                    {guess === o.value && <span className="tl-choice__end">tvoje odpověď</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {guess !== null && (
            <div className="tl-quiz__feedback" aria-live="polite">
              <p className={`ui-note ${correct ? 'ui-note--ok' : 'ui-note--danger'}`}>
                <strong>{correct ? 'Správně.' : 'Vedle.'} {s.worth ? 'Tady dluh dává smysl.' : 'Tady je dluh spíš past.'}</strong>{' '}
                {s.explain}
              </p>
              <div className="tl-quiz__actions">
                <button type="button" className="btn btn--primary" onClick={next}>
                  {i + 1 >= SCENARIOS.length ? 'Zobrazit výsledek' : 'Další situace'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
