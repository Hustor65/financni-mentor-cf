import { useState } from 'react';

/**
 * ScamCheck — interaktivní „Je to scam?“ cvičení k tématu Podvody a scamy.
 * Student dostane reálné scénáře (zprávy/nabídky) a hádá, jestli jde o podvod.
 * Po každé volbě dostane vysvětlení → trénuje rozpoznávání.
 */

interface Scenario {
  text: string;
  isScam: boolean;
  explain: string;
}

const SCENARIOS: Scenario[] = [
  {
    text: '„Gratulujeme! Vyhrál jsi nový iPhone. Pro doručení zaplať jen 49 Kč poplatek tady: bit.ly/vyhra-cz“',
    isScam: true,
    explain: 'Výhra v soutěži, které ses neúčastnil, plus malý „poplatek“ předem = klasická past na tvoje platební údaje. Skutečné výhry se neplatí dopředu.',
  },
  {
    text: '„Investuj 1 000 Kč do našeho krypto fondu a garantujeme ti 500 Kč každý týden. Úplně bez rizika!“',
    isScam: true,
    explain: 'Zaručený vysoký výnos bez rizika neexistuje. Tohle je typický investiční podvod (často Ponziho schéma, co vyplácí první z peněz dalších).',
  },
  {
    text: 'SMS „od banky“: „Zaznamenali jsme podezřelou platbu. Potvrďte identitu zde, jinak účet zablokujeme: secure-bank-cz.net“',
    isScam: true,
    explain: 'Phishing. Banka tě nikdy nežádá o přihlášení přes odkaz v SMS a doména je podezřelá. Nikdy neklikej — jdi rovnou do oficiální appky banky.',
  },
  {
    text: '„Práce z domova: necháš si na svůj účet posílat platby od našich klientů a pošleš je dál. Necháš si 10 %.“',
    isScam: true,
    explain: 'Money muling — praní špinavých peněz přes tvůj účet. Je to trestné, i když „jen přeposíláš“. Svůj účet nikdy nikomu nepůjčuj.',
  },
  {
    text: '„Někdo ti poslal dárek! Pro odemčení potvrď číslo karty, datum platnosti, CVV a kód z SMS.“',
    isScam: true,
    explain: 'CVV a kód z SMS jsou klíče k tvým penězům — nikdy je nikam nezadávej kvůli „dárku“. Žádná legitimní služba je takhle nechce.',
  },
  {
    text: 'Na e‑shopu, kde běžně nakupuješ, je sleva 20 %. Otevřeš si jejich oficiální stránku (adresu znáš) a koupíš.',
    isScam: false,
    explain: 'V pořádku — jdeš přes ověřený web, který znáš, ne přes odkaz z podezřelé zprávy. Slevy na známém e‑shopu jsou normální.',
  },
];

export const ScamCheck: React.FC = () => {
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const s = SCENARIOS[i];
  const correct = guess !== null && guess === s.isScam;

  const answer = (g: boolean) => {
    if (guess !== null) return;
    setGuess(g);
    if (g === s.isScam) setScore(v => v + 1);
  };
  const next = () => {
    if (i + 1 >= SCENARIOS.length) { setDone(true); return; }
    setI(i + 1);
    setGuess(null);
  };
  const restart = () => { setI(0); setGuess(null); setScore(0); setDone(false); };

  const answered = i + (guess !== null ? 1 : 0);
  const options: { value: boolean; label: string }[] = [
    { value: true, label: 'Podvod' },
    { value: false, label: 'V pořádku' },
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
          <strong>{good ? 'Podvod poznáš.' : 'Ještě trénuj, podvodníci jsou vychytralí.'}</strong>{' '}
          Správně máš {pct}{'\u00a0'}% odpovědí. {good ? 'Stejné triky se opakují: spěch, výhra zadarmo a žádost o údaje z karty.' : 'Všímej si spěchu, výher zadarmo a žádostí o údaje z karty.'}
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
            <span className="ui-steps">Scénář {i + 1} z {SCENARIOS.length}</span>
            <div className="ui-progress" aria-hidden="true"><span style={{ width: `${(answered / SCENARIOS.length) * 100}%` }} /></div>
          </div>
          {scoreboard}
        </div>
        <div className="tl-quiz__main">
          <p className="tl-quiz__prompt">{s.text}</p>

          <ul className="ui-choices">
            {options.map(o => {
              const isAnswer = guess !== null && o.value === s.isScam;
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
                <strong>{correct ? 'Správně.' : 'Vedle.'} {s.isScam ? 'Tohle je podvod.' : 'Tohle je v pořádku.'}</strong>{' '}
                {s.explain}
              </p>
              <div className="tl-quiz__actions">
                <button type="button" className="btn btn--primary" onClick={next}>
                  {i + 1 >= SCENARIOS.length ? 'Zobrazit výsledek' : 'Další scénář'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
