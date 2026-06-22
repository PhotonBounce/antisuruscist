#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Anti-Ruscist Build Script — Minify & Compress for Production
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
NODE_MODULES="$ROOT/node_modules/.bin"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}═══ Anti-Ruscist Production Build ═══${NC}"
echo ""

# ─── Clean ───
echo -e "${YELLOW}[1/7] Cleaning dist/...${NC}"
rm -rf "$DIST"
mkdir -p "$DIST/scripts" "$DIST/styles" "$DIST/vendor" "$DIST/fonts" "$DIST/icons"
mkdir -p "$DIST/mobile/scripts" "$DIST/mobile/styles"

# ─── Symlink large binary assets (saves ~200MB copy) ───
echo -e "${YELLOW}[2/7] Linking binary assets...${NC}"
ln -s "$ROOT/images" "$DIST/images"
ln -s "$ROOT/sounds" "$DIST/sounds"
ln -s "$ROOT/images" "$DIST/mobile/images"

# ─── Copy static files ───
echo -e "${YELLOW}[3/7] Copying static files...${NC}"
cp "$ROOT/vendor/"* "$DIST/vendor/"
cp "$ROOT/fonts/"* "$DIST/fonts/"
cp "$ROOT/icons/"* "$DIST/icons/"
cp "$ROOT/manifest.json" "$DIST/"
cp "$ROOT/robots.txt" "$DIST/"
cp "$ROOT/sitemap.xml" "$DIST/"

# ─── Minify JavaScript ───
echo -e "${YELLOW}[4/7] Minifying JavaScript...${NC}"

JS_FILES=(
  "scripts/main.js"
  "scripts/jukebox.js"
  "scripts/adaptive-ai.js"
  "scripts/engine-extras.js"
  "scripts/api-client.js"
  "scripts/heartbeat.js"
)

TOTAL_JS_ORIG=0
TOTAL_JS_MIN=0

for f in "${JS_FILES[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    ORIG_SIZE=$(wc -c < "$ROOT/$f")
    "$NODE_MODULES/terser" "$ROOT/$f" \
      --compress passes=2,drop_console=false \
      --mangle \
      --output "$DIST/$f" 2>/dev/null
    MIN_SIZE=$(wc -c < "$DIST/$f")
    RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
    printf "  %-40s %8s → %8s  (-%d%%)\n" "$f" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
    TOTAL_JS_ORIG=$((TOTAL_JS_ORIG + ORIG_SIZE))
    TOTAL_JS_MIN=$((TOTAL_JS_MIN + MIN_SIZE))
  fi
done

# Mobile JS
if [[ -f "$ROOT/mobile/scripts/mobile.js" ]]; then
  ORIG_SIZE=$(wc -c < "$ROOT/mobile/scripts/mobile.js")
  "$NODE_MODULES/terser" "$ROOT/mobile/scripts/mobile.js" \
    --compress passes=2,drop_console=false \
    --mangle \
    --output "$DIST/mobile/scripts/mobile.js" 2>/dev/null
  MIN_SIZE=$(wc -c < "$DIST/mobile/scripts/mobile.js")
  RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
  printf "  %-40s %8s → %8s  (-%d%%)\n" "mobile/scripts/mobile.js" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
  TOTAL_JS_ORIG=$((TOTAL_JS_ORIG + ORIG_SIZE))
  TOTAL_JS_MIN=$((TOTAL_JS_MIN + MIN_SIZE))
fi

# Service Worker
if [[ -f "$ROOT/sw.js" ]]; then
  ORIG_SIZE=$(wc -c < "$ROOT/sw.js")
  "$NODE_MODULES/terser" "$ROOT/sw.js" \
    --compress passes=2,drop_console=false \
    --mangle \
    --output "$DIST/sw.js" 2>/dev/null
  MIN_SIZE=$(wc -c < "$DIST/sw.js")
  RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
  printf "  %-40s %8s → %8s  (-%d%%)\n" "sw.js" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
  TOTAL_JS_ORIG=$((TOTAL_JS_ORIG + ORIG_SIZE))
  TOTAL_JS_MIN=$((TOTAL_JS_MIN + MIN_SIZE))
fi

JS_SAVED=$((TOTAL_JS_ORIG - TOTAL_JS_MIN))
echo -e "  ${GREEN}JS Total: $(numfmt --to=iec $TOTAL_JS_ORIG) → $(numfmt --to=iec $TOTAL_JS_MIN)  (saved $(numfmt --to=iec $JS_SAVED))${NC}"
echo ""

# ─── Minify CSS ───
echo -e "${YELLOW}[5/7] Minifying CSS...${NC}"

TOTAL_CSS_ORIG=0
TOTAL_CSS_MIN=0

if [[ -f "$ROOT/styles/main.css" ]]; then
  ORIG_SIZE=$(wc -c < "$ROOT/styles/main.css")
  "$NODE_MODULES/cleancss" -O2 "$ROOT/styles/main.css" -o "$DIST/styles/main.css"
  MIN_SIZE=$(wc -c < "$DIST/styles/main.css")
  RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
  printf "  %-40s %8s → %8s  (-%d%%)\n" "styles/main.css" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
  TOTAL_CSS_ORIG=$((TOTAL_CSS_ORIG + ORIG_SIZE))
  TOTAL_CSS_MIN=$((TOTAL_CSS_MIN + MIN_SIZE))
fi

# Mobile CSS (check both possible locations)
for MCSS in "mobile/styles/mobile.css" "mobile/scripts/mobile.css"; do
  if [[ -f "$ROOT/$MCSS" ]]; then
    DEST_DIR=$(dirname "$DIST/$MCSS")
    mkdir -p "$DEST_DIR"
    ORIG_SIZE=$(wc -c < "$ROOT/$MCSS")
    "$NODE_MODULES/cleancss" -O2 "$ROOT/$MCSS" -o "$DIST/$MCSS"
    MIN_SIZE=$(wc -c < "$DIST/$MCSS")
    RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
    printf "  %-40s %8s → %8s  (-%d%%)\n" "$MCSS" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
    TOTAL_CSS_ORIG=$((TOTAL_CSS_ORIG + ORIG_SIZE))
    TOTAL_CSS_MIN=$((TOTAL_CSS_MIN + MIN_SIZE))
    break
  fi
done

CSS_SAVED=$((TOTAL_CSS_ORIG - TOTAL_CSS_MIN))
echo -e "  ${GREEN}CSS Total: $(numfmt --to=iec $TOTAL_CSS_ORIG) → $(numfmt --to=iec $TOTAL_CSS_MIN)  (saved $(numfmt --to=iec $CSS_SAVED))${NC}"
echo ""

# ─── Minify HTML ───
echo -e "${YELLOW}[6/7] Minifying HTML...${NC}"

HTML_FILES=(
  "index.html"
  "admin.html"
  "mobile/index.html"
)

TOTAL_HTML_ORIG=0
TOTAL_HTML_MIN=0

for f in "${HTML_FILES[@]}"; do
  if [[ -f "$ROOT/$f" ]]; then
    ORIG_SIZE=$(wc -c < "$ROOT/$f")
    "$NODE_MODULES/html-minifier-terser" \
      --collapse-whitespace \
      --remove-comments \
      --remove-redundant-attributes \
      --remove-script-type-attributes \
      --remove-style-link-type-attributes \
      --minify-css true \
      --minify-js true \
      "$ROOT/$f" -o "$DIST/$f"
    MIN_SIZE=$(wc -c < "$DIST/$f")
    RATIO=$((100 - MIN_SIZE * 100 / ORIG_SIZE))
    printf "  %-40s %8s → %8s  (-%d%%)\n" "$f" "$(numfmt --to=iec $ORIG_SIZE)" "$(numfmt --to=iec $MIN_SIZE)" "$RATIO"
    TOTAL_HTML_ORIG=$((TOTAL_HTML_ORIG + ORIG_SIZE))
    TOTAL_HTML_MIN=$((TOTAL_HTML_MIN + MIN_SIZE))
  fi
done

HTML_SAVED=$((TOTAL_HTML_ORIG - TOTAL_HTML_MIN))
echo -e "  ${GREEN}HTML Total: $(numfmt --to=iec $TOTAL_HTML_ORIG) → $(numfmt --to=iec $TOTAL_HTML_MIN)  (saved $(numfmt --to=iec $HTML_SAVED))${NC}"
echo ""

# ─── Summary ───
echo -e "${YELLOW}[7/7] Build summary${NC}"
GRAND_ORIG=$((TOTAL_JS_ORIG + TOTAL_CSS_ORIG + TOTAL_HTML_ORIG))
GRAND_MIN=$((TOTAL_JS_MIN + TOTAL_CSS_MIN + TOTAL_HTML_MIN))
GRAND_SAVED=$((GRAND_ORIG - GRAND_MIN))
GRAND_RATIO=$((100 - GRAND_MIN * 100 / GRAND_ORIG))

echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "  Original text size:    $(numfmt --to=iec $GRAND_ORIG)"
echo -e "  Minified text size:    $(numfmt --to=iec $GRAND_MIN)"
echo -e "  ${GREEN}Saved:                 $(numfmt --to=iec $GRAND_SAVED) (-${GRAND_RATIO}%)${NC}"
echo -e "  Output:                $DIST/"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Build complete!${NC}"
