/* ════════════════════════════════════════════════════════════
   ChartSkeleton — zástupný obrys grafu, než se načte ECharts/Mermaid
   nebo doteče odpověď v chatu. Drží výšku budoucího grafu, takže
   stránka po načtení neposkočí. Styly: styles/screens/tools.css.
   `bare` = bez podkladu (uvnitř panelu, kde už rámeček je).
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
  height = 320,
  label = 'Načítám graf',
  bare = false,
  style,
}) => (
  <div
    className={`chart-skel${bare ? ' chart-skel--bare' : ''}`}
    style={{ height, ...style }}
    role="status"
  >
    <div className="chart-skel__bars" aria-hidden="true">
      {BARS.map((h, i) => (
        <span
          key={i}
          className="chart-skel__bar"
          style={{ height: `${h}%`, animationDelay: `${i * 110}ms` }}
        />
      ))}
    </div>
    <span className="sr-only">{label}…</span>
  </div>
);
