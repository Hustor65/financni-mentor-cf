-- Žebříček na stánku: body a výkon portfolia vedle účtu, ať se top 10 dá vybrat jedním dotazem.
-- Spustit JEDNOU na existující databázi (nová z db/schema.sql už sloupce má):
--   lokálně:    npx wrangler d1 execute financni-mentor --local  --file db/migrations/001-zebricek.sql
--   produkce:   npx wrangler d1 execute financni-mentor --remote --file db/migrations/001-zebricek.sql
ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN pf_pct REAL;
ALTER TABLE users ADD COLUMN board INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS users_points ON users(points DESC);
