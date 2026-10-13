import React from 'react';
import { Icon } from '../Icon';

export interface ChatSuggestion {
  label: string;
  prompt: string;
}

interface ChatEmptyStateProps {
  suggestions: ChatSuggestion[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * ChatEmptyState — úvod chatu, dokud návštěvník nic nenapsal: krátké oslovení
 * a pár otázek na jedno kliknutí. Po první zprávě ho nahradí seznam zpráv.
 */
export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ suggestions, onPick, disabled }) => (
  <div className="mn-empty">
    <h2 className="mn-empty__title">Na co se chceš zeptat?</h2>
    <p className="mn-empty__lead">Napiš vlastní otázku, nebo začni jednou z těchhle.</p>

    <ul className="mn-ideas">
      {suggestions.map(s => (
        <li key={s.label}>
          <button
            type="button"
            className="mn-idea"
            onClick={() => onPick(s.prompt)}
            disabled={disabled}
            aria-label={`Zeptat se: ${s.label}`}
          >
            <span>{s.label}</span>
            <Icon name="arrow-right" size={16} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  </div>
);
