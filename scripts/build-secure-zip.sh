#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# ANTI-RUSCIST — Secure Deployment ZIP Builder
# Creates a production-ready ZIP safe for shared hosting (Apache).
#
# Usage:   bash scripts/build-secure-zip.sh
# Output:  antiruscist-deploy.zip  (in project root)
#
# WHAT'S INCLUDED (everything the game needs):
#   index.html, admin.html, manifest.json, sw.js, robots.txt, sitemap.xml
#   .htaccess (Apache security headers + rewrite rules)
#   favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png
#   zombie-mayhem.jpg (social share / OG image)
#   scripts/  — main.js, jukebox.js, adaptive-ai.js, agent-manager.js,
#               agent-memory.js, api-client.js, engine-extras.js, ml-brain.js
#   styles/main.css
#   vendor/   — jquery.min.js, soundjs.min.js, tootik.min.css
#   fonts/    — all web fonts
#   icons/    — SVG icons
#   images/   — all game images (backgrounds, UI, vehicles, zombies)
#               EXCLUDING source PSD files and .bak backups
#   sounds/   — jukebox MP3/WAV tracks
#   mobile/   — mobile version (index.html, mobile.js, mobile.css)
#
# WHAT'S EXCLUDED (security risks / dev-only):
#   .git/            — repository history, could leak credentials
#   .github/         — CI/CD workflows, agent configs
#   .devcontainer/   — codespace dev environment
#   .vscode/         — editor settings
#   node_modules/    — npm packages (not needed, potential vulnerabilities)
#   server/          — Node.js backend (not used on shared Apache hosting)
#   contracts/       — Solidity smart contracts (blockchain source code)
#   nft-deploy/      — deployment scripts, .env patterns, private key refs
#   package.json     — npm metadata (exposes dependency tree)
#   package-lock.json
#   .gitignore, .env, .heartbeat*, .keep-alive
#   *.log            — log files
#   *.sh, *.py       — shell/python scripts (executable attack surface)
#   *-qa*.js, *-tmp.js, headless-*.js — QA/test scripts
#   images/src/      — PSD source files (35 MB, not needed)
#   *.bak.*          — backup files
#   styles/*.scss, styles/modules/, styles/ui/, styles/zombies/*.scss
#                    — SCSS source (only compiled main.css is needed)
#   *.md, *.txt      — documentation files (info disclosure)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_NAME="antiruscist-deploy.zip"
ZIP_PATH="${REPO_ROOT}/${ZIP_NAME}"

cd "$REPO_ROOT"

# Remove old zip if present
rm -f "$ZIP_PATH"

echo "═══════════════════════════════════════════════════════════"
echo " ANTI-RUSCIST — Building Secure Deployment ZIP"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Build file list ──────────────────────────────────────────────────────

# Root HTML / config files
FILES=(
  "index.html"
  "admin.html"
  ".htaccess"
  "manifest.json"
  "sw.js"
  "robots.txt"
  "sitemap.xml"
  "favicon.ico"
  "apple-touch-icon.png"
  "icon-192.png"
  "icon-512.png"
  "zombie-mayhem.jpg"
)

# Game scripts (only the ones loaded by index.html / mobile/index.html)
FILES+=(
  "scripts/main.js"
  "scripts/jukebox.js"
  "scripts/adaptive-ai.js"
  "scripts/agent-manager.js"
  "scripts/agent-memory.js"
  "scripts/api-client.js"
  "scripts/engine-extras.js"
  "scripts/ml-brain.js"
)

# Compiled CSS only (no SCSS source)
FILES+=(
  "styles/main.css"
)

# Vendor libraries
FILES+=(
  "vendor/jquery.min.js"
  "vendor/soundjs.min.js"
  "vendor/tootik.min.css"
)

# Mobile version
FILES+=(
  "mobile/index.html"
  "mobile/scripts/mobile.js"
  "mobile/styles/mobile.css"
)

# ── Add directories with glob patterns ───────────────────────────────────

# Fonts — all files
FONT_FILES=$(find fonts/ -type f 2>/dev/null || true)

# Icons — all SVG files
ICON_FILES=$(find icons/ -type f 2>/dev/null || true)

# Images — all except source PSD files and .bak files
IMAGE_FILES=$(find images/ -type f \
  ! -path "images/src/*" \
  ! -name "*.psd" \
  ! -name "*.bak.*" \
  ! -name "*.bak.png" \
  2>/dev/null || true)

# Sounds — only jukebox audio tracks (game uses Web Audio API for SFX)
SOUND_FILES=$(find sounds/ -type f 2>/dev/null || true)

# CSS zombie sprite (referenced by main.css via url())
STYLE_ASSETS=$(find styles/ -type f -name "*.png" 2>/dev/null || true)

# ── Verify critical files exist ──────────────────────────────────────────

echo "Verifying critical files..."
MISSING=0
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ✗ MISSING: $f"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo "ERROR: Critical files are missing. Cannot build ZIP."
  exit 1
fi
echo "  ✓ All critical files present"
echo ""

# ── Create ZIP ───────────────────────────────────────────────────────────

echo "Creating ${ZIP_NAME}..."

# Add explicit files
zip -9 "$ZIP_PATH" "${FILES[@]}"

# Add font files
if [ -n "$FONT_FILES" ]; then
  while IFS= read -r f; do
    zip -9 "$ZIP_PATH" "$f"
  done <<< "$FONT_FILES"
fi

# Add icon files
if [ -n "$ICON_FILES" ]; then
  while IFS= read -r f; do
    zip -9 "$ZIP_PATH" "$f"
  done <<< "$ICON_FILES"
fi

# Add image files (excluding PSD source and backups)
if [ -n "$IMAGE_FILES" ]; then
  while IFS= read -r f; do
    zip -9 "$ZIP_PATH" "$f"
  done <<< "$IMAGE_FILES"
fi

# Add sound files (use while-read to handle Cyrillic/spaces in filenames)
if [ -n "$SOUND_FILES" ]; then
  while IFS= read -r f; do
    zip -9 "$ZIP_PATH" "$f"
  done <<< "$SOUND_FILES"
fi

# Add CSS sprite assets
if [ -n "$STYLE_ASSETS" ]; then
  while IFS= read -r f; do
    zip -9 "$ZIP_PATH" "$f"
  done <<< "$STYLE_ASSETS"
fi

echo ""

# ── Security audit of ZIP contents ──────────────────────────────────────

echo "═══════════════════════════════════════════════════════════"
echo " Security Audit"
echo "═══════════════════════════════════════════════════════════"

SAFE=1

# Check: no server-side code
if zipinfo -1 "$ZIP_PATH" | grep -qiE "^server/|^node_modules/|\.env|package\.json|package-lock"; then
  echo "  ✗ FAIL: Server-side or npm files detected!"
  SAFE=0
else
  echo "  ✓ No server-side code (server/, node_modules/, package.json)"
fi

# Check: no git files
if zipinfo -1 "$ZIP_PATH" | grep -qiE "^\.git"; then
  echo "  ✗ FAIL: Git files detected!"
  SAFE=0
else
  echo "  ✓ No git files (.git/, .github/)"
fi

# Check: no contracts/deploy scripts
if zipinfo -1 "$ZIP_PATH" | grep -qiE "^contracts/|^nft-deploy/"; then
  echo "  ✗ FAIL: Blockchain contract files detected!"
  SAFE=0
else
  echo "  ✓ No blockchain contracts or deploy scripts"
fi

# Check: no shell/python scripts
if zipinfo -1 "$ZIP_PATH" | grep -qiE "\.sh$|\.py$"; then
  echo "  ✗ FAIL: Executable scripts detected!"
  SAFE=0
else
  echo "  ✓ No executable scripts (.sh, .py)"
fi

# Check: no QA/test files
if zipinfo -1 "$ZIP_PATH" | grep -qiE "qa|headless|tmp\.js$"; then
  echo "  ✗ FAIL: QA/test files detected!"
  SAFE=0
else
  echo "  ✓ No QA/test files"
fi

# Check: no log files
if zipinfo -1 "$ZIP_PATH" | grep -qiE "\.log$"; then
  echo "  ✗ FAIL: Log files detected!"
  SAFE=0
else
  echo "  ✓ No log files"
fi

# Check: no PSD source files
if zipinfo -1 "$ZIP_PATH" | grep -qiE "\.psd$|images/src/"; then
  echo "  ✗ FAIL: Source PSD files detected!"
  SAFE=0
else
  echo "  ✓ No PSD source files"
fi

# Check: no markdown/text docs (robots.txt and sitemap.xml are SEO files — intentionally included)
LEAKED_DOCS=$(zipinfo -1 "$ZIP_PATH" | grep -viE "^robots\.txt$|^sitemap\.xml$" | grep -iE "\.md$|\.txt$" || true)
if [ -n "$LEAKED_DOCS" ]; then
  echo "  ✗ FAIL: Documentation files detected: $LEAKED_DOCS"
  SAFE=0
else
  echo "  ✓ No documentation files (info disclosure prevented)"
fi

# Check: no SCSS source
if zipinfo -1 "$ZIP_PATH" | grep -qiE "\.scss$"; then
  echo "  ✗ FAIL: SCSS source files detected!"
  SAFE=0
else
  echo "  ✓ No SCSS source files"
fi

# Check: no devcontainer
if zipinfo -1 "$ZIP_PATH" | grep -qiE "^\.devcontainer/|^\.vscode/"; then
  echo "  ✗ FAIL: Dev environment config files detected!"
  SAFE=0
else
  echo "  ✓ No dev environment configs (.devcontainer/, .vscode/)"
fi

echo ""

if [ "$SAFE" -eq 1 ]; then
  echo "  ✅ ALL SECURITY CHECKS PASSED"
else
  echo "  ❌ SECURITY ISSUES FOUND — review above"
  exit 1
fi

# ── Summary ──────────────────────────────────────────────────────────────

FILE_COUNT=$(zipinfo -1 "$ZIP_PATH" | wc -l)
ZIP_SIZE=$(du -h "$ZIP_PATH" | awk '{print $1}')

echo ""
echo "═══════════════════════════════════════════════════════════"
echo " ✅ ZIP created successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  File:    ${ZIP_PATH}"
echo "  Size:    ${ZIP_SIZE}"
echo "  Files:   ${FILE_COUNT}"
echo ""
echo "  DEPLOYMENT INSTRUCTIONS:"
echo "  1. Upload ${ZIP_NAME} to your shared hosting"
echo "  2. Extract into the /ar/ directory (or your web root)"
echo "  3. Make sure .htaccess is uploaded (it may be hidden)"
echo "  4. Visit your site — the game should work immediately!"
echo ""
echo "  The .htaccess file includes:"
echo "    • Security headers (XSS, MIME sniffing, clickjacking)"
echo "    • Compression (gzip for HTML/CSS/JS)"
echo "    • Browser caching (assets cached 1 week to 1 month)"
echo "    • Access blocking for any server/dev files if accidentally uploaded"
echo ""
