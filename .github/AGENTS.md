# Workspace Agents — antiruscist

Consolidated agent system (B132+). 10 agents → 6 core + 3 QA specialists. Retired agents kept as `.retired` files.

## Active Agent Fleet

| Agent | Priority | Purpose | Trigger |
|-------|----------|---------|---------|
| **bs-cutter** | P-2 | **MS. BS CUTTER** — Honesty enforcer. Headless QA on every task. Outranks all. | **MANDATORY on every task report** |
| **proxy-qa** | P-1 | **PROXY QA** — Full 4-phase QA runner (guardian → syntax → external URL → headless). Blocks task reports on failure. | **MANDATORY after every batch** |
| **guardian** | P-1 | Code integrity. Nav/section/handler counts before+after every edit. | **MANDATORY on every edit** |
| **autopilot** | P0 | Supreme orchestrator. Budget, queue, anti-idle, interrupts. Absorbs former non-stop + resource-manager + triage. | "autopilot mode", "continue", "take over" |
| **follow-through** | P0 | Catches missed promises, dropped tasks, dead UI, admin drift. Enforces delivery. | After batches, on session start, "what did you miss?" |
| **economy** | P1 | Revenue + tokenomics (merged money-hungry + tokenomics-manager). ARC health, pricing, cosmetics, NFTs. | Revenue, pricing, token economy, "monetize" |
| **codebase-intel** | Utility | Fast read-only code exploration. Saves main context tokens. | Research, function lookup, dependency tracing |
| **Explore** | Utility | Parallel research subagent. | Complex codebase Q&A, thorough searches |

## QA Specialist Agents (NEW)

| Agent | Priority | Purpose | Trigger |
|-------|----------|---------|---------|
| **qa-runner** | QA | Automates the full 4-phase mandatory QA protocol. Guardian snapshots, syntax checks, proxy curl tests, headless browser, external URL. | **After every edit batch**, before task report |
| **visual-qa** | QA | Deep headless browser testing. DOM structure, CSS rendering, user flow interactions, game state transitions, mobile viewport. | UI/CSS changes, new features, deeper confidence needed |
| **regression-detector** | QA | Before/after comparison specialist. Full DOM snapshots, file metrics, JS state, diff analysis. Catches what guardian counts miss. | **Before AND after every edit batch** |

## Retired Agents (absorbed into others)

| Retired File | Absorbed Into | Reason |
|-------------|--------------|--------|
| `non-stop.agent.md.retired` | **autopilot** MODULE 3 | Anti-idle is an autopilot behavior, not a separate brain |
| `resource-manager.agent.md.retired` | **autopilot** MODULE 2 | Budget is an autopilot concern |
| `triage.agent.md.retired` | **autopilot** MODULE 4 | Interrupt handling is autopilot behavior |
| `money-hungry.agent.md.retired` | **economy** | Revenue + tokenomics are inseparable |
| `tokenomics-manager.agent.md.retired` | **economy** | Revenue + tokenomics are inseparable |

## Agent Selection Guide

**"I want to..."** → **Choose agent**:
- ...orchestrate work / manage budget / handle interrupts → **autopilot**
- ...verify code integrity after edits → **guardian**
- ...enforce QA honesty → **bs-cutter**
- ...run full QA after a batch → **proxy-qa**
- ...find missed/dropped items → **follow-through**
- ...design pricing or token economy → **economy**
- ...look up code / trace functions → **codebase-intel** or **Explore**
- ...run complete QA after edits → **qa-runner**
- ...test UI/CSS visually with headless browser → **visual-qa**
- ...compare before/after state for regressions → **regression-detector**
- ...queue new requests that arrived mid-task → **triage**

## Compliance Notes

All agents operate under the constraints defined in `copilot-instructions.md`. Standing orders are non-negotiable hardening rules for the antiruscist game project:

1. Guardian runs BEFORE and AFTER every edit
2. Resource-manager consulted before multi-file operations
3. External scripts (Python/sed/awk) forbidden from editing source files
4. Ukraine 10% donation split immutable
5. Free-to-play path must always exist
6. Commits batched, never left uncommitted across restarts

---

**Status**: 8 standard + 1 custom agent ready. proxy-qa agent added Mar 28, 2026.
