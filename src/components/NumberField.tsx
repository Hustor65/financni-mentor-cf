import { useId, useState } from 'react';
import type { CSSProperties } from 'react';

/**
 * NumberField — slider + textové pole, synchronizované přes jeden float.
 * Vzor dle UX výzkumu (NN/g „linked controls“, GOV.UK currency input):
 *  - slider = hrubá explorace, textové pole = přesnost (napsat libovolné číslo)
 *  - type="text" + inputMode="decimal" (NE type=number — rozbíjí CZ čárku)
 *  - formátování „3 250“ na blur, holé číslo při psaní (kurzor neskáče)
 *  - text smí přesáhnout rozsah slideru; thumb se jen zastaví na sliderMax
 *  - akceptuje čárku i tečku i mezery; tvrdá validace min/max až na blur
 */

const fmt = (decimals: number, grouping: boolean) =>
  new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: decimals, useGrouping: grouping });

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
  /** bez oddělovače tisíců (letopočet) */
  plain?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max: maxProp,
  sliderMin = 0,
  sliderMax = 100000,
  step = 1000,
  decimals = 0,
  suffix = '',
  plain = false,
}: NumberFieldProps) {
  // do pole jde napsat víc, než dovolí posuvník, ale ne nesmysl o třiceti nulách
  const max = maxProp ?? sliderMax * 10;
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const formatter = fmt(decimals, !plain);
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
    n = Math.round(n * factor) / factor;     // hodnota shoduje se zobrazenou (3000,5 → „3 001“ i ve stavu)
    onChange(n);
  };

  const sliderPos = clamp(Number.isFinite(value) ? value : sliderMin, sliderMin, sliderMax);

  const fill = sliderMax > sliderMin ? ((sliderPos - sliderMin) / (sliderMax - sliderMin)) * 100 : 0;

  return (
    <div className="num-field nf">
      <label className="nf__label" htmlFor={id}>
        {label}
      </label>

      <div className="nf__box">
        <input
          id={id}
          className="nf__input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
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
        {suffix && <span className="nf__suffix" aria-hidden="true">{suffix}</span>}
      </div>

      <input
        className="nf__slider"
        type="range"
        min={sliderMin}
        max={sliderMax}
        step={step}
        value={sliderPos}
        aria-label={label}
        style={{ '--nf-fill': `${fill}%` } as CSSProperties}
        onChange={e => onChange(clamp(parseFloat(e.target.value), min, max))}
      />
    </div>
  );
}
