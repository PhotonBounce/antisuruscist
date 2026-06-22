// ── Anti-Ruscist — Server API Adapter ─────────────────────────────────
// Drop-in client module. Wraps all server API calls.
// Uses anon_id from localStorage for auth. Falls back to localStorage if server is unreachable.
// Include via <script src="scripts/api-client.js"></script> AFTER jQuery.

(function(window) {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────
  var API_BASE = window.ARC_API_BASE || (function() {
    // Check for a manually-configured external API URL (set via admin panel or ARC_API.setApiUrl)
    var saved = localStorage.getItem('arc_api_url');
    if (saved) return saved.replace(/\/+$/, '');  // strip trailing slashes

    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001';
    // Shared hosting — no Node.js backend; use localStorage fallback unless external API URL is configured
    if (h === 'www.photon-bounce.com' || h === 'photon-bounce.com') return '';
    return location.origin.replace(/-\d+\.app\.github\.dev/, '-3001.app.github.dev');
  })();  // auto-detect server port or use saved external API URL
  var SYNC_INTERVAL = 60000; // auto-sync every 60s
  var _syncTimer = null;
  var _online = false;

  // ── Anonymous ID (persistent, generated once) ───────────────────────
  function getAnonId() {
    var id = localStorage.getItem('arc_anon_id');
    if (!id) {
      id = 'arc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('arc_anon_id', id);
    }
    return id;
  }

  // ── Fetch wrapper ───────────────────────────────────────────────────
  function apiCall(method, endpoint, body) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timeoutId  = controller ? setTimeout(function() { controller.abort(); }, 10000) : null;
    var opts = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Anon-Id': getAnonId()
      }
    };
    if (controller) opts.signal = controller.signal;
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    return fetch(API_BASE + '/api' + endpoint, opts)
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || 'API error ' + r.status); });
        return r.json();
      })
      .then(function(data) {
        _online = true;
        if (timeoutId) clearTimeout(timeoutId);
        return data;
      })
      .catch(function(err) {
        _online = false;
        if (timeoutId) clearTimeout(timeoutId);
        console.warn('[ARC-API] Offline or error:', err.message);
        return null;
      });
  }

  // ── Player auth / registration ──────────────────────────────────────
  function auth(opts) {
    return apiCall('POST', '/player/auth', Object.assign({ anon_id: getAnonId() }, opts || {}));
  }

  // ── Sync: push local state to server ────────────────────────────────
  function syncToServer() {
    if (!_online && !API_BASE) return Promise.resolve(null);

    var data = {
      stats: {
        credits:       window.credits || 500,
        arcoins:       window.arcoins || +(localStorage.getItem('arc_balance') || 0),
        total_earned:  +(localStorage.getItem('arc_total_earned') || 0),
        total_kills:   +(localStorage.getItem('arc_total_kills') || 0),
        total_wins:    +(localStorage.getItem('arc_total_wins') || 0),
        max_wave:      +(localStorage.getItem('arc_max_wave') || 0),
        login_streak:  +(localStorage.getItem('arc_login_streak') || 0),
        streak_multi:  +(localStorage.getItem('arc_streak_multi') || 1),
        shots_fired:   window.shooterShotsFired || 0,
        shots_hit:     window.shooterShotsHit || 0,
        shots_ukraine: +(localStorage.getItem('arc_shots_ukraine') || 0),
        chain_claims:  +(localStorage.getItem('arc_chain_claims') || 0)
      },
      achievements: (function(){ try { return JSON.parse(localStorage.getItem('arc_achievements') || '[]'); } catch(e) { return []; } })(),
      cosmetics:    (function(){ try { return JSON.parse(localStorage.getItem('arc_cosmetics') || '[]'); } catch(e) { return []; } })(),
      skills:       (function(){ try { return JSON.parse(localStorage.getItem('skill_unlocks') || '[]'); } catch(e) { return []; } })(),
      weapons: (function() {
        var w = [];
        ['shotgun','m16','claymore','stugna','drone_bomb','panzerfaust','pkm','ak12','matador'].forEach(function(id) {
          if (localStorage.getItem('unlocked_' + id) === '1') w.push(id);
        });
        return w;
      })(),
      wave_scores: (function() {
        var ws = [];
        for (var i = 1; i <= 8; i++) {
          var s = +(localStorage.getItem('arc_wave_hs_' + i) || 0);
          if (s > 0) ws.push({ wave_num: i, score: s });
        }
        return ws;
      })()
    };

    return apiCall('POST', '/player/sync', data);
  }

  // ── Sync: pull server state to local ────────────────────────────────
  function syncFromServer() {
    return apiCall('GET', '/player/sync').then(function(d) {
      if (!d) return null;
      // Update localStorage from server data
      if (d.stats) {
        localStorage.setItem('arc_balance', String(d.stats.arcoins || 0));
        localStorage.setItem('arc_total_earned', String(d.stats.total_earned || 0));
        localStorage.setItem('arc_total_kills', String(d.stats.total_kills || 0));
        localStorage.setItem('arc_total_wins', String(d.stats.total_wins || 0));
        localStorage.setItem('arc_max_wave', String(d.stats.max_wave || 0));
        localStorage.setItem('arc_login_streak', String(d.stats.login_streak || 0));
        localStorage.setItem('arc_streak_multi', String(d.stats.streak_multi || 1));
        localStorage.setItem('arc_shots_ukraine', String(d.stats.shots_ukraine || 0));
      }
      if (d.achievements) localStorage.setItem('arc_achievements', JSON.stringify(d.achievements));
      if (d.skills) localStorage.setItem('skill_unlocks', JSON.stringify(d.skills));
      return d;
    });
  }

  // ── Start auto-sync ─────────────────────────────────────────────────
  function startAutoSync() {
    if (_syncTimer) return;
    // Initial auth + sync
    auth({
      username: localStorage.getItem('arc_username') || 'Fighter',
      email: localStorage.getItem('arc_user_email') || undefined,
      wallet_addr: localStorage.getItem('arc_wallet_addr') || undefined
    }).then(function() {
      syncToServer();
    });
    // Periodic sync
    _syncTimer = setInterval(function() {
      syncToServer();
    }, SYNC_INTERVAL);
    // Sync on page unload
    window.addEventListener('beforeunload', function() {
      if (navigator.sendBeacon && _online) {
        navigator.sendBeacon(API_BASE + '/api/player/sync', new Blob([JSON.stringify({
          anon_id: getAnonId(),
          stats: { credits: window.credits || 500, arcoins: window.arcoins || 0 }
        })], { type: 'application/json' }));
      }
    });
  }

  // ── Specific API calls ──────────────────────────────────────────────
  function recordMinigame(game, won) { return apiCall('POST', '/player/minigame', { game: game, won: won }); }
  function placePutinBet(amount, date) { return apiCall('POST', '/player/death-pool/bet', { bet_amount: amount, bet_date: date }); }
  function getDeathPool() { return apiCall('GET', '/death-pool/all'); }
  function recordDonation(amount, currency, txHash, method) {
    return apiCall('POST', '/donation', { amount: amount, currency: currency, tx_hash: txHash, method: method });
  }
  function startSession() { return apiCall('POST', '/player/session/start'); }
  function endSession(sessionId, data) {
    return apiCall('POST', '/player/session/end', Object.assign({ session_id: sessionId }, data));
  }
  function getNews() { return apiCall('GET', '/news'); }
  function fetchGameConfig() { return apiCall('GET', '/game-config'); }

  // ── Leaderboard ─────────────────────────────────────────────────────
  /**
   * Submit the player's score for a period (e.g. 'weekly', 'global').
   * Silently returns null on network failure so callers never need to catch.
   * @param {string} period
   * @param {{ score: number, kills: number, wave: number }} data
   * @returns {Promise<{ok:boolean, rank:number, myScore:number}|null>}
   */
  function submitLeaderboard(period, data) {
    if (!API_BASE) return Promise.resolve(null);
    return apiCall('POST', '/leaderboard/' + encodeURIComponent(period), {
      score: data.score || 0,
      kills: data.kills || 0,
      wave:  data.wave  || 0
    });
  }

  /**
   * Fetch the global top-N leaderboard for a period.
   * Silently returns null on network failure.
   * @param {string} period
   * @param {number} [limit=20]
   * @returns {Promise<{entries:Array, myRank:number|null, total:number}|null>}
   */
  function fetchLeaderboard(period, limit) {
    if (!API_BASE) return Promise.resolve(null);
    var qs = limit ? ('?limit=' + encodeURIComponent(limit)) : '';
    return apiCall('GET', '/leaderboard/' + encodeURIComponent(period) + qs);
  }

  // ── Expose global ───────────────────────────────────────────────────
  // ── External API URL management ───────────────────────────────
  function setApiUrl(url) {
    if (!url) {
      localStorage.removeItem('arc_api_url');
      API_BASE = '';
      _online = false;
    } else {
      url = url.replace(/\/+$/, '');
      localStorage.setItem('arc_api_url', url);
      API_BASE = url;
    }
  }
  function getApiUrl() { return API_BASE; }

  window.ARC_API = {
    getAnonId: getAnonId,
    auth: auth,
    syncToServer: syncToServer,
    syncFromServer: syncFromServer,
    startAutoSync: startAutoSync,
    isOnline: function() { return _online; },
    // API URL management for split deployment
    setApiUrl: setApiUrl,
    getApiUrl: getApiUrl,
    // Specific
    recordMinigame: recordMinigame,
    placePutinBet: placePutinBet,
    getDeathPool: getDeathPool,
    recordDonation: recordDonation,
    startSession: startSession,
    endSession: endSession,
    getNews: getNews,
    fetchGameConfig: fetchGameConfig,
    submitLeaderboard: submitLeaderboard,
    fetchLeaderboard: fetchLeaderboard,
    // Raw
    get: function(ep) { return apiCall('GET', ep); },
    post: function(ep, body) { return apiCall('POST', ep, body); }
  };

})(window);
