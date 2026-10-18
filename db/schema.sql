-- Účty návštěvníků (D1). Použití:
--   lokálně:    npx wrangler d1 execute financni-mentor --local  --file db/schema.sql
--   produkce:   npx wrangler d1 execute financni-mentor --remote --file db/schema.sql
-- Neukládáme e-mail ani nic osobního: jen přezdívku, otisk hesla a postup na webu.
-- Existující databázi doplň migracemi z db/migrations/ (001 žebříček, 002 historie chatu).

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,   -- přezdívka malými písmeny (jedinečnost bez ohledu na velikost)
  pass_hash  TEXT NOT NULL,          -- PBKDF2-SHA256, hex
  pass_salt  TEXT NOT NULL,          -- hex
  data       TEXT NOT NULL DEFAULT '{}',  -- JSON: úroveň, hotová témata, portfolio na zkoušku, skóre
  points     INTEGER NOT NULL DEFAULT 0,  -- součet bodů za hry (počítá server při ukládání), pro žebříček
  pf_pct     REAL,                        -- výkon portfolia na zkoušku v % (hlásí web), pro žebříček
  board      INTEGER NOT NULL DEFAULT 1,  -- 0 = nechce být v žebříčku
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS users_points ON users(points DESC);

CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,           -- začátek první otázky
  messages   TEXT NOT NULL,           -- JSON: [{role, content}]
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS chats_user ON chats(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,       -- SHA-256 tokenu z cookie; samotný token v DB není
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- počítadlo pokusů (přihlášení, registrace) proti hádání hesel
CREATE TABLE IF NOT EXISTS attempts (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
