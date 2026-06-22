const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const errors = [];
  const logs = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') errors.push(text);
    else logs.push(`[${type}] ${text}`);
  });
  
  page.on('pageerror', err => {
    errors.push('PAGE ERROR: ' + err.message);
  });
  
  page.on('requestfailed', req => {
    errors.push('FAILED REQUEST: ' + req.url() + ' — ' + (req.failure() ? req.failure().errorText : 'unknown'));
  });

  console.log('Loading page...');
  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('DOM loaded. Waiting 10s for JS init...');
    await new Promise(r => setTimeout(r, 10000));
  } catch (e) {
    console.log('NAVIGATION ERROR: ' + e.message);
  }

  // Check DOM state
  const state = await page.evaluate(() => {
    const c = document.getElementById('canves');
    return {
      canvesClasses: c ? c.className : 'NOT FOUND',
      loaderExists: !!document.querySelector('.loader'),
      gameCoverVisible: (() => {
        const gc = document.querySelector('.game-cover');
        if (!gc) return 'NOT FOUND';
        const s = window.getComputedStyle(gc);
        return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
      })(),
      startBtnVisible: (() => {
        const sb = document.querySelector('.start-game-btn, #start-btn, .game-cover .show-start-btn, [data-i18n="startBtn"]');
        return sb ? 'found: ' + sb.textContent.trim().substring(0, 40) : 'NOT FOUND';
      })(),
      inventoryPanel: (() => {
        const ip = document.getElementById('inventory-panel');
        return ip ? 'exists, display: ' + window.getComputedStyle(ip).display : 'NOT FOUND';
      })(),
      scoreHud: !!document.getElementById('score-hud'),
      zombieCount: document.querySelectorAll('.zombie').length,
      jQueryLoaded: typeof window.jQuery !== 'undefined',
      arcGameBridge: typeof window.ARC_GAME !== 'undefined',
      arcAdaptive: typeof window.ARC_ADAPTIVE !== 'undefined',
      langPickerBtns: document.querySelectorAll('.lang-btn').length,
      typewriterText: (document.getElementById('cover-typewriter') || {}).textContent || 'NOT FOUND',
    };
  });

  console.log('\n=== DOM STATE ===');
  for (const [k, v] of Object.entries(state)) {
    console.log(`  ${k}: ${JSON.stringify(v)}`);
  }

  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log('  ❌ ' + e));
  
  if (errors.length === 0) console.log('  ✅ No errors!');

  console.log('\n=== CONSOLE LOGS (first 10) ===');
  logs.slice(0, 10).forEach(l => console.log('  ' + l));

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();
