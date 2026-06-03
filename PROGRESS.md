# Nachytej AI — Progress & TODO (handoff)

> Stav k **2026-06-03**. Tenhle soubor je předávka pro další session (i s čistým kontextem).
> Plný report z 93-agentní analýzy: **`.claude/ui-overhaul-report.md`** (445 kB — design brief, 163 redesign návrhů, 223 copy, 126 bugů).

---

## ⚙️ Rychlá fakta o projektu
- **Co to je:** `financni-mentor-cf` / „Nachytej AI" — tmavá fintech-vzdělávací webovka (React 19 + Vite + TS). AI finanční mentor (chat), Akademie (témata/slovníček/kvíz), 4 kalkulačky, Trust centrum.
- **Backend:** Cloudflare Pages Function `functions/api/chat.ts` → **Gemini** (`gemini-2.5-flash` + fallback `-flash-lite`), streaming + function-calling nad Yahoo Finance. Klíč `GEMINI_API_KEY` (v `.dev.vars` lokálně / CF secret).
- **Živě:** https://financni-mentor-cf.pages.dev
- **Záloha:** privátní GitHub `Hustor65/financni-mentor-cf` (`git push origin main`). gh CLI v `~/.local/bin`.
- **Deploy na web:** `npm run build && npx wrangler pages deploy --project-name financni-mentor-cf --branch main` (wrangler je přihlášený, token má pages:write). **Push ≠ deploy** — push je jen záloha do gitu.
- **Lokální náhled:** `.claude/launch.json` má profil „wrangler" (preview_start), nebo `npx wrangler pages dev dist --port 8788`. Vite samo (`npm run dev`) NEservíruje `/api/chat`.
- **⚠️ Commit gotcha:** používat `git commit -m "..." -m "..."` (víc `-m`). NEpoužívat heredoc s `&& \` — slil mi to zprávu 2× (commity 775d258, cc17eb9 mají ošklivý subject; kód je OK, neopravoval jsem — force-push by chtěl tvoje svolení).
- **Build/lint vždy musí projít:** `npm run build` (tsc -b + vite) + `npm run lint` (eslint). tsconfig je přísný (`noUnusedLocals`, `verbatimModuleSyntax`, `react-jsx`). `Icon` komponenta obarvuje přes inline `currentColor` → barvení ikon přes CSS třídu nefunguje, dědí se z rodiče nebo se předá `color` prop.

---

## ✅ HOTOVO (vše nasazené na produkci + pushnuté)
1. **AI vizualizace v chatu** — mentor umí v odpovědi poslat ` ```echarts ` (→ `ChatChart.tsx`, ECharts) nebo ` ```mermaid ` (→ `ChatMermaid.tsx`, flowchart). Lazy chunky, debounce renderu, fallback na zdroj. Pravidlo **#11** v systémovém promptu (`chat.ts`) řídí výběr a značení ilustrací.
2. **Composer redesign** — zaoblená „kapsle" à la Claude Code (jemný neutrální okraj, textarea + akce uvnitř). `ChatPanel.tsx` + `.chat-composer__field` v `index.css`.
3. **Footer redesign** — Stripe-grade grid, `Icon` místo inline SVG, zjemněný amber disclaimer, trust-chip. `Footer.tsx`.
4. **14 high-severity bugů** (commit **cc17eb9**): duplicitní user zpráva; AbortController (memory leak); ChatChart fallback; fullscreen dialog se zavíral předčasně; chat.ts fallback model + hláška u prázdné/blokované odpovědi a selhání po tool-callu; aria-live; DIP marginální matematika (`calculators.ts czDipDeduction`); PensionCalc disclaimer; Quiz reset (`key={topicId}`); MutationObserver rAF (`useScrollReveal`); Glossary viditelnost; `retrieve` minScore pro jednoslovné dotazy.
5. **Chat akce nad zprávou** (Kopírovat/Jednodušeji/Znovu na hover) + **navazující chipy** po odpovědi (commit **b07884b**). `ChatMessage.tsx` + `ChatPanel.tsx` + `ChatInterface.tsx`.
6. **Graf jako výuka — všechny 4 kalkulačky** (commity **836db93**, **a7534f2**): CompoundInterestCalc = delta-strip (výnos navíc + násobek, tabular-nums); GoalCalc = nový růstový graf s markLine na cíli; PensionCalc = markPointy nominálně-vs-reálně (inflační mezera); TaxCalc = cap-meter DIP/sdílený strop 48k.
7. **Command palette (Cmd/Ctrl+K)** (commit **1e207f0**): `src/components/CommandPalette.tsx` — fuzzy hledání (bez diakritiky) přes taby/témata/slovníček + akce, klávesová navigace, top-layer `<dialog>`. Badge „Hledat ⌘K" v `Navigation.tsx` (skrytý na mobilu). **Výběr z palety, když jsi nahoře na hero, navíc plynule sjede dolů na obsah** (`scrollToContentIfAtHero` v `App.tsx` → `scrollIntoView` na obal navigace, `scroll-margin-top: --space-xl`); když už jsi níž v obsahu, nechá tě být (strážka `scrollY < innerHeight*0.9`).
8. **Hash routing** (`App.tsx`) — `#temata` / `#temata/<topicId>` / `#presnost`, výchozí „mentor" = čistá URL (a `#mentor`/divné/neplatné hashe se na startu normalizují přes `replaceState`). Funkční **Back/Forward** (stav→hash přes `pushState`, hash→stav přes `popstate`+`hashchange`, žádná smyčka ani anchor-jump). **Sdílitelné odkazy** na sekci/téma; deep-link na startu sjede rovnou na obsah (ne na hero). `parseHash()` validuje `topicId` proti `TOPICS`. Ověřeno v prohlížeči (klik taby, ruční hash, Back/Forward, deep-link load, paleta→téma).
9. **Skeleton loadery** (`src/components/ChartSkeleton.tsx` + `.chart-skeleton*` v `index.css`) — pulzující obrys grafu (7 sloupců animovaných mezi `--surface-1`/`--surface-2`, kontejner `--surface-0` kvůli kontrastu, `prefers-reduced-motion` respektováno, `.sr-only` popis pro čtečky). Nahradil všech 6 textových „Načítám/Připravuji graf…" fallbacků: 4 kalkulačky (`CompoundInterestCalc`/`GoalCalc`/`PensionCalc`/`TopicTools`) + `ChatChart` (2×, jeden `bare` uvnitř WRAP) + `ChatMermaid`. Ověřeno v prohlížeči (vzhled přes reálné CSS + grafy renderují bez regrese).

---

## 📋 ZBÝVÁ (priorita shora)

### P0 redesign (z reportu — velké kusy HOTOVO ✅)
- [x] ~~**Skeletony + glass→solid**~~ — HOTOVO. Skeletony viz HOTOVO #9. **Glass→solid už byla dřív hotová** (pozn. v reportu/PROGRESS byla zastaralá): `.glass-panel*`, `kpi-card`, summary tiles kalkulaček i info-rail chatu jsou už solidní (`var(--surface-*)`, strukturální okraje, žádný backdrop-filter). `backdrop-filter` zbývá JEN na zamýšlených overlay/app površích: `.hero-eyebrow`, hero CTA, `.chat-panel`, `.cmdk::backdrop`.
- [x] ~~**Hash routing**~~ — HOTOVO (viz HOTOVO #8).
- [ ] (Volitelně projít zbytek `redesign.byPriority.P0` v reportu — celkem 55 P0; hotové: chat akce, graf-jako-výuka, Cmd+K, hash routing, skeletony, glass→solid.)

### Bugy (z reportu — `.claude/ui-overhaul-report.md`)
- [ ] **39 medium** + **73 low** bugů. Každý PŘED opravou ověřit v kódu (agenti mohou mít false-positives). Matematiku kalkulaček měnit jen po pečlivém ověření.

### Copy
- [ ] **223 copy vylepšení** (české texty po sekcích) — v reportu.

### Volitelné / budoucí
- [ ] **OpenAI API** (škola financuje klíč) — přidat/přepnout vedle Gemini v `functions/api/chat.ts` (vizualizační vrstva je provider-agnostic, jede beze změny). Učitelovy „custom GPT" odkazy NEJDOU volat přes API — replikovat zkopírováním jejich Instructions do promptu. Detail v paměti `openai-migration-plan.md`.
- [ ] **B2 — grafy z reálných dat:** rozšířit `get_historical_performance` (chat.ts) o downsamplovanou sérii, ať mentor kreslí živý vývoj (ne jen ilustrace).
- [ ] Drobnost: 2 commity (775d258, cc17eb9) mají slitou commit zprávu — kosmetika, oprava by chtěla force-push (svolení uživatele).

---

## 🗂️ Kde co je
- Plný report (vše): `.claude/ui-overhaul-report.md`
- Paměť (auto-load): `openai-migration-plan.md`, `ui-overhaul-report.md`, `cloudflare-deploy-backup.md`
- Klíčové soubory chatu: `src/components/chat/*` + `functions/api/chat.ts` + `src/utils/api.ts`
- Kalkulačky: `src/components/calculators/*` + `src/utils/calculators.ts`
- Design systém: `src/styles/index.css` (tokeny `--surface-*`, `--lg-cyan-*`, `--border-*`, `--space-*`)

**Pracovní postup, který sedí:** ověřit kód → udělat změnu → `npm run build` + `npm run lint` → preview (wrangler + preview_start) + screenshot → commit (`-m` flagy) + push + deploy → ověřit živě.
