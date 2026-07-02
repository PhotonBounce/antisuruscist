// Bug-hunt: collect failed requests (4xx/5xx + net errors) and JS errors across game states.
const puppeteer = require('puppeteer');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  const http4xx = new Set(), netfail = new Set(), pageErr = [], consoleErr = [];
  p.on('response', (r) => { const s = r.status(); if (s >= 400) http4xx.add(s + ' ' + r.url().replace('http://localhost:8080','')); });
  p.on('requestfailed', (r) => netfail.add((r.failure()?r.failure().errorText:'?') + ' ' + r.url().replace('http://localhost:8080','')));
  p.on('pageerror', (e) => pageErr.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.text()); });
  const clk = (s)=>p.evaluate((x)=>{const e=document.querySelector(x);if(e){e.click();return true;}return false;},s);
  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle2', timeout: 25000 }).catch(()=>{});
  await wait(2500);
  if (await p.evaluate(()=>!!document.querySelector('#reg-guest-btn'))) { await clk('#reg-guest-btn'); await wait(1200); }
  await clk('#god-mode'); await wait(300);
  await clk('#start-game-btn'); await wait(3500);
  for (const w of ['2','3','4']) { await clk('.lvl-btn[data-wave="'+w+'"]'); await wait(2500); }
  await p.evaluate(()=>{ if(window.openInventory) window.openInventory('inv-sec-armory'); }); await wait(1500);
  console.log('=== HTTP 4xx/5xx (real missing/broken assets) ===');
  console.log([...http4xx].sort().join('\n') || '(none)');
  console.log('\n=== net failures (ERR_*; localhost:3001 = backend-off = expected) ===');
  console.log([...netfail].sort().join('\n') || '(none)');
  console.log('\n=== pageerrors (JS exceptions — REAL BUGS) (' + pageErr.length + ') ===');
  console.log(pageErr.slice(0,15).join('\n') || '(none)');
  await b.close();
})().catch(e=>{console.error('ERR '+e.message);process.exit(1);});
