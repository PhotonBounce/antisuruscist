// Interactive game-state screenshot harness — drives the game past the signup
// gate into real gameplay/menus and captures each state. Dev/QA only (not deployed).
// Usage: node qa-capture-states.js [outdir] [baseURL]
const puppeteer = require('puppeteer');
const path = require('path');

const OUTDIR = process.argv[2] || 'screencaptures';
const BASE = (process.argv[3] || 'http://localhost:8080').replace(/\/+$/, '');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickSel(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
}
async function exists(page, sel) { return page.evaluate((s) => !!document.querySelector(s), sel); }

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const report = [];

  // ───────── DESKTOP ─────────
  const d = await browser.newPage();
  await d.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  const dErr = [];
  d.on('pageerror', (e) => dErr.push(e.message));
  d.on('console', (m) => { if (m.type() === 'error') dErr.push('[console] ' + m.text()); });

  const shot = async (page, name) => {
    const out = path.join(OUTDIR, name + '.png');
    await page.screenshot({ path: out });
    report.push('  ' + name + '.png');
  };

  await d.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await wait(3500);
  await shot(d, '10-desktop-signup');

  // dismiss signup as guest
  const guest = await clickSel(d, '#reg-guest-btn');
  report.push('reg-guest-btn clicked: ' + guest);
  await wait(1800);
  await shot(d, '11-desktop-lobby');

  // enable god mode (unlocks weapons + survivability for capture)
  const god = await clickSel(d, '#god-mode');
  report.push('god-mode clicked: ' + god);
  await wait(600);

  // start game
  const start = await clickSel(d, '#start-game-btn');
  report.push('start-game-btn clicked: ' + start);
  await wait(4500);
  await shot(d, '12-desktop-gameplay');

  // jump to a later wave for denser combat
  const wave3 = await clickSel(d, '.lvl-btn[data-wave="3"]');
  report.push('wave3 jump clicked: ' + wave3);
  await wait(3500);
  await shot(d, '13-desktop-wave3');

  // open inventory / armory (MENU button)
  const menu = await clickSel(d, '#pause-game');
  report.push('pause/menu clicked: ' + menu);
  await wait(1800);
  await shot(d, '14-desktop-armory');

  // settings (close inventory first via same toggle, then settings)
  await clickSel(d, '#pause-game');
  await wait(600);
  const settings = await clickSel(d, '#settings-btn');
  report.push('settings clicked: ' + settings);
  await wait(1000);
  await shot(d, '15-desktop-settings');

  report.push('DESKTOP pageerrors: ' + dErr.length + (dErr.length ? ' :: ' + dErr.slice(0, 3).join(' | ') : ''));
  await d.close();

  // ───────── MOBILE ─────────
  const m = await browser.newPage();
  await m.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  const mErr = [];
  m.on('pageerror', (e) => mErr.push(e.message));

  await m.goto(BASE + '/mobile/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await wait(3500);
  await shot(m, '16-mobile-cover');
  if (await exists(m, '#reg-guest-btn')) { await clickSel(m, '#reg-guest-btn'); await wait(1500); }
  await shot(m, '17-mobile-lobby');
  await clickSel(m, '#god-mode');
  await wait(400);
  await clickSel(m, '#start-game-btn');
  await wait(4000);
  await shot(m, '18-mobile-gameplay');
  report.push('MOBILE pageerrors: ' + mErr.length);
  await m.close();

  await browser.close();
  console.log(report.join('\n'));
}
run().catch((e) => { console.error('HARNESS ERROR: ' + e.message); process.exit(1); });
