-- Účty návštěvníků (D1). Použití:
--   lokálně:    npx wrangler d1 execute financni-mentor --local  --file db/schema.sql
--   produkce:   npx wrangler d1 execute financni-mentor --remote --file db/schema.sql
-- Neukládáme e-mail ani nic osobního: jen přezdívku, otisk hesla a postup na webu.

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  name_key   TEXT NOT NULL UNIQUE,   -- přezdívka malými písmeny (jedinečnost bez ohledu na velikost)
  pass_hash  TEXT NOT NULL,          -- PBKDF2-SHA256, hex
  pass_salt  TEXT NOT NULL,          -- hex
  data       TEXT NOT NULL DEFAULT '{}',  -- JSON: úroveň, hotová témata, portfolio na zkoušku, skóre
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

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
