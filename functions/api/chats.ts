/**
 * Cloudflare Pages Function — historie konverzací s mentorem (jen pro přihlášené).
 *
 *   GET    /api/chats           → seznam konverzací účtu (nejnovější první, bez zpráv)
 *   GET    /api/chats?id=…      → jedna konverzace se zprávami
 *   PUT    /api/chats           {id, messages} → uloží (vytvoří nebo přepíše) konverzaci
 *   DELETE /api/chats?id=…      → smaže jednu konverzaci
 *   DELETE /api/chats?all=1     → smaže všechny konverzace účtu
 *
 * Konverzace patří k účtu; cizí id se nikdy nevrátí ani nepřepíše (vždy se filtruje podle user_id).
 * Vstup se hlídá: počet zpráv, jejich délka a celková velikost, jen role user/assistant.
 */

import { sessionUserId } from '../../src/server/session';

interface Env { DB?: D1Database }

const MAX_CHATS = 30;          // starší konverzace nad tenhle počet se smažou
const MAX_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 8000;
const MAX_BYTES = 150_000;
const ID_RE = /^[a-f0-9]{32}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const fail = (status: number, error: string) => json({ error }, status);

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

interface Msg { role: 'user' | 'assistant'; content: string }

/** Z čehokoli udělá platné zprávy, nebo null (když nic použitelného nezbylo). */
function cleanMessages(raw: unknown): Msg[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Msg[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== 'object') continue;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) continue;
    out.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }
  return out.some(m => m.role === 'user') ? out : null;
}

const titleOf = (messages: Msg[]) =>
  (messages.find(m => m.role === 'user')?.content ?? 'Konverzace').replace(/\s+/g, ' ').trim().slice(0, 60);

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const db = env.DB;
  if (!db) return fail(503, 'Historie teď není dostupná.');
  if (request.method !== 'GET' && !sameOrigin(request)) return fail(403, 'Neplatný původ požadavku.');

  try {
    const userId = await sessionUserId(db, request);
    if (!userId) return fail(401, 'Nejsi přihlášený.');
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const id = url.searchParams.get('id');
      if (id) {
        if (!ID_RE.test(id)) return fail(400, 'Neplatné id.');
        const row = await db.prepare('SELECT id, title, messages, updated_at FROM chats WHERE id = ? AND user_id = ?')
          .bind(id, userId).first<{ id: string; title: string; messages: string; updated_at: number }>();
        if (!row) return fail(404, 'Konverzace nenalezena.');
        let messages: unknown = [];
        try { messages = JSON.parse(row.messages); } catch { /* poškozený záznam → prázdná */ }
        return json({ id: row.id, title: row.title, updatedAt: row.updated_at, messages });
      }
      const { results } = await db.prepare('SELECT id, title, updated_at FROM chats WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
        .bind(userId, MAX_CHATS).all<{ id: string; title: string; updated_at: number }>();
      return json({ chats: results.map(r => ({ id: r.id, title: r.title, updatedAt: r.updated_at })) });
    }

    if (request.method === 'DELETE') {
      if (url.searchParams.get('all') === '1') {
        await db.prepare('DELETE FROM chats WHERE user_id = ?').bind(userId).run();
        return json({ ok: true });
      }
      const id = url.searchParams.get('id') ?? '';
      if (!ID_RE.test(id)) return fail(400, 'Neplatné id.');
      await db.prepare('DELETE FROM chats WHERE id = ? AND user_id = ?').bind(id, userId).run();
      return json({ ok: true });
    }

    if (request.method === 'PUT') {
      let body: { id?: unknown; messages?: unknown };
      try { body = await request.json() as typeof body; } catch { return fail(400, 'Neplatný požadavek.'); }
      const id = typeof body.id === 'string' ? body.id : '';
      if (!ID_RE.test(id)) return fail(400, 'Neplatné id.');
      const messages = cleanMessages(body.messages);
      if (!messages) return fail(400, 'Není co uložit.');
      const text = JSON.stringify(messages);
      if (text.length > MAX_BYTES) return fail(413, 'Konverzace je příliš dlouhá.');
      const now = Date.now();
      // cizí id nepřepíšeme: ON CONFLICT jen u vlastního záznamu (podmínka WHERE user_id)
      const res = await db.prepare(
        `INSERT INTO chats (id, user_id, title, messages, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
         ON CONFLICT(id) DO UPDATE SET messages = ?4, title = ?3, updated_at = ?5 WHERE chats.user_id = ?2`,
      ).bind(id, userId, titleOf(messages), text, now).run();
      if (!res.meta.changes) return fail(403, 'Tuhle konverzaci nemůžeš přepsat.');
      // drž nejvýš MAX_CHATS konverzací na účet — nejstarší se smažou
      await db.prepare(
        `DELETE FROM chats WHERE user_id = ?1 AND id NOT IN (SELECT id FROM chats WHERE user_id = ?1 ORDER BY updated_at DESC LIMIT ?2)`,
      ).bind(userId, MAX_CHATS).run();
      return json({ ok: true, updatedAt: now });
    }

    return fail(405, 'Nepodporovaná metoda.');
  } catch (err) {
    console.error('chats error', err);
    return fail(500, 'Něco se pokazilo. Zkus to prosím znovu.');
  }
};
