/**
 * Kdo je přihlášený podle cookie `fm_session` (stejná relace jako v functions/api/account.ts).
 * V databázi je jen otisk tokenu; samotný token zná prohlížeč. Strukturální typ databáze,
 * ať se soubor přeloží i bez typů Cloudflare Workers.
 */

interface Db {
  prepare(sql: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null> };
  };
}

const COOKIE = 'fm_session';

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** id přihlášeného uživatele, nebo null */
export async function sessionUserId(db: Db, request: Request): Promise<string | null> {
  const m = (request.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`));
  if (!m) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await sha256(m[1]), now).first<{ user_id: string }>();
  return row?.user_id ?? null;
}
