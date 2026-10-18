import React, { useId, useLayoutEffect, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatEmptyState, type ChatSuggestion } from './ChatEmptyState';
import { Icon } from '../Icon';
import type { ChatSummary } from '../../utils/chatHistory';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  /** místo odpovědi přišla hláška o chybě nebo limitu */
  error?: boolean;
}

export interface ChatTopic {
  title: string;
  desc: string;
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
  /** okruhy, se kterými mentor pomůže (rozbalovací nápověda v hlavičce) */
  topics: ChatTopic[];
  /** smaže konverzaci a začne novou */
  onReset: () => void;
  /** přihlášený návštěvník má historii konverzací uloženou u účtu */
  signedIn?: boolean;
  /** uložené konverzace (null = ještě se nenačetly) */
  history?: ChatSummary[] | null;
  historyError?: boolean;
  onOpenChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  /** akce na POSLEDNÍ odpovědi mentora */
  onRetry?: () => void;
  onSimplify?: () => void;
  /** navazující chipy pod dokončenou odpovědí mentora */
  followUps?: ChatSuggestion[];
}

/**
 * ChatPanel — jedna plocha chatu: lišta, scrollující zprávy a pole pro psaní.
 * Použitý 1:1 na stránce i uvnitř fullscreen <dialog> — žádná duplikace
 * logiky odesílání.
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
  topics,
  onReset,
  signedIn,
  history,
  historyError,
  onOpenChat,
  onDeleteChat,
  onRetry,
  onSimplify,
  followUps,
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const helpId = useId();
  const historyId = useId();

  // Dokud uživatel nenapsal první zprávu (v poli je jen uvítací zpráva), ukaž
  // úvod s návrhy otázek místo osamocené zprávy v prázdné ploše.
  const showEmptyState = messages.length <= 1 && !isLoading;

  // čekáme na první kus streamované odpovědi (poslední zpráva je prázdný assistant)
  const last = messages[messages.length - 1];
  const waitingFirstChunk = isLoading && last?.role === 'assistant' && last.content === '';

  // navazující chipy ukaž jen pod DOKONČENOU poslední odpovědí mentora
  const showFollowUps =
    !showEmptyState && !isLoading && !!followUps?.length &&
    last?.role === 'assistant' && last.content !== '' && !last.error;

  // Auto-grow textarey podle obsahu — spolehlivé i tam, kde CSS field-sizing není
  // podporované (uživatel pak nemusí scrollovat uvnitř malého pole).
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input, textareaRef]);

  return (
    <div className={`ui-panel mn-chat${showEmptyState ? ' mn-chat--empty' : ''}${isFullscreen ? ' mn-chat--full' : ''}`}>
      {/* ── Lišta ── */}
      <div className="mn-chat__bar">
        {isFullscreen && <h2 className="mn-chat__name">AI mentor</h2>}
        <button
          type="button"
          className="mn-bar-btn"
          aria-expanded={helpOpen}
          aria-controls={helpId}
          onClick={() => setHelpOpen(o => !o)}
        >
          S čím pomůžu
          <Icon name="chevron-down" size={16} className="mn-bar-btn__chev" aria-hidden />
        </button>
        {signedIn && (
          <button
            type="button" className="mn-bar-btn" aria-expanded={historyOpen} aria-controls={historyId}
            onClick={() => setHistoryOpen(o => !o)}
          >
            Historie{history?.length ? ` (${history.length})` : ''}
            <Icon name="chevron-down" size={16} className="mn-bar-btn__chev" aria-hidden />
          </button>
        )}
        <span className="mn-chat__gap" />
        {!showEmptyState && (
          <button type="button" className="mn-bar-btn" onClick={onReset} disabled={isLoading}>
            Nová konverzace
          </button>
        )}
        <button
          type="button"
          className="mn-bar-btn mn-bar-btn--icon"
          onClick={e => onToggleFullscreen(e.currentTarget)}
          aria-label={isFullscreen ? 'Zavřít celou obrazovku' : 'Rozšířit na celou obrazovku'}
          title={isFullscreen ? 'Zavřít celou obrazovku' : 'Celá obrazovka'}
        >
          <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={18} aria-hidden />
          {isFullscreen && <span>Zavřít</span>}
        </button>
      </div>

      {signedIn && (
        <div id={historyId} className="mn-help mn-history" hidden={!historyOpen}>
          <div className="mn-help__inner">
            {historyError && <p className="ui-small">Historii se teď nepodařilo načíst.</p>}
            {history && history.length === 0 && !historyError && (
              <p className="ui-small">Zatím tu nic není. Konverzace se ukládají k tvému účtu a najdeš je i na jiném zařízení.</p>
            )}
            <ul className="mn-history__list">
              {(history ?? []).map(c => (
                <li key={c.id}>
                  <button
                    type="button" className="mn-history__open" disabled={isLoading}
                    onClick={() => { onOpenChat?.(c.id); setHistoryOpen(false); }}
                  >
                    <span className="mn-history__title">{c.title}</span>
                    <span className="mn-history__when num">{new Date(c.updatedAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                  </button>
                  <button
                    type="button" className="mn-history__del" aria-label={`Smazat konverzaci: ${c.title}`}
                    onClick={() => onDeleteChat?.(c.id)}
                  >
                    <Icon name="x" size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div id={helpId} className="mn-help" hidden={!helpOpen}>
        <div className="mn-help__inner">
          <ul className="mn-help__list">
            {topics.map(t => (
              <li key={t.title}>
                <strong>{t.title}</strong>
                <span>{t.desc}</span>
              </li>
            ))}
          </ul>
          <p className="mn-help__note">
            Mentor vysvětluje, jak věci fungují, a ukazuje souvislosti. Tvoje konkrétní peníze neřeší —
            s větším rozhodnutím se poraď s někým, kdo má licenci ČNB.
          </p>
        </div>
      </div>

      {/* ── Scrollující zprávy ── */}
      <div className="mn-list" role="region" aria-label="Konverzace">
        <div className="mn-list__inner">
          {showEmptyState ? (
            <ChatEmptyState suggestions={suggestions} onPick={onSend} disabled={isLoading} />
          ) : (
            messages.map((msg, i) => {
              // poslední, zatím prázdnou odpověď nevykresluj —
              // místo ní je níže typing indikátor (dokud nepřijde první text)
              if (i === messages.length - 1 && waitingFirstChunk) return null;
              const isLastAnswer =
                i === messages.length - 1 && msg.role === 'assistant' && msg.content !== '' && !isLoading;
              return (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  content={msg.content}
                  isError={msg.error}
                  bare={i === 0 && msg.role === 'assistant'}
                  onRetry={isLastAnswer ? onRetry : undefined}
                  onSimplify={isLastAnswer && !msg.error ? onSimplify : undefined}
                />
              );
            })
          )}
          {showFollowUps && (
            <div className="mn-follow">
              {followUps!.map(f => (
                <button
                  key={f.label}
                  type="button"
                  className="mn-follow__btn"
                  onClick={() => onSend(f.prompt)}
                  disabled={isLoading}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          {waitingFirstChunk && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Pole pro psaní ── */}
      <div className="mn-chat__foot">
        <div className="mn-chat__foot-inner">
          <div className="mn-composer">
            <textarea
              ref={textareaRef}
              className="mn-composer__input"
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Napiš otázku…"
              rows={1}
              readOnly={isLoading}
              aria-label="Napiš zprávu"
            />
            <button
              type="button"
              className="btn btn--primary mn-composer__send"
              onClick={() => onSend(input)}
              disabled={isLoading || !input.trim()}
              aria-label="Odeslat zprávu"
            >
              Odeslat
            </button>
          </div>
          <p className="mn-chat__note">
            Mentor vysvětluje, není to finanční poradce. Může se splést, důležité věci si ověř.
          </p>
        </div>
      </div>
    </div>
  );
};
