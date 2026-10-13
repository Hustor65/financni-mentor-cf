import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════════════
   Hlídač stánku — když se návštěvník chvíli nehýbe, zeptá se,
   jestli tu ještě je, a pak web vrátí na začátek. Další člověk
   tak nezačíná v cizí konverzaci ani v cizím účtu.
   ════════════════════════════════════════════════════════════ */

const IDLE_MS = 75_000;
const WARN_S = 15;
const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

interface Props {
  /** vrátí web do výchozího stavu */
  onReset: () => void;
}

export const KioskGuard: React.FC<Props> = ({ onReset }) => {
  const [left, setLeft] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  // od posledního resetu se na web někdo dotkl → je co uklízet
  const dirty = useRef(false);
  const warning = left !== null;

  // odpočet nečinnosti (běží, jen když není zobrazená výzva)
  useEffect(() => {
    if (warning) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { if (dirty.current) setLeft(WARN_S); else arm(); }, IDLE_MS);
    };
    const onActivity = () => { dirty.current = true; arm(); };
    arm();
    EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true, capture: true }));
    return () => {
      clearTimeout(timer);
      EVENTS.forEach(e => window.removeEventListener(e, onActivity, { capture: true }));
    };
  }, [warning]);

  // výzva „jsi tu ještě?“ s odpočtem
  useEffect(() => {
    if (left === null) return;
    const t = setTimeout(() => {
      if (left > 1) { setLeft(left - 1); return; }
      dirty.current = false;
      onReset();
      setLeft(null);
    }, 1000);
    return () => clearTimeout(t);
  }, [left, onReset]);

  const resetNow = () => {
    dirty.current = false;
    onReset();
    setLeft(null);
  };

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (warning && !dlg.open) dlg.showModal();
    else if (!warning && dlg.open) dlg.close();
  }, [warning]);

  return (
    <dialog ref={dialogRef} className="sheet sheet--center sh-dlg" aria-labelledby="kiosk-title" onCancel={e => { e.preventDefault(); setLeft(null); }}>
      <div className="sheet__box sh-dlg__box">
        <h2 id="kiosk-title" className="sh-dlg__title">Jsi tu ještě?</h2>
        <p className="sh-dlg__lead">
          Za <strong className="num">{left ?? 0} s</strong> vrátím web na začátek, aby ho měl další návštěvník čistý.
        </p>
        <div className="sh-dlg__actions">
          <button type="button" className="btn btn--primary" onClick={() => setLeft(null)} autoFocus>Pokračuju</button>
          <button type="button" className="btn btn--ghost" onClick={resetNow}>Začít znovu</button>
        </div>
      </div>
    </dialog>
  );
};
