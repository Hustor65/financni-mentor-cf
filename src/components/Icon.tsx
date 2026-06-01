import React, { useMemo } from 'react';

/**
 * Icon — inline SVG ikony z `src/icons/*.svg` (1:1 ty samé co používal
 * originální Streamlit app přes render_icon()).
 * Barvu dědí přes `currentColor`, velikost a tloušťku tahu jdou nastavit propsy.
 */

// Načti všechny SVG jako raw string (eager → součást bundlu, žádný runtime fetch).
const RAW = import.meta.glob('../icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Mapa: název (bez přípony) → svg string
const ICONS: Record<string, string> = {};
for (const path in RAW) {
  const name = path.split('/').pop()!.replace('.svg', '');
  ICONS[name] = RAW[path];
}

export type IconName = string;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color,
  strokeWidth,
  className,
  style,
}) => {
  const html = useMemo(() => {
    let svg = ICONS[name];
    if (!svg) return '';
    // velikost
    svg = svg
      .replace(/width="\d+"/, `width="${size}"`)
      .replace(/height="\d+"/, `height="${size}"`);
    // tloušťka tahu (volitelně)
    if (strokeWidth != null) {
      svg = svg.replace(/stroke-width="[\d.]+"/, `stroke-width="${strokeWidth}"`);
    }
    return svg;
  }, [name, size, strokeWidth]);

  if (!html) return null;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color ?? 'currentColor',
        lineHeight: 0,
        flexShrink: 0,
        ...style,
      }}
      // ikony jsou statické lokální soubory → bezpečné
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
