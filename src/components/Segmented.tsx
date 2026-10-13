import { useId } from 'react';

interface Option { value: string; label: string }

interface Props {
  /** popisek skupiny pro čtečky */
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

/** Přepínač jedné z několika možností (nativní radio skupina → šipky fungují samy). */
export const Segmented: React.FC<Props> = ({ label, value, options, onChange, disabled, size = 'sm' }) => {
  const name = useId();
  return (
    <fieldset className={`segmented segmented--${size}`} disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      {options.map(o => (
        <label key={o.value} className={`segmented__item${o.value === value ? ' is-active' : ''}`}>
          <input
            type="radio" name={name} value={o.value} checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
};
