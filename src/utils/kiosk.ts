/**
 * Režim stánku — web běží na společném zařízení (veletrh). Zapne se adresou
 * s ?stanek=1 a drží se v prohlížeči, dokud ho ?stanek=0 nevypne.
 * V tomhle režimu se web po chvíli nečinnosti vrátí na začátek a smaže
 * stopy po předchozím návštěvníkovi (viz components/kiosk/KioskGuard).
 */
const KEY = 'fm-kiosk';

function detect(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('stanek');
    if (param === '1') localStorage.setItem(KEY, '1');
    if (param === '0') localStorage.removeItem(KEY);
    if (param !== null) {
      // parametr z adresy uklidíme, ať se nedostane do QR kódu ani sdílených odkazů
      const url = new URL(window.location.href);
      url.searchParams.delete('stanek');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const KIOSK = detect();
if (KIOSK && typeof document !== 'undefined') document.documentElement.dataset.kiosk = '';
