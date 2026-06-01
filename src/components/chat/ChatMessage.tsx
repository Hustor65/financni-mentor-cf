import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Icon } from '../Icon';

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
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  </div>
);
