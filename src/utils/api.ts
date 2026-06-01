import { retrieve, formatContext } from '../data/knowledge';

const API_BASE = '/api';

export async function sendChatMessage(
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  // GROUNDING — stejná logika jako core.py send_message
  const docs = retrieve(message);
  const ctx = formatContext(docs);

  let augmentedMessage: string;
  if (ctx) {
    augmentedMessage = `${ctx}\n\n=== DOTAZ UŽIVATELE ===\n${message}`;
  } else {
    augmentedMessage =
      `(K tomuto dotazu nemáme v ověřené databázi materiál — u faktických tvrzení buď opatrný a případně odkaž na lekci, kalkulačku nebo poradce.)\n\n=== DOTAZ UŽIVATELE ===\n${message}`;
  }

  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // history obsahuje PŮVODNÍ (neaugmentované) zprávy; augmentujeme jen aktuální message
    body: JSON.stringify({ message: augmentedMessage, history }),
  });
  if (!response.ok) throw new Error(`Chat error: ${response.status}`);
  const data = await response.json();
  return data.response;
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
