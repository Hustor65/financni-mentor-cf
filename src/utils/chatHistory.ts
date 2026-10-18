/**
 * Historie konverzací s mentorem (/api/chats). Funguje jen pro přihlášené: konverzace
 * patří k účtu, takže je návštěvník najde i na jiném zařízení. Bez účtu se nic neukládá.
 */

export interface ChatSummary { id: string; title: string; updatedAt: number }
export interface StoredMessage { role: 'user' | 'assistant'; content: string }

export const newChatId = (): string =>
  [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(url, {
    credentials: 'same-origin',
    signal: AbortSignal.timeout(12_000),
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!(resp.headers.get('content-type') ?? '').includes('json')) throw new Error('Historie teď není dostupná.');
  const reply = await resp.json() as T & { error?: string };
  if (!resp.ok) throw new Error(reply.error ?? 'Něco se pokazilo.');
  return reply;
}

export const listChats = () => call<{ chats: ChatSummary[] }>('/api/chats').then(r => r.chats);

export const loadChat = (id: string) =>
  call<{ id: string; messages: StoredMessage[] }>(`/api/chats?id=${encodeURIComponent(id)}`).then(r => r.messages);

export const saveChat = (id: string, messages: StoredMessage[]) =>
  call<{ ok: boolean }>('/api/chats', { method: 'PUT', body: JSON.stringify({ id, messages }) });

export const deleteChat = (id: string) =>
  call<{ ok: boolean }>(`/api/chats?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
