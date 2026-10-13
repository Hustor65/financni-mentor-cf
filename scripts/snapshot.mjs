// Uloží offline snímek tržních dat do public/snapshot (záloha pro prezentaci bez Wi‑Fi).
// Spuštění: běžící `npx wrangler pages dev dist --port 8788` → `node scripts/snapshot.mjs`
// (nebo proti produkci: `node scripts/snapshot.mjs https://financni-mentor-cf.pages.dev`)
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:8788';
const src = await readFile(new URL('../src/utils/market.ts', import.meta.url), 'utf8');
const tickers = [...src.matchAll(/ticker: '([^']+)'/g)].map(m => m[1]);
const ranges = ['1y', '2y', '5y', 'max'];
const out = new URL('../public/snapshot/', import.meta.url);
await mkdir(out, { recursive: true });

const round = v => Math.round(v * 1000) / 1000;
for (const t of tickers) {
  for (const r of ranges) {
    const resp = await fetch(`${base}/api/market?type=series&ticker=${encodeURIComponent(t)}&period=${r}`);
    if (!resp.ok) { console.warn('skip', t, r, resp.status); continue; }
    const data = await resp.json();
    data.points = data.points.map(([ts, o, h, l, c, v]) => [ts, round(o), round(h), round(l), round(c), v]);
    await writeFile(new URL(`${t.replace(/[^A-Za-z0-9]/g, '_')}_${r}.json`, out), JSON.stringify(data));
    console.log('ok', t, r, data.points.length);
  }
}
const q = await fetch(`${base}/api/market?type=quotes&symbols=${encodeURIComponent(tickers.join(','))}`);
if (q.ok) await writeFile(new URL('quotes.json', out), JSON.stringify(await q.json()));
