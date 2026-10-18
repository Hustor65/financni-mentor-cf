import { useEffect, useState } from 'react';
import { Segmented } from '../Segmented';
import { SECTORS, fetchSeries, fmtDay, fmtPct, typicalAsof } from '../../utils/market';
import type { Quote, Series } from '../../utils/market';

/* ════════════════════════════════════════════════════════════
   Jak si vedou sektory — 11 odvětví amerického trhu vedle sebe,
   seřazená od nejlepšího. Den bere z kotací, měsíc a rok z roční
   řady každého sektorového ETF (načte se, až o ni někdo řekne).
   ════════════════════════════════════════════════════════════ */

type Period = 'day' | 'month' | 'year';

const PERIODS: { value: Period; label: string; text: string }[] = [
  { value: 'day', label: 'Den', text: 'za poslední den' },
  { value: 'month', label: 'Měsíc', text: 'za poslední měsíc' },
  { value: 'year', label: 'Rok', text: 'za poslední rok' },
];

const DAY_MS = 86_400_000;

/** Změna v % od první svíčky, která je mladší než `days` dní, do poslední. */
function changeSince(s: Series, days: number): number | null {
  const pts = s.points;
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const from = pts.find(p => p[0] >= last[0] - days * DAY_MS) ?? pts[0];
  return from[4] ? ((last[4] - from[4]) / from[4]) * 100 : null;
}

interface Props {
  quotes: Record<string, Quote>;
  active: string;
  onPick: (ticker: string) => void;
}

export const SectorBoard: React.FC<Props> = ({ quotes, active, onPick }) => {
  const [period, setPeriod] = useState<Period>('day');
  const [series, setSeries] = useState<Record<string, Series | 'error'>>({});
  const needSeries = period !== 'day';
  // u denní změny píšeme datum poslední ceny, ne „dnes“ (data jsou zpožděná, o víkendu jde o pátek)
  const dayAsof = typicalAsof(SECTORS.map(s => quotes[s.ticker]));

  useEffect(() => {
    if (!needSeries) return;
    const ctrl = new AbortController();
    SECTORS.forEach(s => {
      fetchSeries(s.ticker, '1y', ctrl.signal)
        .then(r => setSeries(prev => ({ ...prev, [s.ticker]: r })))
        .catch(() => { if (!ctrl.signal.aborted) setSeries(prev => ({ ...prev, [s.ticker]: 'error' })); });
    });
    return () => ctrl.abort();
  }, [needSeries]);

  const rows = SECTORS.map(s => {
    let value: number | null = null;
    if (period === 'day') value = quotes[s.ticker]?.change_percent ?? null;
    else {
      const ser = series[s.ticker];
      if (ser && ser !== 'error') value = changeSince(ser, period === 'month' ? 31 : 366);
    }
    return { ...s, value };
  });
  const known = rows.filter((r): r is typeof r & { value: number } => r.value !== null && Number.isFinite(r.value));
  known.sort((a, b) => b.value - a.value);
  const missing = rows.filter(r => !known.includes(r as typeof known[number]));
  const scale = Math.max(...known.map(r => Math.abs(r.value)), 0.01);
  const loading = missing.length > 0 && (period === 'day' ? Object.keys(quotes).length === 0 : missing.some(r => !series[r.ticker]));
  const best = known[0];
  const worst = known[known.length - 1];
  const label = PERIODS.find(p => p.value === period)!;
  const lead = period === 'day' && dayAsof
    ? `K ${fmtDay(dayAsof)}`
    : label.text.charAt(0).toUpperCase() + label.text.slice(1);
  const offline = needSeries && SECTORS.some(s => { const r = series[s.ticker]; return r && r !== 'error' && r.offline; });

  return (
    <section className="ui-sec mx-sectors" aria-labelledby="mx-sectors">
      <div className="mx-sectors__head">
        <div>
          <h2 className="ui-sec__title" id="mx-sectors">Jak si vedou sektory</h2>
          <p className="ui-sec__lead">
            Americký trh rozdělený do 11 odvětví. Každý řádek je jedno ETF, které drží všechny velké
            firmy z daného odvětví. Klikni na řádek a nahoře uvidíš jeho graf.
          </p>
        </div>
        <Segmented
          label="Období" value={period} onChange={v => setPeriod(v as Period)}
          options={PERIODS.map(p => ({ value: p.value, label: p.label }))}
        />
      </div>

      <ul className="mx-bars" aria-busy={loading}>
        {[...known, ...missing].map(r => {
          const v = r.value;
          const up = v !== null && v >= 0;
          const width = v === null ? 0 : (Math.abs(v) / scale) * 50;
          return (
            <li key={r.ticker}>
              <button
                type="button" className={`mx-bar${r.ticker === active ? ' is-active' : ''}`}
                onClick={() => onPick(r.ticker)} aria-current={r.ticker === active}
              >
                <span className="mx-bar__name">{r.name}</span>
                <span className="mx-bar__track" aria-hidden="true">
                  {v !== null && (
                    <span
                      className={`mx-bar__fill ${up ? 'is-up' : 'is-down'}`}
                      style={up ? { left: '50%', width: `${width}%` } : { right: '50%', width: `${width}%` }}
                    />
                  )}
                </span>
                <span className={`mx-bar__val num${v === null ? '' : up ? ' is-up' : ' is-down'}`}>
                  {v === null ? (loading ? '…' : '—') : fmtPct(v, 1)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {best && worst && best !== worst && (
        <p className="ui-note mx-sectors__note">
          {lead} vede <strong>{best.name}</strong> ({fmtPct(best.value, 1)})
          {' '}a nejhůř je na tom <strong>{worst.name}</strong> ({fmtPct(worst.value, 1)}). Sektory se často
          hýbou každý jinam a pořadí se rok od roku mění. Proto se vyplatí nemít všechno v jednom odvětví:
          ETF na celý trh drží všech 11 najednou.
        </p>
      )}
      {offline && <p className="ui-small mx-sectors__off">Část dat je z uloženého snímku, živé ceny se teď nepodařilo načíst.</p>}
    </section>
  );
};
