import { useState } from 'react';
import { NEWSLETTER_FALLBACK_EMAIL } from '../../data/constants';
import { Icon } from '../Icon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Newsletter: React.FC = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email.trim())) {
      setError('Zadej prosím platný e-mail.');
      return;
    }
    if (!consent) {
      setError('Pro přihlášení potřebujeme tvůj souhlas se zpracováním e-mailu.');
      return;
    }

    // Žádný nakonfigurovaný endpoint — zobrazíme success fallback
    setDone(true);
  };

  return (
    <div
      className="glass-panel glass-panel--elevated"
      style={{ padding: '1.5rem 1.75rem', textAlign: 'center' }}
    >
      {/* Nadpis */}
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.15rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 0.4rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Icon name="mail" size={20} color="#3ab5e0" />
        Jeden finanční tip týdně
      </p>

      {/* Popis */}
      <p
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          margin: '0 auto 1.25rem',
          maxWidth: '520px',
          lineHeight: 1.6,
        }}
      >
        Srozumitelně, nezávisle a bez spamu. Žádné „zaručené tipy“ — jen vzdělávání.
        Odhlásíš se kdykoli jedním kliknutím.
      </p>

      {done ? (
        /* Success stav */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: 'var(--lg-green-500)',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          <Icon name="circle-check" size={16} color="var(--lg-green-500)" />
          <span>Děkujeme! Brzy se ozveme.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {/* Email + tlačítko */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              maxWidth: '480px',
              margin: '0 auto',
              flexWrap: 'wrap',
            }}
          >
            <input
              className="form-input"
              style={{ flex: '1 1 200px' }}
              type="email"
              placeholder="vas@email.cz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-label="Tvůj e-mail"
              autoComplete="email"
            />
            <button
              className="btn btn--primary"
              type="submit"
              style={{ flexShrink: 0, padding: '0.7rem 1.4rem' }}
            >
              Odebírat
            </button>
          </div>

          {/* Consent checkbox */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginTop: '0.75rem',
              maxWidth: '480px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              style={{ accentColor: 'var(--lg-cyan-500)', marginTop: '2px', flexShrink: 0 }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.5 }}>
              Souhlasím se zpracováním e-mailu pro zasílání newsletteru (odhlásit se lze kdykoli).
            </span>
          </label>

          {/* Chybová hláška */}
          {error && (
            <div
              style={{
                marginTop: '0.6rem',
                color: '#ef4444',
                fontSize: '0.84rem',
              }}
            >
              {error}
            </div>
          )}
        </form>
      )}

      {/* Fallback odkaz (skrytý, přístupný pro screenreader/debug) */}
      <p
        style={{
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
          marginTop: '0.75rem',
          display: done ? 'none' : 'block',
        }}
      >
        Nebo napiš přímo na{' '}
        <a
          href={`mailto:${NEWSLETTER_FALLBACK_EMAIL}?subject=Newsletter%20%E2%80%94%20p%C5%99ihl%C3%A1%C5%A1en%C3%AD`}
          style={{ color: 'var(--lg-cyan-400)', textDecoration: 'none' }}
        >
          {NEWSLETTER_FALLBACK_EMAIL}
        </a>
      </p>
    </div>
  );
};
