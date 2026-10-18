import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatPanel, type ChatTopic, type Message } from './ChatPanel';
import type { ChatSuggestion } from './ChatEmptyState';
import { ChatLimitError, streamChatMessage } from '../../utils/api';

interface ChatInterfaceProps {
  onMessageSent?: () => void;
  initialPrompt?: string | null;
  /** zavolá se po předvyplnění inputu z initialPrompt → rodič prompt vynuluje (M16/M23) */
  onPromptConsumed?: () => void;
  /** true = initialPrompt se rovnou odešle (dotaz napsaný na Přehledu), jinak se jen předvyplní */
  autoSend?: boolean;
  /** úroveň návštěvníka — mentor podle ní volí hloubku výkladu */
  level?: 'start' | 'pro';
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Ahoj! Jsem tvůj AI mentor na finance. Na co se chceš zeptat? Klidně začni úplně od základů.',
};

// Návrhy otázek do úvodu chatu — podle úrovně, kterou si návštěvník zvolil.
const QUICK_PROMPTS: Record<'start' | 'pro', ChatSuggestion[]> = {
  start: [
    { label: 'Co je to ETF?', prompt: 'Vysvětli mi srozumitelně a od základů, co je to ETF.' },
    { label: 'Investuju 3 000 Kč měsíčně', prompt: 'Ukaž mi na praktickém příkladu, jak může vypadat pravidelné investování 3 000 Kč měsíčně.' },
    { label: 'Jak inflace ovlivňuje úspory?', prompt: 'Vysvětli mi srozumitelně, jak inflace ovlivňuje hodnotu mých úspor.' },
    { label: 'Otestuj mé znalosti', prompt: 'Otestuj mé znalosti krátkým kvízem finanční gramotnosti.' },
  ],
  pro: [
    { label: 'Jak funguje krytý call?', prompt: 'Jak funguje krytý call?' },
    { label: 'Co mi říká P/E 35 u technologické firmy?', prompt: 'Co mi říká P/E 35 u technologické firmy?' },
    { label: 'Proč v krizi rostou korelace?', prompt: 'Proč v krizi rostou korelace?' },
    { label: 'Otestuj mé znalosti', prompt: 'Otestuj mé znalosti krátkým kvízem finanční gramotnosti.' },
  ],
};

// Navazující otázky pod dokončenou odpovědí mentora — posunou konverzaci dál.
const FOLLOW_UPS: ChatSuggestion[] = [
  { label: 'Ukázat na grafu', prompt: 'Můžeš mi to prosím ukázat i na grafu?' },
  { label: 'A co inflace?', prompt: 'Jak do toho vstupuje inflace?' },
  { label: 'Otestovat kvízem', prompt: 'Otestuj mě krátkým kvízem na tohle téma.' },
];

// Okruhy, se kterými mentor pomůže — rozbalovací nápověda v liště chatu.
const INFO_TOPICS: ChatTopic[] = [
  { title: 'Investování a ETF', desc: 'Akcie, dluhopisy, fondy a riziko' },
  { title: 'Spoření a rezerva', desc: 'Jak si vytvořit finanční polštář' },
  { title: 'Daně a DIP', desc: 'Daňové úlevy a investiční produkty' },
  { title: 'Důchod a penze', desc: 'Plánování na později' },
  { title: 'Aktuální tržní data', desc: 'Ceny akcií, kryptoměn a indexů' },
];

// Hlášky, které server pošle místo odpovědi (přetížení, výpadek modelu).
// V chatu se ukážou jako klidná poznámka s tlačítkem „Zkusit znovu“.
const SERVER_NOTES = new Set([
  'Mentor má teď hodně dotazů naráz. Zkus to prosím za chvilku znovu.',
  'Odpověď se teď nepodařilo vygenerovat. Zkus dotaz přeformulovat nebo ho poslat znovu.',
  'Něco se nepovedlo. Zkus to prosím za chvíli znovu.',
]);

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onMessageSent, initialPrompt, onPromptConsumed, autoSend, level = 'start' }) => {
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
    // posouvá se jen seznam zpráv, ne celá stránka — a jen když je návštěvník u konce
    // (kdo si čte starší odpověď, toho nová zpráva neodtáhne)
    const list = end?.closest('.mn-list');
    if (!list) return;
    if (list.scrollHeight - list.scrollTop - list.clientHeight < 320) list.scrollTo({ top: list.scrollHeight });
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
  // a odemkni scroll stránky, kdyby chat zmizel s otevřenou celou obrazovkou
  useEffect(() => () => {
    abortRef.current?.abort();
    document.documentElement.style.overflow = '';
  }, []);

  const handleSend = useCallback(
    async (text: string, replaceFailed = false) => {
      if (!text.trim() || isLoading) return;

      const userMsg: Message = { role: 'user', content: text.trim() };
      // přidej dotaz + prázdnou odpověď, kterou budeme plnit streamem;
      // opakování po chybě nahradí neúspěšný pokus, ať dotaz v konverzaci není dvakrát
      const drop = replaceFailed ? 2 : 0;
      setMessages(prev => [...prev.slice(0, prev.length - drop), userMsg, { role: 'assistant', content: '' }]);
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
          .slice(0, messages.length - drop)
          .filter(m => m !== WELCOME)
          .map(m => ({ role: m.role, content: m.content }));
        const full = await streamChatMessage(
          text.trim(),
          history,
          chunk => {
            // průběžně aktualizuj poslední (právě streamovanou) zprávu
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: chunk };
              return next;
            });
          },
          controller.signal,
          level,
        );
        // prázdná odpověď (200 + prázdné tělo / model nic nevrátil) → ať nezůstane
        // jen prázdná bublina s avatarem bez jakékoli indikace (M15/M18)
        if (!full.trim() && abortRef.current === controller) {
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = {
              role: 'assistant',
              content: 'Mentor neposlal žádnou odpověď. Zkus dotaz poslat znovu nebo ho přeformulovat.',
              error: true,
            };
            return next;
          });
        } else if (SERVER_NOTES.has(full.trim()) && abortRef.current === controller) {
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: full.trim(), error: true };
            return next;
          });
        }
      } catch (err) {
        // přerušení (unmount / nový dotaz) není chyba — nic nehlásíme
        if ((err as Error)?.name === 'AbortError') return;
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = {
            role: 'assistant',
            content: err instanceof ChatLimitError ? err.message : navigator.onLine === false
              ? 'Mentor potřebuje připojení k internetu a to teď chybí. Akademie, grafy i nástroje fungují dál; zeptej se znovu, až bude síť zpátky.'
              : 'Spojení s mentorem se nepovedlo. Zkus dotaz za chvíli poslat znovu.',
            error: true,
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
    [isLoading, messages, onMessageSent, focusActiveInput, level],
  );

  // „Zkusit znovu“ — přepošli poslední dotaz uživatele (regenerace odpovědi)
  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const last = messages[messages.length - 1];
    const failed = !!last?.error && messages[messages.length - 2]?.role === 'user';
    if (lastUser) handleSend(lastUser.content, failed);
  }, [messages, handleSend]);

  // „Vysvětli jednodušeji“ — doplňující dotaz na zjednodušení poslední odpovědi
  const handleSimplify = useCallback(() => {
    handleSend('Vysvětli to prosím jednodušeji a stručněji, jako pro úplného začátečníka.');
  }, [handleSend]);

  // dotaz předaný zvenku: z detailu tématu se jen předvyplní (uživatel ho zkontroluje),
  // z Přehledu se rovnou odešle. Ref hlídá, aby se stejný dotaz neodeslal dvakrát
  // (efekt může doběhnout víckrát, než rodič prompt vynuluje).
  const autoSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initialPrompt) {
      autoSentRef.current = null;
      return;
    }
    if (autoSend) {
      if (autoSentRef.current !== initialPrompt) {
        autoSentRef.current = initialPrompt;
        handleSend(initialPrompt);
      }
    } else {
      // legitimní sync: předvyplnění inputu při změně external prop
      setInput(initialPrompt);
    }
    focusActiveInput();
    // spotřebuj prompt → rodič ho vynuluje, takže stejný dotaz jde poslat znovu (M16/M23)
    onPromptConsumed?.();
  }, [initialPrompt, autoSend, handleSend, focusActiveInput, onPromptConsumed]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // !isComposing → neodesílat uprostřed IME kompozice (diakritika, asijské jazyky)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const resetChat = () => {
    // tlačítko je sice disabled při isLoading, ale guard navíc → běžící stream nikdy
    // nezapíše osiřelý chunk do nového [WELCOME] (M24)
    if (isLoading) return;
    if (messages.length > 1 && !window.confirm('Opravdu chceš smazat celou konverzaci? Nejde to vrátit zpět.')) return;
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

  const panelProps = {
    messages,
    input,
    isLoading,
    onInputChange: setInput,
    onSend: handleSend,
    onKeyDown: handleKeyDown,
    suggestions: QUICK_PROMPTS[level],
    topics: INFO_TOPICS,
    onReset: resetChat,
    onRetry: handleRetry,
    onSimplify: handleSimplify,
    followUps: FOLLOW_UPS,
  };

  return (
    <div className="mn" id="chat-section">
      {/* Chat na stránce: úvod s návrhy otázek / zprávy + pole pro psaní. */}
      <ChatPanel
        {...panelProps}
        textareaRef={inlineInputRef}
        messagesEndRef={inlineEndRef}
        isFullscreen={false}
        onToggleFullscreen={trigger => openFullscreen(trigger)}
      />

      {/* ── FULLSCREEN DIALOG (top-layer, nad vším) ── */}
      <dialog ref={dialogRef} className="mn-dialog" aria-label="Chat s finančním mentorem">
        {isFullscreen && (
          <ChatPanel
            {...panelProps}
            textareaRef={fsInputRef}
            messagesEndRef={fsEndRef}
            isFullscreen
            onToggleFullscreen={closeFullscreen}
          />
        )}
      </dialog>
    </div>
  );
};
