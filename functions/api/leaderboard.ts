/**
 * Cloudflare Pages Function — žebříček na stánku.
 *
 *   GET /api/leaderboard → { points: [{name, points}], portfolio: [{name, pct}] }
 *
 * Ukazuje jen přezdívku a číslo, jen u účtů, které si žebříček nevypnuly. Odpověď se
 * na okraji sítě drží 30 s, ať zájem o žebříček nezatěžuje databázi.
 */

interface Env { DB?: D1Database }

const TOP = 10;
const TTL = 30;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json' };
  const db = env.DB;
  if (!db) return new Response(JSON.stringify({ points: [], portfolio: [] }), { headers: { ...headers, 'Cache-Control': 'no-store' } });

  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(`${new URL(request.url).origin}/__board-cache`);
  try {
    const hit = await cache.match(key);
    if (hit) return hit;
  } catch { /* bez cache */ }

  try {
    const [points, portfolio] = await db.batch([
      db.prepare('SELECT name, points FROM users WHERE board = 1 AND points > 0 ORDER BY points DESC, updated_at ASC LIMIT ?').bind(TOP),
      db.prepare('SELECT name, pf_pct AS pct FROM users WHERE board = 1 AND pf_pct IS NOT NULL ORDER BY pf_pct DESC, updated_at ASC LIMIT ?').bind(TOP),
    ]);
    const resp = new Response(JSON.stringify({ points: points.results, portfolio: portfolio.results }), {
      headers: { ...headers, 'Cache-Control': `public, max-age=${TTL}` },
    });
    try { context.waitUntil(cache.put(key, resp.clone())); } catch { /* nevadí */ }
    return resp;
  } catch (err) {
    // databáze ještě nemá sloupce žebříčku → prázdný žebříček, ne chyba
    console.error('leaderboard error', err);
    return new Response(JSON.stringify({ points: [], portfolio: [] }), { headers: { ...headers, 'Cache-Control': 'no-store' } });
  }
};
