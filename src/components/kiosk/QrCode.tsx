import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/** QR kód jako čisté SVG (tmavé moduly na světlém podkladu, ať ho přečte každý telefon). */
export const QrCode: React.FC<{ value: string; size?: number; label: string }> = ({ value, size = 148, label }) => {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) d += `M${x} ${y}h1v1h-1z`;
    return { d, n };
  }, [value]);
  const quiet = 3;
  const box = path.n + quiet * 2;
  return (
    <svg className="qr" width={size} height={size} viewBox={`${-quiet} ${-quiet} ${box} ${box}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect x={-quiet} y={-quiet} width={box} height={box} rx="1.5" fill="#fff" />
      <path d={path.d} fill="#0c1a30" />
    </svg>
  );
};
