import { useState } from 'react';
import { Icon } from '../Icon';

/**
 * BudgetSim — interaktivní rozpočtový simulátor „Zvládneš měsíc?" k tématu Rozpočet.
 * Inspirováno NGPF „SPENT" (research: game-based učení měřitelně zvyšuje fin. gramotnost
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
  prompt: string;
  choices: Choice[];
}

const STEPS: Step[] = [
  {
    prompt: 'Je první a přišla ti výplata z brigády: 10 000 Kč. První rada zní „zaplať nejdřív sobě". Kolik hned dáš stranou na spoření?',
    choices: [
      { label: 'Nic, uvidím na konci', money: 0, note: 'Spoření „z toho, co zbyde" většinou nedopadne — na konci nezbyde nic. Proto se odkládá hned.' },
      { label: 'Dám stranou 1 000 Kč', money: -1000, save: 1000, note: 'Dobrý návyk! Odložit hned po výplatě je nejjistější způsob, jak si vůbec něco ušetřit.' },
      { label: 'Dám stranou 2 000 Kč', money: -2000, save: 2000, note: 'Ambiciózní — pokud na zbytek měsíce vyjdeš, super. Uvidíme, jak to dopadne.' },
    ],
  },
  {
    prompt: 'Nutné výdaje: příspěvek domů, jídlo a doprava ti seberou 5 500 Kč. To prostě platí.',
    choices: [
      { label: 'Zaplatit (−5 500 Kč)', money: -5500, note: 'Nutné výdaje jdou vždy první — bez nich se neobejdeš. Co zbyde, je teprve na zábavu a spoření.' },
    ],
  },
  {
    prompt: '📱 Smůla — rozbil se ti telefon. Nejlevnější oprava stojí 2 000 Kč.',
    choices: [
      { label: 'Zaplatit (−2 000 Kč)', money: -2000, note: 'Přesně kvůli takovým nečekaným věcem je dobrá nouzová rezerva — kryje je, aniž bys spadl do mínusu.' },
    ],
  },
  {
    prompt: '🎉 Kamarádi tě zvou na festival za 1 500 Kč. Jdeš?',
    choices: [
      { label: 'Jdu naplno (−1 500 Kč)', money: -1500, note: 'Zábava je v pohodě — pokud na ni máš po nutných výdajích. Sleduj, kolik ti zůstává.' },
      { label: 'Menší akce s nimi (−500 Kč)', money: -500, note: 'Rozumný kompromis — užiješ si s partou a přitom to nepoloží tvůj rozpočet.' },
      { label: 'Tentokrát ne (0 Kč)', money: 0, note: 'Někdy je úplně OK říct si „teď ne". Nemusíš stíhat každou akci — a peníze zůstanou.' },
    ],
  },
  {
    prompt: '👟 Sleva 20 % na boty, co se ti líbí (1 200 Kč). Bereš?',
    choices: [
      { label: 'Koupím za hotové (−1 200 Kč)', money: -1200, note: 'Když na to máš a fakt to chceš, proč ne — zaplatíš a je hotovo, žádný dluh.' },
      { label: '„Kup teď, zaplať později" (BNPL)', money: 0, note: 'Pozor — BNPL není zadarmo a snadno ztratíš přehled. Odložená platba láká k útratě, kterou bys jinak nezvážil. Dluh nezmizí, jen se schová.' },
      { label: 'Nechám být (0 Kč)', money: 0, note: 'Sleva tě nemusí dostat. Nejlevnější je vždycky to, co nekoupíš.' },
    ],
  },
  {
    prompt: 'Konec měsíce se blíží. Co uděláš s penězi, co ti zůstaly na účtu?',
    choices: [
      { label: 'Nechám je na běžném účtu', money: 0, note: 'V pohodě — ale co leží „jen tak" na běžném účtu, to se snadno rozkutálí do dalších útrat.' },
      { label: 'Většinu pošlu do rezervy', money: 0, sweepToSave: true, note: 'Tohle dělá rozdíl — rezerva roste a příští nečekaný výdaj tě nepoloží. Přesně takhle se buduje klid.' },
    ],
  },
];

const fmt = (n: number) => n.toLocaleString('cs-CZ');

export const BudgetSim: React.FC = () => {
  const [step, setStep] = useState(0);
  const [balance, setBalance] = useState(START);
  const [saved, setSaved] = useState(0);
  const [wentNegative, setWentNegative] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const s = STEPS[step];

  const choose = (c: Choice) => {
    if (note !== null) return;
    let newBalance = balance + c.money;
    let newSaved = saved + (c.save ?? 0);
    if (c.sweepToSave && newBalance > 0) { newSaved += newBalance; newBalance = 0; }
    if (newBalance < 0) setWentNegative(true);
    setBalance(newBalance);
    setSaved(newSaved);
    setNote(c.note);
  };
  const next = () => {
    if (step + 1 >= STEPS.length) { setDone(true); return; }
    setStep(step + 1);
    setNote(null);
  };
  const restart = () => { setStep(0); setBalance(START); setSaved(0); setWentNegative(false); setNote(null); setDone(false); };

  // ── Live stav (zůstatek + rezerva) ──
  const Stat = (
    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
      <div style={{ flex: 1, padding: 'var(--space-sm)', borderRadius: 'var(--radius-md, 10px)', background: 'var(--surface-2, #16242f)', border: '1px solid var(--border-1, rgba(120,180,210,0.18))', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>Na účtu</div>
        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: balance < 0 ? '#fbbf24' : 'var(--lg-cyan-2, #4cc4e6)' }}>{fmt(balance)} Kč</div>
      </div>
      <div style={{ flex: 1, padding: 'var(--space-sm)', borderRadius: 'var(--radius-md, 10px)', background: 'var(--surface-2, #16242f)', border: '1px solid var(--border-1, rgba(120,180,210,0.18))', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>V rezervě</div>
        <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--lg-green-500, #10B981)' }}>{fmt(saved)} Kč</div>
      </div>
    </div>
  );

  if (done) {
    const goodSaved = saved >= 2000;
    const okSaved = saved > 0;
    const verdict = wentNegative
      ? { icon: 'alert-triangle', color: '#F59E0B', title: 'Měsíc jsi přežil, ale byl jsi v mínusu.' }
      : goodSaved
      ? { icon: 'check-circle', color: 'var(--lg-green-500, #10B981)', title: 'Skvělé! Měsíc v pohodě a slušná rezerva.' }
      : { icon: 'check-circle', color: 'var(--lg-cyan-2, #4cc4e6)', title: 'Zvládl jsi to bez mínusu.' };
    return (
      <div role="status" aria-live="polite">
        {Stat}
        <div style={{ textAlign: 'center', padding: 'var(--space-sm) 0' }}>
          <Icon name={verdict.icon} size={40} color={verdict.color} aria-hidden />
          <p style={{ fontWeight: 700, fontSize: '1.15rem', margin: 'var(--space-sm) 0 0' }}>{verdict.title}</p>
          <p style={{ opacity: 0.8, margin: '0.4rem 0 var(--space-md)', lineHeight: 1.5 }}>
            {wentNegative && 'Mínus na účtu znamená drahý kontokorent nebo dluh — příště nech víc na nutné výdaje a méně utrácej za chtění. '}
            {!wentNegative && goodSaved && 'Odkládáš stranou a držíš se rozpočtu — přesně takhle se buduje nouzová rezerva i klid v hlavě. '}
            {!wentNegative && !goodSaved && okSaved && 'Něco sis odložil — fajn start. Zkus příště odložit hned po výplatě o kousek víc. '}
            {!wentNegative && !okSaved && 'Do rezervy nešlo nic — zkus příště „zaplatit nejdřív sobě" hned po výplatě. '}
            Rezerva: {fmt(saved)} Kč.
          </p>
          <button type="button" className="btn btn--ghost" onClick={restart}>Zkusit znovu jinak</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {Stat}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <span className="eyebrow">Krok {step + 1} / {STEPS.length}</span>
      </div>
      <p style={{ fontSize: '1.05rem', lineHeight: 1.55, margin: '0 0 var(--space-md)' }}>{s.prompt}</p>

      {note === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {s.choices.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => choose(c)}
              style={{ textAlign: 'left', padding: '0.7rem 1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border-1, rgba(120,180,210,0.25))', background: 'var(--surface-1, #11202c)', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <div aria-live="polite">
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md, 10px)', background: 'rgba(76,196,230,0.1)', border: '1px solid rgba(76,196,230,0.35)' }}>
            <Icon name="info" size={20} color="var(--lg-cyan-2, #4cc4e6)" aria-hidden />
            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>{note}</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={next} style={{ marginTop: 'var(--space-md)' }}>
            {step + 1 >= STEPS.length ? 'Jak jsem dopadl?' : 'Další →'}
          </button>
        </div>
      )}
    </div>
  );
};
