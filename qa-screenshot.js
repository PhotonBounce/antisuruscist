// Reusable QA screenshot tool — captures desktop + mobile views of the game.
// Usage: node qa-screenshot.js <outdir> <prefix> [baseURL] [waitMs]
// Produces <outdir>/<prefix>-desktop.png and <outdir>/<prefix>-mobile.png
// NOTE: dev/QA tool only — excluded from production deploy via .cpanel.yml / .htaccess.
const puppeteer = require('puppeteer');
const path = require('path');

const OUTDIR = process.argv[2] || 'screencaptures';
const PREFIX = process.argv[3] || 'shot';
const BASE = (process.argv[4] || 'http://localhost:8080').replace(/\/+$/, '');
const WAIT = parseInt(process.argv[5] || '9000', 10);

async function shoot(browser, { name, url, viewport, ua }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  if (ua) await page.setUserAgent(ua);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('[console] ' + m.text()); });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, WAIT));
  } catch (e) {
    errs.push('NAV: ' + e.message);
  }
  const out = path.join(OUTDIR, `${PREFIX}-${name}.png`);
  await page.screenshot({ path: out, fullPage: false });
  await page.close();
  return `${name.padEnd(8)} -> ${out}  (errors: ${errs.length})${errs.length ? '\n           ' + errs.slice(0, 5).join('\n           ') : ''}`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const lines = [];
  lines.push(await shoot(browser, {
    name: 'desktop',
    url: BASE + '/',
    viewport: { width: 1366, height: 768, deviceScaleFactor: 1 },
  }));
  lines.push(await shoot(browser, {
    name: 'mobile',
    url: BASE + '/mobile/',
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  }));
  await browser.close();
  console.log(lines.join('\n'));
})();
