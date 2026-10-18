/**
 * Počítadlo pokusů v D1 (tabulka `attempts`), sdílené funkcemi na serveru: přihlášení,
 * registrace a chat s mentorem. Záměrně jen strukturální typ databáze, ať se soubor
 * přeloží i bez typů Cloudflare Workers.
 */

interface Db {
  prepare(sql: string): {
    bind(...values: unknown[]): { first<T>(): Promise<T | null> };
  };
}

/** true = limit vyčerpán. Jinak pokus započítá (jedním atomickým příkazem, bez závodu). */
export async function limited(db: Db, key: string, max: number, windowSec: number): Promise<boolean> {
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
