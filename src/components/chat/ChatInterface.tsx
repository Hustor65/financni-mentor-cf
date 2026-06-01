import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { Icon } from '../Icon';
import { sendChatMessage } from '../../utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    // block: 'nearest' → scrolluje jen pokud konec není vidět, nevytáhne celou stránku
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

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
        inputRef.current?.focus();
      }
    },
    [isLoading, messages, onMessageSent],
  );

  // předvyplnění dotazu z detailu tématu (kontextový chat) — uživatel zkontroluje a odešle
  useEffect(() => {
    if (initialPrompt) {
      // legitimní sync: předvyplnění inputu při změně external prop z detailu tématu
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(initialPrompt);
      inputRef.current?.focus();
    }
  }, [initialPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const resetChat = () => {
    if (messages.length > 1 && !window.confirm('Opravdu smazat celou konverzaci?')) return;
    setMessages([WELCOME]);
    setInput('');
  };

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

        {/* Chat okno */}
        <div className="chat-messages" role="log" aria-label="Konverzace">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chat-input-container">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Zadejte svůj finanční dotaz..."
              rows={1}
              disabled={isLoading}
              aria-label="Napište zprávu"
            />
            <button
              className="btn btn--primary"
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              style={{ flexShrink: 0, padding: '0.85rem 1.1rem' }}
              aria-label="Odeslat"
            >
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
          <p
            style={{
              color: '#64748B',
              fontSize: '0.72rem',
              margin: '0.4rem 0 0',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <Icon name="info" size={12} color="#64748B" />
            Vzdělávací nástroj, ne investiční doporučení. AI se může mýlit — informace si ověřujte.
          </p>
        </div>
      </div>

      {/* ── PRAVÝ SLOUPEC: info panel ── */}
      <aside className="chat-info">
        <div className="glass-panel glass-panel--elevated">
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
    </div>
  );
};
