/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — SERVER-SIDE ML OPTIMIZER v1
   A/B testing · model serving · federated aggregation · training pipeline
   Express routes + helper functions · requires db from parent server
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

/**
 * Initialize ML Optimizer module
 * @param {object} app - Express app instance
 * @param {object} db - better-sqlite3 database instance
 * @param {function} adminAuth - Admin auth middleware
 * @param {function} adminOnly - Admin role check middleware
 */
function initMLOptimizer(app, db, adminAuth, adminOnly) {

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 1: DATABASE SCHEMA EXTENSIONS
  // ══════════════════════════════════════════════════════════════════════

  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      model_type TEXT NOT NULL,
      weights TEXT NOT NULL,
      metrics TEXT,
      training_samples INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1,
      UNIQUE(name, version)
    );

    CREATE TABLE IF NOT EXISTS ml_ab_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT DEFAULT 'draft',
      variant_a TEXT NOT NULL,
      variant_b TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      confidence_threshold REAL DEFAULT 0.95,
      min_samples INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      ended_at DATETIME,
      winner TEXT,
      results TEXT
    );

    CREATE TABLE IF NOT EXISTS ml_ab_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ml_ab_tests(id),
      UNIQUE(test_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS ml_ab_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      variant TEXT NOT NULL,
      metric_key TEXT NOT NULL,
      metric_value REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES ml_ab_tests(id)
    );

    CREATE TABLE IF NOT EXISTS ml_client_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      churn_risk REAL,
      engagement_score REAL,
      avg_fps REAL,
      session_duration_s REAL,
      recommendations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ml_optimization_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      impact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_ml_client_insights_player ON ml_client_insights(player_id);
    CREATE INDEX IF NOT EXISTS idx_ml_ab_events_test ON ml_ab_events(test_id);
    CREATE INDEX IF NOT EXISTS idx_ml_optimization_log_source ON ml_optimization_log(source);

    CREATE TABLE IF NOT EXISTS ml_training_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name TEXT NOT NULL,
      status TEXT DEFAULT 'running',
      records_in INTEGER DEFAULT 0,
      anomalies_found INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      details TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ml_economy_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_arc REAL DEFAULT 0,
      arc_earned_24h REAL DEFAULT 0,
      arc_spent_24h REAL DEFAULT 0,
      arc_staked REAL DEFAULT 0,
      active_players INTEGER DEFAULT 0,
      avg_session_s REAL DEFAULT 0,
      avg_wave REAL DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      inflation_rate REAL DEFAULT 0,
      velocity REAL DEFAULT 0,
      health_score REAL DEFAULT 0,
      snapshot_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 2: MODEL SERVING
  // ══════════════════════════════════════════════════════════════════════

  // Save/update a trained model
  app.post('/api/ml/models', adminAuth, adminOnly, (req, res) => {
    try {
      const { name, model_type, weights, metrics, training_samples, accuracy } = req.body;
      if (!name || !model_type || !weights) {
        return res.status(400).json({ error: 'name, model_type, and weights are required' });
      }

      // Get next version
      const latest = db.prepare('SELECT MAX(version) as v FROM ml_models WHERE name = ?').get(name);
      const version = (latest && latest.v ? latest.v : 0) + 1;

      // Deactivate previous versions
      db.prepare('UPDATE ml_models SET is_active = 0 WHERE name = ?').run(name);

      db.prepare(`INSERT INTO ml_models (name, version, model_type, weights, metrics, training_samples, accuracy)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        name, version, model_type,
        typeof weights === 'string' ? weights : JSON.stringify(weights),
        typeof metrics === 'string' ? metrics : JSON.stringify(metrics || {}),
        training_samples || 0, accuracy || 0
      );

      res.json({ ok: true, name, version });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get active model weights (for client download)
  app.get('/api/ml/models/:name', (req, res) => {
    try {
      const model = db.prepare('SELECT * FROM ml_models WHERE name = ? AND is_active = 1 ORDER BY version DESC LIMIT 1')
        .get(req.params.name);
      if (!model) return res.status(404).json({ error: 'Model not found' });

      res.json({
        name: model.name,
        version: model.version,
        model_type: model.model_type,
        weights: JSON.parse(model.weights),
        accuracy: model.accuracy,
        updated_at: model.updated_at
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // List all models
  app.get('/api/ml/models', adminAuth, adminOnly, (req, res) => {
    try {
      const models = db.prepare(`SELECT id, name, version, model_type, training_samples, accuracy,
        is_active, created_at, updated_at FROM ml_models ORDER BY updated_at DESC`).all();
      res.json({ models });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 3: A/B TESTING FRAMEWORK
  // ══════════════════════════════════════════════════════════════════════

  // Create a new A/B test
  app.post('/api/ml/ab-tests', adminAuth, adminOnly, (req, res) => {
    try {
      const { name, description, variant_a, variant_b, metric_key, confidence_threshold, min_samples } = req.body;
      if (!name || !variant_a || !variant_b || !metric_key) {
        return res.status(400).json({ error: 'name, variant_a, variant_b, metric_key required' });
      }

      db.prepare(`INSERT INTO ml_ab_tests (name, description, variant_a, variant_b, metric_key, confidence_threshold, min_samples)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        name, description || '',
        typeof variant_a === 'string' ? variant_a : JSON.stringify(variant_a),
        typeof variant_b === 'string' ? variant_b : JSON.stringify(variant_b),
        metric_key,
        confidence_threshold || 0.95,
        min_samples || 100
      );

      res.json({ ok: true, name });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Start an A/B test
  app.post('/api/ml/ab-tests/:id/start', adminAuth, adminOnly, (req, res) => {
    try {
      db.prepare("UPDATE ml_ab_tests SET status = 'running', started_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(req.params.id);
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get player's A/B test assignment (or assign them)
  app.get('/api/ml/ab-tests/:id/assignment', (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const playerId = req.headers['x-anon-id'] || 'unknown';

      const test = db.prepare("SELECT * FROM ml_ab_tests WHERE id = ? AND status = 'running'").get(testId);
      if (!test) return res.status(404).json({ error: 'Test not found or not running' });

      // Check existing assignment
      let assignment = db.prepare('SELECT * FROM ml_ab_assignments WHERE test_id = ? AND player_id = ?')
        .get(testId, playerId);

      if (!assignment) {
        // Assign randomly (50/50 split)
        const variant = Math.random() < 0.5 ? 'A' : 'B';
        db.prepare('INSERT INTO ml_ab_assignments (test_id, player_id, variant) VALUES (?, ?, ?)')
          .run(testId, playerId, variant);
        assignment = { test_id: testId, player_id: playerId, variant: variant };
      }

      const config = assignment.variant === 'A' ? JSON.parse(test.variant_a) : JSON.parse(test.variant_b);
      res.json({ variant: assignment.variant, config });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Record A/B test metric
  app.post('/api/ml/ab-tests/:id/event', (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const playerId = req.headers['x-anon-id'] || 'unknown';
      const { metric_value } = req.body;

      const assignment = db.prepare('SELECT variant FROM ml_ab_assignments WHERE test_id = ? AND player_id = ?')
        .get(testId, playerId);
      if (!assignment) return res.status(400).json({ error: 'Player not assigned to test' });

      const test = db.prepare('SELECT metric_key FROM ml_ab_tests WHERE id = ?').get(testId);
      if (!test) return res.status(404).json({ error: 'Test not found' });

      db.prepare('INSERT INTO ml_ab_events (test_id, player_id, variant, metric_key, metric_value) VALUES (?, ?, ?, ?, ?)')
        .run(testId, playerId, assignment.variant, test.metric_key, metric_value);

      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Analyze A/B test results
  app.get('/api/ml/ab-tests/:id/results', adminAuth, adminOnly, (req, res) => {
    try {
      const testId = parseInt(req.params.id);
      const test = db.prepare('SELECT * FROM ml_ab_tests WHERE id = ?').get(testId);
      if (!test) return res.status(404).json({ error: 'Test not found' });

      const statsA = db.prepare(`SELECT COUNT(*) as n, AVG(metric_value) as mean,
        CASE WHEN COUNT(*) > 1 THEN (SUM(metric_value * metric_value) - SUM(metric_value) * SUM(metric_value) / COUNT(*)) / (COUNT(*) - 1) ELSE 0 END as variance
        FROM ml_ab_events WHERE test_id = ? AND variant = 'A'`).get(testId);

      const statsB = db.prepare(`SELECT COUNT(*) as n, AVG(metric_value) as mean,
        CASE WHEN COUNT(*) > 1 THEN (SUM(metric_value * metric_value) - SUM(metric_value) * SUM(metric_value) / COUNT(*)) / (COUNT(*) - 1) ELSE 0 END as variance
        FROM ml_ab_events WHERE test_id = ? AND variant = 'B'`).get(testId);

      // Welch's t-test for statistical significance
      let pValue = 1;
      let significant = false;
      const nA = statsA.n || 0, nB = statsB.n || 0;
      const meanA = statsA.mean || 0, meanB = statsB.mean || 0;
      const varA = Math.max(statsA.variance || 0, 0.0001);
      const varB = Math.max(statsB.variance || 0, 0.0001);

      if (nA >= 2 && nB >= 2) {
        const se = Math.sqrt(varA / nA + varB / nB);
        const t = se > 0 ? Math.abs(meanA - meanB) / se : 0;
        // Approximate two-tailed p-value from |t| using Abramowitz & Stegun 26.2.17
        var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        var z = t / Math.SQRT2;
        var tErfc = 1 / (1 + 0.3275911 * z);
        var erfc = tErfc * (a1 + tErfc * (a2 + tErfc * (a3 + tErfc * (a4 + tErfc * a5)))) * Math.exp(-z * z);
        pValue = Math.max(0, Math.min(1, erfc)); // two-tailed approximation
        significant = pValue < (1 - (test.confidence_threshold || 0.95));
      }

      const winner = significant ? (meanA > meanB ? 'A' : 'B') : null;
      const lift = meanA > 0 ? ((meanB - meanA) / meanA * 100) : 0;

      const results = {
        test_name: test.name,
        status: test.status,
        metric_key: test.metric_key,
        variant_a: { n: nA, mean: meanA, variance: varA },
        variant_b: { n: nB, mean: meanB, variance: varB },
        p_value: pValue,
        significant: significant,
        winner: winner,
        lift_pct: Math.round(lift * 100) / 100,
        min_samples: test.min_samples,
        enough_data: nA >= (test.min_samples || 100) && nB >= (test.min_samples || 100)
      };

      res.json(results);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // End A/B test and declare winner
  app.post('/api/ml/ab-tests/:id/end', adminAuth, adminOnly, (req, res) => {
    try {
      const { winner } = req.body;
      db.prepare(`UPDATE ml_ab_tests SET status = 'completed', ended_at = CURRENT_TIMESTAMP,
        winner = ?, results = ? WHERE id = ?`).run(
        winner || null, JSON.stringify(req.body), req.params.id
      );
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // List all A/B tests
  app.get('/api/ml/ab-tests', adminAuth, adminOnly, (req, res) => {
    try {
      const tests = db.prepare('SELECT * FROM ml_ab_tests ORDER BY created_at DESC').all();
      res.json({ tests });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 4: CLIENT INSIGHT AGGREGATION
  // ══════════════════════════════════════════════════════════════════════

  // Receive client-side ML insights
  app.post('/api/ml/client-insights', (req, res) => {
    try {
      const playerId = req.headers['x-anon-id'] || 'unknown';
      const { churn_risk, engagement_score, avg_fps, session_duration_s, recommendations } = req.body;

      db.prepare(`INSERT INTO ml_client_insights
        (player_id, churn_risk, engagement_score, avg_fps, session_duration_s, recommendations)
        VALUES (?, ?, ?, ?, ?, ?)`).run(
        playerId,
        churn_risk || null,
        engagement_score || null,
        avg_fps || null,
        session_duration_s || null,
        typeof recommendations === 'string' ? recommendations : JSON.stringify(recommendations || [])
      );

      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get aggregated client insights (admin)
  app.get('/api/ml/client-insights/aggregate', adminAuth, adminOnly, (req, res) => {
    try {
      const hours = parseInt(req.query.hours) || 24;

      const agg = db.prepare(`SELECT
        COUNT(*) as total_reports,
        COUNT(DISTINCT player_id) as unique_players,
        AVG(churn_risk) as avg_churn_risk,
        AVG(engagement_score) as avg_engagement,
        AVG(avg_fps) as avg_fps,
        AVG(session_duration_s) as avg_session_s,
        MIN(churn_risk) as min_churn_risk,
        MAX(churn_risk) as max_churn_risk
        FROM ml_client_insights
        WHERE created_at > datetime('now', '-' || ? || ' hours')
      `).get(hours);

      // Distribution of churn risk
      const churnDist = db.prepare(`SELECT
        CASE
          WHEN churn_risk < 0.25 THEN 'low'
          WHEN churn_risk < 0.5 THEN 'moderate'
          WHEN churn_risk < 0.75 THEN 'high'
          ELSE 'critical'
        END as risk_level,
        COUNT(*) as count
        FROM ml_client_insights
        WHERE created_at > datetime('now', '-' || ? || ' hours') AND churn_risk IS NOT NULL
        GROUP BY risk_level
      `).all(hours);

      // Engagement distribution
      const engageDist = db.prepare(`SELECT
        CASE
          WHEN engagement_score < 0.25 THEN 'disengaged'
          WHEN engagement_score < 0.5 THEN 'casual'
          WHEN engagement_score < 0.75 THEN 'engaged'
          ELSE 'flow'
        END as state,
        COUNT(*) as count
        FROM ml_client_insights
        WHERE created_at > datetime('now', '-' || ? || ' hours') AND engagement_score IS NOT NULL
        GROUP BY state
      `).all(hours);

      res.json({ aggregate: agg, churn_distribution: churnDist, engagement_distribution: engageDist });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 5: TRAINING PIPELINE
  // ══════════════════════════════════════════════════════════════════════

  // Trigger server-side model training from aggregated data
  app.post('/api/ml/train', adminAuth, adminOnly, (req, res) => {
    try {
      const { model_name } = req.body;
      if (!model_name) return res.status(400).json({ error: 'model_name required' });

      const startTime = Date.now();
      let result = { model_name, status: 'unknown' };

      switch (model_name) {
        case 'churn_prediction':
          result = _trainChurnModel();
          break;
        case 'engagement_optimization':
          result = _trainEngagementModel();
          break;
        case 'weapon_balance':
          result = _trainWeaponBalanceModel();
          break;
        case 'economy_health':
          result = _trainEconomyModel();
          break;
        default:
          return res.status(400).json({ error: 'Unknown model: ' + model_name });
      }

      result.training_time_ms = Date.now() - startTime;

      // Log training run
      db.prepare('INSERT INTO ml_training_runs (model_name, status, records_in, duration_ms, details) VALUES (?, ?, ?, ?, ?)')
        .run(model_name, 'completed', result.samples || 0, result.training_time_ms, JSON.stringify(result));

      db.prepare('INSERT INTO ml_optimization_log (source, action, details) VALUES (?, ?, ?)').run(
        'training_pipeline', 'train_' + model_name, JSON.stringify(result)
      );

      res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Internal training functions ─────────────────────────────────────

  function _trainChurnModel() {
    // Gather training data: players who haven't played in 7+ days = churned
    const players = db.prepare(`SELECT
      p.id, ps.total_kills, ps.max_wave, ps.shots_fired, ps.shots_hit,
      (SELECT MAX(started_at) FROM game_sessions gs WHERE gs.player_id = p.id) as last_session,
      (SELECT COUNT(*) FROM game_sessions gs WHERE gs.player_id = p.id) as session_count,
      (SELECT AVG(duration_s) FROM game_sessions gs WHERE gs.player_id = p.id) as avg_session_s
      FROM players p JOIN player_stats ps ON p.id = ps.player_id
      WHERE ps.total_kills > 0`).all();

    if (players.length < 10) return { status: 'insufficient_data', samples: players.length };

    // Simple logistic regression weights (not a full NN — server-side is aggregated stats)
    var features = [];
    var labels = [];
    var now = new Date();

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      var daysSincePlay = (p.last_session && !isNaN(new Date(p.last_session).getTime()))
        ? (now - new Date(p.last_session)) / 86400000 : 999;
      var accuracy = p.shots_fired > 0 ? p.shots_hit / p.shots_fired : 0;
      var killPerSession = p.session_count > 0 ? p.total_kills / p.session_count : 0;

      features.push([
        Math.min(accuracy, 1),
        Math.min(killPerSession / 50, 1),
        Math.min(p.max_wave / 10, 1),
        Math.min((p.avg_session_s || 0) / 600, 1)
      ]);
      labels.push(daysSincePlay > 7 ? 1 : 0); // churned if no play in 7 days
    }

    // Train simple logistic regression
    var weights = [0, 0, 0, 0];
    var bias = 0;
    var lr = 0.01;
    var epochs = 100;
    var lastLoss = Infinity;

    for (var e = 0; e < epochs; e++) {
      var totalLoss = 0;
      for (var i = 0; i < features.length; i++) {
        var z = bias;
        for (var j = 0; j < 4; j++) z += weights[j] * features[i][j];
        var pred = 1 / (1 + Math.exp(-z));
        var err = labels[i] - pred;
        totalLoss += err * err;
        for (var j = 0; j < 4; j++) weights[j] += lr * err * features[i][j];
        bias += lr * err;
      }
      lastLoss = totalLoss / features.length;
    }

    // Compute accuracy
    var correct = 0;
    for (var i = 0; i < features.length; i++) {
      var z = bias;
      for (var j = 0; j < 4; j++) z += weights[j] * features[i][j];
      var pred = 1 / (1 + Math.exp(-z)) > 0.5 ? 1 : 0;
      if (pred === labels[i]) correct++;
    }

    var accuracy = correct / features.length;

    // Save model
    var modelWeights = JSON.stringify({ weights: weights, bias: bias, type: 'logistic_regression' });
    var latest = db.prepare('SELECT MAX(version) as v FROM ml_models WHERE name = ?').get('churn_prediction');
    var version = (latest && latest.v ? latest.v : 0) + 1;
    db.prepare('UPDATE ml_models SET is_active = 0 WHERE name = ?').run('churn_prediction');
    db.prepare(`INSERT INTO ml_models (name, version, model_type, weights, metrics, training_samples, accuracy)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'churn_prediction', version, 'logistic_regression', modelWeights,
      JSON.stringify({ loss: lastLoss, epochs: epochs }), features.length, accuracy
    );

    return { status: 'success', samples: features.length, accuracy: accuracy, loss: lastLoss, version: version };
  }

  function _trainEngagementModel() {
    const sessions = db.prepare(`SELECT
      gs.player_id, gs.kills, gs.duration_s, gs.max_wave, gs.shots_fired, gs.shots_hit,
      ps.total_kills, ps.arcoins
      FROM game_sessions gs JOIN player_stats ps ON gs.player_id = ps.player_id
      WHERE gs.duration_s > 10 AND gs.kills > 0
      ORDER BY gs.started_at DESC LIMIT 1000`).all();

    if (sessions.length < 20) return { status: 'insufficient_data', samples: sessions.length };

    // Engagement target: longer sessions with more kills = higher engagement
    var features = [];
    var labels = [];

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var accuracy = s.shots_fired > 0 ? s.shots_hit / s.shots_fired : 0;
      var killRate = s.duration_s > 0 ? s.kills / (s.duration_s / 60) : 0;

      features.push([
        Math.min(s.duration_s / 600, 1),
        Math.min(accuracy, 1),
        Math.min(killRate / 30, 1),
        Math.min(s.max_wave / 10, 1)
      ]);

      // Engagement score: composite of duration, accuracy, kills
      var engScore = (
        Math.min(s.duration_s / 300, 1) * 0.3 +
        Math.min(accuracy, 1) * 0.3 +
        Math.min(killRate / 20, 1) * 0.4
      );
      labels.push(engScore);
    }

    // Train linear regression
    var weights = [0.25, 0.25, 0.25, 0.25];
    var bias = 0;
    var lr = 0.005;
    var epochs = 80;
    var lastLoss = 0;

    for (var e = 0; e < epochs; e++) {
      var totalLoss = 0;
      for (var i = 0; i < features.length; i++) {
        var pred = bias;
        for (var j = 0; j < 4; j++) pred += weights[j] * features[i][j];
        pred = Math.max(0, Math.min(1, pred));
        var err = labels[i] - pred;
        totalLoss += err * err;
        for (var j = 0; j < 4; j++) weights[j] += lr * err * features[i][j];
        bias += lr * err;
      }
      lastLoss = totalLoss / features.length;
    }

    var modelWeights = JSON.stringify({ weights: weights, bias: bias, type: 'linear_regression' });
    var latest = db.prepare('SELECT MAX(version) as v FROM ml_models WHERE name = ?').get('engagement_optimization');
    var version = (latest && latest.v ? latest.v : 0) + 1;
    db.prepare('UPDATE ml_models SET is_active = 0 WHERE name = ?').run('engagement_optimization');
    db.prepare(`INSERT INTO ml_models (name, version, model_type, weights, metrics, training_samples, accuracy)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'engagement_optimization', version, 'linear_regression', modelWeights,
      JSON.stringify({ loss: lastLoss, epochs: epochs }), features.length, 1 - lastLoss
    );

    return { status: 'success', samples: features.length, mse: lastLoss, version: version };
  }

  function _trainWeaponBalanceModel() {
    // Analyze weapon usage distribution for balance
    const weaponStats = db.prepare(`SELECT
      weapon_id, COUNT(*) as uses, SUM(kills) as total_kills, AVG(accuracy) as avg_accuracy
      FROM (
        SELECT json_each.key as weapon_id, json_each.value as kills, 0.5 as accuracy
        FROM player_stats, json_each(COALESCE(weapon_mastery, '{}'))
        WHERE json_each.value > 0
      ) GROUP BY weapon_id`).all();

    if (weaponStats.length < 3) return { status: 'insufficient_data', samples: weaponStats.length };

    var totalUses = weaponStats.reduce(function (s, w) { return s + w.uses; }, 0);
    var idealShare = 1 / weaponStats.length;

    var balanceScores = weaponStats.map(function (w) {
      var share = w.uses / totalUses;
      var imbalance = Math.abs(share - idealShare) / idealShare;
      return {
        weapon_id: w.weapon_id,
        uses: w.uses,
        share: share,
        ideal_share: idealShare,
        imbalance: imbalance,
        balance_score: Math.max(0, 1 - imbalance),
        recommendation: imbalance > 0.5 ? (share > idealShare ? 'nerf' : 'buff') : 'balanced'
      };
    });

    var overallBalance = balanceScores.reduce(function (s, b) { return s + b.balance_score; }, 0) / balanceScores.length;

    var modelData = JSON.stringify({ scores: balanceScores, overall_balance: overallBalance });
    var latest = db.prepare('SELECT MAX(version) as v FROM ml_models WHERE name = ?').get('weapon_balance');
    var version = (latest && latest.v ? latest.v : 0) + 1;
    db.prepare('UPDATE ml_models SET is_active = 0 WHERE name = ?').run('weapon_balance');
    db.prepare(`INSERT INTO ml_models (name, version, model_type, weights, metrics, training_samples, accuracy)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'weapon_balance', version, 'statistical_analysis', modelData,
      JSON.stringify({ weapon_count: weaponStats.length }), totalUses, overallBalance
    );

    return { status: 'success', samples: totalUses, overall_balance: overallBalance, weapons: balanceScores, version: version };
  }

  function _trainEconomyModel() {
    // Time-series analysis of economy health
    const snapshots = db.prepare(`SELECT * FROM ml_economy_snapshots ORDER BY snapshot_at DESC LIMIT 168`).all(); // 7 days hourly

    if (snapshots.length < 5) return { status: 'insufficient_data', samples: snapshots.length };

    // Compute trends
    var healthScores = snapshots.map(function (s) { return s.health_score; });
    var inflationRates = snapshots.map(function (s) { return s.inflation_rate; });

    var avgHealth = healthScores.reduce(function (s, v) { return s + v; }, 0) / healthScores.length;
    var avgInflation = inflationRates.reduce(function (s, v) { return s + v; }, 0) / inflationRates.length;

    // Trend: compare recent 24h to previous
    var recentHealth = snapshots.slice(0, Math.min(24, snapshots.length));
    var olderHealth = snapshots.slice(Math.min(24, snapshots.length));

    var recentAvg = recentHealth.reduce(function (s, v) { return s + v.health_score; }, 0) / recentHealth.length;
    var olderAvg = olderHealth.length > 0 ? olderHealth.reduce(function (s, v) { return s + v.health_score; }, 0) / olderHealth.length : recentAvg;

    var healthTrend = recentAvg - olderAvg;

    var recommendations = [];
    if (avgInflation > 0.1) recommendations.push({ action: 'reduce_rewards', urgency: 'high', reason: 'Inflation above 10%' });
    if (avgInflation < -0.05) recommendations.push({ action: 'increase_rewards', urgency: 'medium', reason: 'Slight deflation detected' });
    if (avgHealth < 40) recommendations.push({ action: 'economy_rebalance', urgency: 'critical', reason: 'Economy health below 40' });
    if (healthTrend < -10) recommendations.push({ action: 'investigate_sinks', urgency: 'high', reason: 'Health declining rapidly' });

    var modelData = JSON.stringify({
      avg_health: avgHealth,
      avg_inflation: avgInflation,
      health_trend: healthTrend,
      recommendations: recommendations,
      snapshots_analyzed: snapshots.length
    });

    var latest = db.prepare('SELECT MAX(version) as v FROM ml_models WHERE name = ?').get('economy_health');
    var version = (latest && latest.v ? latest.v : 0) + 1;
    db.prepare('UPDATE ml_models SET is_active = 0 WHERE name = ?').run('economy_health');
    db.prepare(`INSERT INTO ml_models (name, version, model_type, weights, metrics, training_samples, accuracy)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      'economy_health', version, 'time_series_analysis', modelData,
      JSON.stringify({ trend: healthTrend }), snapshots.length, avgHealth / 100
    );

    return {
      status: 'success',
      samples: snapshots.length,
      avg_health: avgHealth,
      avg_inflation: avgInflation,
      health_trend: healthTrend,
      recommendations: recommendations,
      version: version
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 6: OPTIMIZATION LOG & DASHBOARD
  // ══════════════════════════════════════════════════════════════════════

  // Log an optimization action
  app.post('/api/ml/optimization-log', adminAuth, adminOnly, (req, res) => {
    try {
      const { source, action, details, impact } = req.body;
      db.prepare('INSERT INTO ml_optimization_log (source, action, details, impact) VALUES (?, ?, ?, ?)').run(
        source || 'manual', action || '', JSON.stringify(details || {}), JSON.stringify(impact || {})
      );
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get optimization history
  app.get('/api/ml/optimization-log', adminAuth, adminOnly, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const logs = db.prepare('SELECT * FROM ml_optimization_log ORDER BY created_at DESC LIMIT ?').all(limit);
      res.json({ logs });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Comprehensive ML dashboard
  app.get('/api/ml/dashboard', adminAuth, adminOnly, (req, res) => {
    try {
      const models = db.prepare('SELECT name, version, accuracy, training_samples, updated_at FROM ml_models WHERE is_active = 1').all();
      const activeTests = db.prepare("SELECT id, name, status FROM ml_ab_tests WHERE status = 'running'").all();
      const recentInsights = db.prepare('SELECT COUNT(*) as c, AVG(churn_risk) as avg_churn, AVG(engagement_score) as avg_engage FROM ml_client_insights WHERE created_at > datetime(\'now\', \'-24 hours\')').get();
      const recentOps = db.prepare('SELECT COUNT(*) as c FROM ml_optimization_log WHERE created_at > datetime(\'now\', \'-24 hours\')').get();
      const trainingRuns = db.prepare('SELECT * FROM ml_training_runs ORDER BY started_at DESC LIMIT 10').all();

      res.json({
        models: models,
        active_ab_tests: activeTests,
        client_insights_24h: recentInsights,
        optimization_actions_24h: recentOps.c,
        recent_training: trainingRuns,
        capabilities: [
          'churn_prediction', 'engagement_optimization', 'weapon_balance',
          'economy_health', 'ab_testing', 'client_insights', 'model_serving'
        ]
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 7: AUTO-TRAINING SCHEDULER
  // ══════════════════════════════════════════════════════════════════════

  // Run all training pipelines
  app.post('/api/ml/train-all', adminAuth, adminOnly, (req, res) => {
    try {
      const results = {};
      const models = ['churn_prediction', 'engagement_optimization', 'weapon_balance', 'economy_health'];

      for (var i = 0; i < models.length; i++) {
        var name = models[i];
        try {
          switch (name) {
            case 'churn_prediction': results[name] = _trainChurnModel(); break;
            case 'engagement_optimization': results[name] = _trainEngagementModel(); break;
            case 'weapon_balance': results[name] = _trainWeaponBalanceModel(); break;
            case 'economy_health': results[name] = _trainEconomyModel(); break;
          }
        } catch (e) {
          results[name] = { status: 'error', error: e.message };
        }
      }

      db.prepare('INSERT INTO ml_optimization_log (source, action, details) VALUES (?, ?, ?)').run(
        'training_pipeline', 'train_all', JSON.stringify(results)
      );

      res.json({ ok: true, results });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  console.log('[ML Optimizer] Initialized — model serving, A/B testing, training pipeline ready');
}

module.exports = { initMLOptimizer };
