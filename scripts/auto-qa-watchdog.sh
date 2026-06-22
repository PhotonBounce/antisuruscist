#!/bin/bash
# ══════════════════════════════════════════════════════════════
# AUTO-QA WATCHDOG — runs every 60s, logs health checks
# Catches regressions, serves as ambient guardrail
# ══════════════════════════════════════════════════════════════
LOG="/workspaces/antiruscist/qa-watchdog.log"
PORT=8080

while true; do
  TS=$(date '+%Y-%m-%d %H:%M:%S')
  echo "═══ QA WATCHDOG [$TS] ═══" >> "$LOG"

  # 1. Guardian snapshot
  NAV=$(grep -c 'nav-btn\|nav-link\|nav-item' /workspaces/antiruscist/index.html 2>/dev/null || echo 0)
  SEC=$(grep -c '<section\|<div.*id=.*section\|overlay-screen\|inv-sec ' /workspaces/antiruscist/index.html 2>/dev/null || echo 0)
  JS_LINES=$(wc -l < /workspaces/antiruscist/scripts/main.js 2>/dev/null || echo 0)
  CSS_LINES=$(wc -l < /workspaces/antiruscist/styles/main.css 2>/dev/null || echo 0)
  HTML_LINES=$(wc -l < /workspaces/antiruscist/index.html 2>/dev/null || echo 0)
  echo "  GUARD: NAV=$NAV SEC=$SEC JS=$JS_LINES CSS=$CSS_LINES HTML=$HTML_LINES" >> "$LOG"

  # 2. JS syntax check
  if node --check /workspaces/antiruscist/scripts/main.js 2>/dev/null && \
     node --check /workspaces/antiruscist/scripts/jukebox.js 2>/dev/null && \
     node --check /workspaces/antiruscist/mobile/scripts/mobile.js 2>/dev/null && \
     node --check /workspaces/antiruscist/sw.js 2>/dev/null; then
    echo "  JS_SYNTAX: PASS" >> "$LOG"
  else
    echo "  JS_SYNTAX: *** FAIL ***" >> "$LOG"
  fi

  # 3. HTTP server alive?
  if lsof -i :$PORT >/dev/null 2>&1; then
    echo "  HTTP_SERVER: UP (port $PORT)" >> "$LOG"

    # 4. Proxy checks — desktop + mobile key assets
    HTML_OK=$(curl -s --max-time 5 http://localhost:$PORT/ | grep -c 'shooter-hud\|callin-panel\|fire-fab' 2>/dev/null || echo 0)
    CSS_OK=$(curl -s --max-time 5 http://localhost:$PORT/styles/main.css | wc -c 2>/dev/null || echo 0)
    JS_OK=$(curl -s --max-time 5 http://localhost:$PORT/scripts/main.js | wc -c 2>/dev/null || echo 0)
    MHTML_OK=$(curl -s --max-time 5 http://localhost:$PORT/mobile/ | grep -c 'rotate-prompt\|mob-menu-btn\|mob-drawer' 2>/dev/null || echo 0)
    MCSS_OK=$(curl -s --max-time 5 http://localhost:$PORT/mobile/styles/mobile.css | wc -c 2>/dev/null || echo 0)
    MJS_OK=$(curl -s --max-time 5 http://localhost:$PORT/mobile/scripts/mobile.js | wc -c 2>/dev/null || echo 0)
    echo "  PROXY_DESKTOP: HTML_elements=$HTML_OK CSS_bytes=$CSS_OK JS_bytes=$JS_OK" >> "$LOG"
    echo "  PROXY_MOBILE: HTML_elements=$MHTML_OK CSS_bytes=$MCSS_OK JS_bytes=$MJS_OK" >> "$LOG"
  else
    echo "  HTTP_SERVER: *** DOWN *** — restarting..." >> "$LOG"
    cd /workspaces/antiruscist && npx http-server -p $PORT -c-1 --silent &
  fi

  # 5. Disk space
  DISK=$(df -h /workspaces | tail -1 | awk '{print $5}')
  echo "  DISK: $DISK used" >> "$LOG"

  echo "" >> "$LOG"
  sleep 60
done
