import { retrieve, formatContext } from '../data/knowledge';

const API_BASE = '/api';

export async function streamChatMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
  onChunk: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  // GROUNDING — stejná logika jako core.py send_message
  const docs = retrieve(message);
  const ctx = formatContext(docs);

  const augmentedMessage = ctx
    ? `${ctx}\n\n=== DOTAZ UŽIVATELE ===\n${message}`
    : `(K tomuto dotazu nemáme v ověřené databázi materiál — u faktických tvrzení buď opatrný a případně odkaž na lekci, kalkulačku nebo poradce.)\n\n=== DOTAZ UŽIVATELE ===\n${message}`;

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // history obsahuje PŮVODNÍ (neaugmentované) zprávy; augmentujeme jen aktuální message
    body: JSON.stringify({ message: augmentedMessage, history }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`Chat error: ${response.status}`);

  // čti text/plain stream a předávej průběžně narůstající text
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }
  full += decoder.decode(); // dokonči případný vícebajtový znak
  onChunk(full);
  return full;
}

export async function getMarketData(
  type: 'stock' | 'crypto' | 'summary' | 'history',
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const searchParams = new URLSearchParams({ type, ...params });
  const response = await fetch(`${API_BASE}/market?${searchParams}`);
  if (!response.ok) throw new Error(`Market data error: ${response.status}`);
  return response.json();
}
