import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatPanel, type Message } from './ChatPanel';
import { Icon } from '../Icon';
import { sendChatMessage } from '../../utils/api';

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

const QUICK_PROMPTS: { label: string; icon: string; prompt: string }[] = [
  { label: 'Co je ETF?', icon: 'info', prompt: 'Vysvětlete mi teorii: Co je to ETF?' },
  { label: 'Investice 3 000 Kč / měs.', icon: 'coins', prompt: 'Ukažte mi praktický příklad: Investice 3000 Kč měsíčně.' },
  { label: 'Test gramotnosti', icon: 'graduation-cap', prompt: 'Otestujte mě z finanční gramotnosti.' },
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

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: 'user', content: text.trim() };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      onMessageSent?.();

      try {
        const history = [...messages, userMsg]
          .filter(m => m !== WELCOME)
          .map(m => ({ role: m.role, content: m.content }));
        const response = await sendChatMessage(text.trim(), history);
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '⚠️ Omlouvám se, nepodařilo se spojit se serverem. Zkuste to prosím později.',
          },
        ]);
      } finally {
        setIsLoading(false);
        focusActiveInput();
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
    const onEnd = () => {
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
        {/* Rychlé dotazy */}
        <div className="glass-panel glass-panel--sunken" style={{ padding: '1rem 1.25rem', marginBottom: 'var(--space-md)' }}>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#E2E8F0',
              margin: '0 0 0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Icon name="zap" size={16} color="#F59E0B" /> Rychlé dotazy
          </p>
          <div className="quick-prompts" style={{ marginBottom: 0 }}>
            {QUICK_PROMPTS.map((q, i) => (
              <button key={i} className="btn quick-prompt" onClick={() => handleSend(q.prompt)} disabled={isLoading}>
                <Icon name={q.icon} size={16} />
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ucelený chat panel (zprávy + doku composer) — inline verze */}
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
            />
          </div>
        )}
      </dialog>
    </div>
  );
};
