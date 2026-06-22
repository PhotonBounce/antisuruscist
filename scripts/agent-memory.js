/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — PERSISTENT AGENT MEMORY SYSTEM v1
   IndexedDB + localStorage · tagged & timestamped · TTL-based expiry
   Cross-session knowledge retention so agents don't re-analyze on reboot
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DB_NAME    = 'arc_agent_memory';
  var DB_VERSION = 1;
  var STORE_NAME = 'memories';
  var LS_PREFIX  = 'arc_mem_';
  var MAX_LS_ITEMS   = 200;   // max localStorage quick-access entries
  var MAX_IDB_ITEMS  = 5000;  // max IndexedDB entries before GC
  var DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days default TTL

  // Memory categories with different retention policies
  var CATEGORIES = {
    player_profile:  { ttl: 30 * 24 * 3600000, priority: 10 },  // 30 days
    game_state:      { ttl: 1 * 24 * 3600000,   priority: 3 },   // 1 day
    agent_state:     { ttl: 7 * 24 * 3600000,   priority: 7 },   // 7 days
    model_weights:   { ttl: 14 * 24 * 3600000,  priority: 9 },   // 14 days
    analysis_cache:  { ttl: 3 * 24 * 3600000,   priority: 5 },   // 3 days
    session_insight: { ttl: 2 * 24 * 3600000,   priority: 4 },   // 2 days
    optimization:    { ttl: 7 * 24 * 3600000,   priority: 8 },   // 7 days
    prediction:      { ttl: 1 * 24 * 3600000,   priority: 6 },   // 1 day
    config_snapshot: { ttl: 14 * 24 * 3600000,  priority: 8 },   // 14 days
    error_pattern:   { ttl: 7 * 24 * 3600000,   priority: 6 }    // 7 days
  };

  var _db = null;
  var _ready = false;
  var _queue = [];

  // ── IndexedDB Init ──────────────────────────────────────────────────
  function openDB(cb) {
    if (_db) { cb(null, _db); return; }
    if (typeof indexedDB === 'undefined') { cb(new Error('IndexedDB not available')); return; }

    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        var store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('tag', 'tag', { unique: false });
        store.createIndex('created', 'created', { unique: false });
        store.createIndex('expires', 'expires', { unique: false });
        store.createIndex('cat_tag', ['category', 'tag'], { unique: false });
      }
    };
    req.onsuccess = function (e) {
      _db = e.target.result;
      _ready = true;
      cb(null, _db);
      // Process queued operations
      while (_queue.length) { _queue.shift()(); }
    };
    req.onerror = function () { cb(new Error('IndexedDB open failed')); };
  }

  function whenReady(fn) {
    if (_ready) { fn(); } else { _queue.push(fn); openDB(function () {}); }
  }

  // ── Core Memory Operations ──────────────────────────────────────────

  /**
   * Store a memory entry
   * @param {string} category - One of CATEGORIES keys
   * @param {string} tag - Searchable tag (e.g., 'weapon_balance', 'churn_risk')
   * @param {*} data - Any serializable data
   * @param {object} [opts] - { ttl: ms, source: string, confidence: 0-1 }
   * @param {function} [cb] - callback(err, id)
   */
  function store(category, tag, data, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    cb = cb || function () {};

    var catConfig = CATEGORIES[category] || { ttl: DEFAULT_TTL_MS, priority: 5 };
    var ttl = opts.ttl || catConfig.ttl;
    var now = Date.now();

    var entry = {
      category: category,
      tag: tag,
      data: data,
      source: opts.source || 'unknown',
      confidence: typeof opts.confidence === 'number' ? opts.confidence : 1.0,
      priority: catConfig.priority,
      created: now,
      updated: now,
      expires: now + ttl,
      accessCount: 0,
      lastAccessed: now
    };

    whenReady(function () {
      try {
        var tx = _db.transaction(STORE_NAME, 'readwrite');
        var st = tx.objectStore(STORE_NAME);
        var req = st.add(entry);
        req.onsuccess = function () {
          // Also store in localStorage for quick access (hot cache)
          _cacheToLS(category, tag, data, entry.expires);
          cb(null, req.result);
        };
        req.onerror = function () { cb(new Error('Store failed')); };
      } catch (e) { cb(e); }
    });
  }

  /**
   * Recall memories by category and optional tag
   * @param {string} category
   * @param {string} [tag] - optional filter
   * @param {object} [opts] - { limit: N, minConfidence: 0-1, includeExpired: bool }
   * @param {function} cb - callback(err, entries[])
   */
  function recall(category, tag, opts, cb) {
    if (typeof tag === 'function') { cb = tag; tag = null; opts = {}; }
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    cb = cb || function () {};

    // Try localStorage hot cache first for simple lookups
    if (tag && !opts.includeExpired) {
      var cached = _recallFromLS(category, tag);
      if (cached !== null) {
        cb(null, [{ category: category, tag: tag, data: cached, source: 'ls_cache' }]);
        return;
      }
    }

    whenReady(function () {
      try {
        var tx = _db.transaction(STORE_NAME, 'readonly');
        var st = tx.objectStore(STORE_NAME);
        var results = [];
        var now = Date.now();
        var idx = tag ? st.index('cat_tag') : st.index('category');
        var range = tag ? IDBKeyRange.only([category, tag]) : IDBKeyRange.only(category);

        idx.openCursor(range, 'prev').onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor) {
            var entry = cursor.value;
            var valid = opts.includeExpired || entry.expires > now;
            var confOk = !opts.minConfidence || entry.confidence >= opts.minConfidence;
            if (valid && confOk) {
              results.push(entry);
            }
            if (!opts.limit || results.length < opts.limit) {
              cursor.continue();
            } else {
              cb(null, results);
            }
          } else {
            cb(null, results);
          }
        };
      } catch (e) { cb(e); }
    });
  }

  /**
   * Update an existing memory entry (upsert by category+tag)
   */
  function update(category, tag, data, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    cb = cb || function () {};

    recall(category, tag, { limit: 1 }, function (err, entries) {
      if (err) { cb(err); return; }
      if (entries.length && entries[0].id) {
        // Update existing
        whenReady(function () {
          var tx = _db.transaction(STORE_NAME, 'readwrite');
          var st = tx.objectStore(STORE_NAME);
          var getReq = st.get(entries[0].id);
          getReq.onsuccess = function () {
            var entry = getReq.result;
            if (entry) {
              entry.data = data;
              entry.updated = Date.now();
              if (opts.confidence !== undefined) entry.confidence = opts.confidence;
              var catConfig = CATEGORIES[category] || { ttl: DEFAULT_TTL_MS };
              entry.expires = Date.now() + (opts.ttl || catConfig.ttl);
              st.put(entry);
              _cacheToLS(category, tag, data, entry.expires);
            }
            cb(null, entry ? entry.id : null);
          };
        });
      } else {
        // Insert new
        store(category, tag, data, opts, cb);
      }
    });
  }

  /**
   * Search memories across all categories by keyword in tags
   */
  function search(keyword, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    opts = opts || {};
    cb = cb || function () {};

    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var st = tx.objectStore(STORE_NAME);
      var results = [];
      var now = Date.now();
      var kw = keyword.toLowerCase();

      st.openCursor(null, 'prev').onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          var entry = cursor.value;
          var tagMatch = (entry.tag || '').toLowerCase().indexOf(kw) !== -1;
          var catMatch = (entry.category || '').toLowerCase().indexOf(kw) !== -1;
          if ((tagMatch || catMatch) && entry.expires > now) {
            results.push(entry);
          }
          if (!opts.limit || results.length < opts.limit) {
            cursor.continue();
          } else {
            cb(null, results);
          }
        } else {
          cb(null, results);
        }
      };
    });
  }

  /**
   * Forget (delete) memories by category and optional tag
   */
  function forget(category, tag, cb) {
    cb = cb || function () {};
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var st = tx.objectStore(STORE_NAME);
      var idx = tag ? st.index('cat_tag') : st.index('category');
      var range = tag ? IDBKeyRange.only([category, tag]) : IDBKeyRange.only(category);
      var deleted = 0;

      idx.openCursor(range).onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        } else {
          _removeLSCache(category, tag);
          cb(null, deleted);
        }
      };
    });
  }

  // ── Garbage Collection ──────────────────────────────────────────────

  /**
   * Remove expired entries and enforce max limits
   */
  function gc(cb) {
    cb = cb || function () {};
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var st = tx.objectStore(STORE_NAME);
      var now = Date.now();
      var expiredCount = 0;

      // Phase 1: Remove expired entries
      st.index('expires').openCursor(IDBKeyRange.upperBound(now)).onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          expiredCount++;
          cursor.continue();
        } else {
          // Phase 2: If still over limit, remove lowest priority + oldest
          _enforceLimit(function (trimmed) {
            _gcLocalStorage();
            cb(null, { expired: expiredCount, trimmed: trimmed });
          });
        }
      };
    });
  }

  function _enforceLimit(cb) {
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var st = tx.objectStore(STORE_NAME);
      var countReq = st.count();
      countReq.onsuccess = function () {
        var count = countReq.result;
        if (count <= MAX_IDB_ITEMS) { cb(0); return; }

        var toRemove = count - MAX_IDB_ITEMS;
        var removed = 0;

        // Remove oldest first (created index ascending)
        st.index('created').openCursor(null, 'next').onsuccess = function (e) {
          var cursor = e.target.result;
          if (cursor && removed < toRemove) {
            cursor.delete();
            removed++;
            cursor.continue();
          } else {
            cb(removed);
          }
        };
      };
    });
  }

  // ── localStorage Hot Cache ──────────────────────────────────────────

  function _lsKey(cat, tag) { return LS_PREFIX + cat + ':' + tag; }

  function _cacheToLS(category, tag, data, expires) {
    try {
      var key = _lsKey(category, tag);
      localStorage.setItem(key, JSON.stringify({ d: data, e: expires }));
    } catch (e) { /* quota exceeded — skip cache */ }
  }

  function _recallFromLS(category, tag) {
    try {
      var key = _lsKey(category, tag);
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (obj.e && obj.e < Date.now()) {
        localStorage.removeItem(key);
        return null;
      }
      return obj.d;
    } catch (e) { return null; }
  }

  function _removeLSCache(category, tag) {
    if (tag) {
      try { localStorage.removeItem(_lsKey(category, tag)); } catch (e) {}
    } else {
      // Remove all LS entries for this category
      var prefix = LS_PREFIX + category + ':';
      try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(prefix) === 0) keys.push(k);
        }
        keys.forEach(function (k) { localStorage.removeItem(k); });
      } catch (e) {}
    }
  }

  function _gcLocalStorage() {
    try {
      var memKeys = [];
      var now = Date.now();
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(LS_PREFIX) === 0) {
          memKeys.push(k);
          // Remove expired
          try {
            var obj = JSON.parse(localStorage.getItem(k));
            if (obj.e && obj.e < now) { localStorage.removeItem(k); }
          } catch (e) {}
        }
      }
      // Enforce count limit — remove oldest entries first
      if (memKeys.length > MAX_LS_ITEMS) {
        memKeys.sort(function (a, b) {
          try {
            var ta = JSON.parse(localStorage.getItem(a));
            var tb = JSON.parse(localStorage.getItem(b));
            return (ta.t || 0) - (tb.t || 0); // oldest first
          } catch (e) { return 0; }
        });
        memKeys.slice(0, memKeys.length - MAX_LS_ITEMS).forEach(function (k) {
          localStorage.removeItem(k);
        });
      }
    } catch (e) {}
  }

  // ── Summary & Stats ─────────────────────────────────────────────────

  /**
   * Get memory system statistics
   */
  function getStats(cb) {
    cb = cb || function () {};
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var st = tx.objectStore(STORE_NAME);
      var stats = { total: 0, byCategory: {}, oldestMs: Infinity, newestMs: 0 };

      st.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) {
          stats.total++;
          var cat = cursor.value.category;
          stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
          if (cursor.value.created < stats.oldestMs) stats.oldestMs = cursor.value.created;
          if (cursor.value.created > stats.newestMs) stats.newestMs = cursor.value.created;
          cursor.continue();
        } else {
          stats.lsCacheItems = 0;
          for (var i = 0; i < localStorage.length; i++) {
            if ((localStorage.key(i) || '').indexOf(LS_PREFIX) === 0) stats.lsCacheItems++;
          }
          cb(null, stats);
        }
      };
    });
  }

  /**
   * Export all memories as JSON (for backup/transfer)
   */
  function exportAll(cb) {
    cb = cb || function () {};
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readonly');
      var st = tx.objectStore(STORE_NAME);
      var all = [];
      st.openCursor().onsuccess = function (e) {
        var cursor = e.target.result;
        if (cursor) { all.push(cursor.value); cursor.continue(); }
        else { cb(null, all); }
      };
    });
  }

  /**
   * Import memories from JSON array
   */
  function importAll(entries, cb) {
    cb = cb || function () {};
    if (!Array.isArray(entries)) { cb(new Error('Expected array')); return; }
    whenReady(function () {
      var tx = _db.transaction(STORE_NAME, 'readwrite');
      var st = tx.objectStore(STORE_NAME);
      var count = 0;
      entries.forEach(function (entry) {
        delete entry.id; // let auto-increment assign new IDs
        st.add(entry);
        count++;
      });
      tx.oncomplete = function () { cb(null, count); };
      tx.onerror = function () { cb(new Error('Import failed')); };
    });
  }

  // ── Initialize ──────────────────────────────────────────────────────
  openDB(function (err) {
    if (err) {
      console.warn('[AgentMemory] IndexedDB not available, falling back to localStorage only');
    } else {
      // Run GC on boot (non-blocking)
      setTimeout(function () { gc(); }, 3000);
    }
  });

  // ── Public API ──────────────────────────────────────────────────────
  window.ARC_MEMORY = {
    store:     store,
    recall:    recall,
    update:    update,
    search:    search,
    forget:    forget,
    gc:        gc,
    getStats:  getStats,
    exportAll: exportAll,
    importAll: importAll,
    CATEGORIES: CATEGORIES
  };

})();
