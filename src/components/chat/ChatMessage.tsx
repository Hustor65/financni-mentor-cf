import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../Icon';
import { ChatChart } from './ChatChart';
import { ChatMermaid } from './ChatMermaid';

// Vytáhne čistý text kódu z children (string | string[]) bloku <code>.
function codeText(children: unknown): string {
  return Array.isArray(children) ? children.join('') : String(children ?? '');
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  /** akce jen u POSLEDNÍ odpovědi mentora (regenerace / zjednodušení) */
  onRetry?: () => void;
  onSimplify?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, onRetry, onSimplify }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      ?.writeText(content)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const isAssistant = role === 'assistant';

  return (
    <div className={`chat-message${role === 'user' ? ' chat-message--user' : ''}`}>
      <div className="chat-message__avatar">
        <Icon name={isAssistant ? 'avatar-assistant' : 'avatar-user'} size={36} />
      </div>
      <div className="chat-message__content">
        <ReactMarkdown
          components={{
            // ```echarts → graf, ```mermaid → diagram; ostatní bloky kódu beze změny.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pre({ node, children, ...rest }: any) {
              void node; // 'node' není platný DOM atribut → ven z rest
              const child = Array.isArray(children) ? children[0] : children;
              const lang = child?.props?.className ?? '';
              const text = codeText(child?.props?.children);
              if (/language-echarts/.test(lang)) return <ChatChart code={text} />;
              if (/language-mermaid/.test(lang)) return <ChatMermaid code={text} />;
              return <pre {...rest}>{children}</pre>;
            },
          }}
        >
          {content}
        </ReactMarkdown>

        {/* Akce nad odpovědí mentora — odhalené na hover/focus (à la Linear/Claude) */}
        {isAssistant && content && (
          <div className="chat-message__actions">
            <button type="button" className="msg-action" onClick={copy} aria-label="Kopírovat odpověď">
              <Icon name={copied ? 'circle-check' : 'file-text'} size={13} />
              {copied ? 'Zkopírováno' : 'Kopírovat'}
            </button>
            {onSimplify && (
              <button type="button" className="msg-action" onClick={onSimplify} aria-label="Vysvětlit jednodušeji">
                <Icon name="sparkles" size={13} />
                Jednodušeji
              </button>
            )}
            {onRetry && (
              <button type="button" className="msg-action" onClick={onRetry} aria-label="Vygenerovat odpověď znovu">
                <Icon name="arrow-right-circle" size={13} />
                Znovu
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
