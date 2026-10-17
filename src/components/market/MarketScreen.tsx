import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
const ReactECharts = lazy(() => import('echarts-for-react'));
import { SectorBoard } from './SectorBoard';
import { ChartSkeleton } from '../ChartSkeleton';
import { Segmented } from '../Segmented';
import { Icon } from '../Icon';
import { CHART, tooltipBase, axisLabel } from '../../utils/chartTheme';
import { sma, rsi, seriesStats } from '../../utils/finance';
import {
  WATCHLIST, ALL_INSTRUMENTS, RANGES, fetchSeries, fetchQuotes, fmtPrice, fmtPct,
} from '../../utils/market';
import type { RangeId, Series, Quote } from '../../utils/market';
import type { Level } from '../../data/levels';
import { TradeBox } from '../lab/TradeBox';
import { PortfolioView } from './PortfolioView';

/* ════════════════════════════════════════════════════════════
   Trhy — graf skutečných cen s vysvětlením toho, co na něm je.
   Začátečník dostane čáru a pár vět, pokročilý svíčky, klouzavé
   průměry, objem a RSI. Data: Yahoo Finance přes /api/market,
   při výpadku uložený snímek (viz utils/market.ts).
   ════════════════════════════════════════════════════════════ */

// Kolik historie stáhnout pro dané období. Stahujeme víc, než zobrazíme,
// aby měl klouzavý průměr 200 z čeho počítat hned od levého okraje grafu.
const VIEW: Record<RangeId, { api: string; days: number | null; unit: string }> = {
  '1mo': { api: '1y', days: 31, unit: 'den' },
  '6mo': { api: '2y', days: 183, unit: 'den' },
  '1y': { api: '2y', days: 366, unit: 'den' },
  '5y': { api: '5y', days: null, unit: 'týden' },
  'max': { api: 'max', days: null, unit: 'měsíc' },
};

const COMPARE_COLORS = [CHART.cyan, CHART.amber, CHART.violet];
const MAX_COMPARE = 2;
const MAIN_H = 320;
const PERIOD_LABEL: Record<RangeId, string> = {
  '1mo': 'za měsíc', '6mo': 'za půl roku', '1y': 'za rok', '5y': 'za pět let', 'max': 'za celou historii',
};

type StoreEntry = Series | 'error';

/** Načítá a drží cenové řady pro víc tickerů naráz (hlavní + porovnávané). */
function useSeriesStore(tickers: string[], apiRange: string) {
  const [store, setStore] = useState<Record<string, StoreEntry>>({});
  const requested = useRef(new Set<string>());
  const [retryTick, setRetryTick] = useState(0);
  const wanted = tickers.join(',');

  useEffect(() => {
    for (const t of wanted.split(',').filter(Boolean)) {
      const key = `${t}|${apiRange}`;
      if (requested.current.has(key)) continue;
      requested.current.add(key);
      fetchSeries(t, apiRange)
        .then(data => setStore(s => ({ ...s, [key]: data })))
        .catch(() => setStore(s => ({ ...s, [key]: 'error' })));
    }
  }, [wanted, apiRange, retryTick]);

  const retry = (ticker: string) => {
    const key = `${ticker}|${apiRange}`;
    requested.current.delete(key);
    setStore(s => {
      const next = { ...s };
      delete next[key];
      return next;
    });
    setRetryTick(n => n + 1);
  };

  return { store, retry };
}

const dateLabel = (ms: number, withYear: boolean) =>
  new Date(ms).toLocaleDateString('cs-CZ', withYear
    ? { day: 'numeric', month: 'numeric', year: 'numeric' }
    : { day: 'numeric', month: 'numeric' });

const nameOf = (ticker: string, fallback?: string) =>
  ALL_INSTRUMENTS.find(i => i.ticker === ticker)?.name ?? fallback ?? ticker;

interface Props {
  level: Level;
  /** titul, který se má otevřít (klik z pásku / přehledu / hledání) */
  initialTicker?: string;
  /** předvyplní dotaz v chatu a přepne na mentora */
  onAskMentor?: (prompt: string) => void;
  /** návštěvník si vybral jiný titul → ať se to propíše do adresy (Zpět, sdílení odkazu) */
  onPick?: (ticker: string) => void;
}

export const MarketScreen: React.FC<Props> = ({ level, initialTicker: routeSub, onAskMentor, onPick }) => {
  const pro = level === 'pro';
  // v adrese je buď titul (grafy), nebo „portfolio“ / nic (portfolio na zkoušku — hlavní záložka)
  const onPortfolio = !routeSub || routeSub === 'portfolio';
  const initialTicker = routeSub === 'portfolio' ? undefined : routeSub;
  const [ticker, setTicker] = useState(initialTicker ?? '^GSPC');
  const [range, setRange] = useState<RangeId>('1y');
  const [mode, setMode] = useState<'line' | 'candle'>(pro ? 'candle' : 'line');
  const [showSma50, setShowSma50] = useState(pro);
  const [showSma200, setShowSma200] = useState(false);
  const [showVolume, setShowVolume] = useState(pro);
  const [showRsi, setShowRsi] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  // na telefonu je seznam titulů sbalený pod jedním tlačítkem
  const [listOpen, setListOpen] = useState(false);

  // titul v adrese se změnil zvenku (hledání, pásek, Zpět) → přepni graf
  const [fromUrl, setFromUrl] = useState(initialTicker);
  if (fromUrl !== initialTicker) {
    setFromUrl(initialTicker);
    if (initialTicker && initialTicker !== ticker) {
      setTicker(initialTicker);
      setCompare(c => c.filter(x => x !== initialTicker));
    }
  }

  const view = VIEW[range];
  const { store, retry } = useSeriesStore([ticker, ...compare], view.api);
  const main = store[`${ticker}|${view.api}`];
  const comparing = compare.length > 0;

  // kotace do levého seznamu (obnovují se po minutě)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchQuotes(ALL_INSTRUMENTS.map(i => i.ticker))
        .then(r => { if (alive) setQuotes(Object.fromEntries(r.quotes.map(q => [q.ticker, q]))); })
        .catch(() => { /* seznam se obejde i bez cen */ });
    load();
    const timer = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  const pick = (t: string) => {
    setTicker(t);
    setCompare(c => c.filter(x => x !== t));
    setListOpen(false);
    onPick?.(t);
  };

  const toggleCompare = (t: string) =>
    setCompare(c => (c.includes(t) ? c.filter(x => x !== t) : c.length < MAX_COMPARE ? [...c, t] : c));

  const submitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    const t = query.trim().toUpperCase();
    if (!t) return;
    pick(t);
    setQuery('');
  };

  // ── výpočty nad hlavní řadou ──
  const calc = useMemo(() => {
    if (!main || main === 'error') return null;
    const pts = main.points;
    const closesAll = pts.map(p => p[4]);
    const lastTs = pts[pts.length - 1][0];
    const cutoff = view.days ? lastTs - view.days * 86_400_000 : -Infinity;
    let start = pts.findIndex(p => p[0] >= cutoff);
    if (start < 0) start = 0;
    const visible = pts.slice(start);
    const closes = visible.map(p => p[4]);
    const sma50All = sma(closesAll, 50);
    const sma200All = sma(closesAll, 200);
    const rsiAll = rsi(closesAll, 14);
    const periods = RANGES.find(r => r.id === range)?.periodsPerYear ?? 252;
    return {
      visible,
      closes,
      sma50: sma50All.slice(start),
      sma200: sma200All.slice(start),
      rsi: rsiAll.slice(start),
      stats: seriesStats(closes, periods),
      last: closes[closes.length - 1],
      lastSma200: sma200All[sma200All.length - 1],
      lastSma50: sma50All[sma50All.length - 1],
      lastRsi: rsiAll[rsiAll.length - 1],
      hasVolume: visible.some(p => p[5] > 0),
    };
  }, [main, view.days, range]);

  // ── porovnání: všechny řady přepočtené na % od začátku období ──
  const compareSeries = useMemo(() => {
    if (!calc || !comparing) return [];
    const baseTs = calc.visible.map(p => p[0]);
    const out: { ticker: string; name: string; values: (number | null)[] }[] = [
      { ticker, name: nameOf(ticker, main && main !== 'error' ? main.name : undefined), values: calc.closes.map(c => (c / calc.closes[0] - 1) * 100) },
    ];
    for (const t of compare) {
      const s = store[`${t}|${view.api}`];
      if (!s || s === 'error') continue;
      // burzy mají různé obchodní dny → ke každému datu vezmi poslední známou cenu
      let j = 0;
      let lastClose: number | null = null;
      let base: number | null = null;
      const values = baseTs.map(ts => {
        while (j < s.points.length && s.points[j][0] <= ts + 43_200_000) { lastClose = s.points[j][4]; j++; }
        if (lastClose == null) return null;
        if (base == null) base = lastClose;
        return (lastClose / base - 1) * 100;
      });
      out.push({ ticker: t, name: nameOf(t, s.name), values });
    }
    return out;
  }, [calc, comparing, compare, ticker, main, store, view.api]);

  const option = useMemo(() => {
    if (!calc) return null;
    const withYear = range !== '1mo' && range !== '6mo';
    const dates = calc.visible.map(p => dateLabel(p[0], withYear));
    const volumeOn = showVolume && calc.hasVolume && !comparing;
    const rsiOn = showRsi && !comparing;

    // rozvržení pater grafu: cena / objem / RSI
    const grids: { top: number; height: number }[] = [];
    const mainH = MAIN_H;
    let y = 16;
    grids.push({ top: y, height: mainH });
    y += mainH + 26;
    if (volumeOn) { grids.push({ top: y, height: 64 }); y += 64 + 26; }
    if (rsiOn) { grids.push({ top: y, height: 80 }); y += 80 + 26; }
    const totalH = y + 4;

    const xAxes = grids.map((_, i) => ({
      type: 'category' as const, data: dates, gridIndex: i, boundaryGap: mode === 'candle' && !comparing,
      axisLine: { lineStyle: { color: CHART.axisLine } }, axisTick: { show: false },
      axisLabel: i === grids.length - 1 ? { ...axisLabel, hideOverlap: true } : { show: false },
      axisPointer: { label: { show: i === grids.length - 1 } },
    }));
    const yBase = {
      scale: true, position: 'right' as const,
      axisLine: { show: false }, axisTick: { show: false },
      splitLine: { lineStyle: { color: CHART.grid } },
    };
    const yAxes: object[] = [{
      ...yBase, gridIndex: 0,
      axisLabel: { ...axisLabel, formatter: (v: number) => (comparing ? `${v > 0 ? '+' : ''}${Math.round(v).toLocaleString('cs-CZ')} %` : fmtPrice(v, ticker)) },
    }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series: any[] = [];

    if (comparing) {
      compareSeries.forEach((s, i) => series.push({
        name: s.name, type: 'line', data: s.values, showSymbol: false, connectNulls: true,
        lineStyle: { color: COMPARE_COLORS[i], width: i === 0 ? 2.2 : 1.8 }, itemStyle: { color: COMPARE_COLORS[i] },
        emphasis: { focus: 'series' },
      }));
    } else if (mode === 'candle') {
      series.push({
        name: 'Cena', type: 'candlestick',
        // ECharts chce [open, close, low, high]
        data: calc.visible.map(p => [p[1], p[4], p[3], p[2]]),
        itemStyle: { color: CHART.up, color0: CHART.down, borderColor: CHART.up, borderColor0: CHART.down },
      });
    } else {
      const rising = calc.stats.change >= 0;
      const c = rising ? CHART.up : CHART.down;
      series.push({
        name: 'Cena', type: 'line', data: calc.closes, showSymbol: false,
        lineStyle: { color: c, width: 2 }, itemStyle: { color: c },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: rising ? 'rgba(16,185,129,0.28)' : 'rgba(240,97,122,0.26)' },
          { offset: 1, color: 'rgba(16,185,129,0)' },
        ] } },
      });
    }

    if (!comparing && showSma50) series.push({
      name: 'Průměr 50', type: 'line', data: calc.sma50, showSymbol: false, connectNulls: false,
      lineStyle: { color: CHART.cyan, width: 1.4 }, itemStyle: { color: CHART.cyan },
    });
    if (!comparing && showSma200) series.push({
      name: 'Průměr 200', type: 'line', data: calc.sma200, showSymbol: false, connectNulls: false,
      lineStyle: { color: CHART.amber, width: 1.4 }, itemStyle: { color: CHART.amber },
    });

    let gi = 1;
    if (volumeOn) {
      yAxes.push({ ...yBase, gridIndex: gi, splitNumber: 1, axisLabel: { show: false }, splitLine: { show: false } });
      series.push({
        name: 'Objem', type: 'bar', xAxisIndex: gi, yAxisIndex: gi, barWidth: '62%',
        data: calc.visible.map(p => ({
          value: p[5],
          itemStyle: { color: p[4] >= p[1] ? 'rgba(16,185,129,0.5)' : 'rgba(240,97,122,0.5)' },
        })),
      });
      gi++;
    }
    if (rsiOn) {
      yAxes.push({
        ...yBase, gridIndex: gi, scale: false, min: 0, max: 100, interval: 50,
        axisLabel: { ...axisLabel }, splitLine: { show: false },
      });
      series.push({
        name: 'RSI', type: 'line', xAxisIndex: gi, yAxisIndex: gi, data: calc.rsi, showSymbol: false,
        lineStyle: { color: CHART.violet, width: 1.5 }, itemStyle: { color: CHART.violet },
        markLine: {
          symbol: 'none', silent: true, label: { show: false },
          lineStyle: { color: 'rgba(157,140,245,0.4)', type: 'dashed' },
          data: [{ yAxis: 70 }, { yAxis: 30 }],
        },
        markArea: {
          silent: true, itemStyle: { color: 'rgba(157,140,245,0.07)' },
          data: [[{ yAxis: 30 }, { yAxis: 70 }]],
        },
      });
    }

    const opt = {
      aria: { enabled: true },
      grid: grids.map(g => ({ left: 8, right: 64, top: g.top, height: g.height })),
      xAxis: xAxes,
      yAxis: yAxes,
      axisPointer: { link: [{ xAxisIndex: 'all' }], lineStyle: { color: 'rgba(58,181,224,0.5)', type: 'dashed' } },
      dataZoom: [{ type: 'inside', xAxisIndex: grids.map((_, i) => i), zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false }],
      tooltip: {
        ...tooltipBase, trigger: 'axis',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any[]) => {
          const idx = params[0]?.dataIndex ?? 0;
          const p = calc.visible[idx];
          if (!p) return '';
          const row = (label: string, value: string, color?: string) =>
            `<div style="display:flex;justify-content:space-between;gap:20px;line-height:1.7"><span style="color:${CHART.axis}">${color ? `<span style="display:inline-block;width:8px;height:2px;background:${color};margin-right:6px;vertical-align:middle"></span>` : ''}${label}</span><span style="font-variant-numeric:tabular-nums;font-weight:600">${value}</span></div>`;
          let html = `<div style="font-weight:700;margin-bottom:4px">${dateLabel(p[0], true)}</div>`;
          if (comparing) {
            compareSeries.forEach((s, i) => { const v = s.values[idx]; html += row(s.name, v == null ? '—' : fmtPct(v, 1), COMPARE_COLORS[i]); });
            return html;
          }
          if (mode === 'candle') {
            html += row('Otevření', fmtPrice(p[1], ticker)) + row('Maximum', fmtPrice(p[2], ticker)) + row('Minimum', fmtPrice(p[3], ticker));
          }
          html += row('Zavření', fmtPrice(p[4], ticker));
          if (showSma50 && calc.sma50[idx] != null) html += row('Průměr 50', fmtPrice(calc.sma50[idx]!, ticker), CHART.cyan);
          if (showSma200 && calc.sma200[idx] != null) html += row('Průměr 200', fmtPrice(calc.sma200[idx]!, ticker), CHART.amber);
          if (volumeOn) html += row('Objem', p[5].toLocaleString('cs-CZ', { notation: 'compact', maximumFractionDigits: 1 }));
          if (rsiOn && calc.rsi[idx] != null) html += row('RSI', calc.rsi[idx]!.toFixed(0), CHART.violet);
          return html;
        },
      },
      series,
    };
    return { opt, height: totalH };
  }, [calc, range, mode, showSma50, showSma200, showVolume, showRsi, comparing, compareSeries, ticker]);

  // Při změně období nebo titulu nech na obrazovce poslední graf a čísla (ztlumené),
  // dokud nedorazí nová data — jinak by se stránka pokaždé smrskla a zase roztáhla.
  const [shown, setShown] = useState(option);
  if (option && option !== shown) setShown(option);
  const [live, setLive] = useState(calc);
  if (calc && calc !== live) setLive(calc);
  const busy = !option && !!shown && main !== 'error';
  const [painted, setPainted] = useState(false);

  // ── Co na grafu vidíš: věty spočítané z aktuálních dat ──
  const notes = useMemo(() => {
    if (!live) return [];
    const out: { title: string; text: string }[] = [];
    const rangeLabel = { '1mo': 'poslední měsíc', '6mo': 'posledního půl roku', '1y': 'poslední rok', '5y': 'posledních pět let', 'max': 'celou dostupnou historii' }[range];
    if (comparing) {
      out.push({
        title: 'Proč procenta, ne ceny',
        text: 'Když porovnáváš věci s různou cenou, nedává smysl kreslit je v korunách nebo dolarech. Všechny čáry proto začínají na nule a ukazují, o kolik procent se cena od začátku období změnila.',
      });
      return out;
    }
    out.push({
      title: mode === 'candle' ? 'Jak číst svíčku' : 'Co ukazuje čára',
      text: mode === 'candle'
        ? `Každá svíčka je jeden ${view.unit}. Tělo spojuje otevírací a zavírací cenu, tenké knoty ukazují maximum a minimum. Zelená znamená, že cena skončila výš, než začala; červená opak.`
        : `Každý bod je zavírací cena za jeden ${view.unit}. Za ${rangeLabel} se cena změnila o ${fmtPct(live.stats.change, 1)}.`,
    });
    out.push({
      title: 'Největší propad',
      text: `Kdo koupil na vrcholu, viděl v nejhorší chvíli svou investici o ${Math.abs(live.stats.maxDrawdown).toFixed(0)} % níž. Tohle číslo říká, co musíš ustát — víc než průměrný výnos.`,
    });
    if ((showSma50 || showSma200) && live.lastSma200 != null) {
      const diff = (live.last / live.lastSma200 - 1) * 100;
      out.push({
        title: 'Klouzavé průměry',
        text: `Průměr posledních 50 nebo 200 svíček vyhlazuje denní šum, takže je vidět směr. Cena je teď ${Math.abs(diff).toFixed(1).replace('.', ',')} % ${diff >= 0 ? 'nad' : 'pod'} průměrem 200 — tomu se říká ${diff >= 0 ? 'rostoucí' : 'klesající'} dlouhodobý trend. Minulý trend ale budoucí nezaručuje.`,
      });
    } else if (showSma50 || showSma200) {
      out.push({
        title: 'Klouzavé průměry',
        text: 'Průměr posledních 50 nebo 200 svíček vyhlazuje denní šum, takže je vidět směr. Pro průměr 200 tu zatím není dost historie.',
      });
    }
    if (showVolume && live.hasVolume) out.push({
      title: 'Objem',
      text: 'Sloupce dole ukazují, kolik kusů se zobchodovalo. Velký pohyb ceny při vysokém objemu bere trh vážněji než stejný pohyb, u kterého skoro nikdo neobchodoval.',
    });
    if (showRsi && live.lastRsi != null) {
      const v = live.lastRsi;
      out.push({
        title: 'RSI',
        text: `Index relativní síly měří, jak rychle cena v posledních 14 svíčkách rostla oproti tomu, jak klesala. Teď je na ${v.toFixed(0)}: ${v > 70 ? 'nad 70 se mluví o překoupeném trhu' : v < 30 ? 'pod 30 se mluví o přeprodaném trhu' : 'mezi 30 a 70 je to neutrální pásmo'}. Není to signál k nákupu ani prodeji — jen popis tempa.`,
      });
    }
    return out;
  }, [live, range, mode, comparing, showSma50, showSma200, showVolume, showRsi, view.unit]);

  const instrument = ALL_INSTRUMENTS.find(i => i.ticker === ticker);
  const title = instrument?.name ?? (main && main !== 'error' ? main.name : ticker);
  const offline = main && main !== 'error' && main.offline;
  const snapshotDate = offline ? new Date(main.timestamp).toLocaleDateString('cs-CZ') : null;

  const quote = quotes[ticker];
  const compareFull = compare.length >= MAX_COMPARE;

  return (
    <div className="mx">
      <header className="page-head">
        <h1 className="page-title">Trhy</h1>
        <p className="page-lead">
          {onPortfolio
            ? 'Nakupuj skutečné tituly za skutečné ceny, ale s virtuálními penězi. Zjistíš, jak trh kolísá, dřív než půjde o tvoje peníze.'
            : <>Skutečné ceny akcií, indexů, kryptoměn a měn. {pro
              ? 'Zapni si svíčky, klouzavé průměry, objem nebo RSI a porovnej víc titulů v procentech.'
              : 'Vyber si ze seznamu, co tě zajímá, a pod grafem si přečti, co na něm vlastně vidíš.'}</>}
        </p>
        <div className="mx-tabs">
          <Segmented
            label="Co chceš vidět" size="md" value={onPortfolio ? 'portfolio' : 'grafy'}
            options={[{ value: 'portfolio', label: 'Portfolio na zkoušku' }, { value: 'grafy', label: 'Grafy a ceny' }]}
            onChange={v => onPick?.(v === 'portfolio' ? 'portfolio' : ticker)}
          />
        </div>
      </header>

      {onPortfolio ? (
        <PortfolioView onOpenChart={pick} />
      ) : (
      <div className="mx-layout">
        {/* ── seznam titulů ── */}
        <aside className="mx-rail" aria-label="Seznam titulů">
          <button
            type="button" className="mx-rail__toggle" aria-expanded={listOpen} aria-controls="mx-list"
            onClick={() => setListOpen(o => !o)}
          >
            <span className="mx-rail__toggle-text">
              <span className="mx-rail__toggle-label">{listOpen ? 'Zavřít seznam' : 'Vybrat jiný titul'}</span>
              <span className="mx-rail__toggle-name">{title}</span>
            </span>
            {quote && (
              <span className={`num ${quote.change_percent >= 0 ? 'is-up' : 'is-down'}`}>{fmtPct(quote.change_percent)}</span>
            )}
            <Icon name="chevron-down" size={20} aria-hidden className="mx-rail__chev" />
          </button>

          <div id="mx-list" className={`mx-rail__body${listOpen ? ' is-open' : ''}`}>
            <form className="mx-search" onSubmit={submitQuery}>
              <label className="sr-only" htmlFor="mk-ticker">Vlastní ticker</label>
              <input
                id="mk-ticker" className="ui-input" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Ticker, např. MSFT" autoComplete="off" spellCheck={false} maxLength={14}
              />
              <button type="submit" className="btn" disabled={!query.trim()}>Zobrazit</button>
            </form>

            <p className={`mx-hint${compareFull ? ' is-full' : ''}`} role="status">
              {compareFull
                ? 'Porovnávat jdou nejvýš dva tituly najednou. Chceš jiný? Nejdřív jeden odeber tlačítkem −.'
                : comparing
                  ? 'Porovnáváš jeden titul, tlačítkem + můžeš přidat ještě jeden.'
                  : 'Tlačítkem + přidáš titul do grafu k porovnání. Najednou jdou nejvýš dva.'}
            </p>

            <div className="mx-list">
              {WATCHLIST.map(g => (
                <section key={g.group}>
                  <h2 className="mx-group">{g.group}</h2>
                  <ul>
                    {g.items.map(it => {
                      const q = quotes[it.ticker];
                      const active = it.ticker === ticker;
                      const compared = compare.includes(it.ticker);
                      const blocked = !compared && compareFull;
                      return (
                        <li key={it.ticker} className={`mx-row${active ? ' is-active' : ''}${compared ? ' is-compared' : ''}`}>
                          <button type="button" className="mx-row__main" onClick={() => pick(it.ticker)} aria-current={active}>
                            <span className="mx-row__name">{it.name}</span>
                            <span className={`mx-row__chg num ${q ? (q.change_percent >= 0 ? 'is-up' : 'is-down') : ''}`}>
                              {q ? fmtPct(q.change_percent) : ''}
                            </span>
                          </button>
                          {!active && (
                            <button
                              type="button" className={`mx-row__cmp${compared ? ' is-on' : ''}`}
                              style={compared ? { '--c': COMPARE_COLORS[compare.indexOf(it.ticker) + 1] } as React.CSSProperties : undefined}
                              onClick={() => toggleCompare(it.ticker)}
                              disabled={blocked}
                              aria-pressed={compared}
                              title={compared ? 'Odebrat z porovnání' : blocked ? 'Porovnat jdou nejvýš dva tituly' : `Porovnat s: ${title}`}
                              aria-label={`${compared ? 'Odebrat z porovnání' : 'Porovnat'}: ${it.name}`}
                            >
                              {compared ? '−' : '+'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </aside>

        {/* ── graf ── */}
        <section className="mx-main" aria-live="polite">
          <div className="ui-panel mx-panel">
            <div className="mx-head">
              <div className="mx-head__main">
                <h2 className="mx-head__name">{title} <span className="ui-tag">{ticker}</span></h2>
                {live && (
                  <>
                    <p className="mx-price">
                      <span className="num">{fmtPrice(quote?.price ?? live.last, ticker)}</span>
                      {main && main !== 'error' && <span className="mx-price__cur">{main.currency}</span>}
                    </p>
                    <p className="mx-change">
                      <span className={`num ${live.stats.change >= 0 ? 'is-up' : 'is-down'}`}>{fmtPct(live.stats.change, 1)}</span>
                      {' '}{PERIOD_LABEL[range]}
                      {quote && (
                        <>
                          <span className="mx-change__sep" aria-hidden="true">·</span>
                          <span className={`num ${quote.change_percent >= 0 ? 'is-up' : 'is-down'}`}>{fmtPct(quote.change_percent)}</span>
                          {' '}dnes
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
              {instrument && <p className="mx-head__about">{instrument.about}</p>}
            </div>

            <div className="mx-toolbar">
              <Segmented
                label="Období" value={range} onChange={v => setRange(v as RangeId)}
                options={RANGES.map(r => ({ value: r.id, label: r.label }))}
              />
              <Segmented
                label="Typ grafu" value={mode} onChange={v => setMode(v as 'line' | 'candle')}
                options={[{ value: 'line', label: 'Čára' }, { value: 'candle', label: 'Svíčky' }]}
                disabled={comparing}
              />
              <div className="mx-toggles" role="group" aria-label="Indikátory">
                <Toggle on={showSma50} set={setShowSma50} color={CHART.cyan} disabled={comparing}>Průměr 50</Toggle>
                <Toggle on={showSma200} set={setShowSma200} color={CHART.amber} disabled={comparing}>Průměr 200</Toggle>
                <Toggle on={showVolume} set={setShowVolume} disabled={comparing || (live ? !live.hasVolume : false)}>Objem</Toggle>
                <Toggle on={showRsi} set={setShowRsi} color={CHART.violet} disabled={comparing}>RSI</Toggle>
              </div>
            </div>

            {comparing && (
              <div className="mx-compare">
                <span className="mx-compare__label">Porovnání v procentech od začátku období</span>
                <ul className="mx-compare__list">
                  {compareSeries.map((s, i) => (
                    <li key={s.ticker} className="mx-compare__item">
                      <i style={{ background: COMPARE_COLORS[i] }} aria-hidden="true" />
                      {s.name}
                      {i > 0 && (
                        <button type="button" onClick={() => toggleCompare(s.ticker)} aria-label={`Odebrat ${s.name}`}>
                          <Icon name="x" size={14} aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn btn--quiet btn--small" onClick={() => setCompare([])}>Zrušit porovnání</button>
              </div>
            )}

            <div className="mx-chart" aria-busy={busy} style={{ minHeight: shown?.height }}>
              {main === 'error' ? (
                <div className="mx-empty" role="status">
                  <p><strong>Pro „{ticker}“ se nepodařilo načíst data.</strong></p>
                  <p>Zkontroluj ticker (tak, jak ho uvádí Yahoo Finance — třeba CEZ.PR nebo BTC-USD) nebo připojení.</p>
                  <button type="button" className="btn" onClick={() => retry(ticker)}>Zkusit znovu</button>
                </div>
              ) : shown ? (
                <Suspense fallback={<ChartSkeleton height={shown.height} bare />}>
                  <ReactECharts
                    option={{ ...shown.opt, animationDuration: painted ? 0 : 400, animationDurationUpdate: 200 }}
                    style={{ height: shown.height }} notMerge opts={{ renderer: 'canvas' }}
                    onChartReady={() => setPainted(true)}
                  />
                </Suspense>
              ) : (
                <ChartSkeleton height={MAIN_H + 46} bare />
              )}
            </div>

            {offline && (
              <p className="ui-note ui-note--warn mx-offline" role="status">
                Živá data teď nejsou dostupná, tohle je uložený snímek z {snapshotDate}.
              </p>
            )}

            {live && (
              <dl className="ui-kpis mx-kpis" aria-busy={busy}>
                <div><dt>Změna {PERIOD_LABEL[range]}</dt><dd className={live.stats.change >= 0 ? 'is-up' : 'is-down'}>{fmtPct(live.stats.change, 1)}</dd></div>
                <div><dt>Roční volatilita</dt><dd>{live.stats.volatility.toFixed(1).replace('.', ',')} %</dd></div>
                <div><dt>Největší propad</dt><dd className="is-down">{fmtPct(live.stats.maxDrawdown, 1)}</dd></div>
                <div><dt>Maximum</dt><dd>{fmtPrice(live.stats.high, ticker)}</dd></div>
                <div><dt>Minimum</dt><dd>{fmtPrice(live.stats.low, ticker)}</dd></div>
              </dl>
            )}

            <TradeBox ticker={ticker} showPortfolioLink />
          </div>

          {notes.length > 0 && (
            <section className="ui-sec mx-notes" aria-label="Co na grafu vidíš">
              <h2 className="ui-sec__title">Co na grafu vidíš</h2>
              <div className="mx-notes__grid">
                {notes.map(n => (
                  <div key={n.title} className="mx-note">
                    <h3 className="ui-h3">{n.title}</h3>
                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
              {onAskMentor && (
                <button
                  type="button" className="btn"
                  onClick={() => onAskMentor(`Dívám se na graf ${title} (${ticker}). Vysvětli mi, co ovlivňuje jeho cenu a na co si dát pozor.`)}
                >
                  Zeptat se mentora na {title}
                </button>
              )}
            </section>
          )}

          <SectorBoard
            quotes={quotes} active={ticker}
            onPick={t => { pick(t); document.querySelector('.mx-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
          />

          <p className="ui-small mx-source">
            Data: Yahoo Finance, zpožděná. Slouží k výuce, nejde o investiční doporučení.
          </p>
        </section>
      </div>
      )}
    </div>
  );
};

function Toggle({ on, set, color, disabled, children }: {
  on: boolean; set: (v: boolean) => void; color?: string; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button" className={`mx-chip${on ? ' is-on' : ''}`} aria-pressed={on}
      onClick={() => set(!on)} disabled={disabled}
    >
      {color && <i style={{ background: color }} aria-hidden="true" />}
      {children}
    </button>
  );
}
