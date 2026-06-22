/* ═══════════════════════════════════════════════════════════════════════════
   ANTI-RUSCIST — AGENT MANAGER v1
   Central orchestrator for all game agents · message bus · decision arbiter
   Persistent state · boot analyzer · inter-agent coordination
   Loaded AFTER: agent-memory.js, adaptive-ai.js, ml-brain.js
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VERSION = '1.0.0';
  var HEARTBEAT_MS  = 10000;  // agent health check every 10s
  var SYNC_MS       = 30000;  // sync state to memory every 30s
  var ANALYZE_MS    = 120000; // run optimization analysis every 2 min

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 1: AGENT REGISTRY
  // ══════════════════════════════════════════════════════════════════════

  var _agents = {};
  var _agentOrder = [];

  /**
   * Register an agent with the manager
   * @param {string} id - Unique agent identifier
   * @param {object} config - { name, version, priority, capabilities[], getStatus(), onMessage(msg) }
   */
  function registerAgent(id, config) {
    _agents[id] = {
      id: id,
      name: config.name || id,
      version: config.version || '1.0',
      priority: config.priority || 5,       // 1=lowest, 10=highest
      capabilities: config.capabilities || [],
      getStatus: config.getStatus || function () { return 'unknown'; },
      onMessage: config.onMessage || function () {},
      registered: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'active',
      messageCount: 0,
      errorCount: 0
    };
    _agentOrder = Object.keys(_agents).sort(function (a, b) {
      return (_agents[b].priority || 0) - (_agents[a].priority || 0);
    });
    _emit('agent_registered', { agentId: id, name: config.name });
  }

  function unregisterAgent(id) {
    if (_agents[id]) {
      delete _agents[id];
      _agentOrder = Object.keys(_agents).sort(function (a, b) {
        return (_agents[b].priority || 0) - (_agents[a].priority || 0);
      });
      _emit('agent_unregistered', { agentId: id });
    }
  }

  function getAgent(id) { return _agents[id] || null; }
  function listAgents() { return _agentOrder.map(function (id) { return _agents[id]; }); }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 2: MESSAGE BUS (pub/sub + direct messaging)
  // ══════════════════════════════════════════════════════════════════════

  var _subscribers = {};    // topic → [{ agentId, handler }]
  var _messageLog = [];     // recent messages for debugging
  var MAX_LOG = 100;

  /**
   * Subscribe to a topic
   */
  function subscribe(topic, agentId, handler) {
    if (!_subscribers[topic]) _subscribers[topic] = [];
    _subscribers[topic].push({ agentId: agentId, handler: handler });
  }

  /**
   * Unsubscribe from a topic
   */
  function unsubscribe(topic, agentId) {
    if (_subscribers[topic]) {
      _subscribers[topic] = _subscribers[topic].filter(function (s) {
        return s.agentId !== agentId;
      });
    }
  }

  /**
   * Publish a message to all subscribers of a topic
   */
  function publish(topic, data, sourceAgentId) {
    var msg = {
      topic: topic,
      data: data,
      source: sourceAgentId || 'system',
      timestamp: Date.now(),
      id: _generateId()
    };

    _messageLog.push(msg);
    if (_messageLog.length > MAX_LOG) _messageLog.shift();

    var subs = _subscribers[topic] || [];
    for (var i = 0; i < subs.length; i++) {
      try {
        subs[i].handler(msg);
        if (_agents[subs[i].agentId]) {
          _agents[subs[i].agentId].messageCount++;
        }
      } catch (e) {
        if (_agents[subs[i].agentId]) {
          _agents[subs[i].agentId].errorCount++;
        }
      }
    }

    return msg.id;
  }

  /**
   * Send a direct message to a specific agent
   */
  function sendTo(targetAgentId, topic, data, sourceAgentId) {
    var agent = _agents[targetAgentId];
    if (!agent) return false;

    var msg = {
      topic: topic,
      data: data,
      source: sourceAgentId || 'system',
      target: targetAgentId,
      timestamp: Date.now(),
      id: _generateId()
    };

    try {
      agent.onMessage(msg);
      agent.messageCount++;
    } catch (e) {
      agent.errorCount++;
    }
    return msg.id;
  }

  function _generateId() {
    return 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ── Internal event emitter ──────────────────────────────────────────
  var _internalHandlers = {};

  function _emit(event, data) {
    var handlers = _internalHandlers[event] || [];
    for (var i = 0; i < handlers.length; i++) {
      try { handlers[i](data); } catch (e) {}
    }
    // Also publish to message bus
    publish('system.' + event, data, 'agent_manager');
  }

  function on(event, handler) {
    if (!_internalHandlers[event]) _internalHandlers[event] = [];
    _internalHandlers[event].push(handler);
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 3: DECISION ARBITER
  // ══════════════════════════════════════════════════════════════════════

  var _pendingDecisions = [];

  /**
   * Request a decision when agents have conflicting recommendations
   * @param {string} topic - What the decision is about
   * @param {object[]} proposals - [{ agentId, action, priority, confidence, reason }]
   * @returns {object} The winning proposal
   */
  function arbitrate(topic, proposals) {
    if (!proposals.length) return null;
    if (proposals.length === 1) return proposals[0];

    // Score each proposal: priority * confidence * agent_priority
    var scored = proposals.map(function (p) {
      var agentPri = _agents[p.agentId] ? _agents[p.agentId].priority : 5;
      return {
        proposal: p,
        score: (p.priority || 5) * (p.confidence || 0.5) * (agentPri / 10)
      };
    });

    scored.sort(function (a, b) { return b.score - a.score; });

    var winner = scored[0].proposal;
    var decision = {
      topic: topic,
      winner: winner,
      alternatives: scored.slice(1).map(function (s) { return s.proposal; }),
      score: scored[0].score,
      timestamp: Date.now()
    };

    _pendingDecisions.push(decision);
    if (_pendingDecisions.length > 50) _pendingDecisions.shift();

    publish('decision.' + topic, decision, 'arbiter');
    return winner;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 4: BOOT ANALYZER — Skip re-analysis if recent data exists
  // ══════════════════════════════════════════════════════════════════════

  var _bootReport = null;

  function analyzeBoot(cb) {
    cb = cb || function () {};
    var report = {
      timestamp: Date.now(),
      memoryAvailable: !!window.ARC_MEMORY,
      cachedAnalysis: false,
      lastSessionAge: null,
      modelsLoaded: false,
      skipAnalysis: false,
      reason: ''
    };

    if (!window.ARC_MEMORY) {
      report.reason = 'No memory system — full analysis needed';
      _bootReport = report;
      cb(report);
      return;
    }

    // Check for recent analysis
    window.ARC_MEMORY.recall('analysis_cache', 'session_analysis', { limit: 1 }, function (err, entries) {
      if (!err && entries.length) {
        var age = Date.now() - (entries[0].data.timestamp || 0);
        report.lastSessionAge = age;
        report.cachedAnalysis = true;

        // If last analysis is less than 1 hour old, skip full re-analysis
        if (age < 3600000) {
          report.skipAnalysis = true;
          report.reason = 'Recent analysis found (' + Math.round(age / 60000) + ' min ago) — skipping full scan';
        } else {
          report.reason = 'Cached analysis is ' + Math.round(age / 3600000) + 'h old — refresh recommended';
        }
      } else {
        report.reason = 'No cached analysis — first boot or expired';
      }

      // Check for saved model weights
      window.ARC_MEMORY.recall('model_weights', 'churn_model', { limit: 1 }, function (err2, models) {
        report.modelsLoaded = !err2 && models.length > 0;

        // Check player profile
        window.ARC_MEMORY.recall('player_profile', 'skill_level', { limit: 1 }, function (err3, profile) {
          report.hasPlayerProfile = !err3 && profile.length > 0;
          if (profile && profile.length) {
            report.playerSkill = profile[0].data;
          }

          _bootReport = report;
          publish('boot_analysis', report, 'agent_manager');
          cb(report);
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 5: STATE PERSISTENCE
  // ══════════════════════════════════════════════════════════════════════

  function syncState() {
    if (!window.ARC_MEMORY) return;

    // Save agent registry state
    var agentStates = {};
    for (var id in _agents) {
      var a = _agents[id];
      agentStates[id] = {
        name: a.name,
        status: a.status,
        messageCount: a.messageCount,
        errorCount: a.errorCount,
        lastHeartbeat: a.lastHeartbeat
      };
    }

    window.ARC_MEMORY.update('agent_state', 'registry', agentStates, {
      source: 'agent_manager',
      confidence: 1.0
    });

    // Save recent decisions
    if (_pendingDecisions.length) {
      window.ARC_MEMORY.update('agent_state', 'decisions', _pendingDecisions.slice(-20), {
        source: 'agent_manager',
        confidence: 0.9
      });
    }

    // Save optimization history
    if (_optimizationHistory.length) {
      window.ARC_MEMORY.update('optimization', 'history', _optimizationHistory.slice(-50), {
        source: 'agent_manager',
        confidence: 0.85
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 6: HEALTH MONITOR
  // ══════════════════════════════════════════════════════════════════════

  function checkHealth() {
    var now = Date.now();
    var issues = [];

    for (var id in _agents) {
      var agent = _agents[id];
      var status = 'unknown';
      try { status = agent.getStatus(); } catch (e) { status = 'error'; }

      agent.status = status;
      agent.lastHeartbeat = now;

      if (status === 'error') {
        issues.push({ agentId: id, issue: 'status_error', count: agent.errorCount });
      }
      if (agent.errorCount > 10) {
        issues.push({ agentId: id, issue: 'high_errors', count: agent.errorCount });
      }
    }

    if (issues.length) {
      publish('health_issues', { issues: issues, timestamp: now }, 'agent_manager');
    }

    return issues;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 7: OPTIMIZATION COORDINATOR
  // ══════════════════════════════════════════════════════════════════════

  var _optimizationHistory = [];

  function runOptimizationCycle() {
    var mlBrain = window.ARC_ML_BRAIN;
    var adaptive = window.ARC_ADAPTIVE;
    if (!mlBrain) return;

    var recs = mlBrain.getRecommendations();
    if (!recs.length) return;

    var cycle = {
      timestamp: Date.now(),
      recommendations: recs,
      applied: [],
      skipped: []
    };

    for (var i = 0; i < recs.length; i++) {
      var rec = recs[i];

      // Only auto-apply high-confidence, high-priority recommendations
      if (rec.confidence >= 0.6 && rec.priority >= 7) {
        // Apply difficulty changes via adaptive AI
        if (rec.type === 'difficulty' && adaptive) {
          publish('optimization.apply', {
            type: rec.type,
            action: rec.action,
            magnitude: rec.magnitude,
            reason: rec.reason
          }, 'optimizer');
          cycle.applied.push(rec);
        } else {
          // Queue for server-side or manual application
          publish('optimization.pending', rec, 'optimizer');
          cycle.skipped.push({ rec: rec, reason: 'requires_server' });
        }
      } else {
        cycle.skipped.push({ rec: rec, reason: 'low_confidence_or_priority' });
      }
    }

    _optimizationHistory.push(cycle);
    if (_optimizationHistory.length > 100) _optimizationHistory.shift();

    return cycle;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 8: SERVER SYNC (sends insights to backend)
  // ══════════════════════════════════════════════════════════════════════

  function syncToServer() {
    var apiClient = window.ARC_API;
    if (!apiClient) return;

    var mlBrain = window.ARC_ML_BRAIN;
    if (!mlBrain) return;

    var analysis = mlBrain.analyzeSession();
    if (analysis.status === 'no_data') return;

    // Send to telemetry endpoint
    var payload = {
      type: 'ml_client_analysis',
      data: {
        session: analysis.session,
        churnRisk: analysis.predictions.churnRisk.risk,
        engagement: analysis.predictions.engagement.score,
        performance: analysis.performance,
        recommendationCount: analysis.recommendations.length
      }
    };

    // Use the existing telemetry mechanism if available
    if (typeof apiClient.sendTelemetry === 'function') {
      apiClient.sendTelemetry(payload);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 9: DASHBOARD DATA (for admin panel integration)
  // ══════════════════════════════════════════════════════════════════════

  function getDashboard() {
    var mlBrain = window.ARC_ML_BRAIN;
    var adaptive = window.ARC_ADAPTIVE;

    return {
      version: VERSION,
      uptime: Date.now() - (_bootReport ? _bootReport.timestamp : Date.now()),
      agents: listAgents().map(function (a) {
        return {
          id: a.id,
          name: a.name,
          status: a.status,
          priority: a.priority,
          messages: a.messageCount,
          errors: a.errorCount,
          capabilities: a.capabilities
        };
      }),
      messageBus: {
        topics: Object.keys(_subscribers).length,
        totalSubscribers: Object.keys(_subscribers).reduce(function (s, t) {
          return s + (_subscribers[t] ? _subscribers[t].length : 0);
        }, 0),
        recentMessages: _messageLog.slice(-10)
      },
      decisions: _pendingDecisions.slice(-5),
      optimization: {
        history: _optimizationHistory.slice(-5),
        currentRecs: mlBrain ? mlBrain.getRecommendations() : []
      },
      predictions: mlBrain ? {
        churnRisk: mlBrain.predictChurnRisk(),
        engagement: mlBrain.computeEngagement(),
        performance: mlBrain.getPerformanceMetrics()
      } : null,
      adaptiveAI: adaptive ? adaptive.getDifficulty() : null,
      bootReport: _bootReport,
      memory: null // populated async if needed
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  // SECTION 10: BOOT & LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════

  var _heartbeatTimer = null;
  var _syncTimer = null;
  var _analyzeTimer = null;
  var _booted = false;

  function boot() {
    if (_booted) return;
    _booted = true;

    console.log('[Agent Manager] v' + VERSION + ' booting...');

    // Run boot analysis (checks memory for cached state)
    analyzeBoot(function (report) {
      console.log('[Agent Manager] Boot analysis:', report.reason);

      // Register built-in agents
      _registerBuiltinAgents();

      // Start heartbeat
      _heartbeatTimer = setInterval(checkHealth, HEARTBEAT_MS);

      // Start state sync
      _syncTimer = setInterval(syncState, SYNC_MS);

      // Start optimization cycles
      _analyzeTimer = setInterval(function () {
        runOptimizationCycle();
        syncToServer();
      }, ANALYZE_MS);

      publish('manager_ready', { version: VERSION, agents: _agentOrder.length }, 'agent_manager');
      console.log('[Agent Manager] Ready — ' + _agentOrder.length + ' agents registered');
    });
  }

  function _registerBuiltinAgents() {
    // Register adaptive AI
    if (window.ARC_ADAPTIVE) {
      registerAgent('adaptive_ai', {
        name: 'Adaptive Difficulty AI',
        version: '1.0',
        priority: 8,
        capabilities: ['difficulty_adjustment', 'player_profiling', 'zombie_speed_tuning'],
        getStatus: function () {
          return window.ARC_ADAPTIVE ? 'active' : 'offline';
        },
        onMessage: function (msg) {
          if (msg.topic === 'optimization.apply' && msg.data.type === 'difficulty') {
            // Adaptive AI receives difficulty recommendations from ML Brain
            console.log('[Adaptive AI] Received optimization:', msg.data.action, msg.data.magnitude);
          }
        }
      });
    }

    // Register ML Brain
    if (window.ARC_ML_BRAIN) {
      registerAgent('ml_brain', {
        name: 'ML Optimization Brain',
        version: '1.0',
        priority: 9,
        capabilities: ['churn_prediction', 'engagement_scoring', 'weapon_balance',
                       'economy_optimization', 'performance_monitoring', 'session_analysis'],
        getStatus: function () {
          return window.ARC_ML_BRAIN ? 'active' : 'offline';
        },
        onMessage: function (msg) {
          if (msg.topic === 'training_data') {
            // Receive training data from other agents
            console.log('[ML Brain] Training data received from', msg.source);
          }
        }
      });
    }

    // Register Memory System
    if (window.ARC_MEMORY) {
      registerAgent('memory', {
        name: 'Persistent Memory',
        version: '1.0',
        priority: 10,
        capabilities: ['store', 'recall', 'search', 'gc', 'export', 'import'],
        getStatus: function () {
          return window.ARC_MEMORY ? 'active' : 'offline';
        },
        onMessage: function (msg) {
          // Memory agent can respond to recall/store requests
          if (msg.topic === 'memory.store' && msg.data) {
            window.ARC_MEMORY.store(msg.data.category, msg.data.tag, msg.data.value, {
              source: msg.source
            });
          }
        }
      });
    }

    // Register API Client (if available)
    if (window.ARC_API) {
      registerAgent('api_client', {
        name: 'Server API Client',
        version: '1.0',
        priority: 7,
        capabilities: ['server_sync', 'player_data', 'leaderboard', 'economy'],
        getStatus: function () {
          return window.ARC_API ? 'active' : 'offline';
        }
      });
    }
  }

  function shutdown() {
    console.log('[Agent Manager] Shutting down...');
    syncState();
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    if (_syncTimer) { clearInterval(_syncTimer); _syncTimer = null; }
    if (_analyzeTimer) { clearInterval(_analyzeTimer); _analyzeTimer = null; }
    _booted = false;
    publish('manager_shutdown', { timestamp: Date.now() }, 'agent_manager');
  }

  // ── Public API ──────────────────────────────────────────────────────
  window.ARC_AGENT_MANAGER = {
    // Agent registry
    registerAgent: registerAgent,
    unregisterAgent: unregisterAgent,
    getAgent: getAgent,
    listAgents: listAgents,

    // Message bus
    subscribe: subscribe,
    unsubscribe: unsubscribe,
    publish: publish,
    sendTo: sendTo,
    on: on,

    // Decision making
    arbitrate: arbitrate,

    // Analytics
    getDashboard: getDashboard,
    runOptimizationCycle: runOptimizationCycle,
    getBootReport: function () { return _bootReport; },

    // State
    syncState: syncState,
    syncToServer: syncToServer,

    // Lifecycle
    boot: boot,
    shutdown: shutdown,

    // Version
    version: VERSION
  };

  // Auto-boot after a short delay to let other agents register
  function _scheduleBoot() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(boot, 1000);
    } else {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 1000); });
    }
  }
  _scheduleBoot();

  // Sync state before page unload
  window.addEventListener('beforeunload', function () {
    syncState();
  });

})();
