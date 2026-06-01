import { useState, useMemo } from 'react';
import { czInvestmentTax, czDipDeduction, czNum } from '../../utils/calculators';
import { Icon } from '../Icon';

export const TaxCalc: React.FC = () => {
  // ── Prodej cenných papírů ──
  const [buy, setBuy] = useState(100000);
  const [sell, setSell] = useState(150000);
  const [proceeds, setProceeds] = useState(150000);
  const [heldOver3y, setHeld] = useState(false);

  // ── DIP ──
  const [dipContrib, setDipContrib] = useState(30000);
  const [otherContrib, setOtherContrib] = useState(0);

  const taxResult = useMemo(
    () => czInvestmentTax(buy, sell, proceeds, heldOver3y),
    [buy, sell, proceeds, heldOver3y],
  );
  const dipResult = useMemo(
    () => czDipDeduction(dipContrib, otherContrib),
    [dipContrib, otherContrib],
  );

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
            <label className="form-label">Nákupní cena (Kč)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={buy}
              onChange={e => setBuy(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Prodejní cena (Kč)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              value={sell}
              onChange={e => setSell(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Roční úhrn příjmů z prodeje CP (Kč)</label>
          <input
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
            Drženo déle než 3 roky (časový test)
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
                ? 'držíte déle než 3 roky, zisk nedaníte.'
                : 'úhrn prodejů je do 100 000 Kč, zisk nedaníte.'}
            </>
          ) : (
            <>
              Neprošel žádný test → daníte zisk.{' '}
              <strong style={{ color: 'var(--lg-green-500)' }}>Tip: při držbě nad 3 roky je osvobozeno.</strong>
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
        <Icon name="coins" size={16} color="var(--lg-cyan-400)" /> DIP — kolik ušetříte
      </div>

      <div className="calc-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Roční vklad do DIP (Kč)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              step={2000}
              value={dipContrib}
              onChange={e => setDipContrib(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Penzijko / životko (Kč/rok)</label>
            <input
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
          { label: 'Odečtete od daní', value: `${czNum(dipResult.deductible)} Kč`, color: 'var(--text-primary)' },
          { label: 'Daňová úspora', value: `${czNum(dipResult.taxSaving)} Kč`, color: 'var(--lg-green-500)' },
          { label: 'Čistá cena vkladu', value: `${czNum(dipResult.netCost)} Kč`, color: 'var(--lg-cyan-400)' },
        ].map(k => (
          <div key={k.label} className="glass-panel--sunken" style={{ padding: '0.7rem 0.75rem', textAlign: 'center', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {dipResult.unused > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
          <span style={{ marginTop: '1px', flexShrink: 0 }}><Icon name="info" size={14} color="#64748B" /></span>
          <span>Nevyužitý limit DIP: <strong style={{ color: 'var(--text-secondary)' }}>{czNum(dipResult.unused)} Kč</strong> — celkový strop je 48 000 Kč/rok (DIP + penzijko + životko dohromady).</span>
        </div>
      )}
    </div>
  );
};
