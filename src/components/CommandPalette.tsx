import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { TOPICS } from '../data/topics';
import { GLOSSARY } from '../data/knowledge';

/* ════════════════════════════════════════════════════════════
   CommandPalette — globální Cmd/Ctrl+K vyhledávání (Vercel/Linear styl).
   Fuzzy bez diakritiky přes taby / témata / slovníček + rychlé akce.
   Nativní <dialog> v top-layer → ESC, focus-trap a backdrop zdarma.
   ════════════════════════════════════════════════════════════ */

const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface CmdItem {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  group: string;
  run: () => void;
}

const GROUP_ORDER = ['Akce', 'Navigace', 'Témata', 'Slovníček'];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenTopic: (id: string) => void;
  onAskMentor: (prompt: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSelectTab, onOpenTopic, onAskMentor }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo<CmdItem[]>(() => {
    const actions: CmdItem[] = [
      { id: 'act-ask', label: 'Zeptat se AI Mentora…', hint: 'Otevřít chat', icon: 'message-circle', group: 'Akce', run: () => { onSelectTab('mentor'); onClose(); } },
    ];
    const tabs: CmdItem[] = [
      { id: 'tab-mentor', label: 'AI Mentor', hint: 'Chat', icon: 'message-circle', group: 'Navigace', run: () => { onSelectTab('mentor'); onClose(); } },
      { id: 'tab-temata', label: 'Témata', hint: 'Vzdělávací moduly', icon: 'book-open', group: 'Navigace', run: () => { onSelectTab('temata'); onClose(); } },
      { id: 'tab-presnost', label: 'Přesnost & důvěra', hint: 'Metodika', icon: 'shield-check', group: 'Navigace', run: () => { onSelectTab('presnost'); onClose(); } },
    ];
    const topics: CmdItem[] = TOPICS.map(t => ({
      id: 'topic-' + t.id, label: t.title, hint: t.summary, icon: t.icon || 'book-open', group: 'Témata',
      run: () => { onOpenTopic(t.id); onClose(); },
    }));
    const terms: CmdItem[] = GLOSSARY.map(g => ({
      id: 'term-' + g.term, label: g.term, hint: 'Zeptat se mentora', icon: 'sparkles', group: 'Slovníček',
      run: () => { onAskMentor(`Vysvětlete mi prosím pojem „${g.term}".`); onClose(); },
    }));
    return [...actions, ...tabs, ...topics, ...terms];
  }, [onSelectTab, onOpenTopic, onAskMentor, onClose]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return items;
    const parts = q.split(/\s+/);
    return items.filter(it => {
      const hay = norm(`${it.label} ${it.hint ?? ''} ${it.group}`);
      return parts.every(p => hay.includes(p));
    });
  }, [items, query]);

  // řízení nativního dialogu podle `open`
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  // ESC (cancel) + klik na backdrop → zavřít přes React stav
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    const onClick = (e: MouseEvent) => { if (e.target === dlg) onClose(); };
    dlg.addEventListener('cancel', onCancel);
    dlg.addEventListener('click', onClick);
    return () => { dlg.removeEventListener('cancel', onCancel); dlg.removeEventListener('click', onClick); };
  }, [onClose]);

  useEffect(() => { activeRef.current?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
  };

  return (
    <dialog ref={dialogRef} className="cmdk" aria-label="Rychlé hledání">
      <div className="cmdk__box" onKeyDown={onKeyDown}>
        <div className="cmdk__search">
          <span className="cmdk__search-icon"><Icon name="sparkles" size={16} /></span>
          <input
            ref={inputRef}
            className="cmdk__input"
            placeholder="Hledat téma, pojem nebo sekci…"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            aria-label="Hledat"
          />
          <kbd className="cmdk__esc">ESC</kbd>
        </div>
        <div className="cmdk__list">
          {filtered.length === 0 ? (
            <div className="cmdk__empty">Nic nenalezeno.</div>
          ) : (
            GROUP_ORDER.map(group => {
              const groupItems = filtered.filter(it => it.group === group);
              if (!groupItems.length) return null;
              return (
                <div key={group} className="cmdk__section">
                  <div className="cmdk__group">{group}</div>
                  {groupItems.map(it => {
                    const i = filtered.indexOf(it);
                    const isActive = i === active;
                    return (
                      <button
                        key={it.id}
                        ref={isActive ? activeRef : null}
                        type="button"
                        className={`cmdk__item${isActive ? ' is-active' : ''}`}
                        onClick={it.run}
                        onMouseMove={() => setActive(i)}
                      >
                        <span className="cmdk__item-icon"><Icon name={it.icon} size={16} /></span>
                        <span className="cmdk__item-label">{it.label}</span>
                        {it.hint && <span className="cmdk__item-hint">{it.hint}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </dialog>
  );
};
