/**
 * Režim stánku — web běží na společném zařízení (veletrh). Zapne se adresou
 * s ?stanek=<kód> a drží se v prohlížeči, dokud ho ?stanek=0 nevypne.
 * V tomhle režimu se web po chvíli nečinnosti vrátí na začátek a smaže
 * stopy po předchozím návštěvníkovi (viz components/kiosk/KioskGuard).
 *
 * Kód zná jen Jakub (je v .dev.vars jako KIOSK_CODE), v kódu webu je jen jeho
 * otisk. Cizí odkaz tak režim nezapne nikomu na telefonu, kde by mu po chvíli
 * nečinnosti smazal postup.
 */
const KEY = 'fm-kiosk';
const CODE_SHA256 = 'ffd0bc07e5ca1af146ca81e878e048efd8b520855fe4d5d96ecf4b82f4253839';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('stanek');
    if (param !== null) {
      // parametr z adresy uklidíme, ať se nedostane do QR kódu ani sdílených odkazů
      const url = new URL(window.location.href);
      url.searchParams.delete('stanek');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (param === '0') localStorage.removeItem(KEY);
      else if (localStorage.getItem(KEY) !== '1') {
        // otisk je asynchronní → po ověření kódu stránku načteme znovu už v režimu stánku
        sha256(param).then(hash => {
          if (hash !== CODE_SHA256) return;
          localStorage.setItem(KEY, '1');
          window.location.reload();
        }).catch(() => { /* bez crypto.subtle (http) režim nezapneme */ });
      }
    }
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const KIOSK = detect();
if (KIOSK && typeof document !== 'undefined') document.documentElement.dataset.kiosk = '';
