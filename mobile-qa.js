/**
 * Mobile-format headless QA — emulates iPhone 14 viewport (landscape)
 * Checks: page load, DOM structure, callin-panel position, zombie bottom,
 * truck direction, overlapping, reinforcements icons, and general layout
 */
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  // iPhone 14 landscape viewport
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  console.log('=== MOBILE QA — Loading mobile/index.html ===');
  await page.goto('http://localhost:8080/mobile/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check basic page load
  const title = await page.title();
  console.log('Title:', title);

  // Check jQuery loaded
  const jq = await page.evaluate(() => typeof jQuery !== 'undefined');
  console.log('jQuery loaded:', jq);

  // Check for rotate prompt (should be hidden in landscape)
  const rotateVisible = await page.evaluate(() => {
    const el = document.getElementById('rotate-prompt');
    return el ? getComputedStyle(el).display : 'not-found';
  });
  console.log('Rotate prompt display:', rotateVisible);

  // Check game cover visible (intro state)
  const gameCoverVisible = await page.evaluate(() => {
    const el = document.querySelector('.game-cover');
    if (!el) return 'not-found';
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden';
  });
  console.log('Game cover visible:', gameCoverVisible);

  // Check start button
  const startBtn = await page.evaluate(() => {
    const el = document.getElementById('start-game-btn');
    return el ? el.textContent.trim() : 'not-found';
  });
  console.log('Start button text:', startBtn);

  // Check mobile topbar
  const topbar = await page.evaluate(() => {
    const el = document.getElementById('mob-topbar');
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    return { exists: true, height: r.height, top: r.top, display: getComputedStyle(el).display };
  });
  console.log('Mobile topbar:', JSON.stringify(topbar));

  // Check mobile bottombar
  const bottombar = await page.evaluate(() => {
    const el = document.getElementById('mob-bottombar');
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { exists: true, height: r.height, bottom: window.innerHeight - r.bottom, display: s.display };
  });
  console.log('Mobile bottombar:', JSON.stringify(bottombar));

  // Dismiss registration overlay (blocks start button)
  await page.evaluate(() => {
    const gb = document.querySelector('#reg-guest-btn');
    if (gb) gb.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Click start to enter gameplay (use evaluate — overlay may block Puppeteer .click)
  console.log('\n=== Starting game... ===');
  await page.evaluate(() => {
    const btn = document.getElementById('start-game-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 8000));

  // Check callin-panel (reinforcements) position and visibility
  const callinPanel = await page.evaluate(() => {
    const el = document.getElementById('callin-panel');
    if (!el) return { exists: false };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const btns = el.querySelectorAll('.ci-btn');
    const btnPositions = [];
    btns.forEach(b => {
      const br = b.getBoundingClientRect();
      btnPositions.push({ name: b.querySelector('.ci-name')?.textContent, left: Math.round(br.left), top: Math.round(br.top), width: Math.round(br.width), height: Math.round(br.height) });
    });
    return {
      exists: true,
      display: s.display,
      position: s.position,
      left: Math.round(r.left),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      width: Math.round(r.width),
      height: Math.round(r.height),
      centerX: Math.round(r.left + r.width / 2),
      viewportCenter: Math.round(window.innerWidth / 2),
      btns: btnPositions
    };
  });
  console.log('\n=== CALLIN PANEL (Reinforcements) ===');
  console.log(JSON.stringify(callinPanel, null, 2));

  // Check if callin panel is centered (user says it's in center)
  if (callinPanel.exists) {
    const isCentered = Math.abs(callinPanel.centerX - callinPanel.viewportCenter) < 50;
    console.log('Callin panel is centered:', isCentered, '(centerX:', callinPanel.centerX, 'vs viewport center:', callinPanel.viewportCenter, ')');
  }

  // Check zombie positions
  const zombies = await page.evaluate(() => {
    const zs = document.querySelectorAll('.zombie');
    if (!zs.length) return [];
    return Array.from(zs).slice(0, 5).map(z => {
      const r = z.getBoundingClientRect();
      const s = getComputedStyle(z);
      return {
        class: z.className,
        bottom: Math.round(r.bottom),
        top: Math.round(r.top),
        left: Math.round(r.left),
        cssBottom: s.bottom,
        cssTop: s.top,
        viewportHeight: window.innerHeight
      };
    });
  });
  console.log('\n=== ZOMBIES ===');
  console.log('Count:', zombies.length);
  if (zombies.length > 0) {
    zombies.forEach((z, i) => {
      console.log(`  Z${i}: bottom=${z.bottom} top=${z.top} left=${z.left} vpHeight=${z.viewportHeight} class=${z.class.substring(0, 60)}`);
      if (z.bottom > z.viewportHeight - 52) {
        console.log(`  ⚠️ ZOMBIE ${i} IS AT/BELOW BOTTOM BAR (bottom=${z.bottom} vs vpH-52=${z.viewportHeight - 52})`);
      }
    });
  }

  // Check truck/vehicle direction
  const vehicles = await page.evaluate(() => {
    const results = [];
    // Check trucks
    document.querySelectorAll('.truck, .supply-truck, [class*="truck"]').forEach(el => {
      const s = getComputedStyle(el);
      results.push({
        type: 'truck',
        class: el.className,
        transform: s.transform,
        scaleX: s.transform,
        direction: s.direction
      });
    });
    // Check tanks
    document.querySelectorAll('.tank, [class*="tank"]').forEach(el => {
      const s = getComputedStyle(el);
      results.push({
        type: 'tank',
        class: el.className,
        transform: s.transform
      });
    });
    // Check Bradley
    document.querySelectorAll('.bradley, .bradley-ifv, [class*="bradley"]').forEach(el => {
      const s = getComputedStyle(el);
      results.push({
        type: 'bradley',
        class: el.className,
        transform: s.transform
      });
    });
    return results;
  });
  console.log('\n=== VEHICLES ===');
  console.log('Count:', vehicles.length);
  vehicles.forEach((v, i) => console.log(`  V${i}:`, JSON.stringify(v)));

  // Check for overlapping elements
  const overlapCheck = await page.evaluate(() => {
    const results = [];
    const checkPairs = [
      ['#mob-topbar', '#callin-panel'],
      ['#mob-topbar', '#jukebox-mini'],
      ['#mob-bottombar', '#callin-panel'],
      ['#mob-bottombar', '#shooter-hud'],
      ['#callin-panel', '.game-cover'],
      ['#mob-topbar', '.wave-banner'],
      ['#mob-bottombar', '.wave-banner'],
    ];
    function getRect(sel) {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      if (s.display === 'none') return null;
      return el.getBoundingClientRect();
    }
    function rectsOverlap(a, b) {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }
    checkPairs.forEach(([sel1, sel2]) => {
      const r1 = getRect(sel1);
      const r2 = getRect(sel2);
      if (r1 && r2) {
        const overlap = rectsOverlap(r1, r2);
        results.push({ el1: sel1, el2: sel2, overlap, r1: { t: Math.round(r1.top), b: Math.round(r1.bottom), l: Math.round(r1.left), r: Math.round(r1.right) }, r2: { t: Math.round(r2.top), b: Math.round(r2.bottom), l: Math.round(r2.left), r: Math.round(r2.right) } });
      }
    });
    return results;
  });
  console.log('\n=== OVERLAP CHECK ===');
  overlapCheck.forEach(o => {
    const flag = o.overlap ? '⚠️ OVERLAP' : '✅ OK';
    console.log(`  ${flag} ${o.el1} vs ${o.el2}`, JSON.stringify(o.r1), 'vs', JSON.stringify(o.r2));
  });

  // Check all element positions/z-index stack
  const zIndexStack = await page.evaluate(() => {
    const sels = ['#mob-topbar', '#mob-bottombar', '#callin-panel', '#shooter-hud', '#jukebox-mini', '#game-crosshair', '.overlay-screen'];
    return sels.map(sel => {
      const el = document.querySelector(sel);
      if (!el) return { sel, exists: false };
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        sel,
        display: s.display,
        position: s.position,
        zIndex: s.zIndex,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right)
      };
    });
  });
  console.log('\n=== Z-INDEX STACK ===');
  zIndexStack.forEach(e => console.log(`  ${e.sel}:`, JSON.stringify(e)));

  // Screenshot for reference
  await page.screenshot({ path: '/tmp/mobile-qa.png', fullPage: false });
  console.log('\nScreenshot saved to /tmp/mobile-qa.png');

  // Check callin-panel CSS specifics
  const callinCSS = await page.evaluate(() => {
    const el = document.getElementById('callin-panel');
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      display: s.display,
      position: s.position,
      top: s.top,
      bottom: s.bottom,
      left: s.left,
      right: s.right,
      flexDirection: s.flexDirection,
      maxWidth: s.maxWidth,
      width: s.width,
      justifyContent: s.justifyContent,
      alignItems: s.alignItems,
      margin: s.margin,
      padding: s.padding
    };
  });
  console.log('\n=== CALLIN PANEL CSS ===');
  console.log(JSON.stringify(callinCSS, null, 2));

  // Check desktop CSS leaking into mobile - is callin-panel using desktop left:50% transform centering?
  const callinDesktopLeak = await page.evaluate(() => {
    const el = document.getElementById('callin-panel');
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      transform: s.transform,
      left: s.left,
      right: s.right,
      margin: s.margin,
      marginLeft: s.marginLeft,
      marginRight: s.marginRight
    };
  });
  console.log('\n=== CALLIN DESKTOP CSS LEAK CHECK ===');
  console.log(JSON.stringify(callinDesktopLeak, null, 2));

  // Check main.css callin-panel base styles
  const callinClasses = await page.evaluate(() => {
    const el = document.getElementById('callin-panel');
    if (!el) return '';
    return el.className;
  });
  console.log('Callin panel classes:', callinClasses);

  console.log('\n=== PAGE ERRORS ===');
  console.log('Count:', errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ERR:', e.substring(0, 150)));

  await browser.close();
  console.log('\n=== MOBILE QA COMPLETE ===');
})();
