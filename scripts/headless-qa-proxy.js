#!/usr/bin/env node
'use strict';
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-web-security'] });
  const page = await browser.newPage();

  const errors = [];
  const netFails = [];
  const consoleLog = [];
  const expectedNetFail = [];

  page.on('console', msg => {
    const t = msg.type(), txt = msg.text();
    // Console errors are logged for visibility, but only pageerror/unexpected net fails fail the audit.
    consoleLog.push(t.toUpperCase() + ': ' + txt.slice(0, 200));
  });
  page.on('pageerror', err => errors.push('PAGE_ERROR: ' + err.message));
  page.on('requestfailed', req => {
    const failure = req.url() + ' => ' + (req.failure() ? req.failure().errorText : 'unknown');
    if (/localhost:3001\//.test(req.url())) {
      expectedNetFail.push(failure);
      return;
    }
    netFails.push(failure);
  });

  console.log('Loading game on localhost:8080...');
  await page.goto('http://localhost:8080/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // ── PRE-GAME STATE ──
  console.log('\n=== PRE-GAME STATE ===');
  const preState = await page.evaluate(() => {
    const $ = window.jQuery;
    return {
      coverVisible: !!$('.game-cover:visible').length,
      startBtnVisible: !!$('#start-game-btn:visible').length,
      canvasExists: !!document.getElementById('canves'),
      overlayVisible: !!$('.overlay-screen:visible').length,
      jQueryLoaded: typeof $ === 'function',
      gameActive: !!(window.ARC_GAME && window.ARC_GAME.gameActive),
    };
  });
  console.log(JSON.stringify(preState, null, 2));

  // Dismiss registration modal in automation to emulate a real player choice.
  await page.evaluate(() => {
    const $ = window.jQuery;
    if ($('#reg-guest-btn').length) $('#reg-guest-btn').trigger('click');
  });
  await new Promise(r => setTimeout(r, 300));

  // ── CLICK START ──
  console.log('\n=== CLICKING START ===');
  await page.click('#start-game-btn');
  await new Promise(r => setTimeout(r, 3000));

  const postStart = await page.evaluate(() => {
    const $ = window.jQuery;
    return {
      coverVisible: !!$('.game-cover:visible').length,
      overlayVisible: !!$('.overlay-screen:visible').length,
      callinPanel: !!$('#callin-panel').length,
      callinBtns: ['arty','himars','bradley','rover','firedrone','fpv'].map(id => ({
        id, exists: !!$('#callin-' + id).length, visible: !!$('#callin-' + id + ':visible').length
      })),
      weaponBarExists: !!$('.weapon-bar, .weapon-switcher, [class*=weapon]').length,
      zombiesOnScreen: $('.zombie').length,
      hudElements: {
        wave: !!$('#wave-num, #wave-display, [class*=wave]').length,
        score: !!$('#score-hud, #score-val').length,
        health: !!$('#shooter-hp-bar, #shooter-hp-wrap, #shooter-hp-label').length,
        ammo: !!$('#ammo-count, #ammo-val, [class*=ammo]').length,
      },
    };
  });
  console.log(JSON.stringify(postStart, null, 2));

  // ── WAIT FOR ZOMBIES ──
  console.log('\n=== WAITING FOR ZOMBIES (5s) ===');
  await new Promise(r => setTimeout(r, 5000));

  const gameState = await page.evaluate(() => {
    const $ = window.jQuery;
    return {
      zombieCount: $('.zombie').length,
      tankCount: $('.tank-target').length,
      truckCount: $('[class*=truck]').length,
      gameActiveFlag: !!(window.ARC_GAME && window.ARC_GAME.gameActive),
      gamePausedFlag: !!(window.ARC_GAME && window.ARC_GAME.gamePaused),
      waveNumber: (window.ARC_GAME && window.ARC_GAME.wave) || 'unknown',
      arcBalance: (window.ARC_GAME && typeof window.ARC_GAME.arcoins === 'number') ? window.ARC_GAME.arcoins : (window._arc != null ? window._arc : 'unknown'),
      crosshairActive: !!$('#game-crosshair.active').length,
      deathUpsellVisible: !!$('#death-upsell:visible').length,
    };
  });
  console.log(JSON.stringify(gameState, null, 2));

  // ── SIMULATE CLICKS ON GAME AREA ──
  console.log('\n=== SIMULATING GAMEPLAY (clicking canvas area) ===');
  for (let i = 0; i < 10; i++) {
    await page.mouse.click(300 + Math.random() * 400, 200 + Math.random() * 200);
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 2000));

  const afterShooting = await page.evaluate(() => {
    const $ = window.jQuery;
    return {
      zombieCount: $('.zombie').length,
      shotsElement: !!$('[class*=shot], .muzzle-flash, [class*=muzzle]').length,
    };
  });
  console.log(JSON.stringify(afterShooting, null, 2));

  // ── ERRORS SUMMARY ──
  console.log('\n=== JS ERRORS (' + errors.length + ') ===');
  errors.forEach(e => console.log('  X ' + e.slice(0, 300)));

  console.log('\n=== NETWORK FAILURES (' + netFails.length + ') ===');
  netFails.forEach(f => console.log('  X ' + f));

  console.log('\n=== EXPECTED OFFLINE API FAILURES (' + expectedNetFail.length + ') ===');
  expectedNetFail.forEach(f => console.log('  ~ ' + f));

  console.log('\n=== CONSOLE LOG (last 20) ===');
  consoleLog.slice(-20).forEach(l => console.log('  ' + l));

  await browser.close();
  process.exit((errors.length > 0 || netFails.length > 0) ? 1 : 0);
})();
