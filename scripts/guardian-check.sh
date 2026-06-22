#!/usr/bin/env bash
# Guardian regression gate: compare structural marker counts between a base ref
# and the current working tree. Fails if NAV_BUTTONS, SECTIONS, or HANDLERS drop.
# (JS_DECLARATIONS / line counts change legitimately during refactors, so they are
# reported but not gated here.)
#
# Usage: scripts/guardian-check.sh <base-ref>
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE="${1:-}"
[ -n "$BASE" ] || { echo "usage: scripts/guardian-check.sh <base-ref>"; exit 2; }

get() { grep -E "^$1=" "$2" | cut -d= -f2 || echo 0; }

HEAD_FILE="$(mktemp)"
BASE_FILE="$(mktemp)"
bash scripts/guardian-snapshot.sh head > "$HEAD_FILE"

WT="$(mktemp -d)"
git worktree add -q --detach "$WT" "$BASE"
# Use HEAD's snapshot script against BASE's source so counting logic is identical.
cp scripts/guardian-snapshot.sh "$WT/scripts/guardian-snapshot.sh"
bash "$WT/scripts/guardian-snapshot.sh" base > "$BASE_FILE"
git worktree remove --force "$WT"

echo "=== Guardian base($BASE) vs head ==="
fail=0
for m in NAV_BUTTONS SECTIONS HANDLERS; do
  b="$(get "$m" "$BASE_FILE")"; h="$(get "$m" "$HEAD_FILE")"
  b="${b:-0}"; h="${h:-0}"
  if [ "$h" -lt "$b" ]; then
    echo "  ❌ $m dropped: base=$b head=$h"; fail=1
  else
    echo "  ✓ $m base=$b head=$h"
  fi
done
# Informational (not gated)
for m in JS_DECLARATIONS CSS_LINES HTML_LINES JS_LINES SCRIPT_TAGS; do
  echo "  · $m base=$(get "$m" "$BASE_FILE") head=$(get "$m" "$HEAD_FILE")"
done

if [ "$fail" -eq 0 ]; then echo "GUARDIAN: PASS"; else echo "GUARDIAN: FAIL"; exit 1; fi
