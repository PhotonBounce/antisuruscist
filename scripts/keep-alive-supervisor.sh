#!/bin/bash
set -u

ROOT="/workspaces/antiruscist"
LOG_DIR="/tmp"
SUP_LOG="$LOG_DIR/keep-alive-supervisor.log"
HB_LOG="$LOG_DIR/heartbeat.log"
KA_LOG="$LOG_DIR/keep-alive-local.log"

mkdir -p "$LOG_DIR"

is_running() {
  local pattern="$1"
  pgrep -af "$pattern" >/dev/null 2>&1
}

start_heartbeat() {
  if ! is_running "node $ROOT/scripts/heartbeat.js"; then
    nohup node "$ROOT/scripts/heartbeat.js" >>"$HB_LOG" 2>&1 &
    echo "[$(date '+%F %T')] started heartbeat" >>"$SUP_LOG"
  fi
}

start_local_keepalive() {
  if ! is_running "bash $ROOT/scripts/keep-alive-local.sh"; then
    nohup bash "$ROOT/scripts/keep-alive-local.sh" >>"$KA_LOG" 2>&1 &
    echo "[$(date '+%F %T')] started local keepalive" >>"$SUP_LOG"
  fi
}

run_once() {
  start_heartbeat
  start_local_keepalive
}

# If started with --once, just ensure both are up and exit.
if [ "${1:-}" = "--once" ]; then
  run_once
  exit 0
fi

echo "[$(date '+%F %T')] supervisor running" >>"$SUP_LOG"

while true; do
  run_once
  sleep 60
done
