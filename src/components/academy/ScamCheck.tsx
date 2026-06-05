import { useState } from 'react';
import { Icon } from '../Icon';

/**
 * ScamCheck — interaktivní „Je to scam?" cvičení k tématu Podvody a scamy.
 * Student dostane reálné scénáře (zprávy/nabídky) a hádá, jestli jde o podvod.
 * Po každé volbě dostane vysvětlení → trénuje rozpoznávání. Sedí k brandu „Nachytej AI".
 */

interface Scenario {
  icon: string;
  text: string;
  isScam: boolean;
  explain: string;
}

const SCENARIOS: Scenario[] = [
  {
    icon: 'mail',
    text: '„Gratulujeme! Vyhrál jsi nový iPhone. Pro doručení zaplať jen 49 Kč poplatek tady: bit.ly/vyhra-cz"',
    isScam: true,
    explain: 'Výhra v soutěži, které ses neúčastnil, plus malý „poplatek" předem = klasická past na tvoje platební údaje. Skutečné výhry se neplatí dopředu.',
  },
  {
    icon: 'trending-up',
    text: '„Investuj 1 000 Kč do našeho krypto fondu a garantujeme ti 500 Kč každý týden. Úplně bez rizika!"',
    isScam: true,
    explain: 'Zaručený vysoký výnos bez rizika neexistuje. Tohle je typický investiční podvod (často Ponziho schéma, co vyplácí první z peněz dalších).',
  },
  {
    icon: 'message-circle',
    text: 'SMS „od banky": „Zaznamenali jsme podezřelou platbu. Potvrďte identitu zde, jinak účet zablokujeme: secure-bank-cz.net"',
    isScam: true,
    explain: 'Phishing. Banka tě nikdy nežádá o přihlášení přes odkaz v SMS a doména je podezřelá. Nikdy neklikej — jdi rovnou do oficiální appky banky.',
  },
  {
    icon: 'users',
    text: '„Práce z domova: necháš si na svůj účet posílat platby od našich klientů a pošleš je dál. Necháš si 10 %."',
    isScam: true,
    explain: 'Money muling — praní špinavých peněz přes tvůj účet. Je to trestné, i když „jen přeposíláš". Svůj účet nikdy nikomu nepůjčuj.',
  },
  {
    icon: 'lock',
    text: '„Někdo ti poslal dárek! Pro odemčení potvrď číslo karty, datum platnosti, CVV a kód z SMS."',
    isScam: true,
    explain: 'CVV a kód z SMS jsou klíče k tvým penězům — nikdy je nikam nezadávej kvůli „dárku". Žádná legitimní služba je takhle nechce.',
  },
  {
    icon: 'dollar-sign',
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

  if (done) {
    const pct = Math.round((score / SCENARIOS.length) * 100);
    const good = score >= Math.ceil(SCENARIOS.length * 0.6);
    return (
      <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: 'var(--space-sm) 0' }}>
        <Icon name={good ? 'shield-check' : 'alert-triangle'} size={40} color={good ? 'var(--lg-green-500, #10B981)' : '#F59E0B'} aria-hidden />
        <p style={{ fontWeight: 700, fontSize: '1.15rem', margin: 'var(--space-sm) 0 0' }}>
          {good ? 'Hezky! Podvod poznáš.' : 'Ještě trénuj — podvodníci jsou vychytralí.'}
        </p>
        <p style={{ opacity: 0.75, margin: '0.3rem 0 var(--space-md)' }}>
          Trefil/a jsi {score} z {SCENARIOS.length} ({pct} %).
        </p>
        <button type="button" className="btn btn--ghost" onClick={restart}>Zkusit znovu</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
        <span className="eyebrow">Scénář {i + 1} / {SCENARIOS.length}</span>
        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Skóre {score}</span>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', margin: '0 0 var(--space-md)' }}>
        <Icon name={s.icon} size={26} color="var(--lg-cyan-2, #4cc4e6)" aria-hidden />
        <p style={{ fontSize: '1.05rem', lineHeight: 1.55, margin: 0 }}>{s.text}</p>
      </div>

      {guess === null ? (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => answer(true)}
            style={{ flex: 1, minWidth: 130, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 700, font: 'inherit', cursor: 'pointer' }}
          >
            <Icon name="flag" size={18} aria-hidden /> Podvod
          </button>
          <button
            type="button"
            onClick={() => answer(false)}
            style={{ flex: 1, minWidth: 130, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.7rem 1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontWeight: 700, font: 'inherit', cursor: 'pointer' }}
          >
            <Icon name="check-circle" size={18} aria-hidden /> V pořádku
          </button>
        </div>
      ) : (
        <div aria-live="polite">
          <div
            style={{
              display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start',
              padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md, 10px)',
              background: correct ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${correct ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
            }}
          >
            <Icon name={correct ? 'check-circle' : 'alert-triangle'} size={22} color={correct ? 'var(--lg-green-500, #10B981)' : '#F59E0B'} aria-hidden />
            <div>
              <p style={{ fontWeight: 700, margin: 0 }}>
                {correct ? 'Správně!' : 'Pozor!'} {s.isScam ? 'Tohle je podvod.' : 'Tohle je v pořádku.'}
              </p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.92rem', lineHeight: 1.5, opacity: 0.85 }}>{s.explain}</p>
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={next} style={{ marginTop: 'var(--space-md)' }}>
            {i + 1 >= SCENARIOS.length ? 'Zobrazit výsledek' : 'Další scénář →'}
          </button>
        </div>
      )}
    </div>
  );
};
