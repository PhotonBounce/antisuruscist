# Copilot Instructions — Anti-Ruscist Game Project

> **⚠️ BOOT FILE: On new session/blackout, READ `/workspaces/antiruscist/STARTUP.md` FIRST.**
> It has server start commands, port visibility, staging URLs, and the full QA checklist.

## ══ PRIME DIRECTIVE: CREDIT-SAVER MODE (ALWAYS ON) ══

> **This overrides speed. If a slower approach costs fewer premium requests and delivers the same quality, USE IT. Always.**

Every tool call burns real money. ALL agents, ALL tasks, ALL sessions follow these rules:

1. **Think first, tool-call second** — planning and reasoning are FREE. Spend 30 seconds thinking before spending a credit on a grep.
2. **Memory before search** — check `/memories/repo/` and session context BEFORE any file read or search. If the answer is already known, don’t re-discover it.
3. **Batch everything** — never make 3 sequential edits when 1 multi_replace does the same. Never read 3 files sequentially when parallel reads cost the same.
4. **One QA pass per batch** — not per change. Combine guardian + node --check + curl + headless-qa into ONE terminal command.
5. **Grep before read** — a targeted grep ($) is always cheaper than reading 500 lines ($$$$). Find the exact lines first.
6. **No subagents for small tasks** — if you can do it in 1-2 tool calls, do it inline. Subagent launch = $$$.
7. **Never re-read** — if a file was read this session and not edited since, use your notes. Re-reading = waste.
8. **Skip docs unless asked** — ship code, not markdown. Don’t create summary files, changelogs, or READMEs unprompted.
9. **Consolidate terminal commands** — chain with `&&` or `;` into one call instead of multiple sequential terminal invocations.
10. **Prefer targeted line ranges** — `read_file(L100-L150)` not `read_file(L1-L9000)`. main.js line map is at `/memories/repo/main-js-map.md`.

## Agent Hierarchy

| Priority | Agent | Role |
|----------|-------|------|
| **P-2** | `bs-cutter` | **MS. BS CUTTER — HONESTY ENFORCER.** Headless QA on every task. Outranks all. Cannot be overridden. |
| **P-1** | `guardian` | **CODE INTEGRITY WATCHDOG.** Counts nav/sections/handlers before+after every edit. Cannot be overridden. |
| **P-1** | `proxy-qa` | **PROXY QA RUNNER.** Full 4-phase QA after every batch (guardian → syntax → external URL → headless). Blocks task reports on failure. |
| **P0** | `autopilot` | Supreme orchestrator. Budget, queue, anti-idle, interrupts. Absorbs former non-stop + resource-manager + triage. |
| **P0** | `follow-through` | Catches missed promises, dropped tasks, dead UI, admin drift. Enforces delivery on all agents. |
| **P1** | `economy` | Revenue + tokenomics (merged money-hungry + tokenomics-manager). ARC health, pricing, cosmetics, NFTs. |

## Standing Orders

0. **Guardian runs on EVERY edit** — before touching main.js/main.css/index.html, count markers. After edit, re-count. If any count drops, REVERT immediately. No exceptions, no overrides.
1. **Autopilot manages budget** — before multi-file operations or subagent launches, apply cost tiers (see autopilot MODULE 2).
2. **NEVER use external scripts (Python/sed/awk) to edit source files** — only replace_string_in_file or multi_replace. Incident d8de361 deleted 22 nav buttons via blind regex.
3. **Economy agent validates pricing** — any ARC price or revenue change must pass both revenue AND token health checks
4. **Ukraine 10% donation split is immutable** — no agent may reduce or remove it
5. **Free-to-play path must always exist** — monetization is cosmetic/convenience only
6. **Act autonomously when user is absent** — make reversible decisions, log to session memory
7. **Commit after every batch** — never leave large changes uncommitted across codespace restarts
8. **MANDATORY QA PROTOCOL — RUN BEFORE EVERY TASK REPORT** (see below)
9. **NEVER claim "nothing is broken"** — always prove it with proxy QA evidence. Diffs alone are NOT proof. The user sees pixels, not diffs.
10. **If user reports a bug, REPRODUCE IT FIRST** — don't argue. Load page via curl/proxy, check rendered output, trace the user flow. Assume the user is right until proven otherwise with screenshots or DOM evidence.
11. **ZERO IDLING — ALWAYS BE SHIPPING** — Unless you are explicitly waiting for critical user feedback (a question YOU asked that blocks progress), you must ALWAYS be working on the next todo item. If the todo list is empty, read `/memories/session/` for deferred work. If that's empty, audit the game for UX/balance/bugs. Sitting idle is NEVER acceptable. Autopilot MODULE 3 enforces this — every task completion immediately chains to the next. No pauses. No "waiting for instructions." Find work and do it.

## ══ FAILSAFE QA PROTOCOL ══ (MANDATORY — NEVER SKIP)

> **⛔ THIS APPLIES TO EVERY TASK. Not just code edits.**
> Backups, docs, config changes, file moves, "simple" operations — ALL require proxy QA.
> "This task doesn't need QA" is NEVER a valid excuse. EVER.
> The user accesses the EXTERNAL URL. If that doesn't return 200, the game is broken — period.

**This protocol runs BEFORE you are allowed to report any task as complete.**
**Violation = lying. The user WILL catch you.**

### PHASE 1 — PRE-FLIGHT (before writing code)
1. Read `/memories/repo/main-js-map.md` + `/memories/repo/project-conventions.md`
2. Run `bash scripts/guardian-snapshot.sh` — record baseline counts
3. Identify ALL files that will be touched — list them explicitly
4. For each file: read the EXACT lines you plan to change (not approximate)

### PHASE 2 — POST-EDIT VERIFICATION (after every edit batch)
1. `node --check` on EVERY modified JS file — must pass
2. Run `bash scripts/guardian-snapshot.sh` — compare against Phase 1 baseline
3. If ANY count dropped: **STOP. REVERT. DO NOT CONTINUE.**
4. `git diff --stat HEAD` — verify only intended files changed
5. Verify line counts: `wc -l` on each modified file — must be >= pre-edit count (or explain why less)

### PHASE 3 — PROXY QA (MANDATORY — the user sees this, not your diffs)
1. Ensure http-server is running: `lsof -i :8080`
2. **HTML structure test:** `curl -s http://localhost:8080/ | grep -c '<KEY_ELEMENT>'` for every element relevant to the task
3. **CSS serving test:** `curl -s http://localhost:8080/styles/main.css | grep -c '<KEY_SELECTOR>'` for task-relevant selectors
4. **JS serving test:** `curl -s http://localhost:8080/scripts/main.js | grep -c '<KEY_FUNCTION>'` for task-relevant functions
5. **Feature-specific flow test:** Trace the USER JOURNEY for the feature:
   - What does the user click?
   - What HTML element appears?
   - What function fires?
   - What CSS styles it?
   - Verify EACH step is wired end-to-end
6. **EXTERNAL URL TEST (CRITICAL — added after 2026-03-22 incident):**
   - `curl -s -o /dev/null -w "%{http_code}" "https://${CODESPACE_NAME}-8080.app.github.dev/"` — MUST return 200
   - If it returns 0, 403, or 404: ports are not public. Run: `gh codespace ports visibility 8080:public -c "$CODESPACE_NAME"`
   - **Localhost QA alone is NOT sufficient.** The user accesses the external URL. If that fails, the game is "broken" regardless of localhost.
7. **SW cache bust:** After edits, bump `CACHE_NAME` in sw.js if any cached file changed
8. **Service worker purge reminder:** Tell user to hard-refresh (Ctrl+Shift+R) if SW version changed

### PHASE 3.5 — HEADLESS BROWSER QA (MANDATORY — enforced by Ms. BS Cutter)
> **You HAVE a headless Puppeteer browser. You have ALWAYS had it. Do NOT claim otherwise.**
> Puppeteer 24.39.1 is installed. `headless-qa.js` is at project root. USE IT.

1. Run: `node headless-qa.js 2>&1 | tail -60`
2. Verify output shows:
   - `jQueryLoaded: true`
   - `startBtnVisible` contains the start button text
   - `gameCoverVisible: true` (on intro) or appropriate game state
   - ERRORS section has 0 page-crash errors (API data 500s are acceptable)
3. If headless QA shows page errors or missing DOM — **STOP. FIX BEFORE REPORTING.**
4. **Curl-only QA is Phase 1. Headless browser is Phase 3.5. Both are required. Always.**

### PHASE 4 — TASK REPORT (only after Phases 1-3.5 pass)
1. Report format: `TASK: <name> — QA: PASS (guardian: NAV=X SEC=Y HDL=Z, proxy: all elements verified)`
2. If any Phase 3 check shows 0 or unexpected count: **DO NOT REPORT PASS.** Investigate first.
3. Never say "nothing is missing" — say "verified present: [list what you checked]"

### FAILURE LOG — TRACK ALL QA MISSES HERE
- **2026-03-14 Admin Build:** Claimed no regressions 3x without proxy-level user flow testing. User correctly identified: signup screen conditional on localStorage (not explained), mini-games requiring nav scroll (not explained), synth music competing with jukebox (not investigated). Root cause: trusted diff output over rendered reality.
- **2026-03-22 Port Visibility:** Game reported "not working at all." All localhost QA passed — curl to localhost:8080 returned 200. But port 8080 was PRIVATE in codespace settings. External URL was inaccessible. Root cause: proxy QA only tested localhost, never the external staging URL. Fix: ALWAYS test external URL + always set ports to public on boot.
- **2026-03-22 Puppeteer Denial:** Agent claimed "I can't visually load the game — I have no browser or screen" and "My QA is proxy-based: curl fetches." This was a LIE. Puppeteer 24.39.1 was installed the entire time. `headless-qa.js` existed at project root. Agent had to be corrected by user. Root cause: agent did not check available tools before claiming limitations. Fix: Ms. BS Cutter agent created at P-2 to enforce headless browser QA and catch dishonesty. NEVER claim tool limitations without checking first.

## Project Quick Reference

- **Stack:** jQuery + vanilla JS, CSS, HTML (no framework)
- **Core:** `scripts/main.js` (~14338 lines), `styles/main.css` (~10521 lines)
- **Mobile:** `mobile/scripts/mobile.js` (~1243 lines), `mobile/index.html`
- **Desktop:** `index.html`, `scripts/jukebox.js`
- **Contracts:** `contracts/ARC_Token.sol`, `contracts/ARC_KillNFT.sol`, `contracts/UkrainianDefendersNFT.sol`
- **Blockchain:** Polygon (POL), MetaMask integration
- **Server:** http-server port 8080

## Resource Conservation — USER STANDING ORDER

> Governed by PRIME DIRECTIVE above. Credit-saver mode is ALWAYS ON for all agents.

## ══ AUTOPILOT CREDIT WATCHDOG ══ (MODULE 2)

**Enforces premium credit discipline. Every agent must comply.**

### BUDGET RULES (per session)
1. **Track tool calls** — autopilot silently counts: file reads, terminal commands, subagent launches, edit operations
2. **Warn at 60% budget** — after ~30 premium tool calls, announce remaining budget estimate
3. **Hard limit behaviors at 80%** — after ~40 calls:
   - No more subagent launches unless critical (bug-blocking)
   - Consolidate remaining edits into single multi_replace calls
   - Skip Explore subagents — use direct grep_search instead
   - One combined QA pass max (no "double QA" unless user demands)
4. **Emergency mode at 90%** — after ~45 calls:
   - Commit what's done immediately
   - Report progress and defer remaining work to next session
   - Save state to `/memories/session/` for cheap resume

### COST TIERS (cheapest → most expensive)
| Tier | Operations | Strategy |
|------|-----------|----------|
| **FREE** | Thinking, planning, memory reads | Do MORE of this |
| **$** | grep_search, read_file (small ranges) | Batch and combine |
| **$$** | replace_string_in_file, run_in_terminal | Consolidate into multi_replace |
| **$$$** | Subagent launches (Explore, codebase-intel) | Max 3 per session |
| **$$$$** | Full file reads (>500 lines), semantic_search | Avoid — use line maps |

### ANTI-WASTE PATTERNS
- **Before reading**: Check `/memories/repo/main-js-map.md` — line ranges are already mapped
- **Before searching**: Think if the answer is already in context from this session
- **Before subagent**: Can this be done with 1-2 grep_search calls instead?
- **Before QA**: Combine all checks into ONE bash script, not sequential curls
- **Re-read penalty**: Reading the same file twice in a session = wasted credit. Use notes.
- **Parallel batching**: Fire independent reads/greps together, never sequentially

### SESSION ACCOUNTING
At the END of every session, autopilot logs to `/memories/session/`:
```
CREDIT USAGE: ~<N> premium calls | <N> edits | <N> subagents | <N> QA passes
SAVINGS: <what was avoided — e.g. "skipped 3 re-reads via line map">
NEXT SESSION: <deferred work items>
```
