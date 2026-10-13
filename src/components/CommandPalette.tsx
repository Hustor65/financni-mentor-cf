import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon } from './Icon';
import { TOPICS } from '../data/topics';
import { GLOSSARY } from '../data/knowledge';
import { TOOLS } from './tools/registry';
import { ALL_INSTRUMENTS } from '../utils/market';

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

const GROUP_ORDER = ['Akce', 'Navigace', 'Témata', 'Nástroje', 'Trhy', 'Slovníček'];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenTopic: (id: string) => void;
  onOpenTool: (id: string) => void;
  onOpenMarket: (ticker: string) => void;
  onAskMentor: (prompt: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSelectTab, onOpenTopic, onOpenTool, onOpenMarket, onAskMentor }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo<CmdItem[]>(() => {
    const actions: CmdItem[] = [
      { id: 'act-ask', label: 'Zeptat se AI mentora', hint: 'Otevřít chat', icon: 'message-circle', group: 'Akce', run: () => { onSelectTab('mentor'); onClose(); } },
    ];
    const tabs: CmdItem[] = [
      { id: 'tab-prehled', label: 'Přehled', hint: 'Úvodní stránka', icon: 'home', group: 'Navigace', run: () => { onSelectTab('prehled'); onClose(); } },
      { id: 'tab-akademie', label: 'Akademie', hint: 'Témata, slovníček, kvízy', icon: 'graduation-cap', group: 'Navigace', run: () => { onSelectTab('akademie'); onClose(); } },
      { id: 'tab-trhy', label: 'Trhy', hint: 'Grafy akcií, indexů a krypta', icon: 'candlestick', group: 'Navigace', run: () => { onSelectTab('trhy'); onClose(); } },
      { id: 'tab-nastroje', label: 'Nástroje', hint: 'Kalkulačky a simulace', icon: 'calculator', group: 'Navigace', run: () => { onSelectTab('nastroje'); onClose(); } },
      { id: 'tab-mentor', label: 'AI mentor', hint: 'Chat', icon: 'message-circle', group: 'Navigace', run: () => { onSelectTab('mentor'); onClose(); } },
      { id: 'tab-presnost', label: 'Přesnost a zdroje', hint: 'Odkud bereme čísla', icon: 'shield-check', group: 'Navigace', run: () => { onSelectTab('presnost'); onClose(); } },
    ];
    const tools: CmdItem[] = TOOLS.map(t => ({
      id: 'tool-' + t.id, label: t.name, hint: t.lead, icon: t.icon, group: 'Nástroje',
      run: () => { onOpenTool(t.id); onClose(); },
    }));
    const markets: CmdItem[] = ALL_INSTRUMENTS.map(i => ({
      id: 'mk-' + i.ticker, label: i.name, hint: `Graf ${i.ticker}`, icon: 'candlestick', group: 'Trhy',
      run: () => { onOpenMarket(i.ticker); onClose(); },
    }));
    const topics: CmdItem[] = TOPICS.map(t => ({
      id: 'topic-' + t.id, label: t.title, hint: t.summary, icon: t.icon || 'book-open', group: 'Témata',
      run: () => { onOpenTopic(t.id); onClose(); },
    }));
    const terms: CmdItem[] = GLOSSARY.map(g => ({
      id: 'term-' + g.term, label: g.term, hint: 'Zeptat se mentora', icon: 'sparkles', group: 'Slovníček',
      run: () => { onAskMentor(`Vysvětli mi prosím pojem „${g.term}“.`); onClose(); },
    }));
    return [...actions, ...tabs, ...topics, ...tools, ...markets, ...terms];
  }, [onSelectTab, onOpenTopic, onOpenTool, onOpenMarket, onAskMentor, onClose]);

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
    <dialog ref={dialogRef} className="cmdk sh-dlg" aria-label="Hledání">
      <div className="cmdk__box sh-dlg__box sh-find" onKeyDown={onKeyDown}>
        <div className="sh-find__bar">
          <span className="sh-find__icon" aria-hidden="true"><Icon name="search" size={18} /></span>
          <input
            ref={inputRef}
            className="sh-find__input"
            placeholder="Hledej téma, pojem, nástroj nebo titul"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            aria-label="Hledat"
            autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
          />
          <button type="button" className="sh-dlg__close" onClick={onClose} aria-label="Zavřít hledání">
            <Icon name="x" size={18} aria-hidden />
          </button>
        </div>
        <div className="sh-find__list">
          {filtered.length === 0 ? (
            <div className="sh-find__empty">
              <p>Na „{query.trim()}“ tu nic není. Zkus kratší nebo jiné slovo, nebo se na to zeptej mentora.</p>
              <button type="button" className="btn" onClick={() => { onAskMentor(query.trim()); onClose(); }}>
                Zeptat se mentora
              </button>
            </div>
          ) : (
            GROUP_ORDER.map(group => {
              const groupItems = filtered.filter(it => it.group === group);
              if (!groupItems.length) return null;
              return (
                <div key={group} className="sh-find__group" role="group" aria-label={group}>
                  <div className="sh-find__heading" aria-hidden="true">{group}</div>
                  {groupItems.map(it => {
                    const i = filtered.indexOf(it);
                    const isActive = i === active;
                    return (
                      <button
                        key={it.id}
                        ref={isActive ? activeRef : null}
                        type="button"
                        className={`sh-find__item${isActive ? ' is-active' : ''}`}
                        onClick={it.run}
                        onMouseMove={() => setActive(i)}
                      >
                        <span className="sh-find__item-icon" aria-hidden="true"><Icon name={it.icon} size={18} /></span>
                        <span className="sh-find__label">{it.label}</span>
                        {it.hint && <span className="sh-find__hint">{it.hint}</span>}
                        {isActive && <kbd className="sh-find__enter" aria-hidden="true">Enter</kbd>}
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
