import { useState, useMemo } from 'react';
import { czInvestmentTax, czDipDeduction, czNum } from '../../utils/calculators';
import { DIP_DEDUCT_LIMIT_2026 } from '../../data/constants';
import { Icon } from '../Icon';

export const TaxCalc: React.FC = () => {
  // ── Prodej cenných papírů ──
  const [buy, setBuy] = useState(20000);
  const [sell, setSell] = useState(26000);
  const [proceeds, setProceeds] = useState(26000);
  const [heldOver3y, setHeld] = useState(false);

  // ── DIP ──
  const [dipContrib, setDipContrib] = useState(0);
  const [otherContrib, setOtherContrib] = useState(0);

  const taxResult = useMemo(
    () => czInvestmentTax(buy, sell, proceeds, heldOver3y),
    [buy, sell, proceeds, heldOver3y],
  );
  const dipResult = useMemo(
    () => czDipDeduction(dipContrib, otherContrib),
    [dipContrib, otherContrib],
  );

  // cap meter — sdílený strop se plní penzijkem jako první, pak DIP
  const CAP = DIP_DEDUCT_LIMIT_2026;
  const otherCapped = Math.min(otherContrib, CAP);
  const otherPct = Math.min(100, (otherCapped / CAP) * 100);
  const dipPct = Math.max(0, Math.min(100 - otherPct, (dipResult.deductible / CAP) * 100));
  const dipOverCap = Math.max(0, dipContrib - dipResult.deductible);

  return (
    <div>
      {/* ════ ČÁST 1: Daň z prodeje ════ */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--lg-cyan-400)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Icon name="scale" size={16} color="var(--lg-cyan-400)" /> Daň z prodeje investic
      </div>

      <div className="calc-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tax-buy">Nákupní cena (Kč)</label>
            <input
              id="tax-buy"
              className="form-input"
              type="number"
              min={0}
              value={buy}
              onChange={e => setBuy(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tax-sell">Prodejní cena (Kč)</label>
            <input
              id="tax-sell"
              className="form-input"
              type="number"
              min={0}
              value={sell}
              onChange={e => setSell(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="tax-proceeds">Roční příjmy z prodeje cenných papírů (Kč)</label>
          <input
            id="tax-proceeds"
            className="form-input"
            type="number"
            min={0}
            value={proceeds}
            onChange={e => setProceeds(Number(e.target.value))}
          />
        </div>
        <label
          className="form-group"
          style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={heldOver3y}
            onChange={e => setHeld(e.target.checked)}
            style={{ accentColor: 'var(--lg-cyan-500)', width: '15px', height: '15px', flexShrink: 0 }}
          />
          <span className="form-label" style={{ cursor: 'pointer', marginBottom: 0 }}>
            Cenné papíry držím déle než 3 roky (časový test)
          </span>
        </label>
      </div>

      {/* KPI řádek — daň */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '1rem' }}>
        {[
          { label: 'Hrubý zisk', value: `${czNum(taxResult.gain)} Kč`, color: 'var(--text-primary)' },
          { label: 'Daň', value: taxResult.exempt ? '0 Kč ✓' : `${czNum(taxResult.tax)} Kč`, color: taxResult.exempt ? 'var(--lg-green-500)' : '#ef4444' },
          { label: 'Čistý zisk', value: `${czNum(taxResult.netGain)} Kč`, color: 'var(--lg-green-500)' },
        ].map(k => (
          <div key={k.label} className="glass-panel--sunken" style={{ padding: '0.7rem 0.75rem', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Vysvětlení */}
      <div
        style={{
          borderLeft: `3px solid ${taxResult.exempt ? 'var(--lg-green-500)' : '#f59e0b'}`,
          padding: '0.6rem 0.75rem',
          marginTop: '0.75rem',
          background: taxResult.exempt ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
          borderRadius: '0 8px 8px 0',
        }}
      >
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {taxResult.exempt ? (
            <>
              <strong style={{ color: 'var(--lg-green-500)' }}>Osvobozeno</strong> —{' '}
              {taxResult.passedTimeTest
                ? 'držíš je déle než 3 roky, takže zisk nedaníš.'
                : 'souhrn tvých prodejů je do 100 000 Kč za rok, takže zisk nedaníš.'}
            </>
          ) : (
            <>
              Neplatí žádné osvobození, proto zisk daníš 15 %.{' '}
              <strong style={{ color: 'var(--lg-green-500)' }}>Tip: když cenné papíry držíš déle než 3 roky, je zisk od daně osvobozený.</strong>
            </>
          )}
        </span>
      </div>

      {/* ════ ODDĚLOVAČ ════ */}
      <div style={{ borderTop: '1px solid var(--glass-border)', margin: '1.75rem 0 1.25rem' }} />

      {/* ════ ČÁST 2: DIP ════ */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: 'var(--lg-cyan-400)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Icon name="coins" size={16} color="var(--lg-cyan-400)" /> DIP — kolik ušetříš na daních
      </div>

      <div className="calc-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="tax-dip">Roční vklad do DIP (Kč)</label>
            <input
              id="tax-dip"
              className="form-input"
              type="number"
              min={0}
              step={2000}
              value={dipContrib}
              onChange={e => setDipContrib(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="tax-other">Penzijní a životní pojištění (Kč/rok)</label>
            <input
              id="tax-other"
              className="form-input"
              type="number"
              min={0}
              step={2000}
              value={otherContrib}
              onChange={e => setOtherContrib(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* KPI řádek — DIP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginTop: '1rem' }}>
        {[
          { label: 'Odečet od základu daně', value: `${czNum(dipResult.deductible)} Kč`, color: 'var(--text-primary)' },
          { label: 'Daňová úspora', value: `${czNum(dipResult.taxSaving)} Kč`, color: 'var(--lg-green-500)' },
          { label: 'Čistá cena vkladu', value: `${czNum(dipResult.netCost)} Kč`, color: 'var(--lg-cyan-400)' },
        ].map(k => (
          <div key={k.label} className="glass-panel--sunken" style={{ padding: '0.7rem 0.75rem', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Cap meter — vizualizuje, kde se DIP přestává vyplácet (sdílený strop) */}
      <div style={{ marginTop: '1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          <span>Roční strop odpočtu (DIP + penzijní a životní pojištění)</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{czNum(CAP)} Kč</span>
        </div>
        <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(148,163,184,0.1)' }}>
          <div style={{ width: `${otherPct}%`, background: '#64748b', transition: 'width 300ms ease' }} title="Penzijko / životko" />
          <div style={{ width: `${dipPct}%`, background: 'var(--lg-cyan-500)', transition: 'width 300ms ease' }} title="DIP s odpočtem" />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem 1.1rem', flexWrap: 'wrap', marginTop: '0.55rem', fontSize: '0.72rem' }}>
          {otherCapped > 0 && (
            <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#64748b' }} /> Penzijko/životko {czNum(otherCapped)} Kč
            </span>
          )}
          <span style={{ color: 'var(--lg-cyan-400)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--lg-cyan-500)' }} /> DIP s odpočtem {czNum(dipResult.deductible)} Kč
          </span>
          {dipResult.unused > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>Volný strop {czNum(dipResult.unused)} Kč</span>
          )}
          {dipOverCap > 0 && (
            <span style={{ color: '#f59e0b' }}>DIP nad strop {czNum(dipOverCap)} Kč — už bez úspory</span>
          )}
        </div>
      </div>
    </div>
  );
};
