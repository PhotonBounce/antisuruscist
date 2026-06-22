# STARTUP — Agent Boot Document

> **READ THIS FIRST after every blackout, context loss, or new session.**
> This is the single source of truth for how to operate this project.

---

## 1. Project Identity

- **Name:** Anti-Ruscist — Zombie Shooter with Blockchain Economy
- **Repo:** `lindapot-art/antiruscist` on GitHub
- **Branch:** `main` (only branch)
- **Stack:** jQuery + vanilla JS + CSS + HTML (NO framework)
- **Blockchain:** Polygon (POL), MetaMask, 90/10 collector/Ukraine split

---

## 2. How to Start Servers

### Game (static files) — Port 8080
```bash
cd /workspaces/antiruscist
npx http-server -p 8080 &
```

### API Backend (admin panel) — Port 3001
```bash
cd /workspaces/antiruscist/server
node index.js &
```

### Make Ports Public (MANDATORY for external access)
```bash
gh codespace ports visibility 8080:public -c "$CODESPACE_NAME"
gh codespace ports visibility 3001:public -c "$CODESPACE_NAME"
```

### Staging URLs
```
Game:  https://${CODESPACE_NAME}-8080.app.github.dev/
Admin: https://${CODESPACE_NAME}-8080.app.github.dev/admin.html
API:   https://${CODESPACE_NAME}-3001.app.github.dev/api/health
```

> **CRITICAL:** If ports are not set to `public`, external visitors see NOTHING.
> This was the root cause of the "game not working" incident on 2026-03-22.

---

## 3. File Map

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~666 | Desktop game HTML |
| `scripts/main.js` | ~14,338 | **HUGE** — ALL game logic. NEVER read fully. Use line ranges. |
| `styles/main.css` | ~10,500 | All game CSS. NEVER read fully. |
| `scripts/jukebox.js` | ~350 | Music player |
| `scripts/engine-extras.js` | ~2,000 | Engine extensions, collision, particles |
| `scripts/adaptive-ai.js` | ~300 | Adaptive difficulty system |
| `scripts/api-client.js` | ~300 | API client for backend |
| `mobile/index.html` | | Mobile game HTML |
| `mobile/scripts/mobile.js` | ~1,243 | Mobile-specific logic |
| `admin.html` | ~1,707 | Admin panel (needs port 3001 backend) |
| `server/index.js` | ~1,921 | Express API (JWT, bcrypt, SQLite) |
| `server/db.js` | ~1,000 | Database schema and init |
| `sw.js` | | Service worker (cache-first PWA) |
| `manifest.json` | | PWA manifest |
| `.github/copilot-instructions.md` | | **READ THIS** — Agent rules, QA protocol, standing orders |
| `.github/CONTROL-RULES.md` | | ML agent coordination protocol |

### Memory Files (READ ON BOOT)
- `/memories/repo/main-js-map.md` — Line numbers for key functions in main.js
- `/memories/repo/project-conventions.md` — Architecture, edit rules, backlog
- `/memories/standing-orders.md` — User preferences and standing rules

---

## 4. Guardian System

Before AND after EVERY edit, run:
```bash
bash scripts/guardian-snapshot.sh
```

**Baseline counts (as of B127):**
| Metric | Count |
|--------|-------|
| NAV_BUTTONS | 36 |
| SECTIONS | 33 |
| HANDLERS | 61 |
| JS_DECLARATIONS | 645 |
| CSS_LINES | ~10,500 |
| HTML_LINES | 666 |
| JS_LINES | 14,338 |
| SCRIPT_TAGS | 6 |

**If ANY count DROPS after an edit → REVERT IMMEDIATELY.**

---

## 5. Mandatory QA Protocol (NEVER SKIP)

> **Single source of truth:** `.github/copilot-instructions.md` → FAILSAFE QA PROTOCOL (Phases 1–4).
> Ms. BS Cutter (P-2) enforces. No exceptions. No shortcuts.
>
> Quick reference: guardian snapshot → node --check → curl external URL → headless-qa.js → report.

---

## 6. Edit Rules (NON-NEGOTIABLE)

1. **NEVER use Python/sed/awk to edit source files** — only `replace_string_in_file` or `multi_replace`. (Incident d8de361: blind regex deleted 22 nav buttons.)
2. **NEVER read main.js fully** — use `/memories/repo/main-js-map.md` for line ranges
3. **Batch 2+ edits** into `multi_replace` (saves premium credits)
4. **One QA pass per batch**, not per individual change
5. **Commit after every batch** — never leave large changes uncommitted
6. **Ukraine 10% split is IMMUTABLE** — no agent may reduce or remove it
7. **Free-to-play path must always exist** — monetization = cosmetic/convenience only

---

## 7. Service Worker Cache

Current: `arc-v5.24-batch127`

Pattern: `arc-v5.XX-batchNNN`

After editing ANY file that the SW caches (HTML, CSS, JS), bump the version:
```bash
# In sw.js, change:
var CACHE_NAME = 'arc-v5.24-batch127';
# To:
var CACHE_NAME = 'arc-v5.25-batch128';
```

---

## 8. Git Workflow

```bash
# Check state
git status --short
git log --oneline -5

# Stage and commit (use batch naming)
git add <files>
git commit -m "B128: <description>"

# Push (ONLY with user approval)
git push origin main
```

**Commit naming:** `BNNN: <short description>` (e.g., `B128: fix port visibility`)

---

## 9. Agent Hierarchy

| Priority | Agent | Role |
|----------|-------|------|
| P-1 | `guardian` | Code integrity watchdog. Runs on EVERY edit. |
| P0 | `autopilot` | Supreme orchestrator. Manages all agents. |
| P0 | `resource-manager` | Budget gatekeeper. Premium credit discipline. |
| P0 | `triage` | Interrupt handler. Queues new requests. |
| P1 | `tokenomics-manager` | ARC token economy health. |
| P1 | `money-hungry` | Revenue maximization. |

---

## 10. Current State (update after each session)

- **Last Batch:** B127 (committed, pushed)
- **Git HEAD:** 5ae338e
- **SW Cache:** arc-v5.24-batch127
- **Known Issues:** See `/memories/repo/project-conventions.md` → Known Issues section
- **Backlog:** NFT rebuild, new weapons, options menu, i18n extension, inventory polish

---

## 11. Quick Diagnosis Commands

```bash
# Is the game server running?
lsof -i :8080

# Is the API server running?
lsof -i :3001

# Are ports public?
gh codespace ports -c "$CODESPACE_NAME"

# JS syntax OK?
node --check scripts/main.js

# Guardian counts
bash scripts/guardian-snapshot.sh

# What changed since last commit?
git diff --stat HEAD

# External game loads?
curl -s -o /dev/null -w "%{http_code}\n" "https://${CODESPACE_NAME}-8080.app.github.dev/"

# External API health?
curl -s -o /dev/null -w "%{http_code}\n" "https://${CODESPACE_NAME}-3001.app.github.dev/api/health"
```

---

## 12. Incident History (learn from these)

| Date | Incident | Root Cause | Fix |
|------|----------|-----------|-----|
| 2026-03-14 | 22 nav buttons deleted | Python regex script (`_i18n_patch.py`) | Ban external scripts for edits |
| 2026-03-14 | False QA passes | Trusted diffs, not rendered output | Mandatory proxy QA protocol |
| 2026-03-22 | "Game not working at all" | Port 8080 was private | Always set ports public, test external URL |

---

**END OF STARTUP DOCUMENT — If you read this, you're oriented. Now check the todo list and get to work.**
