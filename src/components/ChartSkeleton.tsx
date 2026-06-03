/* ════════════════════════════════════════════════════════════
   ChartSkeleton — pulzující zástupný obrys grafu (sloupce pulzují
   mezi --surface-1 a --surface-2). Nahrazuje textové „Načítám graf…"
   fallbacky během lazy-loadu ECharts/Mermaid i streamu v chatu.
   `bare` = bez vlastního okraje/pozadí (pro vložení do už orámované karty).
   ════════════════════════════════════════════════════════════ */

// výšky sloupců v % — evokují graf (mírně stoupavý trend s variací), ne náhodný šum
const BARS = [38, 62, 50, 78, 66, 90, 72];

interface ChartSkeletonProps {
  height?: number;
  label?: string;
  bare?: boolean;
  style?: React.CSSProperties;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 280,
  label = 'Načítám graf',
  bare = false,
  style,
}) => (
  <div
    className={`chart-skeleton${bare ? ' chart-skeleton--bare' : ''}`}
    style={{ height, ...style }}
    role="status"
  >
    <div className="chart-skeleton__bars" aria-hidden="true">
      {BARS.map((h, i) => (
        <span
          key={i}
          className="chart-skeleton__bar"
          style={{ height: `${h}%`, animationDelay: `${i * 110}ms` }}
        />
      ))}
    </div>
    <span className="sr-only">{label}…</span>
  </div>
);
