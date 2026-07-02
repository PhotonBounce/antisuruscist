// @ts-check
const { test, expect } = require('@playwright/test');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clear localStorage via initScript so the page never has a cached username.
 * This ensures showRegModal() always fires on first load.
 */
async function clearStorage(page) {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (e) {}
  });
}

/**
 * Wait for the signup modal's "Continue as Guest" button, click it, and wait
 * for the modal to detach.  The modal is injected dynamically after images load
 * (~2–8 s in CI), so we allow up to 30 s.
 */
async function dismissSignup(page) {
  const guestBtn = page.locator('#reg-guest-btn');
  await guestBtn.waitFor({ state: 'visible', timeout: 30000 });
  await guestBtn.click();
  // Modal fades out with a 300 ms CSS transition then is .remove()d
  await guestBtn.waitFor({ state: 'detached', timeout: 5000 });
}

/**
 * Wait until ARC_GAME is available (the full engine bootstrap has run).
 */
async function waitForBoot(page) {
  await expect.poll(
    () => page.evaluate(() =>
      typeof window.ARC_GAME !== 'undefined' && typeof window.jQuery !== 'undefined'
    ),
    { timeout: 30000, intervals: [500, 1000, 2000] }
  ).toBe(true);
}

/**
 * Wait until the game cover has `show-start-btn` class (happens after signup
 * is dismissed and _showStartScreen() runs).
 */
async function waitForLobby(page) {
  await expect.poll(
    () => page.evaluate(() =>
      document.querySelector('.game-cover')?.classList.contains('show-start-btn') ?? false
    ),
    { timeout: 20000, intervals: [300, 500, 1000] }
  ).toBe(true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test A: loads without console errors
// ─────────────────────────────────────────────────────────────────────────────
test('loads without console errors', async ({ page }) => {
  const jsErrors = [];

  // pageerror fires for real uncaught JS exceptions (not network noise)
  page.on('pageerror', (err) => {
    jsErrors.push(err.message);
  });

  await clearStorage(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for full engine bootstrap
  await waitForBoot(page);

  // Dismiss the signup gate so the lobby renders
  await dismissSignup(page);

  // After dismissal _showStartScreen() adds show-start-btn to .game-cover
  await waitForLobby(page);

  // Start button is now visible (CSS: .game-cover.show-start-btn .start-game-btn { display: block })
  const startBtn = page.locator('#start-game-btn');
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await expect(startBtn).toContainText('Kill Ruscists');

  // Globals must be present
  const globals = await page.evaluate(() => ({
    hasJQuery: typeof window.jQuery !== 'undefined',
    hasArcGame: typeof window.ARC_GAME !== 'undefined',
  }));
  expect(globals.hasJQuery).toBe(true);
  expect(globals.hasArcGame).toBe(true);

  // No real JS exceptions occurred
  expect(jsErrors, `JS exceptions: ${jsErrors.join('; ')}`).toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test B: guest → start → gameplay
// ─────────────────────────────────────────────────────────────────────────────
test('guest -> start -> gameplay', async ({ page }) => {
  await clearStorage(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await waitForBoot(page);

  // Dismiss signup
  await dismissSignup(page);

  // Wait for the lobby / start button to appear
  await waitForLobby(page);

  // Enable god mode via the global bridge before starting (avoids player death).
  // #god-mode button is hidden while #canves has .intro (CSS rule), so we
  // toggle it programmatically.
  await page.evaluate(() => {
    // The god-mode button toggles a class on the canvas; replicate via the DOM
    // toggle so the game logic sees it.
    const btn = document.getElementById('god-mode');
    if (btn) btn.click();
  });

  // Click "Kill Ruscists Now!" (now visible in the lobby)
  const startBtn = page.locator('#start-game-btn');
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await startBtn.click();

  // Wave 1 starting removes 'intro' from #canves (main.js: if (wave===1) $canves.removeClass('intro'))
  // We also accept score-hud becoming visible as an alternative signal.
  await expect.poll(
    async () => {
      const [noIntro, hudVisible] = await Promise.all([
        page.evaluate(() => !document.getElementById('canves')?.classList.contains('intro')),
        page.locator('#score-hud').isVisible(),
      ]);
      return noIntro || hudVisible;
    },
    { timeout: 30000, intervals: [500, 1000, 2000] }
  ).toBe(true);

  // Call doHitMarker via the ARC_GAME bridge and verify a floating damage number appears
  await page.evaluate(() => {
    window.ARC_GAME.doHitMarker(400, 300, false);
  });

  // .dmg-number is ephemeral (~750 ms); poll until it appears
  await expect.poll(
    () => page.locator('.dmg-number').count(),
    { timeout: 3000, intervals: [100, 200, 300] }
  ).toBeGreaterThan(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test C: inventory opens
// ─────────────────────────────────────────────────────────────────────────────
test('inventory opens', async ({ page }) => {
  await clearStorage(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await waitForBoot(page);

  // Dismiss signup
  await dismissSignup(page);

  // Wait for lobby
  await waitForLobby(page);

  // Enable god mode programmatically (button hidden in intro state)
  await page.evaluate(() => {
    const btn = document.getElementById('god-mode');
    if (btn) btn.click();
  });

  // Start the game
  const startBtn = page.locator('#start-game-btn');
  await expect(startBtn).toBeVisible({ timeout: 10000 });
  await startBtn.click();

  // Wait for gameplay to be active
  await expect.poll(
    async () => {
      const [noIntro, hudVisible] = await Promise.all([
        page.evaluate(() => !document.getElementById('canves')?.classList.contains('intro')),
        page.locator('#score-hud').isVisible(),
      ]);
      return noIntro || hudVisible;
    },
    { timeout: 30000, intervals: [500, 1000, 2000] }
  ).toBe(true);

  // Open the inventory/armory via the pause button.
  // #pause-game is a div element (not a button), visible during gameplay.
  // The game's RAF loop causes constant layout changes (elements moving),
  // so use openInventory() directly via JS to avoid the "not stable" click issue.
  await page.evaluate(() => {
    if (typeof window.openInventory === 'function') {
      window.openInventory('inv-sec-armory');
    } else {
      // fallback: click the pause div via JS to bypass stability check
      document.getElementById('pause-game')?.click();
    }
  });

  // The inventory panel gets class 'open' when active
  await expect.poll(
    () => page.evaluate(() =>
      document.getElementById('inventory-panel')?.classList.contains('open') ?? false
    ),
    { timeout: 15000, intervals: [300, 500, 1000] }
  ).toBe(true);

  // Inventory nav buttons should be rendered inside the panel
  const invPanel = page.locator('#inventory-panel');
  const navBtns = invPanel.locator('.inv-nav-btn');
  await expect(navBtns.first()).toBeVisible({ timeout: 10000 });

  const count = await navBtns.count();
  expect(count).toBeGreaterThan(0);
});
