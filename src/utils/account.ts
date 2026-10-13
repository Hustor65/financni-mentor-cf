import { useSyncExternalStore } from 'react';
import { getData, isPristine, mergeData, replaceData, resetData, sanitize, subscribeData } from './store';
import { KIOSK } from './kiosk';

/**
 * Účet návštěvníka (/api/account). Přihlášenému se postup ukládá do databáze,
 * takže se k němu vrátí z jiného zařízení. Bez účtu web funguje stejně,
 * jen postup zůstává v prohlížeči.
 */

export interface AccountState {
  /** null = nepřihlášen */
  user: { name: string } | null;
  /** false, dokud nedoběhne úvodní dotaz „kdo jsem“ */
  ready: boolean;
  /** poslední uložení do účtu selhalo (typicky bez připojení) */
  unsynced: boolean;
}

let state: AccountState = { user: null, ready: false, unsynced: false };
const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  listeners.forEach(fn => fn());
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export const useAccount = (): AccountState => useSyncExternalStore(subscribe, () => state);
export const getAccount = (): AccountState => state;

interface ApiReply { user?: { name: string } | null; data?: unknown; error?: string }

async function call(method: string, body?: unknown, keepalive = false): Promise<ApiReply> {
  const resp = await fetch('/api/account', {
    method,
    credentials: 'same-origin',
    keepalive,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: keepalive ? undefined : AbortSignal.timeout(12_000),
  });
  if (!(resp.headers.get('content-type') ?? '').includes('json')) throw new Error('Účty teď nejsou dostupné.');
  const reply = await resp.json() as ApiReply;
  if (!resp.ok) throw new Error(reply.error ?? 'Něco se pokazilo. Zkus to prosím znovu.');
  return reply;
}

const offlineMessage = (err: unknown) =>
  err instanceof TypeError || (err instanceof DOMException && err.name === 'TimeoutError')
    ? 'Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu.'
    : err instanceof Error ? err.message : 'Něco se pokazilo.';

/* ── ukládání postupu do účtu ─────────────────────────────── */

/** Odhlášení se nepovedlo dotáhnout na serveru (výpadek sítě) → cookie ještě žije a musí pryč, než se kdokoli přihlásí. */
const LOGOUT_FLAG = 'fm-logout';
const flag = {
  get: () => { try { return localStorage.getItem(LOGOUT_FLAG) === '1'; } catch { return false; } },
  set: (on: boolean) => { try { if (on) localStorage.setItem(LOGOUT_FLAG, '1'); else localStorage.removeItem(LOGOUT_FLAG); } catch { /* nevadí */ } },
};

let timer: ReturnType<typeof setTimeout> | undefined;
let applyingRemote = false;
let lastPushed = '';
/** Zvedne se při každém přihlášení/odhlášení — odpověď, která dorazí po změně účtu, se zahodí. */
let generation = 0;
/** Ukládání jde jedno po druhém, ať starší stav nepřepíše novější. */
let queue: Promise<unknown> = Promise.resolve();

async function doPush(keepalive: boolean, gen: number): Promise<boolean> {
  if (!state.user || gen !== generation) return true;
  const data = getData();
  const text = JSON.stringify(data);
  if (text === lastPushed) return true;
  try {
    await call('PUT', { data }, keepalive);
    if (gen !== generation) return true;
    lastPushed = text;
    if (state.unsynced) set({ unsynced: false });
    return true;
  } catch (err) {
    if (gen !== generation) return true;
    // 401 = přihlášení mezitím vypršelo
    if (err instanceof Error && err.message.startsWith('Nejsi')) { set({ user: null }); return true; }
    set({ unsynced: true });
    // zkus to znovu i bez události „online“ (pomalá síť, timeout)
    clearTimeout(timer);
    timer = setTimeout(() => { void push(); }, 15_000);
    return false;
  }
}

function push(keepalive = false): Promise<boolean> {
  clearTimeout(timer);
  timer = undefined;
  const gen = generation;
  const run = queue.then(() => doPush(keepalive, gen));
  queue = run.catch(() => false);
  return run;
}

function schedulePush() {
  if (!state.user || applyingRemote) return;
  clearTimeout(timer);
  timer = setTimeout(() => { void push(); }, 1200);
}

/**
 * Po přihlášení: vezmi postup z účtu. Když má návštěvník něco rozdělaného i v prohlížeči,
 * sloučí se to — kromě přihlášení na stánku, kde by „rozdělané“ mohlo patřit někomu před ním.
 */
function adopt(user: { name: string }, remoteRaw: unknown, merge = true) {
  generation++;
  const remote = sanitize(remoteRaw);
  const local = getData();
  const merged = !merge || isPristine(local) ? remote : mergeData(local, remote);
  lastPushed = JSON.stringify(remote);
  applyingRemote = true;
  replaceData(merged);
  applyingRemote = false;
  flag.set(false);
  set({ user, ready: true, unsynced: false });
  if (JSON.stringify(merged) !== lastPushed) void push();
}

/** Zruš přihlášení v tomhle prohlížeči hned teď (bez čekání na síť). */
function forgetLocally() {
  generation++;
  clearTimeout(timer);
  timer = undefined;
  lastPushed = '';
  set({ user: null, unsynced: false });
  resetData();
}

/** Dotáhni odhlášení na serveru; když to nejde, zapamatuj si to a zkus při dalším startu. */
async function finishLogout(gen: number) {
  flag.set(true);
  try {
    if (gen !== generation) return; // mezitím se přihlásil někdo jiný → jeho cookie nemazat
    await call('POST', { action: 'logout' });
    if (gen === generation) flag.set(false);
  } catch { /* příznak zůstává */ }
}

let started = false;
/** Zavolej jednou při startu aplikace. */
export function initAccount() {
  if (started || typeof window === 'undefined') return;
  started = true;
  subscribeData(schedulePush);
  window.addEventListener('online', () => {
    if (flag.get() && !state.user) void finishLogout(generation);
    else if (state.unsynced) void push();
  });
  // zavření záložky: dopiš, co čeká na uložení
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) void push(true);
  });

  const gen = generation;
  if (flag.get()) {
    // minulé odhlášení nedoběhlo → nejdřív zahoď starou cookie, nikoho nepřihlašuj
    set({ ready: true });
    void finishLogout(gen);
    return;
  }
  call('GET')
    .then(r => {
      if (gen !== generation) return; // mezitím se někdo přihlásil ručně
      if (r.user) adopt(r.user, r.data); else set({ ready: true });
    })
    .catch(() => { if (gen === generation) set({ ready: true }); });
}

/** Vrací text chyby, nebo null při úspěchu. */
export async function signIn(mode: 'login' | 'register', name: string, password: string): Promise<string | null> {
  try {
    const r = await call('POST', { action: mode, name, password, ...(mode === 'register' ? { data: getData() } : {}) });
    if (!r.user) return 'Něco se pokazilo. Zkus to prosím znovu.';
    adopt(r.user, r.data, !(KIOSK && mode === 'login'));
    return null;
  } catch (err) {
    return offlineMessage(err);
  }
}

/**
 * Odhlásí a smaže postup z tohohle prohlížeče (zůstává uložený v účtu).
 * Když se poslední změny nepodaří uložit, vrátí text chyby a nic nesmaže —
 * leda s `force` (režim stánku, nebo když to návštěvník potvrdí).
 */
export async function signOut(force = false): Promise<string | null> {
  if (!state.user) { forgetLocally(); return null; }
  if (!force) {
    const saved = await push();
    if (!saved) return 'Poslední změny se nepodařilo uložit do účtu. Zkontroluj připojení, nebo se odhlas i tak — neuložené změny se ztratí.';
    forgetLocally();
    void finishLogout(generation);
    return null;
  }
  // vynucené odhlášení: obrazovka je čistá okamžitě, síť se dořeší na pozadí
  const data = getData();
  const dirty = JSON.stringify(data) !== lastPushed;
  forgetLocally();
  flag.set(true);
  const gen = generation;
  void (async () => {
    if (dirty) { try { await call('PUT', { data }, true); } catch { /* neuložené změny propadnou */ } }
    await finishLogout(gen);
  })();
  return null;
}

export async function deleteAccount(): Promise<string | null> {
  try {
    await call('DELETE');
  } catch (err) {
    return offlineMessage(err);
  }
  forgetLocally();
  return null;
}
