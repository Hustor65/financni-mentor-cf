import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/* ════════════════════════════════════════════════════════════
   Select — rozbalovací seznam ve stylu webu místo systémového
   <select>. Umí skupiny a doplňkový text vpravo (ticker).
   Ovládání jako u nativního: šipky, Home/End, Enter, Esc,
   psaní prvních písmen.
   ════════════════════════════════════════════════════════════ */

export interface SelectOption {
  value: string;
  label: string;
  /** krátký doplněk vpravo, např. ticker */
  hint?: string;
  /** název skupiny; po sobě jdoucí položky se stejnou skupinou dostanou jeden nadpis */
  group?: string;
}

interface Props {
  /** id tlačítka, na které míří <label htmlFor> */
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

const MAX_H = 340;

export const Select: React.FC<Props> = ({ id, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const uid = useId();
  const optId = (i: number) => `${uid}-o${i}`;

  const selected = Math.max(0, options.findIndex(o => o.value === value));
  const current = options[selected];

  const openList = (at = selected) => {
    const r = btnRef.current?.getBoundingClientRect();
    // dole málo místa a nahoře víc → otevři nahoru
    if (r) setUp(window.innerHeight - r.bottom < Math.min(MAX_H, 240) && r.top > window.innerHeight - r.bottom);
    setActive(at);
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o && o.value !== value) onChange(o.value);
    close();
  };

  // po otevření: fokus do seznamu a aktivní položka do zorného pole
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' });
    // optId je stabilní pro dané uid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // klik mimo zavře
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // čas bereme z události (timeStamp), ať funkce zůstane čistá
  const typeahead = (key: string, from: number, now: number) => {
    typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : '') + key.toLowerCase(), at: now };
    const q = typed.current.text;
    // první písmeno hledá od další položky (opakovaný stisk listuje), delší text od aktuální
    const start = q.length > 1 ? from : from + 1;
    for (let k = 0; k < options.length; k++) {
      const i = (start + k) % options.length;
      if (options[i].label.toLowerCase().startsWith(q) || options[i].hint?.toLowerCase().startsWith(q)) return i;
    }
    return -1;
  };

  const onButtonKey = (e: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList(e.key === 'ArrowUp' ? Math.max(0, selected - 1) : e.key === 'ArrowDown' ? Math.min(options.length - 1, selected + 1) : selected);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const i = typeahead(e.key, selected, e.timeStamp);
      if (i >= 0 && options[i].value !== value) onChange(options[i].value);
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    const move = (i: number) => { e.preventDefault(); setActive(Math.max(0, Math.min(last, i))); };
    switch (e.key) {
      case 'ArrowDown': return move(active + 1);
      case 'ArrowUp': return move(active - 1);
      case 'Home': return move(0);
      case 'End': return move(last);
      case 'PageDown': return move(active + 8);
      case 'PageUp': return move(active - 8);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return choose(active);
      case 'Escape':
        e.preventDefault();
        return close();
      case 'Tab':
        return close(false);
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const i = typeahead(e.key, active, e.timeStamp);
          if (i >= 0) setActive(i);
        }
    }
  };

  return (
    <div className={`ui-select${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        ref={btnRef} id={id} type="button" className="ui-select__btn"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${uid}-list` : undefined}
        onClick={() => (open ? close() : openList())} onKeyDown={onButtonKey}
      >
        <span className="ui-select__value">{current?.label}</span>
        {current?.hint && <span className="ui-select__hint">{current.hint}</span>}
        <Icon name="chevron-down" size={18} aria-hidden className="ui-select__chev" />
      </button>

      {open && (
        <ul
          ref={listRef} id={`${uid}-list`} role="listbox" tabIndex={-1}
          className={`ui-select__list${up ? ' is-up' : ''}`} style={{ maxHeight: MAX_H }}
          aria-labelledby={id} aria-activedescendant={optId(active)} onKeyDown={onListKey}
        >
          {options.map((o, i) => {
            const head = o.group && o.group !== options[i - 1]?.group;
            return (
              <li key={o.value} role="presentation">
                {head && <span className="ui-select__group" aria-hidden="true">{o.group}</span>}
                <div
                  id={optId(i)} role="option" aria-selected={i === selected}
                  className={`ui-select__opt${i === active ? ' is-active' : ''}${i === selected ? ' is-selected' : ''}`}
                  onPointerMove={() => { if (i !== active) setActive(i); }}
                  onClick={() => choose(i)}
                >
                  <span className="ui-select__check" aria-hidden="true">
                    {i === selected && <Icon name="check" size={16} />}
                  </span>
                  <span className="ui-select__label">{o.label}</span>
                  {o.hint && <span className="ui-select__hint">{o.hint}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
