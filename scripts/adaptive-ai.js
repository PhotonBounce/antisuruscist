/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — CLIENT-SIDE ADAPTIVE DIFFICULTY v1
   Zero dependencies · localStorage persistence · hooks into ARC_GAME API
   Loaded AFTER main.js — reads game state, adjusts difficulty in real-time
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORAGE_KEY = 'arc_adaptive_ai';
  var TICK_MS     = 2000;   // evaluate every 2 seconds during active play

  // ── Defaults & bounds ──────────────────────────────────────────────────
  var SPEED_MIN  = 0.7,  SPEED_MAX  = 1.4;   // multiplier on zombie walk speed class
  var SPAWN_MIN  = 0.75, SPAWN_MAX  = 1.35;   // multiplier on spawn frequency
  var EMA_ALPHA  = 0.15;                       // smoothing for exponential moving average

  // ── State ──────────────────────────────────────────────────────────────
  var profile = loadProfile();
  var session = {
    shotsFired: 0, shotsHit: 0, kills: 0,
    waveStartTime: 0, lastWave: 0, hpAtWaveEnd: 100,
    combos: 0, headshots: 0
  };
  var tickTimer = null;
  var _zombieObserver = null;

  // ── Persistence ────────────────────────────────────────────────────────
  function loadProfile() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* corrupted — reset */ }
    return {
      gamesPlayed:    0,
      avgAccuracy:    0.5,
      avgKillSpeed:   1.0,    // kills per second
      avgSurvivalPct: 0.8,    // HP% at wave end
      speedMulti:     1.0,
      spawnMulti:     1.0,
      lastUpdated:    Date.now()
    };
  }

  function saveProfile() {
    profile.lastUpdated = Date.now();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}
  }

  // ── EMA helper ─────────────────────────────────────────────────────────
  function ema(current, newVal) {
    return current + EMA_ALPHA * (newVal - current);
  }

  // ── Sigmoid clamp — maps skill 0..1 to multiplier range ───────────────
  function sigmoid(x, min, max) {
    // x expected 0..1, maps to min..max via smooth S-curve
    var s = 1 / (1 + Math.exp(-6 * (x - 0.5)));
    return min + s * (max - min);
  }

  // ── Snapshot game state from ARC_GAME ──────────────────────────────────
  function snapshotGame() {
    var G = window.ARC_GAME;
    if (!G || !G.gameActive) return null;

    // Read accuracy from DOM (main.js exposes shotsFired/shotsHit as closured vars,
    // but we can derive from the crosshair ammo & kill count)
    var kills = G.zombieKilled || 0;
    var wave  = G.wave || 1;

    return { kills: kills, wave: wave, active: G.gameActive, paused: G.gamePaused };
  }

  // ── Core tick — evaluate player performance ────────────────────────────
  function tick() {
    var snap = snapshotGame();
    if (!snap || !snap.active || snap.paused) return;

    // Detect wave change
    if (snap.wave !== session.lastWave) {
      if (session.lastWave > 0) {
        // Wave ended — record
        var elapsed = (Date.now() - session.waveStartTime) / 1000;
        var waveKills = snap.kills - session.kills;
        var killSpeed = elapsed > 0 ? waveKills / elapsed : 0;

        // Read HP from DOM
        var hpEl = document.getElementById('shooter-hp-label');
        var hp = hpEl ? (parseInt(hpEl.textContent) || 100) : 100;

        // Update profile with EMA
        profile.avgKillSpeed   = ema(profile.avgKillSpeed, killSpeed);
        profile.avgSurvivalPct = ema(profile.avgSurvivalPct, hp / 100);

        // Read accuracy from game stats (shooterShotsFired/Hit)
        var _G = window.ARC_GAME;
        var _sf = _G ? _G.shooterShotsFired || 0 : 0, _sh = _G ? _G.shooterShotsHit || 0 : 0;
        if (_sf > 0) {
          var accVal = _sh / _sf;
          profile.avgAccuracy = ema(profile.avgAccuracy, accVal);
        }

        recalcMultipliers();
        saveProfile();
        updateDifficultyBadge();
      }
      // New wave started
      session.lastWave = snap.wave;
      session.waveStartTime = Date.now();
      session.kills = snap.kills;
    }
  }

  // ── Recalculate difficulty multipliers based on player skill ───────────
  function recalcMultipliers() {
    // Composite skill score: 0 = struggling, 1 = dominating
    var skill = (
      profile.avgAccuracy    * 0.35 +
      Math.min(profile.avgKillSpeed / 2.0, 1.0) * 0.35 +
      profile.avgSurvivalPct * 0.30
    );

    // Better players get faster zombies and tighter spawns
    profile.speedMulti = sigmoid(skill, SPEED_MIN, SPEED_MAX);
    profile.spawnMulti = sigmoid(skill, SPAWN_MIN, SPAWN_MAX);
  }

  // ── Monkey-patch createZombies to apply speed adjustment ───────────────
  // We intercept via MutationObserver on the game canvas instead of patching
  // internals — cleaner, no coupling to main.js closures.
  function observeZombies() {
    var canves = document.getElementById('canves');
    if (!canves) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1 && node.classList && node.classList.contains('zombie')) {
            adjustZombieSpeed(node);
          }
        }
      }
    });

    observer.observe(canves, { childList: true });
    _zombieObserver = observer;
  }

  function adjustZombieSpeed(el) {
    var multi = profile.speedMulti;
    if (multi === 1.0) return; // no adjustment needed

    // The game uses walk-speed-N classes where N maps to animation duration.
    // Zombies may have multiple comma-separated animations — adjust each one.
    var style = window.getComputedStyle(el);
    var raw = style.animationDuration; // e.g. "0.55s, 1.2s"
    if (!raw || raw === 'none' || raw === '0s') return;
    var parts = raw.split(',');
    var adjusted = parts.map(function(p) {
      var dur = parseFloat(p);
      if (!dur || dur <= 0) return p.trim();
      return (dur / multi).toFixed(2) + 's';
    });
    el.style.animationDuration = adjusted.join(', ');
  }

  // ── Expose API for debugging and other scripts ─────────────────────────
  window.ARC_ADAPTIVE = {
    getProfile: function () { return JSON.parse(JSON.stringify(profile)); },
    getSession: function () { return JSON.parse(JSON.stringify(session)); },
    reset: function () {
      profile = loadProfile();
      profile.gamesPlayed = 0;
      profile.avgAccuracy = 0.5;
      profile.avgKillSpeed = 1.0;
      profile.avgSurvivalPct = 0.8;
      profile.speedMulti = 1.0;
      profile.spawnMulti = 1.0;
      saveProfile();
      return 'Adaptive AI reset to defaults';
    },
    getSkillScore: function () {
      return (
        profile.avgAccuracy * 0.35 +
        Math.min(profile.avgKillSpeed / 2.0, 1.0) * 0.35 +
        profile.avgSurvivalPct * 0.30
      ).toFixed(3);
    },
    getDifficulty: function () {
      return {
        speedMulti: profile.speedMulti.toFixed(3),
        spawnMulti: profile.spawnMulti.toFixed(3),
        skill: this.getSkillScore()
      };
    },
    getSpawnMultiplier: function () { return profile.spawnMulti; },
    getSpeedMultiplier: function () { return profile.speedMulti; }
  };

  // ── Difficulty badge on HUD ────────────────────────────────────────────
  function updateDifficultyBadge() {
    var badge = document.getElementById('ai-diff-badge');
    if (!badge) {
      var hud = document.getElementById('score-hud');
      if (!hud) return;
      badge = document.createElement('span');
      badge.id = 'ai-diff-badge';
      badge.style.cssText = 'margin-left:8px;font-size:10px;opacity:0.7;letter-spacing:0.05em;';
      hud.appendChild(badge);
    }
    var skill = parseFloat(
      (profile.avgAccuracy * 0.35 +
       Math.min(profile.avgKillSpeed / 2.0, 1.0) * 0.35 +
       profile.avgSurvivalPct * 0.30).toFixed(2)
    );
    var labels = ['🟢 EASY','🟡 NORMAL','🟠 HARD','🔴 BRUTAL'];
    var idx = skill < 0.35 ? 0 : skill < 0.55 ? 1 : skill < 0.75 ? 2 : 3;
    badge.textContent = labels[idx];
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  function boot() {
    // Wait for ARC_GAME to be available
    if (!window.ARC_GAME) {
      setTimeout(boot, 500);
      return;
    }
    profile.gamesPlayed++;
    recalcMultipliers();
    saveProfile();
    observeZombies();
    updateDifficultyBadge();

    // Clear stale timer if boot is called again (page didn't reload)
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, TICK_MS);

    // Stop ticking when game ends to avoid orphan interval
    var _checkAlive = setInterval(function() {
      var G = window.ARC_GAME;
      if (!G || !G.gameActive) {
        clearInterval(tickTimer);
        clearInterval(_checkAlive);
        if (_zombieObserver) { _zombieObserver.disconnect(); _zombieObserver = null; }
        tickTimer = null;
      }
    }, 5000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
