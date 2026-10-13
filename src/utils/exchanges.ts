/**
 * Světové burzy a jejich běžné obchodní hodiny (místní čas burzy, minuty od půlnoci).
 * Glóbus v hero podle nich ukazuje, kde se právě obchoduje. Svátky neřešíme —
 * jde o ilustraci „trh nikdy nespí“, ne o burzovní kalendář.
 */
export interface Exchange {
  id: string;
  /** česky, pro popisek na glóbu */
  city: string;
  lat: number;
  lng: number;
  tz: string;
  /** obchodní seance [od, do) v minutách místního času */
  sessions: [number, number][];
  tier: 'mega' | 'major';
  /** popisek na glóbu: kam od bodu (bez hodnoty = bez popisku) */
  label?: 'left' | 'right';
}

export const EXCHANGES: Exchange[] = [
  { id: 'NYSE', city: 'New York', lat: 40.707, lng: -74.011, tz: 'America/New_York', sessions: [[570, 960]], tier: 'mega', label: 'left' },
  { id: 'TSX', city: 'Toronto', lat: 43.648, lng: -79.381, tz: 'America/Toronto', sessions: [[570, 960]], tier: 'major' },
  { id: 'B3', city: 'São Paulo', lat: -23.571, lng: -46.634, tz: 'America/Sao_Paulo', sessions: [[600, 1020]], tier: 'major', label: 'right' },
  { id: 'LSE', city: 'Londýn', lat: 51.515, lng: -0.092, tz: 'Europe/London', sessions: [[480, 990]], tier: 'mega', label: 'left' },
  { id: 'PAR', city: 'Paříž', lat: 48.869, lng: 2.341, tz: 'Europe/Paris', sessions: [[540, 1050]], tier: 'major' },
  { id: 'FRA', city: 'Frankfurt', lat: 50.115, lng: 8.684, tz: 'Europe/Berlin', sessions: [[540, 1050]], tier: 'mega' },
  { id: 'SIX', city: 'Curych', lat: 47.37, lng: 8.536, tz: 'Europe/Zurich', sessions: [[540, 1040]], tier: 'major' },
  { id: 'PSE', city: 'Praha', lat: 50.083, lng: 14.426, tz: 'Europe/Prague', sessions: [[540, 980]], tier: 'mega', label: 'right' },
  { id: 'JSE', city: 'Johannesburg', lat: -26.098, lng: 28.056, tz: 'Africa/Johannesburg', sessions: [[540, 1020]], tier: 'major', label: 'right' },
  { id: 'NSE', city: 'Bombaj', lat: 18.93, lng: 72.835, tz: 'Asia/Kolkata', sessions: [[555, 930]], tier: 'major', label: 'left' },
  { id: 'SSE', city: 'Šanghaj', lat: 31.233, lng: 121.505, tz: 'Asia/Shanghai', sessions: [[570, 690], [780, 900]], tier: 'mega' },
  { id: 'HKEX', city: 'Hongkong', lat: 22.281, lng: 114.159, tz: 'Asia/Hong_Kong', sessions: [[570, 720], [780, 960]], tier: 'mega', label: 'left' },
  { id: 'JPX', city: 'Tokio', lat: 35.683, lng: 139.777, tz: 'Asia/Tokyo', sessions: [[540, 690], [750, 930]], tier: 'mega', label: 'right' },
  { id: 'KRX', city: 'Soul', lat: 37.525, lng: 126.927, tz: 'Asia/Seoul', sessions: [[540, 930]], tier: 'major' },
  { id: 'SGX', city: 'Singapur', lat: 1.281, lng: 103.85, tz: 'Asia/Singapore', sessions: [[540, 720], [780, 1020]], tier: 'major', label: 'left' },
  { id: 'ASX', city: 'Sydney', lat: -33.867, lng: 151.207, tz: 'Australia/Sydney', sessions: [[600, 960]], tier: 'major', label: 'right' },
];

const DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatters = new Map<string, Intl.DateTimeFormat>();

/** Den v týdnu (0 = neděle) a minuty od půlnoci v daném časovém pásmu. */
function localTime(tz: string, date: Date): { day: number; minutes: number } {
  let fmt = formatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatters.set(tz, fmt);
  }
  let day = 0, hour = 0, minute = 0;
  for (const p of fmt.formatToParts(date)) {
    if (p.type === 'weekday') day = DAYS[p.value] ?? 0;
    else if (p.type === 'hour') hour = Number(p.value) % 24;
    else if (p.type === 'minute') minute = Number(p.value);
  }
  return { day, minutes: hour * 60 + minute };
}

export function isOpen(ex: Exchange, date: Date): boolean {
  const { day, minutes } = localTime(ex.tz, date);
  if (day === 0 || day === 6) return false;
  return ex.sessions.some(([from, to]) => minutes >= from && minutes < to);
}

/** Bitová maska otevřených burz (bit i = EXCHANGES[i]) — levné porovnání „změnilo se něco?“. */
export function openMask(date: Date): number {
  let mask = 0;
  for (let i = 0; i < EXCHANGES.length; i++) if (isOpen(EXCHANGES[i], date)) mask |= 1 << i;
  return mask;
}

export const countOpen = (mask: number): number => {
  let n = 0;
  for (let m = mask; m; m >>>= 1) n += m & 1;
  return n;
};

/** Otevře se v příštích třech hodinách aspoň jedna burza (nebo už je otevřená)? */
export function marketsActiveSoon(now: Date): boolean {
  for (let k = 0; k <= 6; k++) if (openMask(new Date(now.getTime() + k * 30 * 60_000))) return true;
  return false;
}

/** Půlnoc UTC posledního všedního dne před dneškem — podklad pro zrychlenou ukázku o víkendu. */
export function lastWeekdayStart(now: Date): number {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  do d.setUTCDate(d.getUTCDate() - 1); while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.getTime();
}

/** Zeměpisná šířka a délka bodu, nad kterým stojí slunce v zenitu. */
export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  const g = (2 * Math.PI / 365) * (dayOfYear - 81);
  const eot = 9.87 * Math.sin(2 * g) - 7.53 * Math.cos(g) - 1.5 * Math.sin(g); // časová rovnice, minuty
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return { lat: 23.44 * Math.sin(g), lng: -15 * (utcHours - 12 + eot / 60) };
}

const pragueClock = new Intl.DateTimeFormat('cs-CZ', { timeZone: 'Europe/Prague', hour: '2-digit', minute: '2-digit' });
export const pragueTime = (date: Date) => pragueClock.format(date);
