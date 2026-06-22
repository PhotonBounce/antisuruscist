#!/bin/bash
set -u

# Prints the heartbeat endpoint URL for this codespace.
# Works best inside GitHub Codespaces.

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  echo "https://${CODESPACE_NAME}-9999.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  exit 0
fi

# Fallback: infer from vscode env host if available.
if [ -n "${GITHUB_CODESPACE_TOKEN:-}" ]; then
  echo "Unable to infer URL automatically. Open port 9999 and copy its public URL from Ports panel."
  exit 0
fi

echo "Not running inside a detectable Codespaces environment."
