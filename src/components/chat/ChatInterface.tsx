import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatPanel, type Message } from './ChatPanel';
import type { ChatSuggestion } from './ChatEmptyState';
import { Icon } from '../Icon';
import { streamChatMessage } from '../../utils/api';

interface ChatInterfaceProps {
  onMessageSent?: () => void;
  initialPrompt?: string | null;
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    'Dobrý den! Jsem váš osobní finanční mentor z projektu **Nachytej AI**. ' +
    'Jaké téma ohledně správy financí vás zajímá?',
};

const QUICK_PROMPTS: ChatSuggestion[] = [
  { label: 'Co je to ETF?', icon: 'book-open', desc: 'Vysvětlení pojmu od základů', prompt: 'Vysvětlete mi teorii: Co je to ETF?' },
  { label: 'Investice 3 000 Kč měsíčně', icon: 'coins', desc: 'Praktický příklad pravidelného investování', prompt: 'Ukažte mi praktický příklad: Investice 3000 Kč měsíčně.' },
  { label: 'Jak působí inflace na úspory?', icon: 'trending-up', desc: 'Co dělá s hodnotou peněz v čase', prompt: 'Vysvětlete mi, jak inflace ovlivňuje hodnotu mých úspor.' },
  { label: 'Otestujte moji gramotnost', icon: 'graduation-cap', desc: 'Krátký kvíz finanční gramotnosti', prompt: 'Otestujte mě z finanční gramotnosti.' },
];

// Okruhy, se kterými mentor pomůže — naplní pravý boční sloupec do výšky chatu
// a zároveň navádí uživatele, na co se může ptát.
const INFO_TOPICS: { icon: string; title: string; desc: string }[] = [
  { icon: 'trending-up', title: 'Investování & ETF', desc: 'Akcie, dluhopisy, fondy a riziko' },
  { icon: 'coins', title: 'Spoření a rezerva', desc: 'Jak si vytvořit finanční polštář' },
  { icon: 'scale', title: 'Daně a DIP', desc: 'Daňové úlevy a investiční produkty' },
  { icon: 'hourglass', title: 'Důchod a penze', desc: 'Plánování na později' },
  { icon: 'bar-chart-3', title: 'Živá tržní data', desc: 'Ceny akcií, krypta a indexů' },
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onMessageSent, initialPrompt }) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inline panel a fullscreen panel mají vlastní <textarea>/kotvu — focus a
  // auto-scroll musí směřovat na ten právě viditelný.
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);
  const fsInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineEndRef = useRef<HTMLDivElement>(null);
  const fsEndRef = useRef<HTMLDivElement>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // AbortController právě běžícího streamu — přeruší se při unmountu / novém dotazu
  const abortRef = useRef<AbortController | null>(null);

  // focus na <textarea> právě aktivního panelu
  const focusActiveInput = useCallback(() => {
    const el = isFullscreen ? fsInputRef.current : inlineInputRef.current;
    el?.focus();
  }, [isFullscreen]);

  const scrollToBottom = useCallback(() => {
    const end = isFullscreen ? fsEndRef.current : inlineEndRef.current;
    // block: 'nearest' → scrolluje jen pokud konec není vidět, nevytáhne celou stránku
    end?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [isFullscreen]);

  // Nescrollovat při prvním vykreslení (uvítací zpráva) — jinak by se stránka
  // vytáhla dolů k chatu a uživatel by hero animaci vůbec neviděl.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // při odmontování přeruš případný běžící stream (jinak fetch + setState dál běží)
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: 'user', content: text.trim() };
      // přidej dotaz + prázdnou odpověď, kterou budeme plnit streamem
      setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
      setInput('');
      setIsLoading(true);
      onMessageSent?.();

      // přeruš případný předchozí stream a založ nový AbortController
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // history = jen PŘEDCHOZÍ zprávy; aktuální dotaz připojí backend → žádná duplicita
        const history = messages
          .filter(m => m !== WELCOME)
          .map(m => ({ role: m.role, content: m.content }));
        await streamChatMessage(
          text.trim(),
          history,
          full => {
            // průběžně aktualizuj poslední (právě streamovanou) zprávu
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: full };
              return next;
            });
          },
          controller.signal,
        );
      } catch (err) {
        // přerušení (unmount / nový dotaz) není chyba — nic nehlásíme
        if ((err as Error)?.name === 'AbortError') return;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: '⚠️ Omlouvám se, nepodařilo se spojit se serverem. Zkuste to prosím později.',
          };
          return next;
        });
      } finally {
        // resetuj stav jen pokud běží pořád TENTO stream (ne přepsaný novějším)
        if (abortRef.current === controller) {
          setIsLoading(false);
          focusActiveInput();
          abortRef.current = null;
        }
      }
    },
    [isLoading, messages, onMessageSent, focusActiveInput],
  );

  // předvyplnění dotazu z detailu tématu (kontextový chat) — uživatel zkontroluje a odešle
  useEffect(() => {
    if (initialPrompt) {
      // legitimní sync: předvyplnění inputu při změně external prop z detailu tématu
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(initialPrompt);
      focusActiveInput();
    }
  }, [initialPrompt, focusActiveInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // !isComposing → neodesílat uprostřed IME kompozice (diakritika, asijské jazyky)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const resetChat = () => {
    if (messages.length > 1 && !window.confirm('Opravdu smazat celou konverzaci?')) return;
    setMessages([WELCOME]);
    setInput('');
  };

  // ── Fullscreen <dialog> ──
  const openFullscreen = useCallback((trigger?: HTMLButtonElement | null) => {
    triggerRef.current = trigger ?? null;
    // scroll-lock přes overflow (NE position:fixed) → scrollY zůstane zachovaný,
    // takže hero v pozadí se nepřepočítá na opacity 1 a neprobliká při zavírání/otvírání.
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.showModal();
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    // nech doběhnout zavírací animaci, pak dialog skutečně zavři
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.setAttribute('data-closing', '');
    const finish = () => {
      dialog.removeAttribute('data-closing');
      dialog.close();
    };
    let done = false;
    const onEnd = (e?: Event) => {
      // ignoruj animationend probublané z potomků — čekáme na VLASTNÍ animaci dialogu
      if (e && e.target !== dialog) return;
      if (done) return;
      done = true;
      dialog.removeEventListener('animationend', onEnd);
      finish();
    };
    dialog.addEventListener('animationend', onEnd);
    // fallback, kdyby animationend nepřišel (reduced-motion apod.)
    window.setTimeout(onEnd, 320);
  }, []);

  // úklid scroll-locku + návrat focusu při zavření (i přes ESC)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setIsFullscreen(false);
      // odemkni scroll (pozice zůstala zachovaná díky overflow-locku, není co obnovovat)
      document.documentElement.style.overflow = '';
      // vrať focus na spouštěcí tlačítko (preventScroll → ať .focus() nehne stránkou)
      triggerRef.current?.focus({ preventScroll: true });
    };

    // nativní ESC vyvolá 'cancel' → spusť plynulé zavření (ne okamžité)
    const handleCancel = (e: Event) => {
      e.preventDefault();
      closeFullscreen();
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [closeFullscreen]);

  // po otevření fullscreenu zaměř jeho textarea
  useEffect(() => {
    if (isFullscreen) {
      // počkej na vykreslení dialogu v top-layer
      requestAnimationFrame(() => fsInputRef.current?.focus());
    }
  }, [isFullscreen]);

  return (
    <div className="chat-layout" id="chat-section">
      {/* ── LEVÝ SLOUPEC: chat ── */}
      <div className="chat-main">
        {/* Ucelený chat panel (uvítací empty state / zprávy + doku composer) — inline verze.
            Návrhové dotazy jsou součástí empty-state uvnitř okna, ne samostatná lišta nad ním. */}
        <ChatPanel
          messages={messages}
          input={input}
          isLoading={isLoading}
          textareaRef={inlineInputRef}
          messagesEndRef={inlineEndRef}
          onInputChange={setInput}
          onSend={handleSend}
          onKeyDown={handleKeyDown}
          isFullscreen={false}
          onToggleFullscreen={trigger => openFullscreen(trigger)}
          suggestions={QUICK_PROMPTS}
        />
      </div>

      {/* ── PRAVÝ SLOUPEC: info panel ── */}
      <aside className="chat-info">
        <div className="glass-panel glass-panel--elevated">
          <span className="eyebrow eyebrow--cyan">Jak to funguje</span>
          <p
            className="section-header"
            style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Icon name="shield-check" size={18} color="#3ab5e0" /> Co od mentora očekávat
          </p>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: '#EF4444' }}>AI není finanční poradce.</strong>
            <br />
            <br />
            Nástroj disponuje obrovským teoretickým spektrem informací, ale neodpovídá vaší rodinné
            ani reálné byznysové situaci.
            <br />
            <br />
            <strong style={{ color: '#E2E8F0' }}>
              Slouží primárně k seznámení se základními principy ekonomiky
            </strong>{' '}
            a jako mentor pro pochopení učiva.
            <br />
            <br />
            Bavíme-li se o kapitálu, vaše prostředky a rozhodnutí byste měli případně řešit jen s
            člověkem s certifikací od ČNB.
          </p>
        </div>

        {/* „S čím pomůžu" — naplní boční sloupec do výšky chat panelu a zároveň
            navádí, na co se ptát. Statický seznam = deterministická výška. */}
        <div className="glass-panel glass-panel--elevated chat-info__panel">
          <span className="eyebrow eyebrow--cyan">Okruhy</span>
          <p
            className="section-header"
            style={{ fontSize: '1.1rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Icon name="sparkles" size={18} color="#3ab5e0" /> S čím vám pomůžu
          </p>
          <ul className="info-topics">
            {INFO_TOPICS.map((t, i) => (
              <li key={i} className="info-topic">
                <span className="info-topic__icon">
                  <Icon name={t.icon} size={16} />
                </span>
                <span className="info-topic__text">
                  <span className="info-topic__title">{t.title}</span>
                  <span className="info-topic__desc">{t.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <button
          className="btn btn--block"
          onClick={resetChat}
          style={{ marginTop: 'var(--space-md)' }}
          disabled={isLoading}
        >
          Smazat historii
        </button>
      </aside>

      {/* ── FULLSCREEN DIALOG (top-layer, nad vším) ── */}
      <dialog ref={dialogRef} className="chat-dialog" aria-label="Chat s finančním mentorem">
        {isFullscreen && (
          <div className="chat-dialog__shell">
            <div className="chat-dialog__bar">
              <span className="chat-dialog__title">
                <span className="chat-dialog__dot" />
                Finanční mentor
              </span>
              <button
                type="button"
                className="composer-icon-btn chat-dialog__close"
                onClick={closeFullscreen}
                aria-label="Zavřít celou obrazovku"
                title="Zavřít"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <ChatPanel
              messages={messages}
              input={input}
              isLoading={isLoading}
              textareaRef={fsInputRef}
              messagesEndRef={fsEndRef}
              onInputChange={setInput}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              isFullscreen
              onToggleFullscreen={closeFullscreen}
              suggestions={QUICK_PROMPTS}
            />
          </div>
        )}
      </dialog>
    </div>
  );
};
