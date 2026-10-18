/**
 * Cloudflare Pages Function — účty návštěvníků (D1).
 *
 *   GET    /api/account                      → kdo je přihlášený + uložený postup
 *   POST   /api/account {action:'register'|'login', name, password, data?}
 *   POST   /api/account {action:'logout'}
 *   PUT    /api/account {data}               → uloží postup přihlášeného
 *   DELETE /api/account                      → smaže účet i s daty
 *
 * Bez e-mailu: stačí přezdívka a heslo. Heslo se ukládá jen jako otisk
 * (PBKDF2-SHA256 se solí), přihlášení drží HttpOnly cookie s náhodným tokenem;
 * v databázi je z tokenu zase jen otisk.
 */

interface Env { DB?: D1Database }

interface UserRow {
  id: string; name: string; pass_hash: string; pass_salt: string; data: string; updated_at: number;
}

const COOKIE = 'fm_session';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100_000; // strop Workers runtime
const MAX_DATA_BYTES = 60_000;
const NAME_RE = /^[\p{L}\p{N}_.-]{3,24}$/u;

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });

const fail = (status: number, error: string) => json({ error }, status);

const hex = (buf: ArrayBuffer | Uint8Array) =>
  [...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))].map(b => b.toString(16).padStart(2, '0')).join('');

const unhex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map(h => parseInt(h, 16)));

const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));

async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: PBKDF2_ITERATIONS }, key, 256,
  );
  return hex(bits);
}

/** porovnání bez úniku informace přes čas */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readToken(request: Request): string | null {
  const m = (request.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  return m ? m[1] : null;
}

/** Požadavky měnící stav musí přijít z naší vlastní stránky. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // stejný původ Origin u některých prohlížečů neposílá
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

/** true = limit vyčerpán. Jinak pokus započítá (jedním atomickým příkazem, bez závodu). */
async function limited(db: D1Database, key: string, max: number, windowSec: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare(
    `INSERT INTO attempts (key, count, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN reset_at <= ?3 THEN 1 ELSE count + 1 END,
       reset_at = CASE WHEN reset_at <= ?3 THEN ?2 ELSE reset_at END
     RETURNING count`,
  ).bind(key, now + windowSec, now).first<{ count: number }>();
  return (row?.count ?? 1) > max;
}

function cleanData(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const text = JSON.stringify(value);
  return text.length <= MAX_DATA_BYTES ? text : null;
}

const parseData = (text: string): unknown => { try { return JSON.parse(text); } catch { return {}; } };

/** Strop bodů za jednu hru v tématu (stejné hodnoty jako PLAY_MAX na webu). */
const PLAY_MAX: Record<string, number> = { tip: 20, sort: 30, quiz: 50 };

/**
 * Údaje pro žebříček z uloženého postupu. Body se počítají tady na serveru ze skóre
 * (se stropy za hru), výkon portfolia hlásí web — je to hra, ne soutěž o peníze,
 * proto jen ořezaný do rozumného rozsahu.
 */
function boardStats(raw: string): { points: number; pfPct: number | null; board: number } {
  const d = parseData(raw) as Record<string, unknown>;
  let points = 0;
  const scores = d.scores && typeof d.scores === 'object' ? Object.values(d.scores as Record<string, Record<string, unknown>>).slice(0, 200) : [];
  for (const topic of scores) {
    if (!topic || typeof topic !== 'object') continue;
    for (const [kind, max] of Object.entries(PLAY_MAX)) {
      const v = Number(topic[kind]);
      if (Number.isFinite(v) && v > 0) points += Math.min(max, Math.round(v));
    }
  }
  const trades = (d.portfolio as { trades?: unknown[] } | undefined)?.trades;
  const pct = typeof d.pfPct === 'number' && Number.isFinite(d.pfPct) ? Math.max(-100, Math.min(10_000, d.pfPct)) : null;
  return { points, pfPct: Array.isArray(trades) && trades.length > 0 ? pct : null, board: d.board === false ? 0 : 1 };
}

async function currentUser(db: D1Database, request: Request): Promise<UserRow | null> {
  const token = readToken(request);
  if (!token) return null;
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(
    `SELECT u.id, u.name, u.pass_hash, u.pass_salt, u.data, u.updated_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256(token), now).first<UserRow>();
}

async function startSession(db: D1Database, userId: string): Promise<string> {
  const token = randomHex(32);
  const now = Math.floor(Date.now() / 1000);
  const maxAge = SESSION_DAYS * 86_400;
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM attempts WHERE reset_at <= ?').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), userId, now + maxAge),
  ]);
  return sessionCookie(token, maxAge);
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  if (!db) return fail(503, 'Účty teď nejsou dostupné.');
  if (request.method !== 'GET' && !sameOrigin(request)) return fail(403, 'Neplatný původ požadavku.');

  try {
    if (request.method === 'GET') {
      const user = await currentUser(db, request);
      if (!user) return json({ user: null });
      return json({ user: { name: user.name }, data: parseData(user.data), updatedAt: user.updated_at });
    }

    if (request.method === 'DELETE') {
      const user = await currentUser(db, request);
      if (!user) return fail(401, 'Nejsi přihlášený.');
      await db.batch([
        db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
        db.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
      ]);
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }

    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; } catch { return fail(400, 'Neplatný požadavek.'); }

    if (request.method === 'PUT') {
      const user = await currentUser(db, request);
      if (!user) return fail(401, 'Nejsi přihlášený.');
      const data = cleanData(body.data);
      if (!data) return fail(400, 'Data se nepodařilo uložit.');
      const now = Date.now();
      const b = boardStats(data);
      await db.prepare('UPDATE users SET data = ?, updated_at = ?, points = ?, pf_pct = ?, board = ? WHERE id = ?')
        .bind(data, now, b.points, b.pfPct, b.board, user.id).run();
      return json({ ok: true, updatedAt: now });
    }

    if (request.method !== 'POST') return fail(405, 'Nepodporovaná metoda.');

    const action = body.action;
    if (action === 'logout') {
      const token = readToken(request);
      if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
    }

    const name = typeof body.name === 'string' ? body.name.trim().normalize('NFC') : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const nameKey = name.toLowerCase();
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local';

    if (action === 'register') {
      if (!NAME_RE.test(name)) return fail(400, 'Přezdívka musí mít 3–24 znaků: písmena, číslice, tečka, pomlčka nebo podtržítko.');
      if (password.length < 8 || password.length > 200) return fail(400, 'Heslo musí mít aspoň 8 znaků.');
      const taken = await db.prepare('SELECT 1 FROM users WHERE name_key = ?').bind(nameKey).first();
      if (taken) return fail(409, 'Tahle přezdívka už je zabraná. Zkus jinou.');

      // na veletrhu sdílí jednu IP celá hala → limit je záměrně volný a počítá jen skutečně založené účty
      if (await limited(db, `reg:${ip}`, 600, 3600)) return fail(429, 'Příliš mnoho nových účtů z jedné sítě. Zkus to za chvíli.');

      const id = crypto.randomUUID();
      const salt = randomHex(16);
      const now = Date.now();
      const data = cleanData(body.data) ?? '{}';
      try {
        const b = boardStats(data);
        await db.prepare(
          'INSERT INTO users (id, name, name_key, pass_hash, pass_salt, data, points, pf_pct, board, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ).bind(id, name, nameKey, await hashPassword(password, salt), salt, data, b.points, b.pfPct, b.board, now, now).run();
      } catch (err) {
        // dva lidé si ve stejnou chvíli vybrali stejnou přezdívku
        if (String(err).includes('UNIQUE')) return fail(409, 'Tahle přezdívka už je zabraná. Zkus jinou.');
        throw err;
      }
      return json({ user: { name }, data: parseData(data), updatedAt: now }, 201, { 'Set-Cookie': await startSession(db, id) });
    }

    if (action === 'login') {
      if (!name || !password) return fail(400, 'Vyplň přezdívku i heslo.');
      if (name.length > 24 || password.length > 200) return fail(401, 'Přezdívka nebo heslo nesedí.');
      if (await limited(db, `login:${ip}:${nameKey}`, 8, 600)) return fail(429, 'Příliš mnoho pokusů. Zkus to za 10 minut.');
      // celkový strop na účet: kdo střídá IP adresy, nemůže hádat heslo jednoho účtu bez omezení
      if (await limited(db, `login-acct:${nameKey}`, 40, 3600)) return fail(429, 'K tomuhle účtu přišlo příliš mnoho pokusů. Zkus to za hodinu.');

      const user = await db.prepare(
        'SELECT id, name, pass_hash, pass_salt, data, updated_at FROM users WHERE name_key = ?',
      ).bind(nameKey).first<UserRow>();
      // otisk počítáme i pro neexistující účet, ať se z doby odpovědi nedá poznat, jestli přezdívka existuje
      const hash = await hashPassword(password, user?.pass_salt ?? '00000000000000000000000000000000');
      if (!user || !safeEqual(hash, user.pass_hash)) return fail(401, 'Přezdívka nebo heslo nesedí.');

      await db.prepare('DELETE FROM attempts WHERE key IN (?, ?)').bind(`login:${ip}:${nameKey}`, `login-acct:${nameKey}`).run();
      return json(
        { user: { name: user.name }, data: parseData(user.data), updatedAt: user.updated_at },
        200, { 'Set-Cookie': await startSession(db, user.id) },
      );
    }

    return fail(400, 'Neznámá akce.');
  } catch (err) {
    console.error('account error', err);
    return fail(500, 'Něco se pokazilo. Zkus to prosím znovu.');
  }
};
