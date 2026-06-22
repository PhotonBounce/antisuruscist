/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — CLIENT-SIDE ML OPTIMIZATION BRAIN v1
   Lightweight neural network · behavior prediction · engagement optimization
   Zero external dependencies · runs entirely in-browser · uses ARC_MEMORY
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var TICK_INTERVAL = 5000;   // optimization tick every 5s
  var TRAIN_INTERVAL = 60000; // model training every 60s during active play
  var SESSION_SAMPLE_MS = 2000; // collect data points every 2s

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 1: MINI NEURAL NETWORK (feedforward, backprop training)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Create a simple feedforward neural network
   * @param {number[]} layers - e.g., [4, 8, 4, 1] = 4 inputs, 2 hidden layers, 1 output
   * @returns {object} network with predict() and train() methods
   */
  function createNetwork(layers) {
    var weights = [];
    var biases = [];

    // Xavier initialization
    for (var i = 0; i < layers.length - 1; i++) {
      var fanIn = layers[i], fanOut = layers[i + 1];
      var scale = Math.sqrt(2.0 / (fanIn + fanOut));
      var w = [];
      var b = [];
      for (var j = 0; j < fanOut; j++) {
        var row = [];
        for (var k = 0; k < fanIn; k++) {
          row.push((Math.random() * 2 - 1) * scale);
        }
        w.push(row);
        b.push(0);
      }
      weights.push(w);
      biases.push(b);
    }

    // Activation functions
    function relu(x) { return x > 0 ? x : 0.01 * x; } // leaky ReLU
    function reluDeriv(x) { return x > 0 ? 1 : 0.01; }
    function sigmoid(x) { return 1 / (1 + Math.exp(-Math.max(-50, Math.min(50, x)))); }
    function sigmoidDeriv(y) { return y * (1 - y); }

    function forward(input) {
      var activations = [input.slice()];
      var current = input.slice();

      for (var l = 0; l < weights.length; l++) {
        var next = [];
        var isOutput = (l === weights.length - 1);
        for (var j = 0; j < weights[l].length; j++) {
          var sum = biases[l][j];
          for (var k = 0; k < current.length; k++) {
            sum += weights[l][j][k] * current[k];
          }
          next.push(isOutput ? sigmoid(sum) : relu(sum));
        }
        activations.push(next);
        current = next;
      }
      return activations;
    }

    function predict(input) {
      var acts = forward(input);
      return acts[acts.length - 1];
    }

    function train(input, target, lr) {
      lr = lr || 0.01;
      var acts = forward(input);
      var numLayers = weights.length;

      // Compute output error
      var deltas = [];
      var outputLayer = acts[numLayers];
      var outputDelta = [];
      for (var i = 0; i < outputLayer.length; i++) {
        var err = target[i] - outputLayer[i];
        outputDelta.push(err * sigmoidDeriv(outputLayer[i]));
      }
      deltas[numLayers - 1] = outputDelta;

      // Backpropagate
      for (var l = numLayers - 2; l >= 0; l--) {
        var layerDelta = [];
        for (var j = 0; j < weights[l].length; j++) {
          var err = 0;
          for (var k = 0; k < weights[l + 1].length; k++) {
            err += deltas[l + 1][k] * weights[l + 1][k][j];
          }
          layerDelta.push(err * reluDeriv(acts[l + 1][j]));
        }
        deltas[l] = layerDelta;
      }

      // Update weights & biases
      for (var l = 0; l < numLayers; l++) {
        for (var j = 0; j < weights[l].length; j++) {
          for (var k = 0; k < weights[l][j].length; k++) {
            weights[l][j][k] += lr * deltas[l][j] * acts[l][k];
          }
          biases[l][j] += lr * deltas[l][j];
        }
      }

      // Compute loss
      var loss = 0;
      for (var i = 0; i < outputLayer.length; i++) {
        loss += (target[i] - outputLayer[i]) * (target[i] - outputLayer[i]);
      }
      return loss / outputLayer.length;
    }

    function serialize() {
      return { layers: layers, weights: weights, biases: biases };
    }

    function deserialize(data) {
      weights = data.weights;
      biases = data.biases;
    }

    return {
      predict: predict,
      train: train,
      serialize: serialize,
      deserialize: deserialize,
      getWeights: function () { return { weights: weights, biases: biases }; }
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 2: OPTIMIZATION MODELS
  // ══════════════════════════════════════════════════════════════════════

  // Player behavior prediction: [accuracy, killSpeed, waveReached, sessionTime] → [churnRisk]
  var churnModel = createNetwork([4, 8, 4, 1]);

  // Engagement optimization: [timePlaying, recentRewards, difficulty, combo] → [engagementScore]
  var engagementModel = createNetwork([4, 6, 3, 1]);

  // Weapon balance: [weaponId(encoded), kills, accuracy, avgDamage] → [balanceScore]
  var weaponBalanceModel = createNetwork([4, 8, 4, 1]);

  // Economy optimization: [earnRate, spendRate, balance, stakeRatio] → [healthScore]
  var economyModel = createNetwork([4, 6, 3, 1]);

  // Session length prediction: [timeOfDay, dayOfWeek, prevSessionLen, skillLevel] → [predictedMinutes]
  var sessionModel = createNetwork([4, 6, 3, 1]);

  // ── Data collectors ─────────────────────────────────────────────────
  var _sessionData = {
    startTime: Date.now(),
    samples: [],
    kills: 0,
    shots: 0,
    hits: 0,
    maxWave: 0,
    rewardsEarned: 0,
    rewardsSpent: 0,
    comboMax: 0,
    weaponUsage: {},
    deaths: 0,
    pauseCount: 0,
    idleTime: 0,
    lastActivityTime: Date.now()
  };

  var _trainingData = {
    churn: [],
    engagement: [],
    weapon: [],
    economy: [],
    session: []
  };

  // ── Normalization helpers ───────────────────────────────────────────
  function norm(val, min, max) {
    if (max === min) return 0.5;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  function denorm(val, min, max) {
    return val * (max - min) + min;
  }

  // ── Data Collection ─────────────────────────────────────────────────
  function collectSample() {
    var G = window.ARC_GAME;
    if (!G || !G.gameActive) return;

    var now = Date.now();
    var elapsed = (now - _sessionData.startTime) / 1000;

    var sample = {
      t: elapsed,
      kills: G.zombieKilled || 0,
      wave: G.wave || 1,
      hp: 100,
      combo: 0,
      active: !G.gamePaused
    };

    // Read HP from DOM
    var hpEl = document.getElementById('shooter-hp-label');
    if (hpEl) sample.hp = parseInt(hpEl.textContent) || 100;

    // Read combo from DOM
    var comboEl = document.getElementById('combo-label');
    if (comboEl) sample.combo = parseInt(comboEl.textContent) || 0;

    _sessionData.samples.push(sample);
    _sessionData.kills = sample.kills;
    if (sample.wave > _sessionData.maxWave) _sessionData.maxWave = sample.wave;
    if (sample.combo > _sessionData.comboMax) _sessionData.comboMax = sample.combo;

    // Track idle time
    if (!sample.active) {
      _sessionData.idleTime += SESSION_SAMPLE_MS / 1000;
    } else {
      _sessionData.lastActivityTime = now;
    }

    // Keep only last 500 samples (~16 min of data at 2s intervals)
    if (_sessionData.samples.length > 500) {
      _sessionData.samples = _sessionData.samples.slice(-500);
    }
  }

  // ── Feature Engineering ─────────────────────────────────────────────
  function computeFeatures() {
    var G = window.ARC_GAME;
    var adaptive = window.ARC_ADAPTIVE;
    var samples = _sessionData.samples;
    if (samples.length < 3) return null;

    var elapsed = (Date.now() - _sessionData.startTime) / 60000; // minutes
    var recent = samples.slice(-15); // last 30 seconds
    var killDelta = recent.length > 1 ? recent[recent.length - 1].kills - recent[0].kills : 0;
    var killRate = elapsed > 0 ? _sessionData.kills / elapsed : 0;

    // Accuracy from adaptive AI or game state
    var accuracy = 0.5;
    if (adaptive) {
      var prof = adaptive.getProfile();
      accuracy = prof.avgAccuracy || 0.5;
    }
    if (G && G.shooterShotsFired > 0) {
      accuracy = (G.shooterShotsHit || 0) / G.shooterShotsFired;
    }

    // HP trend (are they taking more damage over time?)
    var hpTrend = 0;
    if (recent.length > 1) {
      hpTrend = (recent[recent.length - 1].hp - recent[0].hp) / recent.length;
    }

    // Engagement momentum: combo usage + kill consistency
    var avgCombo = recent.reduce(function (s, r) { return s + r.combo; }, 0) / recent.length;

    return {
      accuracy: accuracy,
      killRate: killRate,
      killRateNorm: norm(killRate, 0, 60),       // 0-60 kills/min
      waveProg: norm(_sessionData.maxWave, 0, 10), // waves 0-10
      sessionMin: elapsed,
      sessionNorm: norm(elapsed, 0, 30),           // 0-30 min sessions
      hpTrend: hpTrend,
      comboAvg: avgCombo,
      comboNorm: norm(avgCombo, 0, 20),
      idleRatio: elapsed > 0 ? _sessionData.idleTime / (elapsed * 60) : 0,
      recentKillDelta: killDelta,
      difficulty: adaptive ? parseFloat(adaptive.getSkillScore()) : 0.5,
      rewardsEarned: _sessionData.rewardsEarned,
      weaponDiversity: Object.keys(_sessionData.weaponUsage).length
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 3: PREDICTION & OPTIMIZATION
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Predict churn risk (0 = likely to stay, 1 = likely to leave)
   */
  function predictChurnRisk() {
    var f = computeFeatures();
    if (!f) return { risk: 0.5, confidence: 0, reason: 'insufficient_data' };

    var input = [f.accuracy, f.killRateNorm, f.waveProg, f.sessionNorm];
    var output = churnModel.predict(input);
    var risk = output[0];

    // Heuristic adjustments (before model is trained)
    if (f.hpTrend < -2 && f.waveProg < 0.2) risk = Math.max(risk, 0.7); // dying early = frustration
    if (f.idleRatio > 0.4) risk = Math.max(risk, 0.6); // lots of idle time
    if (f.comboAvg > 5 && f.accuracy > 0.4) risk = Math.min(risk, 0.3); // doing well

    var reason = risk > 0.7 ? 'high_frustration' : risk > 0.5 ? 'declining_engagement' : risk > 0.3 ? 'moderate' : 'engaged';

    return {
      risk: Math.round(risk * 1000) / 1000,
      confidence: Math.min(f.sessionMin / 5, 1), // confidence grows with session length
      reason: reason,
      features: f
    };
  }

  /**
   * Compute engagement score (0 = bored, 1 = highly engaged)
   */
  function computeEngagement() {
    var f = computeFeatures();
    if (!f) return { score: 0.5, confidence: 0, state: 'unknown' };

    var input = [f.sessionNorm, norm(f.rewardsEarned, 0, 100), f.difficulty, f.comboNorm];
    var output = engagementModel.predict(input);
    var score = output[0];

    // Heuristic overlay
    if (f.idleRatio < 0.1 && f.killRateNorm > 0.3) score = Math.max(score, 0.6);
    if (f.comboAvg > 8) score = Math.max(score, 0.7);
    if (f.recentKillDelta === 0 && f.sessionMin > 2) score = Math.min(score, 0.4);

    var state = score > 0.7 ? 'flow' : score > 0.5 ? 'engaged' : score > 0.3 ? 'casual' : 'disengaged';

    return {
      score: Math.round(score * 1000) / 1000,
      confidence: Math.min(f.sessionMin / 3, 1),
      state: state
    };
  }

  /**
   * Get optimization recommendations
   */
  function getRecommendations() {
    var f = computeFeatures();
    if (!f) return [];

    var recs = [];
    var churn = predictChurnRisk();
    var engage = computeEngagement();

    // Difficulty recommendations
    if (churn.risk > 0.7 && f.waveProg < 0.3) {
      recs.push({
        type: 'difficulty',
        action: 'decrease',
        magnitude: 0.15,
        reason: 'Player struggling — reduce difficulty to prevent churn',
        priority: 9,
        confidence: churn.confidence
      });
    }

    if (engage.state === 'flow' && f.waveProg > 0.6) {
      recs.push({
        type: 'difficulty',
        action: 'increase',
        magnitude: 0.05,
        reason: 'Player in flow state — slight challenge increase to maintain engagement',
        priority: 5,
        confidence: engage.confidence
      });
    }

    // Reward timing recommendations
    if (engage.state === 'disengaged' && f.sessionMin > 3) {
      recs.push({
        type: 'reward',
        action: 'trigger_bonus',
        magnitude: 1.5,
        reason: 'Engagement dropping — consider bonus reward or power-up to re-engage',
        priority: 8,
        confidence: engage.confidence
      });
    }

    // Session pacing
    if (f.sessionMin > 20 && f.idleRatio < 0.1) {
      recs.push({
        type: 'pacing',
        action: 'suggest_break',
        reason: 'Extended intense session — consider suggesting a break for player wellbeing',
        priority: 3,
        confidence: 0.8
      });
    }

    // Weapon balance observation
    if (f.weaponDiversity <= 1 && f.sessionMin > 5) {
      recs.push({
        type: 'weapon_balance',
        action: 'encourage_diversity',
        reason: 'Player only using 1 weapon — consider incentivizing weapon variety',
        priority: 4,
        confidence: 0.6
      });
    }

    // Economy optimization
    if (f.rewardsEarned === 0 && f.sessionMin > 5 && f.kills > 20) {
      recs.push({
        type: 'economy',
        action: 'boost_rewards',
        magnitude: 1.2,
        reason: 'Player active but earning nothing — may feel unrewarded',
        priority: 7,
        confidence: 0.7
      });
    }

    recs.sort(function (a, b) { return b.priority - a.priority; });
    return recs;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 4: ONLINE TRAINING
  // ══════════════════════════════════════════════════════════════════════

  function trainModels() {
    var f = computeFeatures();
    if (!f) return;

    // Generate training data from heuristic labels
    // Churn model: train on session outcome signals
    var churnTarget = f.idleRatio > 0.3 ? 0.8 : f.waveProg > 0.5 ? 0.2 : 0.5;
    churnModel.train([f.accuracy, f.killRateNorm, f.waveProg, f.sessionNorm], [churnTarget], 0.005);

    // Engagement model
    var engageTarget = f.comboNorm * 0.3 + (1 - f.idleRatio) * 0.4 + f.killRateNorm * 0.3;
    engagementModel.train([f.sessionNorm, norm(f.rewardsEarned, 0, 100), f.difficulty, f.comboNorm], [engageTarget], 0.005);

    // Store training progress in memory
    if (window.ARC_MEMORY) {
      window.ARC_MEMORY.update('model_weights', 'churn_model', churnModel.serialize(), {
        source: 'ml_brain_training',
        confidence: Math.min(f.sessionMin / 10, 0.9)
      });
      window.ARC_MEMORY.update('model_weights', 'engagement_model', engagementModel.serialize(), {
        source: 'ml_brain_training',
        confidence: Math.min(f.sessionMin / 10, 0.9)
      });
    }
  }

  /**
   * Load previously trained model weights from memory
   */
  function loadModels(cb) {
    cb = cb || function () {};
    if (!window.ARC_MEMORY) { cb(false); return; }

    var loaded = 0;
    window.ARC_MEMORY.recall('model_weights', 'churn_model', { limit: 1 }, function (err, entries) {
      if (!err && entries.length && entries[0].data && entries[0].data.weights) {
        try { churnModel.deserialize(entries[0].data); loaded++; } catch (e) {}
      }
      window.ARC_MEMORY.recall('model_weights', 'engagement_model', { limit: 1 }, function (err2, entries2) {
        if (!err2 && entries2.length && entries2[0].data && entries2[0].data.weights) {
          try { engagementModel.deserialize(entries2[0].data); loaded++; } catch (e) {}
        }
        cb(loaded > 0);
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 5: PERFORMANCE MONITORING
  // ══════════════════════════════════════════════════════════════════════

  var _fpsHistory = [];
  var _lastFrameTime = 0;
  var _frameCount = 0;

  function measureFPS() {
    var now = performance.now();
    _frameCount++;
    if (now - _lastFrameTime >= 1000) {
      _fpsHistory.push(_frameCount);
      if (_fpsHistory.length > 60) _fpsHistory.shift(); // keep 60 seconds
      _frameCount = 0;
      _lastFrameTime = now;
    }
    if (window.ARC_GAME && window.ARC_GAME.gameActive) {
      requestAnimationFrame(measureFPS);
    }
  }

  function getPerformanceMetrics() {
    if (_fpsHistory.length === 0) return { avgFps: 60, minFps: 60, jank: 0 };
    var sum = _fpsHistory.reduce(function (s, v) { return s + v; }, 0);
    var avg = sum / _fpsHistory.length;
    var min = Math.min.apply(null, _fpsHistory);
    var jank = _fpsHistory.filter(function (f) { return f < 30; }).length;
    return {
      avgFps: Math.round(avg),
      minFps: min,
      jank: jank,
      samples: _fpsHistory.length,
      recommendation: avg < 30 ? 'reduce_effects' : avg < 45 ? 'optimize_spawns' : 'good'
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 6: ANALYTICS & INSIGHTS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Generate a comprehensive session analysis
   */
  function analyzeSession() {
    var f = computeFeatures();
    if (!f) return { status: 'no_data' };

    var churn = predictChurnRisk();
    var engage = computeEngagement();
    var perf = getPerformanceMetrics();
    var recs = getRecommendations();

    var analysis = {
      timestamp: Date.now(),
      session: {
        duration: f.sessionMin,
        kills: _sessionData.kills,
        maxWave: _sessionData.maxWave,
        accuracy: f.accuracy,
        killRate: f.killRate,
        comboMax: _sessionData.comboMax,
        idleRatio: f.idleRatio,
        weaponDiversity: f.weaponDiversity
      },
      predictions: {
        churnRisk: churn,
        engagement: engage
      },
      performance: perf,
      recommendations: recs,
      difficulty: f.difficulty
    };

    // Store analysis in memory for future reference
    if (window.ARC_MEMORY) {
      window.ARC_MEMORY.store('analysis_cache', 'session_analysis', analysis, {
        source: 'ml_brain',
        confidence: Math.min(f.sessionMin / 5, 0.95)
      });

      // Store player profile insights
      window.ARC_MEMORY.update('player_profile', 'skill_level', {
        accuracy: f.accuracy,
        killRate: f.killRate,
        maxWave: _sessionData.maxWave,
        difficulty: f.difficulty,
        lastPlayed: Date.now()
      }, { source: 'ml_brain', confidence: 0.9 });
    }

    return analysis;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 7: BOOT & LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════

  var _sampleTimer = null;
  var _trainTimer = null;
  var _optimizeTimer = null;
  var _checkAliveTimer = null;
  var _booted = false;

  function boot() {
    if (_booted) return;
    if (!window.ARC_GAME) { setTimeout(boot, 500); return; }
    _booted = true;

    // Load previous model weights
    loadModels(function (loaded) {
      if (loaded) {
        console.log('[ML Brain] Restored model weights from memory');
      } else {
        console.log('[ML Brain] Starting with fresh models');
      }
    });

    // Start data collection
    _sampleTimer = setInterval(collectSample, SESSION_SAMPLE_MS);

    // Start periodic training
    _trainTimer = setInterval(trainModels, TRAIN_INTERVAL);

    // Start FPS monitoring
    _lastFrameTime = performance.now();
    requestAnimationFrame(measureFPS);

    // Monitor game end
    _checkAliveTimer = setInterval(function () {
      var G = window.ARC_GAME;
      if (!G || !G.gameActive) {
        // Game ended — clear this timer first, then do final analysis
        clearInterval(_checkAliveTimer);
        _checkAliveTimer = null;
        var analysis = analyzeSession();
        if (analysis.status !== 'no_data') {
          trainModels(); // Final training pass
          console.log('[ML Brain] Session analysis:', analysis.predictions);
        }
        cleanup();
      }
    }, 5000);

    console.log('[ML Brain] Initialized — collecting data, training models');
  }

  function cleanup() {
    if (_sampleTimer) { clearInterval(_sampleTimer); _sampleTimer = null; }
    if (_trainTimer) { clearInterval(_trainTimer); _trainTimer = null; }
    if (_optimizeTimer) { clearInterval(_optimizeTimer); _optimizeTimer = null; }
    if (_checkAliveTimer) { clearInterval(_checkAliveTimer); _checkAliveTimer = null; }
    _booted = false;
  }

  // ── Public API ──────────────────────────────────────────────────────
  window.ARC_ML_BRAIN = {
    // Predictions
    predictChurnRisk: predictChurnRisk,
    computeEngagement: computeEngagement,
    getRecommendations: getRecommendations,
    analyzeSession: analyzeSession,

    // Performance
    getPerformanceMetrics: getPerformanceMetrics,

    // Model management
    loadModels: loadModels,
    trainModels: trainModels,

    // Data
    getSessionData: function () { return JSON.parse(JSON.stringify(_sessionData)); },
    getFeatures: computeFeatures,

    // Network factory (for custom models)
    createNetwork: createNetwork,

    // Lifecycle
    boot: boot,
    cleanup: cleanup,

    // Track events from game
    trackKill: function (weaponId) {
      _sessionData.kills++;
      _sessionData.weaponUsage[weaponId] = (_sessionData.weaponUsage[weaponId] || 0) + 1;
    },
    trackShot: function (hit) {
      _sessionData.shots++;
      if (hit) _sessionData.hits++;
    },
    trackReward: function (amount) {
      if (amount > 0) _sessionData.rewardsEarned += amount;
      else _sessionData.rewardsSpent += Math.abs(amount);
    },
    trackDeath: function () { _sessionData.deaths++; }
  };

  // Auto-boot when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
