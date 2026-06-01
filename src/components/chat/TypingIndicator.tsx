import { Icon } from '../Icon';

export const TypingIndicator: React.FC = () => (
  <div className="chat-message">
    <div className="chat-message__avatar">
      <Icon name="avatar-assistant" size={36} />
    </div>
    <div className="chat-message__content">
      <div className="typing-indicator">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </div>
    </div>
  </div>
);
