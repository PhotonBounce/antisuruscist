# Anti-Ruscist — Modernization Plan

> Status doc for the revamp/cleanup/upgrade effort. Branch: `claude/stoic-davinci-o63qlb`.
> Proof of every test/change is captured in [`screencaptures/`](./screencaptures/).

## Context

`Anti-Ruscist` is a jQuery + vanilla-JS browser zombie-shooter (no framework, no build step)
with an optional Express/SQLite backend and a **live** Polygon mainnet economy (ARC ERC-20 +
Kill/Defender NFTs). It shipped through many ad-hoc AI-agent sessions and has accumulated:
a 15,164-line single-IIFE `main.js`, an 11,111-line hand-edited `main.css`, ~76KB of dead
"AI-coding-agent" scripts loaded into every player's browser, no minification in production,
a 143MB `sounds/` tree, stale Codespaces paths, three conflicting deploy paths, an
ephemeral backend DB that wipes on redeploy, and several auth/security gaps.

### Decisions (locked with the owner)
- **Hosting:** keep **cPanel** shared hosting at `photon-bounce.com/ar/` (PWA scope stays `/ar/`). No GitHub Pages.
- **Backend:** keep + **harden** (fix DB persistence, JWT, admin auth, CORS, rate limits). Live contracts untouched.
- **Scope:** **full modernization** — real build tool, incremental ES modules, CI/CD, automated tests.
- **Priorities (all):** performance, maintainability, security, low cost/simplicity.

### Hard invariants — never change
- Contract addresses: ARC `0xD7D4F2DE20a11B344A44519583b177F26A6AEe76`, KillNFT `0xe78485271787d712179CCaA4a3A67f07C2Ed7800`, DefendersNFT `0x8FF4468c28fD4A1ad4EfbD82dD7F1c9eb8C1bACc`.
- The immutable **10% Ukraine donation split** + wallet `0x165CD37b4C644C2921454429E7F9358d18A45e14`.
- The ECDSA oracle claim flow. The `window.ARC_GAME` bridge consumed by `engine-extras.js`.
- A free-to-play path must always exist.

### Behavior-preservation gate (every phase)
`node --check` all JS → `scripts/guardian-snapshot.sh` diff (no count drops) → `headless-qa.js`
green → Playwright/manual smoke of: load → pick language → start → shoot → wave clear → inventory → earn ARC.
Expected/intended count drops (e.g. removing dead `<script>` tags, moving declarations out of `main.js`)
get an explicit baseline reset in that PR.

---

## Phases

### Phase 0 — Safety net & repo hygiene *(no behavior change)* — DONE ✅ (PR #1)
- [x] Make `scripts/guardian-snapshot.sh` path-portable (was hardcoded `/workspaces/antiruscist`).
- [x] Baseline proofs captured (`screencaptures/00-guardian-baseline.txt`, `01-baseline-*.png`, `03-headless-qa-baseline.txt`).
- [x] Delete `.github/workflows/deploy-pages.yml` (conflicts with cPanel-only; leaks `server/`+`contracts/`).
- [x] Delete `.github/workflows/codespace-watchdog.yml` (dead Codespaces keep-alive; wastes scheduled Actions minutes).
- [x] Track `package-lock.json` (un-ignore) so CI `npm ci` is reproducible.
- [x] Add `.github/workflows/ci.yml` PR gate: `node --check` + guardian diff (fail if counts drop). CI green.

### Phase 1 — Backend persistence + hardening *(highest severity, isolated)* — hardening DONE ✅; DB backend pending decision
> Security hardening shipped + proven (`screencaptures/08`): JWT-required-in-prod, admin JWT-only
> (anon_id fallback removed), `/api/setup` rate-limited, CORS fail-closed in prod, password min 6→10,
> explicit HSTS, `DB_PATH` env-overridable. **Remaining:** choose persistence backend (Turso libSQL free
> vs Render persistent disk paid) + telemetry-table pruning. Live contracts untouched.
- DB persistence: migrate `server/db.js` (`DB_PATH` hardcode, line ~10) to **Turso/libSQL** (SQLite-compatible,
  free tier survives redeploy, near-zero query rewrites). Keep `file:` driver for local dev.
- Security, ordered: JWT_SECRET required in prod (no random fallback); remove admin `anon_id` fallback (JWT-only);
  rate-limit `/api/setup`; CORS fail-closed in prod; password min ≥10; add HSTS; prune telemetry tables.
- Verify: backend test suite (auth lifecycle, rate limits, arc/staking math), redeploy persistence drill,
  game still 100% playable with backend OFF.

### Phase 2 — Build tool in legacy/IIFE mode *(zero source rewrite)*
- Adopt **Vite** (`base: '/ar/'`). Milestone 2.1: scripts stay classic, load-order-preserved, just hashed+minified;
  HTML refs rewritten; `?v=172` removed; large binaries symlinked (mirror `scripts/build.sh` trick).
- Equivalence gate: built `/dist` passes `headless-qa.js` identically; ~70% text size reduction.

### Phase 3 — PWA cache-busting from build manifest *(keep scope `/ar/`)*
- Generate `sw.js` precache from Vite manifest; `CACHE_NAME = arc-<buildhash>` (no manual `batchNNN` bumps).
- Tune `.htaccess`: hashed JS/CSS/images `immutable, 1y`; HTML/sw/manifest `no-cache`.

### Phase 4 — Dead-code & asset cleanup *(quick wins)* — Phase 4a (dead scripts) DONE ✅ — every delete preceded by a reference grep
- Remove 3 truly-dead scripts: `agent-memory.js`, `ml-brain.js`, `agent-manager.js` (0 game refs).
  **Keep `adaptive-ai.js`** (8 guarded uses, drives difficulty) — move it modular later. Update `headless-qa.js`/`mobile-qa.js` assertions.
- Delete `images/src` (9.1M, 0 refs), `styles/zombies/zombie-1.png` (dup), stale SCSS (`styles/main.scss`, `styles/modules|ui|zombies/*.scss`).
- Audio: transcode 33MB `track09` + 9–10MB MP3s to ~128kbps; delete Cyrillic-named duplicate originals; lazy-load music.

### Phase 5 — Automated tests *(net before the big refactor)*
- Vitest+jsdom unit tests for pure logic (economy/weapon math, **10% split lock**, i18n, ARC ledger).
- Backend tests (libsql `:memory:`). Playwright e2e happy-path. Promote `headless-qa.js` into CI gate.

### Phase 6 — Incremental ES-module extraction of `main.js` *(largest, last)*
- Introduce `scripts/modules/state.js` (single mutable namespace `S`); rewrite free vars → `S.*` mechanically.
- Extraction order (least-coupled first): `i18n` (dedupe with mobile) → `audio` → `config` → `economy` →
  `inventory-ui` → `waves/spawn` → `minigames` → `blockchain` (addresses verbatim) → `core`.
- One module per PR; full gate each time; extend guardian to glob `scripts/modules/*.js` + `main.js`.

### Phase 7 — CI/CD with deploy
- `ci.yml` (PR+main): install → `node --check` → guardian diff → `vitest` → `vite build` → serve `/dist` → `headless-qa` + Playwright smoke.
- `deploy.yml` (main, gated): build → deploy frontend to cPanel `public_html/ar` via `lftp`/`rsync` (Secrets);
  trigger Render backend deploy hook; post-deploy curl smoke (`/ar/` 200, Render `/api/health`).
- Heavy `sounds/`+`images/` synced only on change.

---

## Sequencing rationale
Risk front-loaded: data-loss (backend DB) and the conflicting Pages deploy first; the big mechanical
`main.js` split only after the build harness + tests exist to catch regressions. Each phase is
independently shippable and revertable (one PR per phase / sub-step).

---

## Progress Log (PR #1 — `claude/stoic-davinci-o63qlb`)

**Modernization**
- ✅ Phase 0 — CI gate (guardian regression + `node --check` + backend tests), removed conflicting Pages/Codespaces workflows, portable scripts, lockfiles.
- ✅ Phase 1 — backend hardened (prod-required JWT, JWT-only admin, CORS fail-closed, `/api/setup` rate-limit, password 6→10, HSTS, env `DB_PATH`) + telemetry pruning + 9-test `node:test` suite.
- ✅ Phase 4a/4b — removed ~65KB dead agent JS + ~81MB unused art/SCSS/duplicate audio.
- 🅿️ Phase 2 (Vite build) — **verified & parked** on branch `claude/phase2-vite`; land together with Phase 7 deploy (avoids cache-bust regression on raw deploy).
- ⏳ Phase 3 (PWA hashing), Phase 5 (e2e — in progress), Phase 6 (main.js→modules), Phase 7 (CI/CD deploy — **needs cPanel FTP creds + Render deploy hook**).

**Beast-game (screenshot-driven backlog)**
- ✅ Mobile i18n rotate-prompt bug fixed; mobile rotate screen redesigned (`screencaptures/23`).
- ✅ Floating damage numbers + hit-stop (`22`); zombie kill-flash.
- ✅ Wave background cross-fade (`25/26`).
- ✅ Wave-clear cinematic stat card (`27`).
- ✅ Enemy elite callouts — Brute/Tank/Titan badges + spawn callout (`28`).
- ⏳ Ammo-HUD pip-bars (#10, in progress); global leaderboard (#4); onboarding (#7, product-sensitive — flagged for owner).

All screenshot proofs in [`screencaptures/`](./screencaptures/). CI green throughout.
