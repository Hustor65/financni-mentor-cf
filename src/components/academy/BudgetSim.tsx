import { useState } from 'react';

/**
 * BudgetSim — interaktivní rozpočtový simulátor „Zvládneš měsíc?“ k tématu Rozpočet.
 * Inspirováno NGPF „SPENT“ (research: game-based učení měřitelně zvyšuje fin. gramotnost
 * +0,313 SD). Student dostane výplatu z brigády a prochází měsícem rozhodnutí a nečekaných
 * událostí; po každé volbě dostane vysvětlení (rozhodnutí + reflexe), na konci debrief.
 * Pevná sekvence událostí (žádný Math.random) → reprodukovatelné a férové.
 */

const START = 10000; // výplata z brigády (Kč)

interface Choice {
  label: string;
  money: number;        // změna zůstatku
  save?: number;        // kolik z toho jde do rezervy
  sweepToSave?: boolean; // přesune zbylý zůstatek do rezervy
  note: string;
}
interface Step {
  title: string;
  prompt: string;
  choices: Choice[];
}

const STEPS: Step[] = [
  {
    title: 'Výplata',
    prompt: 'Je prvního a přišla ti výplata z brigády: 10 000 Kč. První rada zní „zaplať nejdřív sobě“. Kolik hned dáš stranou na spoření?',
    choices: [
      { label: 'Nic, uvidím na konci', money: 0, note: 'Spoření „z toho, co zbyde“ většinou nedopadne, na konci nezbyde nic. Proto se odkládá hned.' },
      { label: 'Dám stranou 1 000 Kč', money: -1000, save: 1000, note: 'Dobrý návyk. Odložit hned po výplatě je nejjistější způsob, jak vůbec něco ušetřit.' },
      { label: 'Dám stranou 2 000 Kč', money: -2000, save: 2000, note: 'Ambiciózní. Pokud se zbytkem měsíce vyjdeš, je to výborný krok. Uvidíme, jak to dopadne.' },
    ],
  },
  {
    title: 'Nutné výdaje',
    prompt: 'Příspěvek domů, jídlo a doprava ti seberou 5 500 Kč. To prostě platí.',
    choices: [
      { label: 'Zaplatit', money: -5500, note: 'Nutné výdaje jdou vždy první, bez nich se neobejdeš. Teprve co zbyde, je na zábavu a spoření.' },
    ],
  },
  {
    title: 'Nečekaný výdaj',
    prompt: 'Smůla, rozbil se ti telefon. Nejlevnější oprava stojí 2 000 Kč.',
    choices: [
      { label: 'Zaplatit opravu', money: -2000, note: 'Přesně kvůli takovým nečekaným věcem se vyplatí nouzová rezerva. Pokryje je a účet nespadne do mínusu.' },
    ],
  },
  {
    title: 'Zábava',
    prompt: 'Kamarádi tě zvou na festival za 1 500 Kč. Jdeš?',
    choices: [
      { label: 'Jdu naplno', money: -1500, note: 'Zábava je v pořádku, pokud na ni po nutných výdajích máš. Sleduj, kolik ti zůstává.' },
      { label: 'Menší akce s nimi', money: -500, note: 'Rozumný kompromis. Užiješ si s partou a rozpočet to nepoloží.' },
      { label: 'Tentokrát ne', money: 0, note: 'Někdy je úplně v pořádku říct „teď ne“. Nemusíš stíhat každou akci a peníze zůstanou.' },
    ],
  },
  {
    title: 'Sleva',
    prompt: 'Boty, co se ti líbí, jsou ve slevě 20 % za 1 200 Kč. Bereš?',
    choices: [
      { label: 'Koupím za hotové', money: -1200, note: 'Když na to máš a opravdu je chceš, proč ne. Zaplatíš a je hotovo, žádný dluh.' },
      { label: '„Kup teď, zaplať později“', money: 0, note: 'Pozor. Odložená platba není zadarmo a snadno ztratíš přehled. Láká k útratě, kterou si jinak rozmyslíš. Dluh nezmizí, jen se schová.' },
      { label: 'Nechám být', money: 0, note: 'Sleva tě nemusí dostat. Nejlevnější je vždycky to, co nekoupíš.' },
    ],
  },
  {
    title: 'Konec měsíce',
    prompt: 'Měsíc končí. Co uděláš s penězi, které ti zůstaly na účtu?',
    choices: [
      { label: 'Nechám je na běžném účtu', money: 0, note: 'V pořádku. Jen počítej s tím, že co leží na běžném účtu, snadno se rozkutálí do dalších útrat.' },
      { label: 'Pošlu je do rezervy', money: 0, sweepToSave: true, note: 'Tohle dělá rozdíl. Rezerva roste a příští nečekaný výdaj tě nepoloží.' },
    ],
  },
];

const fmt = (n: number) => `${n.toLocaleString('cs-CZ').replace('-', '−')}\u00a0Kč`;

export const BudgetSim: React.FC = () => {
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState(START);
  const [saved, setSaved] = useState(0);
  const [wentNegative, setWentNegative] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const s = STEPS[step];

  const choose = (c: Choice, idx: number) => {
    if (note !== null) return;
    let newBalance = balance + c.money;
    let newSaved = saved + (c.save ?? 0);
    if (c.sweepToSave && newBalance > 0) { newSaved += newBalance; newBalance = 0; }
    if (newBalance < 0) setWentNegative(true);
    setBalance(newBalance);
    setSaved(newSaved);
    setPicked(idx);
    setNote(c.note);
  };
  const next = () => {
    if (step + 1 >= STEPS.length) { setDone(true); return; }
    setStep(step + 1);
    setNote(null);
    setPicked(null);
  };
  const restart = () => { setStep(0); setBalance(START); setSaved(0); setWentNegative(false); setNote(null); setPicked(null); setDone(false); };

  // průběžný stav: účet a rezerva
  const state = (
    <dl className="ui-kpis">
      <div>
        <dt>Na účtu</dt>
        <dd className={balance < 0 ? 'is-down' : undefined}>{fmt(balance)}</dd>
      </div>
      <div>
        <dt>V rezervě</dt>
        <dd className={saved > 0 ? 'is-up' : undefined}>{fmt(saved)}</dd>
      </div>
    </dl>
  );

  if (done) {
    const goodSaved = saved >= 2000;
    const okSaved = saved > 0;
    const title = wentNegative
      ? 'Měsíc máš za sebou, ale účet šel do mínusu.'
      : goodSaved
      ? 'Měsíc bez mínusu a slušná rezerva.'
      : 'Měsíc bez mínusu.';
    return (
      <div className="tl-quiz tl-quiz--end" role="status" aria-live="polite">
        <p className="ui-steps">Hotovo, {STEPS.length} z {STEPS.length} kroků</p>
        <p className="ui-hero-num tl-hero">
          <span className="ui-hero-num__label">V rezervě máš</span>
          {fmt(saved)}
        </p>
        <dl className="ui-kpis">
          <div>
            <dt>Na účtu zbylo</dt>
            <dd className={balance < 0 ? 'is-down' : undefined}>{fmt(balance)}</dd>
          </div>
          <div>
            <dt>Utraceno</dt>
            <dd>{fmt(START - balance - saved)}</dd>
          </div>
        </dl>
        <p className={`ui-note ${wentNegative ? 'ui-note--warn' : 'ui-note--ok'}`}>
          <strong>{title}</strong>{' '}
          {wentNegative && 'Mínus na účtu znamená drahý kontokorent nebo dluh. Příště nech víc na nutné výdaje a míň utrácej za věci, které počkají.'}
          {!wentNegative && goodSaved && 'Odkládáš stranou a držíš se rozpočtu. Přesně takhle se buduje nouzová rezerva i klid v hlavě.'}
          {!wentNegative && !goodSaved && okSaved && 'Něco šlo stranou, to je dobrý začátek. Zkus příště hned po výplatě odložit o kousek víc.'}
          {!wentNegative && !okSaved && 'Do rezervy nešlo nic. Zkus příště „zaplatit nejdřív sobě“ hned po výplatě.'}
        </p>
        <div className="tl-quiz__actions">
          <button type="button" className="btn btn--primary" onClick={restart}>Zkusit měsíc znovu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tl-ex">
      <div className="tl-quiz tl-quiz--run">
        <div className="tl-quiz__side">
          <div className="tl-quiz__head">
            <span className="ui-steps">Krok {step + 1} z {STEPS.length} · {s.title}</span>
            <div className="ui-progress" aria-hidden="true"><span style={{ width: `${((step + (note !== null ? 1 : 0)) / STEPS.length) * 100}%` }} /></div>
          </div>
          {state}
        </div>
        <div className="tl-quiz__main">
          <p className="tl-quiz__prompt">{s.prompt}</p>

          <ul className="ui-choices">
            {s.choices.map((c, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  className={`ui-choice${picked === idx ? ' is-selected' : ''}`}
                  aria-disabled={note !== null}
                  aria-pressed={picked === idx}
                  onClick={() => choose(c, idx)}
                >
                  <span className="tl-choice__text">{c.label}</span>
                  <span className="tl-choice__end">{fmt(c.money)}</span>
                </button>
              </li>
            ))}
          </ul>

          {note !== null && (
            <div className="tl-quiz__feedback" aria-live="polite">
              <p className="ui-note">{note}</p>
              <div className="tl-quiz__actions">
                <button type="button" className="btn btn--primary" onClick={next}>
                  {step + 1 >= STEPS.length ? 'Jak to dopadlo?' : 'Další krok'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
