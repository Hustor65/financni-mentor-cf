import React from 'react';
import { Icon } from '../Icon';

export interface ChatSuggestion {
  label: string;
  icon: string;
  prompt: string;
  /** krátký podtitulek pod labelem v uvítací kartě */
  desc?: string;
}

interface ChatEmptyStateProps {
  suggestions: ChatSuggestion[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * ChatEmptyState — uvítací obrazovka uvnitř chat okna (místo holé bubliny v
 * prázdné tmavé ploše). Avatar mentora + nadpis + popis + klikací návrhové
 * karty (vzor ChatGPT/Claude/Gemini). Zobrazí se, dokud uživatel nenapíše
 * první zprávu; pak ho nahradí normální seznam zpráv.
 */
export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({
  suggestions,
  onPick,
  disabled,
}) => (
  <div className="chat-empty">
    <div className="chat-empty__halo">
      <Icon name="avatar-assistant" size={52} />
    </div>
    <h3 className="chat-empty__title">Tvůj osobní finanční mentor</h3>
    <p className="chat-empty__lead">
      Zeptej se na cokoli kolem investování, spoření, daní nebo důchodu. Srozumitelně ti
      vysvětlím teorii a ukážu živá tržní data — žádné konkrétní rady na tvoje peníze, jen pochopení souvislostí.
    </p>

    <div className="chat-empty__suggestions">
      {suggestions.map((s, i) => (
        <button
          key={i}
          type="button"
          className="chat-suggestion"
          onClick={() => onPick(s.prompt)}
          disabled={disabled}
          aria-label={`Zeptat se: ${s.label}`}
        >
          <span className="chat-suggestion__icon">
            <Icon name={s.icon} size={18} />
          </span>
          <span className="chat-suggestion__text">
            <span className="chat-suggestion__label">{s.label}</span>
            {s.desc && <span className="chat-suggestion__desc">{s.desc}</span>}
          </span>
          <span className="chat-suggestion__arrow" aria-hidden={true}>
            <Icon name="arrow-right" size={15} />
          </span>
        </button>
      ))}
    </div>
  </div>
);
