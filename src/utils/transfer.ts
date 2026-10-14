import { TOPICS } from '../data/topics';
import { getData, isPristine, mergeData, replaceData, sanitize } from './store';
import type { TopicScore, UserData } from './store';

/**
 * Přenos postupu ze stánku do telefonu bez účtu: QR kód na stánku nese adresu
 * s ?postup=<kód>, telefon ho při načtení přičte ke svému postupu a parametr
 * z adresy smaže. Přenáší se jen učení (úroveň, hotová témata, body), ne
 * portfolio na zkoušku, aby QR kód zůstal malý a šel snadno vyfotit.
 *
 * Formát: verze „1“, úroveň (s/p), nejlepší výsledek v Odhadni graf (base36),
 * pak „.“ a za každé téma 9 znaků: pořadí tématu (2), hotovo (0/1),
 * body za odhad, třídění a kvíz (po 2 znacích, base36).
 */

const PARAM = 'postup';
const b36 = (n: number, width: number) => n.toString(36).padStart(width, '0');

export function encodeProgress(d: UserData): string {
  const done = new Set(d.completed);
  let out = `1${d.level === 'pro' ? 'p' : 's'}${b36(d.guessBest, 1)}.`;
  TOPICS.forEach((t, i) => {
    const s = d.scores[t.id];
    if (!done.has(t.id) && !s) return;
    out += b36(i, 2) + (done.has(t.id) ? '1' : '0') + b36(s?.tip ?? 0, 2) + b36(s?.sort ?? 0, 2) + b36(s?.quiz ?? 0, 2);
  });
  return out;
}

export function decodeProgress(code: string): UserData | null {
  const m = /^1([sp])([0-9a-z])\.((?:[0-9a-z]{2}[01][0-9a-z]{6})*)$/.exec(code);
  if (!m) return null;
  const completed: string[] = [];
  const scores: Record<string, TopicScore> = {};
  for (const entry of m[3].match(/.{9}/g) ?? []) {
    const topic = TOPICS[parseInt(entry.slice(0, 2), 36)];
    if (!topic) continue;
    if (entry[2] === '1') completed.push(topic.id);
    scores[topic.id] = {
      tip: parseInt(entry.slice(3, 5), 36),
      sort: parseInt(entry.slice(5, 7), 36),
      quiz: parseInt(entry.slice(7, 9), 36),
    };
  }
  // sanitize ořízne body na povolené maximum a vyhodí nuly
  return sanitize({ level: m[1] === 'p' ? 'pro' : 'start', guessBest: parseInt(m[2], 36), completed, scores });
}

/** Adresa pro QR kód: s postupem, pokud tu návštěvník už něco udělal. */
export function takeHomeUrl(d: UserData): string {
  const base = window.location.origin + '/';
  return isPristine(d) ? base : `${base}?${PARAM}=${encodeProgress(d)}#akademie`;
}

/** Načte postup z adresy (jednou, při startu). true = něco se přeneslo. */
function importFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get(PARAM);
    if (code === null) return false;
    url.searchParams.delete(PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    const incoming = decodeProgress(code);
    if (!incoming || isPristine(incoming)) return false;
    replaceData(mergeData(getData(), incoming));
    return true;
  } catch {
    return false;
  }
}

export const IMPORTED = importFromUrl();
