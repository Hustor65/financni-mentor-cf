import { useState, useMemo } from 'react';
import { Icon } from '../Icon';
import { NumberField } from '../NumberField';

// Formátování čísel — české locale s mezerami jako oddělovači tisíců
const czFmt = (n: number): string =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const czFmt2 = (n: number): string =>
  n.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const HallucinationDemo: React.FC = () => {
  const [initDeposit, setInitDeposit] = useState(50000);
  const [monthly, setMonthly] = useState(3155);
  const [rate, setRate] = useState(11.43);
  const [years, setYears] = useState(8);

  const { exactValue, hallucinatedValue, diffValue, formattedExact, formattedHallucinated, formattedDiff } =
    useMemo(() => {
      const r = (rate / 100) / 12;
      const n = years * 12;
      const exact = initDeposit * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
      const hallucinated = exact * 0.9904;
      const hallucShown = Math.floor(hallucinated);  // přesně tak, jak halucinaci zobrazíme
      const diff = exact - hallucShown;              // rozdíl ze ZOBRAZENÉ halucinace → tři čísla na stránce sedí
      return {
        exactValue: exact,
        hallucinatedValue: hallucinated,
        diffValue: diff,
        formattedExact: czFmt2(exact),
        formattedHallucinated: czFmt(hallucShown),
        formattedDiff: czFmt2(diff),
      };
    }, [initDeposit, monthly, rate, years]);

  // Suppress unused-variable lint for exactValue/hallucinatedValue/diffValue
  void exactValue; void hallucinatedValue; void diffValue;

  return (
    <>
      {/* ── Nadpis sekce ── */}
      <div className="spacer-md" />
      <span className="eyebrow eyebrow--cyan">Proč Function Calling</span>
      <p className="section-header">Jazykové modely neumí počítat bez Function Callingu</p>
      <p className="section-desc">
        Nejslabší a nejnebezpečnější stránka AI? Generuje textové odpovědi skládáním slov na základě statistické
        pravděpodobnosti,{' '}
        <strong>ale přirozeně neprovádí exaktní matematiku.</strong>{' '}
        Toto chování ukazuje enormní riziko v oblasti financí.
      </p>

      <div className="spacer-md" />

      {/* ── Error banner ── */}
      <div
        className="glass-panel reveal"
        style={{ borderLeft: '3px solid #EF4444', padding: '1rem 1.5rem' }}
      >
        <p
          style={{
            color: '#EF4444',
            fontWeight: 600,
            margin: 0,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <span style={{ display: 'inline-flex', color: '#EF4444', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span>
            Níže uvedený scénář demonstruje skutečnou halucinaci jazykového modelu, na kterou jsme v praxi upozornili!
          </span>
        </p>
      </div>

      <div className="spacer-lg" />

      {/* ── Interaktivní intro panel ── */}
      <div
        className="glass-panel glass-panel--sunken reveal"
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1rem',
            fontWeight: 600,
            color: '#E2E8F0',
            marginBottom: '0.5rem',
            marginTop: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Icon name="sparkles" size={18} color="#3ab5e0" />
          Vyzkoušejte si to sami — Změňte parametry a sledujte rozdíl v přímém přenosu
        </p>
        <p style={{ color: '#64748B', fontSize: '0.82rem', margin: 0 }}>
          Zadejte libovolné hodnoty a pozorujte, jak se liší přesný matematický výpočet od toho, co by odpověděl standardní jazykový model.
        </p>
      </div>

      {/* ── 4 vstupy ── */}
      <div className="calc-form reveal" style={{ marginBottom: '1.5rem' }}>
        <NumberField label="Počáteční vklad" suffix="Kč" value={initDeposit} onChange={setInitDeposit}
          min={1000} sliderMin={1000} sliderMax={500000} step={5000} />
        <NumberField label="Měsíční splátka" suffix="Kč" value={monthly} onChange={setMonthly}
          min={100} sliderMin={100} sliderMax={20000} step={500} />
        <NumberField label="Úrok (% p.a.)" suffix="%" value={rate} onChange={setRate}
          min={1} max={100} sliderMin={1} sliderMax={15} step={0.1} decimals={2} />
        <NumberField label="Doba (roky)" suffix="let" value={years} onChange={setYears}
          min={3} max={20} sliderMin={3} sliderMax={20} step={1} />
      </div>

      {/* ── Dva sloupce: Exaktní vs Halucinace ── */}
      <div className="spacer-md" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* VLEVO — Exaktní matematika */}
        <div className="glass-panel glass-panel--elevated reveal" style={{ height: '100%', ['--reveal-i' as string]: 0 }}>
          <p
            className="section-header"
            style={{
              fontSize: '1.15rem',
              color: '#10B981',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ display: 'inline-flex', color: '#10B981' }}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
            Exaktní Matematika (Python)
          </p>

          <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 2, marginBottom: '1.5rem' }}>
            • Počáteční vklad: <strong style={{ color: '#E2E8F0' }}>{czFmt(initDeposit)} Kč</strong><br />
            • Měsíční splátka: <strong style={{ color: '#E2E8F0' }}>{czFmt(monthly)} Kč</strong><br />
            • Úroková sazba: <strong style={{ color: '#E2E8F0' }}>{rate} % p.a.</strong><br />
            • Doba úročení: <strong style={{ color: '#E2E8F0' }}>{years} let</strong> (měsíční úročení)
          </p>

          <div
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: '12px',
              padding: '1.75rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Přesný vědecký výpočet
            </p>
            <p
              aria-live="polite"
              aria-label={`Přesný výpočet: ${formattedExact} korun`}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.9rem',
                fontWeight: 700,
                color: '#10B981',
                margin: 0,
              }}
            >
              {formattedExact} Kč
            </p>
          </div>
        </div>

        {/* VPRAVO — LLM Halucinace */}
        <div className="glass-panel glass-panel--elevated reveal" style={{ height: '100%', ['--reveal-i' as string]: 1 }}>
          <p
            className="section-header"
            style={{
              fontSize: '1.15rem',
              color: '#EF4444',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ display: 'inline-flex', color: '#EF4444' }}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            LLM Halucinace
          </p>

          {/* Dotaz pro AI */}
          <div
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0 0 0.4rem' }}>Dotaz pro AI:</p>
            <p style={{ color: '#94A3B8', fontSize: '0.82rem', fontStyle: 'italic', margin: 0, lineHeight: 1.7 }}>
              &quot;Vypočítej stav budoucího konta po {years} letech s vkladem {czFmt(initDeposit)} Kč
              a měsíční úsporou {czFmt(monthly)} Kč s úrokem {rate}%...&quot;
            </p>
          </div>

          {/* Halucinovaná částka */}
          <div
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ color: '#64748B', fontSize: '0.75rem', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              AI s naprostou jistotou odpoví:
            </p>
            <p
              aria-live="polite"
              aria-label={`Halucinovaná odpověď AI: ${formattedHallucinated} korun`}
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.9rem',
                fontWeight: 700,
                color: '#EF4444',
                margin: 0,
              }}
            >
              ~{formattedHallucinated} Kč
            </p>
          </div>

          {/* Chyba + vysvětlení */}
          <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: '12px', padding: '1rem' }}>
            <p style={{ color: '#EF4444', fontWeight: 700, fontSize: '1.05rem', margin: '0 0 0.5rem' }}>
              Chyba: o {formattedDiff} Kč méně!
            </p>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: 1.7, margin: 0 }}>
              Model sice správně popíše postup výpočtu, ale jelikož ve skutečnosti nepočítá exponenty,
              nýbrž pouze tipuje další slova, vytvoří zcela smyšlenou konečnou částku.
              Dokud AI modely nepoužívají pokročilé volání funkcí (Function Calling) jako náš FinMentor,
              nelze jim ve finančních záležitostech důvěřovat!
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
