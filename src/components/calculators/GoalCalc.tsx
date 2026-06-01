import { useState, useMemo } from 'react';
import { czNum } from '../../utils/calculators';
import { NumberField } from '../NumberField';

/**
 * Obrácená kalkulačka složeného úročení — z cíle spočítá měsíční vklad.
 * PMT = FV / ( ((1+r)^n − 1)/r × (1+r) )  [anuita-due, vklad na začátku měsíce]
 */
export const GoalCalc = () => {
  const [goal, setGoal] = useState(1_000_000);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(7);

  const { monthly, invested, gain } = useMemo(() => {
    const r = rate / 100 / 12;
    const n = Math.max(1, years * 12);
    const m = r === 0 ? goal / n : goal / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    const monthlyRounded = Math.max(0, Math.ceil(m));
    const inv = monthlyRounded * n;
    return { monthly: monthlyRounded, invested: inv, gain: Math.max(0, goal - inv) };
  }, [goal, years, rate]);

  return (
    <div>
      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: '#E2E8F0', fontSize: '0.95rem', margin: '0 0 0.9rem' }}>
        Mám cíl — kolik musím odkládat měsíčně?
      </p>
      <div className="calc-form">
        <NumberField label="Cílová částka" suffix="Kč" value={goal} onChange={setGoal}
          min={10000} sliderMin={100000} sliderMax={10000000} step={50000} />
        <NumberField label="Za kolik let" suffix="let" value={years} onChange={setYears}
          min={1} max={60} sliderMin={1} sliderMax={40} step={1} />
        <NumberField label="Roční výnos" suffix="%" value={rate} onChange={setRate}
          min={0} max={100} sliderMin={1} sliderMax={15} step={0.5} decimals={1} />
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', marginTop: '1rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          Měsíčně odkládat
        </div>
        <div className="grad-text--green" style={{ fontSize: '2rem', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
          {czNum(monthly)} Kč
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.6 }}>
          Celkem vložíš <strong style={{ color: '#E2E8F0' }}>{czNum(invested)} Kč</strong>,
          výnosy ti přidají <strong style={{ color: 'var(--lg-green-500)' }}>{czNum(gain)} Kč</strong>.
        </div>
      </div>
    </div>
  );
};
