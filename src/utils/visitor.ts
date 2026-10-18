/**
 * Anonymní ID návštěvníka pro limity dotazů na mentora (viz functions/api/chat.ts).
 * Neobsahuje nic osobního — je to náhodné číslo v prohlížeči. Režim stánku ho po každém
 * resetu mění, takže každý další návštěvník společného zařízení má vlastní limit.
 */
const KEY = 'fm-vid';
let memory: string | null = null;

const random = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');

export function visitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id || !/^[a-f0-9]{32}$/.test(id)) {
      id = random();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // úložiště nedostupné (soukromé okno) → ID platí do zavření stránky
    return (memory ??= random());
  }
}

export function rotateVisitorId(): void {
  memory = null;
  try { localStorage.removeItem(KEY); } catch { /* nevadí */ }
}
