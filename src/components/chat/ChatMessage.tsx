import React from 'react';
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
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => (
  <div className={`chat-message${role === 'user' ? ' chat-message--user' : ''}`}>
    <div className="chat-message__avatar">
      <Icon name={role === 'assistant' ? 'avatar-assistant' : 'avatar-user'} size={36} />
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
    </div>
  </div>
);
