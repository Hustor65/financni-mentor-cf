export const TypingIndicator: React.FC = () => (
  <div className="mn-msg mn-msg--assistant" role="status">
    <span className="sr-only">Mentor píše odpověď…</span>
    <div className="mn-typing" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  </div>
);
