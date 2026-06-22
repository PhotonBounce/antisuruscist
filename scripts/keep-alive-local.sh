#!/bin/bash
# Codespace Keep-Alive Loop — runs inside the codespace
# Prevents idle shutdown by generating activity every 2 minutes
# Auto-restarts via .bashrc hook if killed

PIDFILE="/tmp/keep-alive.pid"

# Prevent duplicate instances
if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "[keep-alive] Already running (PID $(cat "$PIDFILE"))"
  exit 0
fi
echo $$ > "$PIDFILE"
trap "rm -f $PIDFILE" EXIT

echo "[keep-alive] Started (PID $$) — pinging every 120s"

while true; do
  # 1. Touch VS Code internal state files (simulates editor activity)
  for f in /home/codespace/.vscode-remote/data/Machine/.sessionId \
           /home/codespace/.vscode-remote/data/logs/*; do
    [ -e "$f" ] && touch "$f" 2>/dev/null
  done

  # 2. Touch workspace marker
  echo "$(date +%s)" > /workspaces/antiruscist/.keep-alive

  # 3. Git operation (generates terminal-like activity the idle detector sees)
  cd /workspaces/antiruscist && git status > /dev/null 2>&1

  # 4. Ping heartbeat server if running
  curl -s http://localhost:9999/loop-ping > /dev/null 2>&1

  # 5. Log
  echo "[keep-alive] ping at $(date '+%H:%M:%S')" >> /tmp/keep-alive.log

  sleep 120  # 2 minutes
done
