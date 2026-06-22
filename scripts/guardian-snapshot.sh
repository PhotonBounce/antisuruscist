#!/usr/bin/env bash
# Guardian pre/post-edit snapshot — run before and after edits to detect regressions
# Usage: bash scripts/guardian-snapshot.sh [label]
set -euo pipefail
cd /workspaces/antiruscist

LABEL="${1:-snapshot}"
NAV=$(grep -c 'inv-nav-btn.*data-target' scripts/main.js 2>/dev/null || echo 0)
SEC=$(grep -c 'id="inv-sec-' scripts/main.js 2>/dev/null || echo 0)
HDL=$(grep '\$p\.' scripts/main.js 2>/dev/null | grep -c '\.on(' || echo 0)
FN=$(grep -c '^  function \|^  var \|^  const \|^  let ' scripts/main.js 2>/dev/null || echo 0)
CSS_LINES=$(wc -l < styles/main.css 2>/dev/null || echo 0)
HTML_LINES=$(wc -l < index.html 2>/dev/null || echo 0)
JS_LINES=$(wc -l < scripts/main.js 2>/dev/null || echo 0)
SCRIPTS=$(grep -c '<script src=' index.html 2>/dev/null || echo 0)

echo "=== GUARDIAN SNAPSHOT [$LABEL] $(date '+%H:%M:%S') ==="
echo "NAV_BUTTONS=$NAV"
echo "SECTIONS=$SEC"
echo "HANDLERS=$HDL"
echo "JS_DECLARATIONS=$FN"
echo "CSS_LINES=$CSS_LINES"
echo "HTML_LINES=$HTML_LINES"
echo "JS_LINES=$JS_LINES"
echo "SCRIPT_TAGS=$SCRIPTS"
echo "=========================================="
