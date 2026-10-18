-- Historie konverzací s mentorem: každý přihlášený účet má vlastní uložené konverzace.
-- Spustit JEDNOU na existující databázi (nová z db/schema.sql už tabulku má):
--   lokálně:    npx wrangler d1 execute financni-mentor --local  --file db/migrations/002-historie-chatu.sql
--   produkce:   npx wrangler d1 execute financni-mentor --remote --file db/migrations/002-historie-chatu.sql
CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,           -- začátek první otázky
  messages   TEXT NOT NULL,           -- JSON: [{role, content}]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, updated_at DESC);
