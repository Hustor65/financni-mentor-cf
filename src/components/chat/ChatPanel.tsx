import React, { useLayoutEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatEmptyState, type ChatSuggestion } from './ChatEmptyState';
import { Icon } from '../Icon';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  isLoading: boolean;
  /** ref na <textarea> tohoto konkrétního panelu (inline vs. fullscreen mají vlastní) */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** kotva na konec seznamu pro auto-scroll */
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  /** zda jsme ve fullscreen režimu (mění chování/ikonu expand tlačítka) */
  isFullscreen: boolean;
  /** přepínač fullscreen — předá spouštěcí tlačítko, aby se po zavření vrátil focus */
  onToggleFullscreen: (trigger: HTMLButtonElement) => void;
  /** návrhové dotazy do uvítací obrazovky (empty state) */
  suggestions: ChatSuggestion[];
}

/**
 * ChatPanel — jeden ucelený skleněný panel: scrollující zprávy nahoře +
 * "doku" composer dole (vzor ChatGPT/Claude). Použitý 1:1 inline v gridu
 * i uvnitř fullscreen <dialog> — žádná duplikace logiky odesílání.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  isLoading,
  textareaRef,
  messagesEndRef,
  onInputChange,
  onSend,
  onKeyDown,
  isFullscreen,
  onToggleFullscreen,
  suggestions,
}) => {
  // Dokud uživatel nenapsal první zprávu (v poli je jen uvítací zpráva), ukaž
  // bohatý empty state místo holé bubliny v prázdné ploše.
  const showEmptyState = messages.length <= 1 && !isLoading;

  // čekáme na první kus streamované odpovědi (poslední zpráva je prázdný assistant)
  const last = messages[messages.length - 1];
  const waitingFirstChunk = isLoading && last?.role === 'assistant' && last.content === '';

  // Auto-grow textarey podle obsahu — spolehlivé i tam, kde CSS field-sizing není
  // podporované (uživatel pak nemusí scrollovat uvnitř malého pole).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input, textareaRef]);

  return (
    <div className={`chat-panel${showEmptyState ? ' chat-panel--empty' : ''}`}>
      {/* ── Scrollující zprávy ── */}
      <div
        className="chat-messages"
        role="log"
        aria-label="Konverzace"
        aria-live="polite"
      >
        <div className="chat-messages__inner">
          {showEmptyState ? (
            <ChatEmptyState suggestions={suggestions} onPick={onSend} disabled={isLoading} />
          ) : (
            messages.map((msg, i) => {
              // poslední, zatím prázdnou odpověď nevykresluj jako bublinu —
              // místo ní je níže typing indikátor (dokud nepřijde první text)
              if (i === messages.length - 1 && waitingFirstChunk) return null;
              return <ChatMessage key={i} role={msg.role} content={msg.content} />;
            })
          )}
          {waitingFirstChunk && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Doku composer ── */}
      <div className="chat-composer">
        <div className="chat-composer__row">
          <div className="chat-composer__field">
            <textarea
              ref={textareaRef}
              className="chat-input"
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Zadejte svůj finanční dotaz..."
              rows={1}
              disabled={isLoading}
              aria-label="Napište zprávu"
            />
            <div className="chat-composer__actions">
              <button
                type="button"
                className="composer-icon-btn"
                onClick={e => onToggleFullscreen(e.currentTarget)}
                aria-label={isFullscreen ? 'Zavřít celou obrazovku' : 'Rozšířit na celou obrazovku'}
                title={isFullscreen ? 'Zavřít' : 'Celá obrazovka'}
              >
                <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={18} />
              </button>
              <button
                type="button"
                className="btn composer-send-btn"
                onClick={() => onSend(input)}
                disabled={isLoading || !input.trim()}
                aria-label="Odeslat zprávu"
              >
                <Icon name="arrow-right" size={18} />
              </button>
            </div>
          </div>
        </div>
        <p className="chat-composer__hint">
          <Icon name="info" size={12} color="#64748B" />
          Vzdělávací nástroj, ne investiční doporučení. AI se může mýlit — informace si ověřujte.
        </p>
      </div>
    </div>
  );
};
