#!/usr/bin/env python3
"""
Codespace Keep-Alive — Run on YOUR PC or always-on host
Pings your codespace every 5 minutes to reduce idle suspension risk.

Usage:
    python3 keep-alive-remote.py YOUR_HEARTBEAT_URL [--codespace NAME]

Examples:
    python3 keep-alive-remote.py https://friendly-potato-g4g5p556wrgrfrwp-9999.app.github.dev
    python3 keep-alive-remote.py https://friendly-potato-g4g5p556wrgrfrwp-9999.app.github.dev --codespace friendly-potato-g4g5p556wrgrfrwp

Notes:
- The URL should point to port 9999 (heartbeat server).
- If ping fails repeatedly, the script attempts to restart the target codespace via gh CLI.
"""

import sys
import time
import subprocess
import urllib.request
import json
import re
from datetime import datetime

PING_INTERVAL = 300  # 5 minutes
RESTART_AFTER_FAILURES = 3  # restart codespace after 3 consecutive failures


def parse_args(argv):
    if len(argv) < 2:
        print(__doc__)
        sys.exit(1)

    url = argv[1].rstrip('/')
    codespace = None

    # Optional explicit target: --codespace <name>
    if len(argv) >= 4 and argv[2] == '--codespace':
        codespace = argv[3].strip()

    return url, codespace


def infer_codespace_name(url):
    # Typical format: https://<codespace-name>-9999.app.github.dev
    m = re.search(r'https://([a-z0-9-]+)-\d+\.app\.github\.dev/?$', url, re.IGNORECASE)
    if m:
        return m.group(1)
    return None

def ping(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'KeepAlive/1.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
            return True, data
    except Exception as e:
        return False, str(e)

def restart_codespace(codespace_name=None):
    """Try to restart the target codespace via GitHub CLI."""
    try:
        if codespace_name:
            print(f'  Restarting target codespace: {codespace_name}')
            subprocess.run(['gh', 'codespace', 'start', '-c', codespace_name], timeout=90, check=False)
            return True

        # Fallback: start any non-available codespace if target was not provided.
        result = subprocess.run(
            ['gh', 'codespace', 'list', '--json', 'name,state', '-q',
             '.[] | select(.state != "Available") | .name'],
            capture_output=True, text=True, timeout=30, check=False
        )
        for cs in [x.strip() for x in result.stdout.splitlines() if x.strip()]:
            print(f'  Restarting fallback codespace: {cs}')
            subprocess.run(['gh', 'codespace', 'start', '-c', cs], timeout=90, check=False)
            return True
    except Exception as e:
        print(f'  gh CLI not available or failed: {e}')
    return False

def main():
    url, cli_codespace = parse_args(sys.argv)
    inferred_codespace = infer_codespace_name(url)
    target_codespace = cli_codespace or inferred_codespace

    failures = 0

    print(f'[keep-alive] Pinging {url} every {PING_INTERVAL}s')
    if target_codespace:
        print(f'[keep-alive] Restart target: {target_codespace}')
    else:
        print('[keep-alive] Restart target: auto-fallback (first non-Available codespace)')
    print(f'[keep-alive] Press Ctrl+C to stop\n')

    while True:
        ok, data = ping(url)
        now = datetime.now().strftime('%H:%M:%S')

        if ok:
            failures = 0
            print(f'[{now}] ALIVE — uptime: {data.get("uptimeMinutes", "?")}min, pings: {data.get("totalPings", "?")}')
        else:
            failures += 1
            print(f'[{now}] FAIL #{failures} — {data}')

            if failures >= RESTART_AFTER_FAILURES:
                print(f'[{now}] Attempting codespace restart...')
                if restart_codespace(target_codespace):
                    failures = 0
                    print(f'[{now}] Restart initiated, waiting 60s...')
                    time.sleep(60)
                    continue

        time.sleep(PING_INTERVAL)

if __name__ == '__main__':
    main()
