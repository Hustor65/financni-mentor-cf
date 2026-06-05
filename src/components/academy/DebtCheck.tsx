import { useState } from 'react';
import { Icon } from '../Icon';

/**
 * DebtCheck — interaktivní „Vyplatí se ten dluh?" cvičení k tématu Dluhy.
 * Student dostane reálné situace a rozhoduje, jestli dluh/splátky dávají smysl.
 * Feedback + vysvětlení po každé volbě (research: rozhodnutí + reflexe učí líp
 * než pasivní text). Trénuje rozdíl mezi „dobrým" a „špatným" dluhem.
 */

interface Scenario {
  text: string;
  worth: boolean; // true = dluh tu dává rozumný smysl
  explain: string;
}

const SCENARIOS: Scenario[] = [
  {
    text: '📱 Nový telefon za 6 000 Kč. Na hotovost máš. Prodejce nabízí 24 splátek po 350 Kč (celkem 8 400 Kč).',
    worth: false,
    explain: 'Na splátky zaplatíš o 2 400 Kč víc za něco, na co máš. Když máš hotovost, skoro vždy se vyplatí zaplatit rovnou.',
  },
  {
    text: '🎓 Rekvalifikační kurz za 15 000 Kč, který ti reálně zvedne plat, na půjčku s nízkým RPSN, kterou v pohodě splatíš.',
    worth: true,
    explain: 'Tohle je „dobrý dluh" — investice do sebe, co ti vydělá víc, než stojí. Pokud splátky utáhneš, dává smysl.',
  },
  {
    text: '👟 Boty za 2 000 Kč přes „kup teď, zaplať za 30 dní". Máš teď jiné výdaje a nejsi si jistý, že za měsíc peníze budeš mít.',
    worth: false,
    explain: 'BNPL na zbytnou věc, k tomu nejistota, že zaplatíš včas = past. Při zpoždění přijdou poplatky. Co si nemůžeš dovolit teď, nekupuj na dluh.',
  },
  {
    text: '💳 Na kreditce utratíš 4 000 Kč a celou částku splatíš do data splatnosti (v bezúročném období).',
    worth: true,
    explain: 'Když splatíš celou částku včas, je odklad zdarma — to je kreditka použitá správně. Past nastává, až když nesplatíš celé a naskočí úrok.',
  },
  {
    text: '🛋️ Gauč za 15 000 Kč na splátky s RPSN 38 %, i když ten tvůj starý pořád funguje.',
    worth: false,
    explain: 'Drahý úvěr (RPSN 38 %) na zbytnou věc, kterou nutně nepotřebuješ. Radši našetři — ušetříš tisíce na úrocích.',
  },
  {
    text: '🏖️ Rychlá půjčka s RPSN 80 % na dovolenou, na kterou teď nemáš.',
    worth: false,
    explain: 'Drahý dluh na spotřebu, co za chvíli „není". RPSN 80 % je extrémní past. Dovolená počká, až si na ni našetříš.',
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

  if (done) {
    const pct = Math.round((score / SCENARIOS.length) * 100);
    const good = score >= Math.ceil(SCENARIOS.length * 0.6);
    return (
      <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: 'var(--space-sm) 0' }}>
        <Icon name={good ? 'check-circle' : 'alert-triangle'} size={40} color={good ? 'var(--lg-green-500, #10B981)' : '#F59E0B'} aria-hidden />
        <p style={{ fontWeight: 700, fontSize: '1.15rem', margin: 'var(--space-sm) 0 0' }}>
          {good ? 'Dobře! Dobrý dluh od pasti rozeznáš.' : 'Ještě trénuj — drahý dluh se umí dobře schovat.'}
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
        <span className="eyebrow">Situace {i + 1} / {SCENARIOS.length}</span>
        <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>Skóre {score}</span>
      </div>

      <p style={{ fontSize: '1.05rem', lineHeight: 1.55, margin: '0 0 var(--space-md)' }}>{s.text}</p>

      {guess === null ? (
        <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => answer(true)}
            style={{ flex: 1, minWidth: 130, padding: '0.7rem 1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid rgba(16,185,129,0.5)', background: 'rgba(16,185,129,0.12)', color: '#34d399', fontWeight: 700, font: 'inherit', cursor: 'pointer' }}
          >
            ✅ Dává smysl
          </button>
          <button
            type="button"
            onClick={() => answer(false)}
            style={{ flex: 1, minWidth: 130, padding: '0.7rem 1rem', borderRadius: 'var(--radius-md, 10px)', border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', fontWeight: 700, font: 'inherit', cursor: 'pointer' }}
          >
            🚩 Radši ne
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
                {correct ? 'Správně!' : 'Pozor!'} {s.worth ? 'Tady dluh dává smysl.' : 'Tady je dluh spíš past.'}
              </p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.92rem', lineHeight: 1.5, opacity: 0.85 }}>{s.explain}</p>
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={next} style={{ marginTop: 'var(--space-md)' }}>
            {i + 1 >= SCENARIOS.length ? 'Zobrazit výsledek' : 'Další situace →'}
          </button>
        </div>
      )}
    </div>
  );
};
