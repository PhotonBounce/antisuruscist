# CONTROL RULES — Agent Coordination Protocol
## Machine-Learning-Optimized Decision System

> **Purpose:** Central rules engine that any AI agent must read FIRST before doing ANY work.
> **Scope:** Transferable to any project. Fork this file and adapt the project-specific sections.
> **Authority:** These rules override all other instructions except user direct commands.

---

## PHASE 0 — BOOT SEQUENCE (mandatory on every session start)

```
1. READ  /memories/standing-orders.md          → user preferences & anti-patterns
2. READ  /memories/repo/project-conventions.md → line maps, guardian counts, HEAD
3. READ  .github/CONTROL-RULES.md             → this file (you're here)
4. RUN   git log --oneline -3 && git status --short
5. RUN   bash scripts/guardian-snapshot.sh     → record baseline
6. CHECK session memory for prior checkpoint   → resume where stopped
7. LOAD  todo list from last session if exists
```

**If ANY read fails:** the file is missing or outdated → note it, create/update it, proceed.
**If guardian counts are lower than last known:** STOP. Something broke. Investigate before any new work.

---

## PHASE 1 — PATTERN LIBRARY (learned from mistakes)

### Pattern 1: NEVER Edit Without Reading
- **Trigger:** About to modify a file
- **Rule:** Read the exact lines first. No exceptions.
- **Violation log:** 2026-03-14 — edited main.js line ~8400 blindly, broke zombie spawn

### Pattern 2: NEVER Trust Diffs Alone
- **Trigger:** Reporting task completion
- **Rule:** Proxy QA (curl the served file, check for expected elements)
- **Violation log:** 2026-03-14 — claimed "nothing broken" 3x without rendering verification. User found signup screen conditional, mini-games needing scroll, audio conflicts.

### Pattern 3: NEVER Re-Read Files Already in Context
- **Trigger:** About to call read_file
- **Rule:** Check session memory/context first. If you read it this session, use notes.
- **Cost:** Each unnecessary read burns a premium credit

### Pattern 4: NEVER Use External Scripts on Source Files
- **Trigger:** Temptation to use sed/awk/python to batch-edit
- **Rule:** Only use replace_string_in_file or multi_replace_string_in_file
- **Violation log:** Incident d8de361 — blind sed regex deleted 22 nav buttons

### Pattern 5: ALWAYS Batch Related Edits
- **Trigger:** 2+ changes needed in same or related files
- **Rule:** Use multi_replace in ONE call, not sequential single edits
- **Cost saving:** N edits → 1 tool call instead of N

### Pattern 6: ALWAYS Run Guardian Before AND After Edits
- **Trigger:** Any file modification
- **Rule:** `bash scripts/guardian-snapshot.sh` → compare counts → revert if any drop
- **Counts to track:** NAV_BUTTONS, SECTIONS, HANDLERS, JS_DECLARATIONS, CSS_LINES, HTML_LINES, JS_LINES

### Pattern 7: ONE QA Pass Per Batch, Not Per Edit
- **Trigger:** Completed a set of related changes
- **Rule:** Run proxy QA once at the end, covering all changes
- **Anti-pattern:** QA after every single line change (wastes credits)

### Pattern 8: Predict Before Searching
- **Trigger:** Need to find something in codebase
- **Rule:** Check /memories/repo/ first (line maps exist). Think about likely location. Only search if prediction fails.
- **ML parallel:** Feature prediction → reduce inference cost

### Pattern 9: NEVER Stop With Empty Todo List
- **Trigger:** Last todo about to be marked complete
- **Rule:** BEFORE marking it, load next backlog items from session memory. The todo list must always have ≥1 not-started item while backlog exists.
- **Violation log:** 3 idle stalls on 2026-03-14 from empty todo lists

### Pattern 10: Reproduce Before Fixing
- **Trigger:** User reports a bug
- **Rule:** Don't argue. Reproduce it first (curl, grep, trace the flow). Assume user is right.
- **Violation log:** 2026-03-14 — argued about start screen buttons instead of checking z-index overlap

---

## PHASE 2 — DECISION TREE (per-task routing)

```
INPUT: New task arrives

├─ Is it a BUG FIX?
│  ├─ YES → Reproduce first (Pattern 10)
│  │        Read affected lines (Pattern 1)
│  │        Guardian pre-flight (Pattern 6)
│  │        Fix + Guardian post-check
│  │        Proxy QA (Pattern 2)
│  │        Commit
│  │
│  └─ NO → Is it a FEATURE?
│     ├─ YES → Check /memories/repo/ for conventions
│     │        Plan the minimum viable change
│     │        Batch edits (Pattern 5)
│     │        Guardian + proxy QA
│     │        Commit
│     │
│     └─ Is it POLISH/CLEANUP?
│        ├─ YES → Low priority. Batch with other polish items.
│        │        One QA pass for entire polish batch.
│        │
│        └─ Is it META (documentation, memory, coordination)?
│           └─ YES → Do it during "free" cycles (no tool calls needed).
│                    Don't count toward premium budget.
```

---

## PHASE 3 — COST MODEL (resource optimization)

| Tier | Operations | Credits | Strategy |
|------|-----------|---------|----------|
| FREE | Think, plan, memory reads, session notes | 0 | Maximize |
| $ | grep_search, read_file (small range) | 1 | Batch + combine |
| $$ | replace_string, run_in_terminal | 1 | Use multi_replace |
| $$$ | Subagent launches | 3-5 | Max 3/session |
| $$$$ | Full file reads (>500 lines), semantic_search | 2-3 | Use line maps |

### Budget Thresholds
- **60% spent (~30 calls):** Announce remaining budget
- **80% spent (~40 calls):** No more subagents, consolidate edits
- **90% spent (~45 calls):** Emergency commit, defer rest to next session

### Anti-Waste Checklist
- [ ] Did I check /memories/repo/ before searching?
- [ ] Did I check session context before re-reading?
- [ ] Am I batching related edits?
- [ ] Can I do this with thinking instead of tool calls?

---

## PHASE 4 — QA PROTOCOL (mandatory before task report)

### Step 1: Guardian Snapshot Compare
```bash
bash scripts/guardian-snapshot.sh
# Compare: NAV, SEC, HDL, JS_DECL must be ≥ pre-edit values
```

### Step 2: Syntax Verification
```bash
node --check scripts/main.js  # Must exit 0
```

### Step 3: Proxy QA (what the user actually sees)
```bash
# Verify CSS is served with expected selectors
curl -s http://localhost:8080/styles/main.css | grep -c '<expected_selector>'

# Verify JS is served with expected functions
curl -s http://localhost:8080/scripts/main.js | grep -c '<expected_function>'

# Verify HTML structure has expected elements
curl -s http://localhost:8080/ | grep -c '<expected_element>'
```

### Step 4: Feature Flow Trace
For each feature/fix, trace the user journey:
1. What does user click/trigger?
2. What HTML element responds?
3. What JS function fires?
4. What CSS styles the result?
Verify EACH step has working code end-to-end.

### Step 5: Report Format
```
TASK: <name> — QA: PASS
Guardian: NAV=X SEC=Y HDL=Z (stable)
Proxy: <list verified elements>
SW: bumped to <version>
```

---

## PHASE 5 — SESSION LIFECYCLE

### On Wake-Up
1. Run PHASE 0 boot sequence
2. Check git status for uncommitted work
3. Discard stale rollbacks if any (`git checkout -- <file>` for unintended changes)
4. Resume from todo list / session memory

### During Work
- Update todo list after each completed item
- Flush important findings to session memory every ~10 tool calls
- Track credit usage mentally

### On Session End
1. Commit all completed work
2. Bump SW cache if any cached file changed
3. Save checkpoint to `/memories/session/`
4. Record credit usage estimate
5. List deferred work for next session

---

## PROJECT-SPECIFIC RULES (Anti-Ruscist Game)

### Immutable Constraints
- **Ukraine 10% donation split** — no agent may reduce or remove
- **Free-to-play path** must always exist — monetization is cosmetic/convenience only
- **jQuery + vanilla JS stack** — no framework migrations
- **1024×550 canvas** — fixed dimensions, responsive via zoom

### File Size Awareness
- `scripts/main.js` — ~14,300 lines → ALWAYS use line-range reads
- `styles/main.css` — ~10,500 lines → ALWAYS use line-range reads
- `index.html` — ~666 lines → safe to read in larger chunks

### Guardian Baseline (update after each batch)
```
NAV_BUTTONS=36  SECTIONS=33  HANDLERS=61
JS_DECLARATIONS=645  CSS_LINES=10521  HTML_LINES=666
JS_LINES=14338  SCRIPT_TAGS=6
HEAD=<update after commit>  SW=arc-v5.23-batch126
```

### Sprite Sheet Verification
When zombie rendering is questioned:
1. Check image files exist: `ls images/zombies/zombie-*.png`
2. Check dimensions match CSS: `file images/zombies/zombie-N.png` vs CSS `background-size`
3. Check frame count: image_height / frame_height = steps(N)
4. Check CSS cascade: no later rule overrides `background-image`
5. Check serving: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/images/zombies/zombie-N.png`

---

## ADAPTATION GUIDE (for other projects)

To use this system on a different project:

1. **Copy this file** to `.github/CONTROL-RULES.md`
2. **Replace Phase 5 project-specific section** with your project's constraints
3. **Create `/memories/repo/project-conventions.md`** with your line maps and guardian equivalents
4. **Create `/memories/standing-orders.md`** with user preferences
5. **Adapt guardian script** to count your project's key structural elements
6. **Update cost model** based on your file sizes and tool patterns

The patterns in Phase 1 are universal — they apply to any codebase.
The decision tree in Phase 2 works for any task type.
The QA protocol in Phase 4 adapts to any web project with minor changes.
