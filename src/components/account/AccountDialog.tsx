import { useEffect, useRef, useState } from 'react';
import { Segmented } from '../Segmented';
import { Icon } from '../Icon';
import { deleteAccount, signIn, signOut, useAccount } from '../../utils/account';
import { useUserData } from '../../utils/store';

/* ════════════════════════════════════════════════════════════
   Účet — přezdívka a heslo, nic dalšího. Přihlášenému se postup
   (hotová témata, portfolio na zkoušku, skóre) ukládá do databáze
   a najde ho i na jiném zařízení.
   ════════════════════════════════════════════════════════════ */

interface Props {
  open: boolean;
  onClose: () => void;
}

type Mode = 'register' | 'login';

export const AccountDialog: React.FC<Props> = ({ open, onClose }) => {
  const { user, unsynced } = useAccount();
  const data = useUserData();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('register');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // odhlášení narazilo na neuložené změny → nabídni „odhlásit i tak“
  const [unsaved, setUnsaved] = useState(false);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      requestAnimationFrame(() => nameRef.current?.focus());
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  // ESC + klik mimo okno → zavřít přes React stav
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    const onClick = (e: MouseEvent) => { if (e.target === dlg) onClose(); };
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('click', onClick);
    return () => { dlg.removeEventListener('cancel', onCancel); dlg.removeEventListener('click', onClick); };
  }, [onClose]);

  // po zavření (jakkoli — křížkem, klávesou ESC, klikem vedle i resetem stánku)
  // nesmí v poli zůstat cizí přezdívka ani heslo
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) { setName(''); setPassword(''); setError(null); setConfirmDelete(false); setUnsaved(false); }
  }
  const close = onClose;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const err = await signIn(mode, name.trim(), password);
    setBusy(false);
    if (err) { setError(err); return; }
    setPassword('');
    setName('');
  };

  const logout = async (force = false) => {
    setBusy(true);
    setError(null);
    const err = await signOut(force);
    setBusy(false);
    if (err) { setError(err); setUnsaved(true); return; }
    close();
  };

  const remove = async () => {
    setBusy(true);
    const err = await deleteAccount();
    setBusy(false);
    if (err) { setError(err); return; }
    close();
  };

  const holdings = Object.keys(data.portfolio.positions).length;

  return (
    <dialog ref={dialogRef} className="sheet sh-dlg" aria-labelledby="account-title">
      <div className="sheet__box sh-dlg__box">
        <button type="button" className="sh-dlg__close" onClick={close} aria-label="Zavřít">
          <Icon name="x" size={18} aria-hidden />
        </button>

        {user ? (
          <>
            <h2 id="account-title" className="sh-dlg__title">{user.name}</h2>
            <p className="sh-dlg__lead">
              Jsi přihlášený. Postup se ti ukládá do účtu a najdeš ho na každém zařízení,
              kde se přihlásíš.
            </p>
            <dl className="ui-kpis sh-dlg__kpis">
              <div><dt>Hotová témata</dt><dd>{data.completed.length}</dd></div>
              <div><dt>Pozice v portfoliu</dt><dd>{holdings}</dd></div>
              <div><dt>Rekord ve hře</dt><dd>{data.guessBest ? `${data.guessBest} z 10` : '—'}</dd></div>
            </dl>
            {unsynced && (
              <p className="ui-note ui-note--warn sh-dlg__note" role="status">
                Poslední změny se zatím nepodařilo uložit do účtu. Zkusím to znovu, až bude připojení.
              </p>
            )}
            {error && <p className="ui-note ui-note--danger sh-dlg__note" role="alert">{error}</p>}
            <div className="sh-dlg__actions">
              <button type="button" className="btn btn--primary" onClick={() => logout(unsaved)} disabled={busy}>
                {unsaved ? 'Odhlásit i tak' : 'Odhlásit se'}
              </button>
              {confirmDelete ? (
                <>
                  <button type="button" className="btn btn--danger" onClick={remove} disabled={busy}>Opravdu smazat účet</button>
                  <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>Nechat být</button>
                </>
              ) : (
                <button type="button" className="btn btn--ghost sh-dlg__aside" onClick={() => setConfirmDelete(true)}>Smazat účet</button>
              )}
            </div>
            <p className="ui-small sh-dlg__small">
              Odhlášení smaže postup z tohohle prohlížeče; v účtu zůstane. Smazání účtu je nevratné.
            </p>
          </>
        ) : (
          <>
            <h2 id="account-title" className="sh-dlg__title">
              {mode === 'register' ? 'Ulož si postup' : 'Vítej zpátky'}
            </h2>
            <p className="sh-dlg__lead">
              S účtem se k hotovým tématům, portfoliu na zkoušku i skóre vrátíš kdykoli a z jakéhokoli zařízení.
              Stačí přezdívka a heslo, e-mail nechceme.
            </p>
            <Segmented
              label="Účet" value={mode} size="md"
              options={[{ value: 'register', label: 'Nový účet' }, { value: 'login', label: 'Už účet mám' }]}
              onChange={v => { setMode(v as Mode); setError(null); }}
            />
            <form className="sh-dlg__form" onSubmit={submit}>
              <label className="ui-field">
                <span>Přezdívka</span>
                <input
                  ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
                  autoComplete="username" autoCapitalize="none" spellCheck={false}
                  minLength={3} maxLength={24} required
                />
              </label>
              <label className="ui-field">
                <span>Heslo</span>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 8 : 1} maxLength={200} required
                />
                {mode === 'register' && <small>Aspoň 8 znaků. Nepoužívej heslo, které máš jinde.</small>}
              </label>
              {error && <p className="ui-note ui-note--danger sh-dlg__note" role="alert">{error}</p>}
              <div className="sh-dlg__actions">
                <button type="submit" className="btn btn--primary" disabled={busy}>
                  {busy ? 'Chvilku…' : mode === 'register' ? 'Vytvořit účet' : 'Přihlásit se'}
                </button>
              </div>
            </form>
            <p className="ui-small sh-dlg__small">
              {mode === 'register'
                ? 'Heslo ukládáme jen jako otisk, přečíst ho neumíme. Protože nemáme tvůj e-mail, zapomenuté heslo obnovit nejde.'
                : 'Zapomenuté heslo obnovit nejde, e-mail k účtu nemáme. Můžeš si založit nový účet.'}
            </p>
          </>
        )}
      </div>
    </dialog>
  );
};
