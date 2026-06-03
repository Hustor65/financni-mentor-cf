import { useId, useState } from 'react';

/**
 * NumberField — slider + textové pole, synchronizované přes jeden float.
 * Vzor dle UX výzkumu (NN/g „linked controls", GOV.UK currency input):
 *  - slider = hrubá explorace, textové pole = přesnost (napsat libovolné číslo)
 *  - type="text" + inputMode="decimal" (NE type=number — rozbíjí CZ čárku)
 *  - formátování „3 250" na blur, holé číslo při psaní (kurzor neskáče)
 *  - text smí přesáhnout rozsah slideru; thumb se jen zastaví na sliderMax
 *  - akceptuje čárku i tečku i mezery; tvrdá validace min/max až na blur
 */

const fmt = (decimals: number) =>
  new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: decimals });

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

function parseRaw(str: string): number {
  const cleaned = String(str)
    .replace(/[\s\u00A0\u202F\u2009]/g, '')   // mezery vč. nedělitelných
    .replace(/[^\d,.-]/g, '')            // pryč Kč, %, …
    .replace(',', '.');                  // čárka → tečka
  return cleaned === '' ? NaN : parseFloat(cleaned);
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  sliderMin?: number;
  sliderMax?: number;
  step?: number;
  decimals?: number;
  suffix?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  sliderMin = 0,
  sliderMax = 100000,
  step = 1000,
  decimals = 0,
  suffix = '',
}: NumberFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formatter = fmt(decimals);
  const displayValue = focused
    ? draft
    : Number.isFinite(value)
      ? formatter.format(value)
      : '';

  const commit = (raw: string) => {
    let n = parseRaw(raw);
    if (!Number.isFinite(n)) n = Number.isFinite(value) ? value : min;
    n = clamp(n, min, max);
    const factor = Math.pow(10, decimals);   // zaokrouhli na `decimals`, ať se uložená
    n = Math.round(n * factor) / factor;     // hodnota shoduje se zobrazenou (3000,5 → „3 001" i ve stavu)
    onChange(n);
  };

  const sliderPos = clamp(Number.isFinite(value) ? value : sliderMin, sliderMin, sliderMax);

  return (
    <div className="num-field">
      <label className="num-field__label" htmlFor={id}>
        {label}
      </label>

      <div className="num-field__row">
        <input
          className="num-field__slider form-range"
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={sliderPos}
          aria-label={label}
          onChange={e => onChange(clamp(parseFloat(e.target.value), min, max))}
        />

        <div className="num-field__inputwrap">
          <input
            id={id}
            className="num-field__input form-input"
            type="text"
            inputMode="decimal"
            value={displayValue}
            onFocus={() => {
              setFocused(true);
              setDraft(Number.isFinite(value) ? String(value).replace('.', ',') : '');
            }}
            onChange={e => setDraft(e.target.value)}
            onBlur={e => {
              setFocused(false);
              commit(e.target.value);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
          />
          {suffix && <span className="num-field__suffix" aria-hidden="true">{suffix}</span>}
        </div>
      </div>
    </div>
  );
}
