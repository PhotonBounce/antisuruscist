// ── Anti-Ruscist Game — API Server ────────────────────────────────────
// Express + better-sqlite3 + JWT. Self-hosted. Single process.
// Start: cd server && npm install && node index.js
// Serves API on :3001, static game files on :3001/ (optional)

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const multer   = require('multer');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');
const crypto   = require('crypto');
const { initDB, DB_PATH } = require('./db');

// ── Init ──────────────────────────────────────────────────────────────
initDB();
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const app = express();
const PORT = process.env.API_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || (function () {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production (refusing to start with a random secret that would invalidate all tokens on restart).');
    process.exit(1);
  }
  return crypto.randomBytes(32).toString('hex'); // dev-only ephemeral secret
})();
const JWT_EXPIRES = '7d';

// ── Middleware ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com"],
      imgSrc:     ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://polygon-rpc.com", "wss:"],
      mediaSrc:   ["'self'", "blob:"],
      objectSrc:  ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && !ALLOWED_ORIGINS.length) {
  console.error('FATAL: CORS_ORIGINS must be set in production (refusing to reflect all origins).');
  process.exit(1);
}
app.use(cors({
  origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true, // dev only: reflect all origins
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.set('trust proxy', 1); // Codespaces runs behind GitHub's reverse proxy

// Rate limiting: 100 req/min per IP (global)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Tighter rate limits for financial/state-changing endpoints
const financialLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many financial requests, slow down' },
});
app.use('/api/player/arc-earn', financialLimiter);
app.use('/api/player/stake', financialLimiter);
app.use('/api/player/loan', financialLimiter);
app.use('/api/market/buy', financialLimiter);
app.use('/api/market/list', financialLimiter);

const syncLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sync rate limited' },
});
app.use('/api/player/sync', syncLimiter);

// Strict limit on first-time admin setup. It is self-securing (only works while no
// admin exists), but throttle to prevent brute/race abuse during the bootstrap window.
const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many setup attempts, try again later' },
});
app.use('/api/setup', setupLimiter);

// Serve static game files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// ── Health check (for split-deployment connection tests) ──────────────
app.get('/api/health', (req, res) => {
  let version = '1.0.0';
  try { version = require('./package.json').version || version; } catch(e) { /* ignore */ }
  res.json({ status: 'ok', version, timestamp: new Date().toISOString() });
});

// ── Helper: get or create player by anon_id ───────────────────────────
function getOrCreatePlayer(anonId) {
  if (!anonId || typeof anonId !== 'string') return null;
  const clean = anonId.slice(0, 64);
  let row = db.prepare('SELECT * FROM players WHERE anon_id = ?').get(clean);
  if (!row) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let refCode, attempts = 0;
    do {
      refCode = '';
      for (let i = 0; i < 8; i++) refCode += chars[Math.floor(Math.random() * chars.length)];
      attempts++;
    } while (db.prepare('SELECT 1 FROM players WHERE ref_code = ?').get(refCode) && attempts < 10);
    db.prepare('INSERT INTO players (anon_id, ref_code) VALUES (?, ?)').run(clean, refCode);
    row = db.prepare('SELECT * FROM players WHERE anon_id = ?').get(clean);
    db.prepare('INSERT INTO player_stats (player_id) VALUES (?)').run(row.id);
  }
  return row;
}

// ── Auth middleware (anon_id in header or body) ───────────────────────
function authMiddleware(req, res, next) {
  const anonId = req.headers['x-anon-id'] || (req.body && req.body.anon_id);
  if (!anonId) return res.status(401).json({ error: 'Missing x-anon-id header' });
  const player = getOrCreatePlayer(anonId);
  if (!player) return res.status(400).json({ error: 'Invalid anon_id' });
  if (player.is_banned) return res.status(403).json({ error: 'Account banned', reason: player.ban_reason });
  req.player = player;
  next();
}
const anonAuth = authMiddleware;
function optionalAuth(req, res, next) {
  const anonId = req.headers['x-anon-id'] || (req.body && req.body.anon_id);
  if (anonId) {
    const player = getOrCreatePlayer(anonId);
    if (player && !player.is_banned) req.player = player;
  }
  next();
}

// JWT auth middleware (for admin routes)
function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(decoded.id);
    if (!player) return res.status(401).json({ error: 'Player not found' });
    if (player.is_banned) return res.status(403).json({ error: 'Account banned' });
    req.player = player;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin check (works with both auth methods)
function adminOnly(req, res, next) {
  if (!req.player || !req.player.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// ══════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── First-time admin setup (self-securing: only works when no admin exists) ──
app.get('/api/setup/status', (req, res) => {
  const admin = db.prepare('SELECT id FROM players WHERE is_admin = 1').get();
  res.json({ needsSetup: !admin });
});

app.post('/api/setup', (req, res) => {
  // Only allow when no admin account exists yet
  const existingAdmin = db.prepare('SELECT id FROM players WHERE is_admin = 1').get();
  if (existingAdmin) return res.status(403).json({ error: 'Admin account already exists. Use /api/login instead.' });

  const { password } = req.body;
  const username = req.body.username ? String(req.body.username).trim() : '';
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username.length < 2 || username.length > 24) {
    return res.status(400).json({ error: 'Username must be 2-24 characters' });
  }
  if (typeof password !== 'string' || password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }

  const existing = db.prepare('SELECT id FROM players WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const anonId = uuidv4();
  const refCode = anonId.slice(0, 8).toUpperCase();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO players (anon_id, username, password_hash, ref_code, is_admin)
     VALUES (?, ?, ?, ?, 1)`
  ).run(anonId, username, hash, refCode);

  const player = db.prepare('SELECT * FROM players WHERE anon_id = ?').get(anonId);
  db.prepare('INSERT INTO player_stats (player_id) VALUES (?)').run(player.id);

  const token = jwt.sign({ id: player.id, username: player.username, is_admin: 1 }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  const p = { ...player };
  delete p.password_hash;
  console.log('🔑 Admin account "' + username + '" created via /api/setup');
  res.status(201).json({ player: p, token });
});

// ── Signup ─────────────────────────────────────────────────────────────
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (typeof username !== 'string' || username.length < 2 || username.length > 24) {
    return res.status(400).json({ error: 'Username must be 2-24 characters' });
  }
  if (typeof password !== 'string' || password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }
  // Check username uniqueness
  const existing = db.prepare('SELECT id FROM players WHERE username = ?').get(username.trim());
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const anonId = uuidv4();
  const refCode = anonId.slice(0, 8).toUpperCase();
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`INSERT INTO players (anon_id, username, email, password_hash, ref_code)
    VALUES (?, ?, ?, ?, ?)`).run(anonId, username.trim(), email ? String(email).slice(0, 100) : null, hash, refCode);

  const player = db.prepare('SELECT * FROM players WHERE anon_id = ?').get(anonId);
  db.prepare('INSERT INTO player_stats (player_id) VALUES (?)').run(player.id);

  const token = jwt.sign({ id: player.id, username: player.username, is_admin: player.is_admin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  const p = { ...player };
  delete p.password_hash;
  res.status(201).json({ player: p, token, anon_id: anonId });
});

// ── Login ──────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const player = db.prepare('SELECT * FROM players WHERE username = ?').get(String(username).trim());
  if (!player || !player.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, player.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  if (player.is_banned) return res.status(403).json({ error: 'Account banned', reason: player.ban_reason });

  db.prepare('UPDATE players SET last_login = datetime(\'now\') WHERE id = ?').run(player.id);

  const token = jwt.sign({ id: player.id, username: player.username, is_admin: player.is_admin }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  const p = { ...player };
  delete p.password_hash;
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(player.id);
  res.json({ player: p, stats, token });
});

// ══════════════════════════════════════════════════════════════════════
// PLAYER ROUTES
// ══════════════════════════════════════════════════════════════════════

// Register / login (creates player if needed, returns profile)
app.post('/api/player/auth', (req, res) => {
  const { anon_id, username, email, password, wallet_addr } = req.body;
  if (!anon_id) return res.status(400).json({ error: 'anon_id required' });

  const player = getOrCreatePlayer(anon_id);

  // Update profile fields if provided
  const updates = [];
  const params = [];
  if (username && typeof username === 'string') { updates.push('username = ?'); params.push(username.slice(0, 24)); }
  if (email && typeof email === 'string') { updates.push('email = ?'); params.push(email.slice(0, 100)); }
  if (wallet_addr && typeof wallet_addr === 'string') { updates.push('wallet_addr = ?'); params.push(wallet_addr.slice(0, 64)); }
  if (password && typeof password === 'string') {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }
  updates.push('last_login = datetime(\'now\')');

  if (updates.length > 0) {
    params.push(player.id);
    db.prepare('UPDATE players SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);
  }

  const fresh = db.prepare('SELECT * FROM players WHERE id = ?').get(player.id);
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(player.id);
  delete fresh.password_hash;

  res.json({ player: fresh, stats });
});

// Get full player profile + stats
app.get('/api/player/profile', authMiddleware, (req, res) => {
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(req.player.id);
  const p = { ...req.player };
  delete p.password_hash;
  res.json({ player: p, stats });
});

// Update player stats (bulk sync from client)
app.post('/api/player/stats', authMiddleware, (req, res) => {
  const { credits, arcoins, total_earned, total_kills, total_wins, max_wave,
          login_streak, streak_multi, shots_fired, shots_hit, shots_ukraine,
          chain_claims } = req.body;
  const fields = [];
  const params = [];
  const allowed = { credits, arcoins, total_earned, total_kills, total_wins, max_wave,
                    login_streak, streak_multi, shots_fired, shots_hit, shots_ukraine, chain_claims };
  // Sanity-cap all numeric values to prevent absurd submissions
  const MAX_STAT = 999999999;
  for (const [k, v] of Object.entries(allowed)) {
    if (v !== undefined && typeof v === 'number' && isFinite(v)) {
      fields.push(k + ' = ?');
      params.push(Math.max(0, Math.min(v, MAX_STAT)));
    }
  }
  if (fields.length === 0) return res.json({ ok: true });
  params.push(req.player.id);
  db.prepare('UPDATE player_stats SET ' + fields.join(', ') + ' WHERE player_id = ?').run(...params);
  res.json({ ok: true });
});

// ── Wave High Scores ──────────────────────────────────────────────────
app.post('/api/player/wave-score', authMiddleware, (req, res) => {
  const { wave_num, score } = req.body;
  if (!wave_num || !score) return res.status(400).json({ error: 'wave_num and score required' });
  if (typeof wave_num !== 'number' || typeof score !== 'number') return res.status(400).json({ error: 'Invalid types' });
  if (wave_num < 1 || wave_num > 999 || score < 0 || score > 99999999) return res.status(400).json({ error: 'Out of range' });
  db.prepare(`INSERT INTO wave_high_scores (player_id, wave_num, score)
    VALUES (?, ?, ?) ON CONFLICT(player_id, wave_num)
    DO UPDATE SET score = MAX(score, excluded.score), set_at = datetime('now')
  `).run(req.player.id, wave_num, score);
  res.json({ ok: true });
});

app.get('/api/player/wave-scores', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT wave_num, score, set_at FROM wave_high_scores WHERE player_id = ? ORDER BY wave_num').all(req.player.id);
  res.json(rows);
});

// ── ARC Ledger ────────────────────────────────────────────────────────
app.post('/api/player/arc-earn', authMiddleware, (req, res) => {
  const { amount, reason } = req.body;
  if (!amount || typeof amount !== 'number') return res.status(400).json({ error: 'amount required' });
  // Cap per-request earn to prevent abuse (max 50 ARC per call)
  const safeAmount = Math.min(Math.max(0, amount), 50);
  if (safeAmount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, safeAmount, reason || '');
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ?, total_earned = total_earned + ? WHERE player_id = ?')
    .run(safeAmount, safeAmount, req.player.id);
  res.json({ ok: true });
});

app.get('/api/player/arc-ledger', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT amount, reason, created_at FROM arc_ledger WHERE player_id = ? ORDER BY created_at DESC LIMIT 100').all(req.player.id);
  res.json(rows);
});

// ── Achievements ──────────────────────────────────────────────────────
app.post('/api/player/achievement', authMiddleware, (req, res) => {
  const { achievement_id } = req.body;
  if (!achievement_id) return res.status(400).json({ error: 'achievement_id required' });
  db.prepare('INSERT OR IGNORE INTO achievements (player_id, achievement_id) VALUES (?, ?)').run(req.player.id, achievement_id);
  res.json({ ok: true });
});

app.get('/api/player/achievements', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE player_id = ?').all(req.player.id);
  res.json(rows);
});

// ── Cosmetics ─────────────────────────────────────────────────────────
app.post('/api/player/cosmetic', authMiddleware, (req, res) => {
  const { cosmetic_id, equipped } = req.body;
  if (!cosmetic_id) return res.status(400).json({ error: 'cosmetic_id required' });
  db.prepare('INSERT OR IGNORE INTO cosmetics (player_id, cosmetic_id) VALUES (?, ?)').run(req.player.id, cosmetic_id);
  if (equipped !== undefined) {
    db.prepare('UPDATE cosmetics SET equipped = ? WHERE player_id = ? AND cosmetic_id = ?').run(equipped ? 1 : 0, req.player.id, cosmetic_id);
  }
  res.json({ ok: true });
});

app.get('/api/player/cosmetics', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT cosmetic_id, equipped, bought_at FROM cosmetics WHERE player_id = ?').all(req.player.id);
  res.json(rows);
});

// ── Skills ────────────────────────────────────────────────────────────
app.post('/api/player/skill', authMiddleware, (req, res) => {
  const { skill_id } = req.body;
  if (!skill_id) return res.status(400).json({ error: 'skill_id required' });
  db.prepare('INSERT OR IGNORE INTO skills (player_id, skill_id) VALUES (?, ?)').run(req.player.id, skill_id);
  res.json({ ok: true });
});

app.get('/api/player/skills', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT skill_id, unlocked_at FROM skills WHERE player_id = ?').all(req.player.id);
  res.json(rows);
});

// ── Weapons ───────────────────────────────────────────────────────────
app.post('/api/player/weapon', authMiddleware, (req, res) => {
  const { weapon_id } = req.body;
  if (!weapon_id) return res.status(400).json({ error: 'weapon_id required' });
  db.prepare('INSERT OR IGNORE INTO weapons (player_id, weapon_id) VALUES (?, ?)').run(req.player.id, weapon_id);
  res.json({ ok: true });
});

app.get('/api/player/weapons', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT weapon_id, unlocked_at FROM weapons WHERE player_id = ?').all(req.player.id);
  res.json(rows);
});

// ── Staking ───────────────────────────────────────────────────────────
app.post('/api/player/stake', authMiddleware, (req, res) => {
  const { amount, days } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const safeDays = Math.min(Math.max(Math.floor(days || 30), 1), 365);
  // Check player has enough arcoins to stake
  const stats = db.prepare('SELECT arcoins FROM player_stats WHERE player_id = ?').get(req.player.id);
  if (!stats || stats.arcoins < amount) return res.status(400).json({ error: 'Insufficient arcoins' });
  const apy = 0.12;
  const maturesAt = new Date(Date.now() + safeDays * 86400000).toISOString();
  const reward = Math.floor(amount * apy * safeDays / 365);
  db.prepare('INSERT INTO stakes (player_id, amount, apy, matures_at, reward) VALUES (?, ?, ?, ?, ?)').run(req.player.id, amount, apy, maturesAt, reward);
  db.prepare('UPDATE player_stats SET arcoins = arcoins - ? WHERE player_id = ?').run(amount, req.player.id);
  res.json({ ok: true, reward, matures_at: maturesAt });
});

app.get('/api/player/stakes', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM stakes WHERE player_id = ? ORDER BY staked_at DESC').all(req.player.id);
  res.json(rows);
});

app.post('/api/player/stake/claim', authMiddleware, (req, res) => {
  const { stake_id } = req.body;
  const stake = db.prepare('SELECT * FROM stakes WHERE id = ? AND player_id = ?').get(stake_id, req.player.id);
  if (!stake) return res.status(404).json({ error: 'Stake not found' });
  if (stake.claimed) return res.status(400).json({ error: 'Already claimed' });
  // Enforce maturity — cannot claim before matures_at
  if (new Date(stake.matures_at) > new Date()) return res.status(400).json({ error: 'Stake not yet matured' });
  db.prepare('UPDATE stakes SET claimed = 1, claimed_at = datetime(\'now\') WHERE id = ?').run(stake_id);
  const payout = stake.amount + stake.reward;
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(payout, req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, payout, 'Stake claim #' + stake_id);
  res.json({ ok: true, payout });
});

// ── Contracts ─────────────────────────────────────────────────────────
app.post('/api/player/contract/accept', authMiddleware, (req, res) => {
  const { contract_id, description, type, target, arc_reward, money_reward, hours } = req.body;
  if (!contract_id) return res.status(400).json({ error: 'contract_id required' });
  const active = db.prepare('SELECT COUNT(*) as c FROM contracts WHERE player_id = ? AND done = 0 AND failed = 0 AND claimed = 0').get(req.player.id);
  if (active.c >= 3) return res.status(400).json({ error: 'Max 3 active contracts' });
  const expiresAt = new Date(Date.now() + (hours || 2) * 3600000).toISOString();
  db.prepare(`INSERT INTO contracts (player_id, contract_id, description, type, target, arc_reward, money_reward, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(req.player.id, contract_id, description, type, target, arc_reward || 0, money_reward || 0, expiresAt);
  res.json({ ok: true });
});

app.get('/api/player/contracts', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM contracts WHERE player_id = ? ORDER BY accepted_at DESC LIMIT 20').all(req.player.id);
  res.json(rows);
});

app.post('/api/player/contract/progress', authMiddleware, (req, res) => {
  const { type, value } = req.body;
  const contracts = db.prepare('SELECT * FROM contracts WHERE player_id = ? AND done = 0 AND failed = 0 AND claimed = 0').all(req.player.id);
  const now = new Date().toISOString();
  contracts.forEach(c => {
    if (c.type !== type) return;
    if (c.expires_at < now) {
      db.prepare('UPDATE contracts SET failed = 1 WHERE id = ?').run(c.id);
      return;
    }
    const newProg = Math.max(c.progress, value);
    const done = newProg >= c.target ? 1 : 0;
    db.prepare('UPDATE contracts SET progress = ?, done = ? WHERE id = ?').run(newProg, done, c.id);
  });
  res.json({ ok: true });
});

app.post('/api/player/contract/claim', authMiddleware, (req, res) => {
  const { contract_db_id } = req.body;
  const c = db.prepare('SELECT * FROM contracts WHERE id = ? AND player_id = ? AND done = 1 AND claimed = 0').get(contract_db_id, req.player.id);
  if (!c) return res.status(400).json({ error: 'Contract not claimable' });
  db.prepare('UPDATE contracts SET claimed = 1 WHERE id = ?').run(c.id);
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ?, credits = credits + ? WHERE player_id = ?').run(c.arc_reward, c.money_reward, req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, c.arc_reward, 'Contract: ' + c.description);
  res.json({ ok: true, arc: c.arc_reward, money: c.money_reward });
});

// ── Loans ─────────────────────────────────────────────────────────────
app.get('/api/player/loans', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM loans WHERE player_id = ? AND repaid = 0 ORDER BY taken_at DESC').all(req.player.id);
  res.json(rows);
});

app.post('/api/player/loan/repay', authMiddleware, (req, res) => {
  const { loan_id } = req.body;
  const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND player_id = ? AND repaid = 0').get(loan_id, req.player.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  const stats = db.prepare('SELECT credits FROM player_stats WHERE player_id = ?').get(req.player.id);
  if (stats.credits < loan.total) return res.status(400).json({ error: 'Not enough credits' });
  db.prepare('UPDATE loans SET repaid = 1, repaid_at = datetime(\'now\') WHERE id = ?').run(loan_id);
  db.prepare('UPDATE player_stats SET credits = credits - ? WHERE player_id = ?').run(loan.total, req.player.id);
  res.json({ ok: true });
});

// ── Minigame Stats ────────────────────────────────────────────────────
app.post('/api/player/minigame', authMiddleware, (req, res) => {
  const { game, won } = req.body;
  if (!game) return res.status(400).json({ error: 'game required' });
  const validGames = ['play21', 'cups', 'teter', 'putin_pool'];
  if (!validGames.includes(game)) return res.status(400).json({ error: 'Invalid game' });
  db.prepare(`INSERT INTO minigame_stats (player_id, game, played, won, lost)
    VALUES (?, ?, 1, ?, ?) ON CONFLICT(player_id, game)
    DO UPDATE SET played = played + 1, won = won + ?, lost = lost + ?
  `).run(req.player.id, game, won ? 1 : 0, won ? 0 : 1, won ? 1 : 0, won ? 0 : 1);
  res.json({ ok: true });
});

app.get('/api/player/minigames', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM minigame_stats WHERE player_id = ?').all(req.player.id);
  res.json(rows);
});

// ── Putin Death Pool ──────────────────────────────────────────────────
app.post('/api/player/death-pool/bet', authMiddleware, (req, res) => {
  const { bet_amount, bet_date } = req.body;
  if (!bet_amount || !bet_date) return res.status(400).json({ error: 'bet_amount and bet_date required' });
  if (typeof bet_amount !== 'number' || bet_amount < 1 || bet_amount > 10000) return res.status(400).json({ error: 'Invalid bet amount' });
  if (typeof bet_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(bet_date)) return res.status(400).json({ error: 'Invalid bet_date format (YYYY-MM-DD)' });
  db.prepare('INSERT INTO putin_death_pool (player_id, bet_amount, bet_date) VALUES (?, ?, ?)').run(req.player.id, bet_amount, bet_date);
  res.json({ ok: true });
});

app.get('/api/death-pool/all', (req, res) => {
  const total = db.prepare('SELECT SUM(bet_amount) as pool, COUNT(*) as bets FROM putin_death_pool').get();
  const topDates = db.prepare('SELECT bet_date, COUNT(*) as votes, SUM(bet_amount) as total FROM putin_death_pool GROUP BY bet_date ORDER BY votes DESC LIMIT 10').all();
  res.json({ total_pool: total.pool || 0, total_bets: total.bets || 0, top_dates: topDates });
});

// ── Clans ─────────────────────────────────────────────────────────────
app.post('/api/clan/create', authMiddleware, (req, res) => {
  const { name, tag } = req.body;
  if (!name || !tag) return res.status(400).json({ error: 'name and tag required' });
  const cleanName = name.slice(0, 24).trim();
  const cleanTag = tag.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = cleanTag + '-' + uuidv4().slice(0, 6).toUpperCase();
  try {
    db.prepare('INSERT INTO clans (name, tag, code, leader_id) VALUES (?, ?, ?, ?)').run(cleanName, cleanTag, code, req.player.id);
    const clan = db.prepare('SELECT * FROM clans WHERE code = ?').get(code);
    db.prepare('INSERT OR REPLACE INTO clan_members (clan_id, player_id, role) VALUES (?, ?, ?)').run(clan.id, req.player.id, 'leader');
    res.json({ ok: true, clan });
  } catch(e) {
    res.status(400).json({ error: 'Clan name taken' });
  }
});

app.post('/api/clan/join', authMiddleware, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const clan = db.prepare('SELECT * FROM clans WHERE code = ?').get(code.toUpperCase());
  if (!clan) return res.status(404).json({ error: 'Clan not found' });
  db.prepare('INSERT OR REPLACE INTO clan_members (clan_id, player_id, role) VALUES (?, ?, ?)').run(clan.id, req.player.id, 'member');
  res.json({ ok: true, clan });
});

app.get('/api/clan/members/:clanId', (req, res) => {
  const rows = db.prepare(`SELECT cm.role, cm.joined_at, p.username, ps.total_kills, ps.max_wave, ps.arcoins
    FROM clan_members cm JOIN players p ON cm.player_id = p.id
    LEFT JOIN player_stats ps ON cm.player_id = ps.player_id
    WHERE cm.clan_id = ? ORDER BY cm.role DESC, ps.total_kills DESC`).all(req.params.clanId);
  res.json(rows);
});

// ── Market (P2P) ──────────────────────────────────────────────────────
app.post('/api/market/list', authMiddleware, (req, res) => {
  const { item_type, item_id, price_arc, price_cred } = req.body;
  if (!item_type || !item_id) return res.status(400).json({ error: 'item_type and item_id required' });
  db.prepare('INSERT INTO market_listings (seller_id, item_type, item_id, price_arc, price_cred) VALUES (?, ?, ?, ?, ?)')
    .run(req.player.id, item_type, item_id, price_arc || null, price_cred || null);
  res.json({ ok: true });
});

app.get('/api/market/active', (req, res) => {
  const rows = db.prepare(`SELECT ml.*, p.username as seller_name FROM market_listings ml
    JOIN players p ON ml.seller_id = p.id WHERE ml.status = 'active'
    ORDER BY ml.listed_at DESC LIMIT 50`).all();
  res.json(rows);
});

app.post('/api/market/buy', authMiddleware, (req, res) => {
  const { listing_id } = req.body;
  const listing = db.prepare('SELECT * FROM market_listings WHERE id = ? AND status = \'active\'').get(listing_id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  if (listing.seller_id === req.player.id) return res.status(400).json({ error: 'Cannot buy own listing' });
  db.prepare('UPDATE market_listings SET status = \'sold\', buyer_id = ?, sold_at = datetime(\'now\') WHERE id = ?').run(req.player.id, listing_id);
  res.json({ ok: true });
});

// ── Leaderboard ───────────────────────────────────────────────────────
app.get('/api/leaderboard/:period', (req, res) => {
  const period = req.params.period || 'weekly';
  const rows = db.prepare(`SELECT l.*, p.username FROM leaderboard l
    JOIN players p ON l.player_id = p.id WHERE l.period = ?
    ORDER BY l.rank ASC LIMIT 100`).all(period);
  res.json(rows);
});

// ── Donations ─────────────────────────────────────────────────────────
app.post('/api/donation', authMiddleware, (req, res) => {
  const { amount, currency, tx_hash, method } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  db.prepare('INSERT INTO donations (player_id, amount, currency, tx_hash, method) VALUES (?, ?, ?, ?, ?)')
    .run(req.player.id, amount, currency || 'USD', tx_hash, method);
  res.json({ ok: true });
});

// ── Game Sessions (analytics) ─────────────────────────────────────────
app.post('/api/player/session/start', authMiddleware, (req, res) => {
  const result = db.prepare('INSERT INTO game_sessions (player_id) VALUES (?)').run(req.player.id);
  res.json({ session_id: result.lastInsertRowid });
});

app.post('/api/player/session/end', authMiddleware, (req, res) => {
  const { session_id, wave_reached, score, kills, death_cause, duration_s } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  db.prepare(`UPDATE game_sessions SET ended_at = datetime('now'), wave_reached = ?, score = ?, kills = ?, death_cause = ?, duration_s = ? WHERE id = ? AND player_id = ?`)
    .run(wave_reached || 0, score || 0, kills || 0, death_cause, duration_s || 0, session_id, req.player.id);
  res.json({ ok: true });
});

// ── Full Sync (export all player data / import) ──────────────────────
app.get('/api/player/sync', authMiddleware, (req, res) => {
  const pid = req.player.id;
  res.json({
    player: (() => { const p = { ...req.player }; delete p.password_hash; return p; })(),
    stats: db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(pid),
    achievements: db.prepare('SELECT achievement_id FROM achievements WHERE player_id = ?').all(pid).map(r => r.achievement_id),
    cosmetics: db.prepare('SELECT cosmetic_id, equipped FROM cosmetics WHERE player_id = ?').all(pid),
    skills: db.prepare('SELECT skill_id FROM skills WHERE player_id = ?').all(pid).map(r => r.skill_id),
    weapons: db.prepare('SELECT weapon_id FROM weapons WHERE player_id = ?').all(pid).map(r => r.weapon_id),
    stakes: db.prepare('SELECT * FROM stakes WHERE player_id = ?').all(pid),
    contracts: db.prepare('SELECT * FROM contracts WHERE player_id = ? AND claimed = 0 AND failed = 0').all(pid),
    loans: db.prepare('SELECT * FROM loans WHERE player_id = ? AND repaid = 0').all(pid),
    wave_scores: db.prepare('SELECT wave_num, score FROM wave_high_scores WHERE player_id = ?').all(pid),
    minigames: db.prepare('SELECT * FROM minigame_stats WHERE player_id = ?').all(pid),
    death_pool_bets: db.prepare('SELECT bet_amount, bet_date, placed_at FROM putin_death_pool WHERE player_id = ?').all(pid),
  });
});

app.post('/api/player/sync', authMiddleware, (req, res) => {
  const pid = req.player.id;
  const d = req.body;

  const syncTx = db.transaction(() => {
    // Stats
    if (d.stats) {
      const s = d.stats;
      db.prepare(`UPDATE player_stats SET credits=?, arcoins=?, total_earned=?, total_kills=?,
        total_wins=?, max_wave=?, login_streak=?, streak_multi=?, shots_fired=?, shots_hit=?,
        shots_ukraine=?, chain_claims=? WHERE player_id=?`).run(
        s.credits||0, s.arcoins||0, s.total_earned||0, s.total_kills||0,
        s.total_wins||0, s.max_wave||0, s.login_streak||0, s.streak_multi||1,
        s.shots_fired||0, s.shots_hit||0, s.shots_ukraine||0, s.chain_claims||0, pid
      );
    }
    // Achievements
    if (d.achievements && Array.isArray(d.achievements)) {
      const ins = db.prepare('INSERT OR IGNORE INTO achievements (player_id, achievement_id) VALUES (?, ?)');
      d.achievements.forEach(a => ins.run(pid, a));
    }
    // Cosmetics
    if (d.cosmetics && Array.isArray(d.cosmetics)) {
      const ins = db.prepare('INSERT OR IGNORE INTO cosmetics (player_id, cosmetic_id) VALUES (?, ?)');
      d.cosmetics.forEach(c => ins.run(pid, typeof c === 'string' ? c : c.cosmetic_id));
    }
    // Skills
    if (d.skills && Array.isArray(d.skills)) {
      const ins = db.prepare('INSERT OR IGNORE INTO skills (player_id, skill_id) VALUES (?, ?)');
      d.skills.forEach(s => ins.run(pid, s));
    }
    // Weapons
    if (d.weapons && Array.isArray(d.weapons)) {
      const ins = db.prepare('INSERT OR IGNORE INTO weapons (player_id, weapon_id) VALUES (?, ?)');
      d.weapons.forEach(w => ins.run(pid, w));
    }
    // Wave scores
    if (d.wave_scores && Array.isArray(d.wave_scores)) {
      const ins = db.prepare(`INSERT INTO wave_high_scores (player_id, wave_num, score)
        VALUES (?, ?, ?) ON CONFLICT(player_id, wave_num) DO UPDATE SET score = MAX(score, excluded.score)`);
      d.wave_scores.forEach(ws => ins.run(pid, ws.wave_num, ws.score));
    }
  });

  syncTx();
  res.json({ ok: true, synced_at: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════════════════

// Admin routes require a valid JWT. The previous anon_id fallback was a footgun
// (any player row with is_admin=1 could reach admin endpoints without a token);
// the admin panel authenticates with a Bearer JWT, so JWT-only is the correct gate.
function adminAuth(req, res, next) {
  return jwtAuth(req, res, next);
}

app.get('/api/admin/players', adminAuth, adminOnly, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const search = req.query.search ? String(req.query.search).slice(0, 50) : null;
  let query = `SELECT p.id, p.anon_id, p.username, p.email, p.wallet_addr, p.is_admin, p.is_banned, p.ban_reason, p.last_login, p.created_at,
    ps.credits, ps.arcoins, ps.total_kills, ps.total_wins, ps.max_wave, ps.prestige_level, ps.shots_fired, ps.shots_hit
    FROM players p LEFT JOIN player_stats ps ON p.id = ps.player_id`;
  const params = [];
  if (search) {
    query += ` WHERE p.username LIKE ? OR p.email LIKE ? OR p.wallet_addr LIKE ?`;
    const like = '%' + search + '%';
    params.push(like, like, like);
  }
  query += ` ORDER BY p.last_login DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  const rows = db.prepare(query).all(...params);
  const totalQ = search
    ? db.prepare('SELECT COUNT(*) as c FROM players WHERE username LIKE ? OR email LIKE ? OR wallet_addr LIKE ?')
        .get('%' + search + '%', '%' + search + '%', '%' + search + '%')
    : db.prepare('SELECT COUNT(*) as c FROM players').get();
  res.json({ players: rows, total: totalQ.c });
});

app.post('/api/admin/ban', adminAuth, adminOnly, (req, res) => {
  const { player_id, ban, reason } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  db.prepare('UPDATE players SET is_banned = ?, ban_reason = ? WHERE id = ?').run(ban ? 1 : 0, reason || null, player_id);
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)').run(req.player.id, ban ? 'ban' : 'unban', player_id, reason);
  res.json({ ok: true });
});

app.post('/api/admin/grant-admin', adminAuth, adminOnly, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  db.prepare('UPDATE players SET is_admin = 1 WHERE id = ?').run(player_id);
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id) VALUES (?, ?, ?)').run(req.player.id, 'grant_admin', player_id);
  res.json({ ok: true });
});

app.post('/api/admin/give-arc', adminAuth, adminOnly, (req, res) => {
  const { player_id, amount } = req.body;
  if (!player_id || !amount) return res.status(400).json({ error: 'player_id and amount required' });
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(amount, player_id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(player_id, amount, 'Admin grant');
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)').run(req.player.id, 'give_arc', player_id, String(amount));
  res.json({ ok: true });
});

app.get('/api/admin/stats', adminAuth, adminOnly, (req, res) => {
  const players = db.prepare('SELECT COUNT(*) as c FROM players').get();
  const sessions = db.prepare('SELECT COUNT(*) as c FROM game_sessions').get();
  const totalArc = db.prepare('SELECT SUM(arcoins) as total FROM player_stats').get();
  const totalDonations = db.prepare('SELECT SUM(amount) as total, COUNT(*) as c FROM donations').get();
  const poolStats = db.prepare('SELECT SUM(bet_amount) as pool, COUNT(*) as bets FROM putin_death_pool').get();
  const activeStakes = db.prepare('SELECT SUM(amount) as total, COUNT(*) as c FROM stakes WHERE claimed = 0').get();
  const activeLoans = db.prepare('SELECT SUM(total) as total, COUNT(*) as c FROM loans WHERE repaid = 0').get();
  const recentSessions = db.prepare('SELECT COUNT(*) as c FROM game_sessions WHERE started_at > datetime(\'now\', \'-24 hours\')').get();
  res.json({
    total_players: players.c,
    total_sessions: sessions.c,
    sessions_24h: recentSessions.c,
    total_arc_supply: totalArc.total || 0,
    donations: { total: totalDonations.total || 0, count: totalDonations.c || 0 },
    death_pool: { pool: poolStats.pool || 0, bets: poolStats.bets || 0 },
    staking: { locked: activeStakes.total || 0, count: activeStakes.c || 0 },
    loans: { outstanding: activeLoans.total || 0, count: activeLoans.c || 0 },
  });
});

app.get('/api/admin/log', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT al.*, p.username as admin_name FROM admin_log al
    JOIN players p ON al.admin_id = p.id ORDER BY al.created_at DESC LIMIT 100`).all();
  res.json(rows);
});

// ── Settings (admin) ──────────────────────────────────────────────────
app.get('/api/admin/settings', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  res.json(rows);
});

app.post('/api/admin/settings', adminAuth, adminOnly, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'setting_change', key + '=' + value);
  res.json({ ok: true });
});

// ── News ──────────────────────────────────────────────────────────────
app.get('/api/news', (req, res) => {
  const rows = db.prepare(`SELECT n.*, p.username as author FROM news n
    LEFT JOIN players p ON n.author_id = p.id ORDER BY n.pinned DESC, n.created_at DESC LIMIT 20`).all();
  res.json(rows);
});

app.post('/api/admin/news', adminAuth, adminOnly, (req, res) => {
  const { title, body, pinned } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  db.prepare('INSERT INTO news (title, body, author_id, pinned) VALUES (?, ?, ?, ?)').run(title, body || '', req.player.id, pinned ? 1 : 0);
  res.json({ ok: true });
});

// ── Game Config (admin) ───────────────────────────────────────────────

// Get all game config, grouped by category
app.get('/api/admin/game-config', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM game_config ORDER BY category, key').all();
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }
  res.json(grouped);
});

// Get config for a specific category
app.get('/api/admin/game-config/:category', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT * FROM game_config WHERE category = ? ORDER BY key').all(req.params.category);
  res.json(rows);
});

// Update a single config value
app.post('/api/admin/game-config', adminAuth, adminOnly, (req, res) => {
  const { category, key, value } = req.body;
  if (!category || !key || value === undefined) return res.status(400).json({ error: 'category, key, value required' });

  const existing = db.prepare('SELECT * FROM game_config WHERE category = ? AND key = ?').get(category, key);
  if (!existing) return res.status(404).json({ error: 'Config key not found' });

  // Validate numeric bounds
  const numVal = parseFloat(value);
  if (existing.data_type === 'number') {
    if (!isFinite(numVal)) return res.status(400).json({ error: 'Value must be a valid number' });
    if (existing.min_val !== null && numVal < existing.min_val) return res.status(400).json({ error: 'Value below minimum: ' + existing.min_val });
    if (existing.max_val !== null && numVal > existing.max_val) return res.status(400).json({ error: 'Value above maximum: ' + existing.max_val });
  }

  // Log history
  db.prepare('INSERT INTO config_history (category, key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)')
    .run(category, key, existing.value, String(value), req.player.id);

  // Update
  db.prepare('UPDATE game_config SET value = ?, updated_at = datetime(\'now\'), updated_by = ? WHERE category = ? AND key = ?')
    .run(String(value), req.player.id, category, key);

  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)')
    .run(req.player.id, 'config_change', category + '.' + key + '=' + value);

  res.json({ ok: true });
});

// Batch update multiple config values
app.post('/api/admin/game-config/batch', adminAuth, adminOnly, (req, res) => {
  const { changes } = req.body;
  if (!Array.isArray(changes) || changes.length === 0) return res.status(400).json({ error: 'changes array required' });
  if (changes.length > 50) return res.status(400).json({ error: 'Max 50 changes per batch' });

  const errors = [];
  const updateTx = db.transaction(() => {
    for (const ch of changes) {
      const { category, key, value } = ch;
      if (!category || !key || value === undefined) { errors.push(key + ': missing fields'); continue; }
      const existing = db.prepare('SELECT * FROM game_config WHERE category = ? AND key = ?').get(category, key);
      if (!existing) { errors.push(key + ': not found'); continue; }

      if (existing.data_type === 'number') {
        const num = parseFloat(value);
        if (!isFinite(num)) { errors.push(key + ': not a number'); continue; }
        if (existing.min_val !== null && num < existing.min_val) { errors.push(key + ': below min ' + existing.min_val); continue; }
        if (existing.max_val !== null && num > existing.max_val) { errors.push(key + ': above max ' + existing.max_val); continue; }
      }

      db.prepare('INSERT INTO config_history (category, key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)')
        .run(category, key, existing.value, String(value), req.player.id);
      db.prepare('UPDATE game_config SET value = ?, updated_at = datetime(\'now\'), updated_by = ? WHERE category = ? AND key = ?')
        .run(String(value), req.player.id, category, key);
    }
    db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)')
      .run(req.player.id, 'config_batch', changes.length + ' changes');
  });

  updateTx();
  res.json({ ok: true, errors: errors.length ? errors : undefined, applied: changes.length - errors.length });
});

// Get config change history
app.get('/api/admin/game-config-history', adminAuth, adminOnly, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const rows = db.prepare(`SELECT ch.*, p.username as changed_by_name FROM config_history ch
    LEFT JOIN players p ON ch.changed_by = p.id ORDER BY ch.changed_at DESC LIMIT ?`).all(limit);
  res.json(rows);
});

// Reset a config key to its default
app.post('/api/admin/game-config/reset', adminAuth, adminOnly, (req, res) => {
  const { category, key } = req.body;
  if (!category || !key) return res.status(400).json({ error: 'category and key required' });
  // Default values are seeded in db.js — we just need to re-run initDB for that key.
  // For now, log and return the current value so admin can manually set defaults.
  const row = db.prepare('SELECT * FROM game_config WHERE category = ? AND key = ?').get(category, key);
  if (!row) return res.status(404).json({ error: 'Config key not found' });
  res.json({ current: row });
});

// ── Player Detail (admin) ─────────────────────────────────────────────
app.get('/api/admin/player/:id', adminAuth, adminOnly, (req, res) => {
  const pid = parseInt(req.params.id);
  if (!pid) return res.status(400).json({ error: 'Invalid player id' });
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pid);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  delete player.password_hash;
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(pid);
  const achievements = db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE player_id = ?').all(pid);
  const weapons = db.prepare('SELECT weapon_id, unlocked_at FROM weapons WHERE player_id = ?').all(pid);
  const sessions = db.prepare('SELECT * FROM game_sessions WHERE player_id = ? ORDER BY started_at DESC LIMIT 20').all(pid);
  const stakes = db.prepare('SELECT * FROM stakes WHERE player_id = ?').all(pid);
  const loans = db.prepare('SELECT * FROM loans WHERE player_id = ?').all(pid);
  const minigames = db.prepare('SELECT * FROM minigame_stats WHERE player_id = ?').all(pid);
  const battlePass = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? ORDER BY season DESC').all(pid);
  const missions = db.prepare('SELECT * FROM daily_missions WHERE player_id = ? ORDER BY mission_date DESC LIMIT 20').all(pid);
  const cosmetics = db.prepare('SELECT * FROM cosmetics WHERE player_id = ?').all(pid);
  const skills = db.prepare('SELECT * FROM skills WHERE player_id = ?').all(pid);
  const spins = db.prepare('SELECT * FROM spin_wheel WHERE player_id = ? ORDER BY spun_at DESC LIMIT 10').all(pid);
  const referrals = db.prepare('SELECT r.*, p.username as referred_name FROM referrals r JOIN players p ON r.referred_id = p.id WHERE r.referrer_id = ?').all(pid);
  res.json({ player, stats, achievements, weapons, sessions, stakes, loans, minigames, battlePass, missions, cosmetics, skills, spins, referrals });
});

// ── Admin: Reset player stats ─────────────────────────────────────────
app.post('/api/admin/reset-player', adminAuth, adminOnly, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  db.prepare(`UPDATE player_stats SET credits=500, arcoins=0, total_earned=0, total_kills=0,
    total_wins=0, max_wave=0, prestige_level=0, login_streak=0, streak_multi=1.0,
    shots_fired=0, shots_hit=0, shots_ukraine=0, chain_claims=0, lb_rank=999 WHERE player_id=?`).run(player_id);
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)').run(req.player.id, 'reset_player', player_id, 'Stats reset');
  res.json({ ok: true });
});

// ── Admin: Revoke admin ───────────────────────────────────────────────
app.post('/api/admin/revoke-admin', adminAuth, adminOnly, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  if (player_id === req.player.id) return res.status(400).json({ error: 'Cannot revoke own admin' });
  db.prepare('UPDATE players SET is_admin = 0 WHERE id = ?').run(player_id);
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id) VALUES (?, ?, ?)').run(req.player.id, 'revoke_admin', player_id);
  res.json({ ok: true });
});

// ── Admin: Delete player ──────────────────────────────────────────────
app.post('/api/admin/delete-player', adminAuth, adminOnly, (req, res) => {
  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id required' });
  if (player_id === req.player.id) return res.status(400).json({ error: 'Cannot delete own account' });
  db.prepare('DELETE FROM players WHERE id = ?').run(player_id);
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)').run(req.player.id, 'delete_player', player_id, 'Account deleted');
  res.json({ ok: true });
});

// ── Admin: Enhanced Stats ─────────────────────────────────────────────
app.get('/api/admin/stats/extended', adminAuth, adminOnly, (req, res) => {
  const topPlayers = db.prepare(`SELECT p.username, ps.total_kills, ps.max_wave, ps.arcoins, ps.prestige_level
    FROM players p JOIN player_stats ps ON p.id = ps.player_id ORDER BY ps.total_kills DESC LIMIT 10`).all();
  const recentSignups = db.prepare(`SELECT COUNT(*) as c FROM players WHERE created_at > datetime('now', '-24 hours')`).get();
  const weaponPop = db.prepare(`SELECT weapon_id, COUNT(*) as count FROM weapons GROUP BY weapon_id ORDER BY count DESC LIMIT 10`).all();
  const avgWave = db.prepare('SELECT AVG(max_wave) as avg, MAX(max_wave) as max FROM player_stats').get();
  const achievementPop = db.prepare('SELECT achievement_id, COUNT(*) as count FROM achievements GROUP BY achievement_id ORDER BY count DESC LIMIT 10').all();
  const totalShots = db.prepare('SELECT SUM(shots_fired) as fired, SUM(shots_hit) as hit FROM player_stats').get();
  const minigameStats = db.prepare('SELECT game, SUM(played) as played, SUM(won) as won FROM minigame_stats GROUP BY game').all();
  res.json({ topPlayers, recentSignups: recentSignups.c, weaponPop, avgWave, achievementPop, totalShots, minigameStats });
});

// ══════════════════════════════════════════════════════════════════════
// DAILY MISSIONS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/missions', anonAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const missions = db.prepare('SELECT * FROM daily_missions WHERE player_id = ? AND mission_date = ?').all(req.player.id, today);
  res.json({ date: today, missions });
});

app.post('/api/player/missions/progress', anonAuth, (req, res) => {
  const { mission_index, progress } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  if (mission_index === undefined) return res.status(400).json({ error: 'mission_index required' });
  const row = db.prepare('SELECT * FROM daily_missions WHERE player_id = ? AND mission_date = ? AND mission_index = ?')
    .get(req.player.id, today, mission_index);
  if (!row) return res.status(404).json({ error: 'Mission not found' });
  const newProg = Math.min(row.target, (progress !== undefined ? parseInt(progress) : row.progress + 1));
  const done = newProg >= row.target ? 1 : 0;
  db.prepare('UPDATE daily_missions SET progress = ?, done = ? WHERE id = ?').run(newProg, done, row.id);
  res.json({ ok: true, progress: newProg, done });
});

app.post('/api/player/missions/claim', anonAuth, (req, res) => {
  const { mission_index } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare('SELECT * FROM daily_missions WHERE player_id = ? AND mission_date = ? AND mission_index = ? AND done = 1 AND claimed = 0')
    .get(req.player.id, today, mission_index);
  if (!row) return res.status(400).json({ error: 'Mission not claimable' });
  db.prepare('UPDATE daily_missions SET claimed = 1 WHERE id = ?').run(row.id);
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(row.arc_reward, req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, row.arc_reward, 'Daily mission: ' + row.mission_id);
  res.json({ ok: true, reward: row.arc_reward });
});

app.post('/api/player/missions/generate', anonAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT COUNT(*) as c FROM daily_missions WHERE player_id = ? AND mission_date = ?')
    .get(req.player.id, today);
  if (existing.c > 0) return res.json({ ok: true, message: 'Already generated' });
  const POOL = [
    { id: 'kill_20',    type: 'kills',   target: 20,  arc: 3  },
    { id: 'kill_50',    type: 'kills',   target: 50,  arc: 5  },
    { id: 'wave_3',     type: 'wave',    target: 3,   arc: 4  },
    { id: 'headshot_5', type: 'headshots',target: 5,  arc: 3  },
    { id: 'score_5k',   type: 'score',   target: 5000,arc: 4  },
    { id: 'combo_3',    type: 'combo',   target: 3,   arc: 2  },
    { id: 'no_death',   type: 'nodeath', target: 1,   arc: 5  },
    { id: 'w2_clear',   type: 'w2clear', target: 1,   arc: 3  },
  ];
  // Pick 3 random missions
  const shuffled = POOL.sort(() => Math.random() - 0.5).slice(0, 3);
  const insert = db.prepare('INSERT INTO daily_missions (player_id, mission_date, mission_index, mission_id, type, target, arc_reward) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    shuffled.forEach((m, i) => insert.run(req.player.id, today, i, m.id, m.type, m.target, m.arc));
  });
  tx();
  res.json({ ok: true, count: shuffled.length });
});

// ══════════════════════════════════════════════════════════════════════
// BATTLE PASS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/battlepass', anonAuth, (req, res) => {
  const season = parseInt(req.query.season) || 1;
  let bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, season);
  if (!bp) {
    db.prepare('INSERT INTO battle_pass (player_id, season) VALUES (?, ?)').run(req.player.id, season);
    bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, season);
  }
  res.json(bp);
});

app.post('/api/player/battlepass/kills', anonAuth, (req, res) => {
  const { kills, season } = req.body;
  const s = season || 1;
  let bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, s);
  if (!bp) {
    db.prepare('INSERT INTO battle_pass (player_id, season) VALUES (?, ?)').run(req.player.id, s);
    bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, s);
  }
  const newKills = bp.total_kills + (parseInt(kills) || 0);
  db.prepare('UPDATE battle_pass SET total_kills = ? WHERE id = ?').run(newKills, bp.id);
  res.json({ ok: true, total_kills: newKills });
});

app.post('/api/player/battlepass/upgrade', anonAuth, (req, res) => {
  const season = req.body.season || 1;
  const cost = 50; // _BP_PREM_COST
  const stats = db.prepare('SELECT arcoins FROM player_stats WHERE player_id = ?').get(req.player.id);
  if (!stats || stats.arcoins < cost) return res.status(400).json({ error: 'Not enough ARC (need ' + cost + ')' });
  let bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, season);
  if (!bp) {
    db.prepare('INSERT INTO battle_pass (player_id, season) VALUES (?, ?)').run(req.player.id, season);
    bp = db.prepare('SELECT * FROM battle_pass WHERE player_id = ? AND season = ?').get(req.player.id, season);
  }
  if (bp.is_premium) return res.status(400).json({ error: 'Already premium' });
  db.prepare('UPDATE battle_pass SET is_premium = 1, purchased_at = datetime(\'now\') WHERE id = ?').run(bp.id);
  db.prepare('UPDATE player_stats SET arcoins = arcoins - ? WHERE player_id = ?').run(cost, req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, -cost, 'Battle Pass Premium');
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// SPIN WHEEL
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/spin', anonAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const lastSpin = db.prepare('SELECT * FROM spin_wheel WHERE player_id = ? ORDER BY spun_at DESC LIMIT 1').get(req.player.id);
  const canSpin = !lastSpin || lastSpin.spun_at.slice(0, 10) !== today;
  res.json({ canSpin, lastSpin });
});

app.post('/api/player/spin', anonAuth, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const lastSpin = db.prepare('SELECT * FROM spin_wheel WHERE player_id = ? ORDER BY spun_at DESC LIMIT 1').get(req.player.id);
  if (lastSpin && lastSpin.spun_at.slice(0, 10) === today) {
    return res.status(429).json({ error: 'Already spun today', next: today + 'T00:00:00Z' });
  }
  const PRIZES = [
    { prize: 'ARC', amount: 1, weight: 30 },
    { prize: 'ARC', amount: 3, weight: 25 },
    { prize: 'ARC', amount: 5, weight: 15 },
    { prize: 'ARC', amount: 10, weight: 8 },
    { prize: 'ARC', amount: 25, weight: 3 },
    { prize: 'Credits', amount: 100, weight: 10 },
    { prize: 'Credits', amount: 250, weight: 5 },
    { prize: 'XP Boost', amount: 1, weight: 4 },
  ];
  const totalWeight = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  let picked = PRIZES[0];
  for (const p of PRIZES) {
    r -= p.weight;
    if (r <= 0) { picked = p; break; }
  }
  db.prepare('INSERT INTO spin_wheel (player_id, prize, amount) VALUES (?, ?, ?)').run(req.player.id, picked.prize, picked.amount);
  if (picked.prize === 'ARC') {
    db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(picked.amount, req.player.id);
    db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, picked.amount, 'Daily Spin: ' + picked.amount + ' ARC');
  } else if (picked.prize === 'Credits') {
    db.prepare('UPDATE player_stats SET credits = credits + ? WHERE player_id = ?').run(picked.amount, req.player.id);
  }
  res.json({ prize: picked.prize, amount: picked.amount });
});

// ══════════════════════════════════════════════════════════════════════
// REFERRALS
// ══════════════════════════════════════════════════════════════════════
app.post('/api/player/referral', anonAuth, (req, res) => {
  const { referrer_code } = req.body;
  if (!referrer_code) return res.status(400).json({ error: 'referrer_code required' });
  const referrer = db.prepare('SELECT id FROM players WHERE ref_code = ?').get(String(referrer_code).trim().toUpperCase());
  if (!referrer) return res.status(404).json({ error: 'Referral code not found' });
  if (referrer.id === req.player.id) return res.status(400).json({ error: 'Cannot refer yourself' });
  const existing = db.prepare('SELECT id FROM referrals WHERE referred_id = ?').get(req.player.id);
  if (existing) return res.status(409).json({ error: 'Already referred' });
  const bonus = 5;
  db.prepare('INSERT INTO referrals (referrer_id, referred_id, bonus_paid) VALUES (?, ?, ?)').run(referrer.id, req.player.id, bonus);
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(bonus, referrer.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(referrer.id, bonus, 'Referral bonus');
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(bonus, req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(req.player.id, bonus, 'Referral welcome bonus');
  res.json({ ok: true, bonus });
});

app.get('/api/player/referrals', anonAuth, (req, res) => {
  const refs = db.prepare(`SELECT r.*, p.username as referred_name FROM referrals r
    JOIN players p ON r.referred_id = p.id WHERE r.referrer_id = ? ORDER BY r.created_at DESC`).all(req.player.id);
  res.json(refs);
});

// ══════════════════════════════════════════════════════════════════════
// EMAIL SUBSCRIBE (legacy endpoint for registration modal)
// ══════════════════════════════════════════════════════════════════════
app.post('/api/email/subscribe', (req, res) => {
  const { email, username } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  // Just store/update on existing player if found
  const player = db.prepare('SELECT id FROM players WHERE email = ?').get(String(email).slice(0, 100));
  if (player) {
    if (username) db.prepare('UPDATE players SET username = ? WHERE id = ?').run(String(username).slice(0, 24), player.id);
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: ECONOMY CONFIG CATEGORIES (cosmetics, battle pass, skills, prestige)
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/economy-overview', adminAuth, adminOnly, (req, res) => {
  const totalArc = db.prepare('SELECT SUM(arcoins) as total FROM player_stats').get();
  const totalEarned = db.prepare('SELECT SUM(total_earned) as total FROM player_stats').get();
  const spins = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM spin_wheel WHERE prize = ?').get('ARC');
  const bpSales = db.prepare('SELECT COUNT(*) as count FROM battle_pass WHERE is_premium = 1').get();
  const missionsClaimed = db.prepare('SELECT COUNT(*) as count, SUM(arc_reward) as total FROM daily_missions WHERE claimed = 1').get();
  const referralBonuses = db.prepare('SELECT COUNT(*) as count, SUM(bonus_paid) as total FROM referrals').get();
  const cosmBought = db.prepare('SELECT COUNT(*) as count FROM cosmetics').get();
  const staked = db.prepare('SELECT COUNT(*) as count, SUM(amount) as total FROM stakes WHERE claimed = ?').get(0);
  res.json({
    arc_circulating: totalArc.total || 0,
    arc_total_earned: totalEarned.total || 0,
    spins: { count: spins.count || 0, arc_paid: spins.total || 0 },
    battle_pass: { premium_count: bpSales.count || 0 },
    missions: { claimed: missionsClaimed.count || 0, arc_paid: missionsClaimed.total || 0 },
    referrals: { count: referralBonuses.count || 0, bonuses_paid: referralBonuses.total || 0 },
    cosmetics_purchased: cosmBought.count || 0,
    staking: { active: staked.count || 0, locked: staked.total || 0 },
  });
});

// ══════════════════════════════════════════════════════════════════════
// ARC PURCHASES (crypto buy records)
// ══════════════════════════════════════════════════════════════════════
app.post('/api/arc/purchase', anonAuth, (req, res) => {
  const { pol_amount, arc_amount, tx_hash, label } = req.body;
  if (!pol_amount || !arc_amount) return res.status(400).json({ error: 'pol_amount and arc_amount required' });
  db.prepare('INSERT INTO arc_purchases (player_id, pol_amount, arc_amount, tx_hash, label) VALUES (?, ?, ?, ?, ?)')
    .run(req.player.id, parseFloat(pol_amount), parseFloat(arc_amount), String(tx_hash || '').slice(0, 100), String(label || '').slice(0, 50));
  db.prepare('UPDATE player_stats SET arcoins = arcoins + ?, total_earned = total_earned + ? WHERE player_id = ?')
    .run(parseFloat(arc_amount), parseFloat(arc_amount), req.player.id);
  db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)')
    .run(req.player.id, parseFloat(arc_amount), 'Purchase: ' + (label || arc_amount + ' ARC'));
  // 10% Ukraine donation tracking
  const donation = parseFloat(pol_amount) * 0.10;
  db.prepare('INSERT INTO donations (player_id, amount, currency, method) VALUES (?, ?, ?, ?)')
    .run(req.player.id, donation, 'POL', 'auto_10pct');
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// JOKES TICKER + SUBMIT
// ══════════════════════════════════════════════════════════════════════
app.get('/api/jokes/ticker', (req, res) => {
  const jokes = db.prepare('SELECT text, username FROM jokes WHERE approved = 1 AND flagged = 0 ORDER BY RANDOM() LIMIT 20').all();
  res.json({ jokes });
});

app.post('/api/jokes/submit', (req, res) => {
  const { joke, username } = req.body;
  if (!joke || String(joke).trim().length < 10) return res.status(400).json({ error: 'Joke must be at least 10 characters' });
  const text = String(joke).trim().slice(0, 500);
  const uname = String(username || 'Anonymous').slice(0, 24);
  db.prepare('INSERT INTO jokes (text, username) VALUES (?, ?)').run(text, uname);
  res.json({ ok: true, message: 'Joke submitted! It will appear after admin approval.' });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: PURCHASES
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/purchases', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT ap.*, p.username FROM arc_purchases ap
    LEFT JOIN players p ON ap.player_id = p.id ORDER BY ap.created_at DESC LIMIT 200`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: STAKING
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/staking', adminAuth, adminOnly, (req, res) => {
  const summary = db.prepare(`SELECT
    COUNT(CASE WHEN claimed = 0 THEN 1 END) as active_count,
    SUM(CASE WHEN claimed = 0 THEN amount ELSE 0 END) as total_locked,
    SUM(reward) as total_rewarded FROM stakes`).get();
  const stakes = db.prepare(`SELECT s.*, p.username FROM stakes s
    LEFT JOIN players p ON s.player_id = p.id ORDER BY s.staked_at DESC LIMIT 200`).all();
  res.json({ summary: summary || { active_count: 0, total_locked: 0, total_rewarded: 0 }, stakes });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: LEADERBOARD
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/leaderboard', adminAuth, adminOnly, (req, res) => {
  const sortMap = {
    kills: 'ps.total_kills DESC',
    wave: 'ps.max_wave DESC',
    arc: 'ps.arcoins DESC',
    prestige: 'ps.prestige_level DESC',
  };
  const sort = sortMap[req.query.sort] || sortMap.kills;
  const rows = db.prepare(`SELECT p.id, p.username, ps.total_kills, ps.max_wave, ps.arcoins,
    ps.prestige_level, ps.total_wins FROM players p JOIN player_stats ps ON p.id = ps.player_id
    ORDER BY ${sort} LIMIT 100`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: CLANS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/clans', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT c.*, p.username as leader_name,
    (SELECT COUNT(*) FROM clan_members cm WHERE cm.clan_id = c.id) as member_count
    FROM clans c LEFT JOIN players p ON c.leader_id = p.id ORDER BY c.created_at DESC`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN: COSMETICS CATALOG MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/jokes', adminAuth, adminOnly, (req, res) => {
  const filter = req.query.filter || 'pending';
  let where = '';
  if (filter === 'pending') where = 'WHERE approved = 0 AND flagged = 0';
  else if (filter === 'approved') where = 'WHERE approved = 1';
  else if (filter === 'flagged') where = 'WHERE flagged = 1';
  const rows = db.prepare('SELECT * FROM jokes ' + where + ' ORDER BY created_at DESC LIMIT 200').all();
  res.json(rows);
});

app.post('/api/admin/jokes/:id/approve', adminAuth, adminOnly, (req, res) => {
  db.prepare('UPDATE jokes SET approved = 1, flagged = 0 WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.post('/api/admin/jokes/:id/flag', adminAuth, adminOnly, (req, res) => {
  db.prepare('UPDATE jokes SET flagged = 1, approved = 0 WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.post('/api/admin/jokes/:id/delete', adminAuth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM jokes WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/cosmetics', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare(`SELECT cc.*, (SELECT COUNT(*) FROM cosmetics c WHERE c.cosmetic_id = cc.cosmetic_id) as owner_count
    FROM cosmetics_catalog cc ORDER BY cc.created_at DESC`).all();
  res.json(rows);
});

app.post('/api/admin/cosmetics', adminAuth, adminOnly, (req, res) => {
  const { cosmetic_id, type, price, rarity, label } = req.body;
  if (!cosmetic_id) return res.status(400).json({ error: 'cosmetic_id required' });
  try {
    db.prepare('INSERT INTO cosmetics_catalog (cosmetic_id, type, price, rarity, label) VALUES (?, ?, ?, ?, ?)')
      .run(String(cosmetic_id).slice(0, 50), type || 'weapon_skin', parseFloat(price) || 0, rarity || 'common', String(label || cosmetic_id).slice(0, 50));
    db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)')
      .run(req.admin.id, 'add_cosmetic', cosmetic_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(409).json({ error: 'Duplicate cosmetic_id or DB error' });
  }
});

app.delete('/api/admin/cosmetics/:id', adminAuth, adminOnly, (req, res) => {
  const cid = req.params.id;
  db.prepare('DELETE FROM cosmetics_catalog WHERE cosmetic_id = ?').run(cid);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)')
    .run(req.admin.id, 'delete_cosmetic', cid);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// PUBLIC GAME CONFIG (for client to fetch live config)
// ══════════════════════════════════════════════════════════════════════
app.get('/api/game-config', (req, res) => {
  const rows = db.prepare('SELECT category, key, value, data_type FROM game_config').all();
  const config = {};
  for (const row of rows) {
    if (!config[row.category]) config[row.category] = {};
    config[row.category][row.key] = row.data_type === 'number' ? parseFloat(row.value) : row.value;
  }
  // Also include settings that affect gameplay
  const settings = db.prepare('SELECT key, value FROM settings').all();
  config._settings = {};
  for (const s of settings) config._settings[s.key] = s.value;
  res.json(config);
});

// ══════════════════════════════════════════════════════════════════════
// STREAK BADGES
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/streak-badges', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.json([]);
  const rows = db.prepare('SELECT badge_id, earned_at FROM streak_badges WHERE player_id = ? ORDER BY earned_at DESC').all(pid);
  res.json(rows);
});
app.post('/api/player/streak-badge', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.status(401).json({ error: 'auth required' });
  const { badge_id } = req.body;
  if (!badge_id || typeof badge_id !== 'string') return res.status(400).json({ error: 'badge_id required' });
  const allowed = ['login_3','login_7','login_14','login_30','login_60','login_100'];
  if (!allowed.includes(badge_id)) return res.status(400).json({ error: 'invalid badge_id' });
  try {
    db.prepare('INSERT OR IGNORE INTO streak_badges (player_id, badge_id) VALUES (?, ?)').run(pid, badge_id);
    res.json({ ok: true });
  } catch (e) { res.json({ ok: true, note: 'already earned' }); }
});

// ══════════════════════════════════════════════════════════════════════
// NFTs
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/nfts', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.json([]);
  const rows = db.prepare('SELECT id, token_id, contract, tier, name, image_url, minted_at FROM nfts WHERE player_id = ? ORDER BY minted_at DESC').all(pid);
  res.json(rows);
});
app.post('/api/player/nft/mint', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.status(401).json({ error: 'auth required' });
  const { token_id, contract, tier, name, image_url } = req.body;
  if (!token_id || !contract) return res.status(400).json({ error: 'token_id and contract required' });
  const safeFields = {
    token_id: String(token_id).slice(0, 100),
    contract: String(contract).slice(0, 100),
    tier: String(tier || 'common').slice(0, 50),
    name: String(name || '').slice(0, 200),
    image_url: String(image_url || '').slice(0, 500)
  };
  db.prepare('INSERT INTO nfts (player_id, token_id, contract, tier, name, image_url) VALUES (?, ?, ?, ?, ?, ?)')
    .run(pid, safeFields.token_id, safeFields.contract, safeFields.tier, safeFields.name, safeFields.image_url);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// PVP CHALLENGES
// ══════════════════════════════════════════════════════════════════════
app.get('/api/player/pvp', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.json([]);
  const rows = db.prepare(`SELECT c.*, p1.username AS challenger_name, p2.username AS opponent_name 
    FROM pvp_challenges c 
    LEFT JOIN players p1 ON c.challenger_id = p1.id 
    LEFT JOIN players p2 ON c.opponent_id = p2.id 
    WHERE c.challenger_id = ? OR c.opponent_id = ? 
    ORDER BY c.created_at DESC LIMIT 50`).all(pid, pid);
  res.json(rows);
});
app.post('/api/player/pvp/create', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.status(401).json({ error: 'auth required' });
  const { opponent_id, wager } = req.body;
  if (!opponent_id) return res.status(400).json({ error: 'opponent_id required' });
  const w = Math.max(0, Math.min(Number(wager) || 0, 1000));
  // Check player has enough ARC for wager
  if (w > 0) {
    const p = db.prepare('SELECT arc_balance FROM players WHERE id = ?').get(pid);
    if (!p || p.arc_balance < w) return res.status(400).json({ error: 'insufficient ARC for wager' });
  }
  const info = db.prepare('INSERT INTO pvp_challenges (challenger_id, opponent_id, wager) VALUES (?, ?, ?)').run(pid, opponent_id, w);
  res.json({ ok: true, challenge_id: info.lastInsertRowid });
});
app.post('/api/player/pvp/accept', optionalAuth, (req, res) => {
  const pid = req.playerId; if (!pid) return res.status(401).json({ error: 'auth required' });
  const { challenge_id } = req.body;
  if (!challenge_id) return res.status(400).json({ error: 'challenge_id required' });
  const ch = db.prepare('SELECT * FROM pvp_challenges WHERE id = ? AND opponent_id = ? AND status = ?').get(challenge_id, pid, 'pending');
  if (!ch) return res.status(404).json({ error: 'challenge not found or not pending' });
  db.prepare("UPDATE pvp_challenges SET status = 'accepted' WHERE id = ?").run(challenge_id);
  res.json({ ok: true });
});
app.post('/api/player/pvp/resolve', adminAuth, (req, res) => {
  const { challenge_id, winner_id, challenger_score, opponent_score } = req.body;
  if (!challenge_id || !winner_id) return res.status(400).json({ error: 'challenge_id and winner_id required' });
  const ch = db.prepare('SELECT * FROM pvp_challenges WHERE id = ? AND status = ?').get(challenge_id, 'accepted');
  if (!ch) return res.status(404).json({ error: 'challenge not found or not accepted' });
  db.prepare(`UPDATE pvp_challenges SET status = 'resolved', winner_id = ?, 
    challenger_score = ?, opponent_score = ?, resolved_at = datetime('now') WHERE id = ?`)
    .run(winner_id, challenger_score || 0, opponent_score || 0, challenge_id);
  // Transfer wager to winner
  if (ch.wager > 0) {
    const loserId = winner_id === ch.challenger_id ? ch.opponent_id : ch.challenger_id;
    db.prepare('UPDATE players SET arc_balance = arc_balance + ? WHERE id = ?').run(ch.wager, winner_id);
    db.prepare('UPDATE players SET arc_balance = arc_balance - ? WHERE id = ?').run(ch.wager, loserId);
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN — NFTs
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/nfts', adminAuth, (req, res) => {
  const rows = db.prepare(`SELECT n.*, p.username FROM nfts n LEFT JOIN players p ON n.player_id = p.id ORDER BY n.minted_at DESC LIMIT 200`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN — PVP
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/pvp', adminAuth, (req, res) => {
  const rows = db.prepare(`SELECT c.*, p1.username AS challenger_name, p2.username AS opponent_name, pw.username AS winner_name
    FROM pvp_challenges c 
    LEFT JOIN players p1 ON c.challenger_id = p1.id 
    LEFT JOIN players p2 ON c.opponent_id = p2.id
    LEFT JOIN players pw ON c.winner_id = pw.id
    ORDER BY c.created_at DESC LIMIT 200`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN — STREAK BADGES  
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/streak-badges', adminAuth, (req, res) => {
  const rows = db.prepare(`SELECT sb.*, p.username FROM streak_badges sb LEFT JOIN players p ON sb.player_id = p.id ORDER BY sb.earned_at DESC LIMIT 200`).all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN — REVENUE ANALYTICS
// ══════════════════════════════════════════════════════════════════════
app.get('/api/admin/revenue', adminAuth, (req, res) => {
  const summary = db.prepare(`SELECT 
    COALESCE(SUM(pol_amount),0) AS total_pol,
    COALESCE(SUM(pol_amount * 0.1),0) AS total_donation,
    COALESCE(SUM(arc_amount),0) AS total_arc_purchased,
    COUNT(DISTINCT player_id) AS unique_buyers,
    COUNT(*) AS total_txns,
    COALESCE(AVG(pol_amount),0) AS avg_pol
    FROM arc_purchases`).get();
  const economy = {
    total_earned: db.prepare(`SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),0) AS v FROM arc_ledger`).get().v,
    total_spent: db.prepare(`SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END),0) AS v FROM arc_ledger`).get().v,
    active_stakers: db.prepare(`SELECT COUNT(DISTINCT player_id) AS v FROM stakes WHERE claimed=0`).get().v,
    total_staked: db.prepare(`SELECT COALESCE(SUM(amount),0) AS v FROM stakes WHERE claimed=0`).get().v,
    bp_sold: db.prepare(`SELECT COUNT(*) AS v FROM battle_pass WHERE is_premium=1`).get().v,
  };
  const recent = db.prepare(`SELECT ap.*, p.username FROM arc_purchases ap LEFT JOIN players p ON ap.player_id = p.id ORDER BY ap.created_at DESC LIMIT 50`).all();
  res.json({ summary, economy, recent });
});

// ══════════════════════════════════════════════════════════════════════
// ML ENGINE — Statistical Analysis & Anomaly Detection
// ══════════════════════════════════════════════════════════════════════

// ── ML Helper: Stats utilities ────────────────────────────────────────
function mlStats(arr) {
  if (!arr.length) return { mean: 0, std: 0, median: 0, min: 0, max: 0, q1: 0, q3: 0, iqr: 0, count: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const median = n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return { mean, std, median, min: sorted[0], max: sorted[n - 1], q1, q3, iqr: q3 - q1, count: n };
}

function zScore(value, mean, std) {
  if (std === 0) return 0;
  return (value - mean) / std;
}

// ── ML: Run full analysis pipeline ───────────────────────────────────
function mlRunAnalysis() {
  const startTime = Date.now();
  let anomaliesFound = 0;
  let recordsAnalyzed = 0;

  // 1) CHEAT DETECTION — find statistical outliers in player stats
  const players = db.prepare(`SELECT p.id, p.username, ps.* FROM players p
    JOIN player_stats ps ON p.id = ps.player_id WHERE p.is_banned = 0`).all();
  recordsAnalyzed += players.length;

  if (players.length >= 5) {
    const metrics = ['total_kills', 'max_wave', 'arcoins', 'total_earned', 'shots_fired', 'shots_hit'];
    for (const metric of metrics) {
      const values = players.map(p => p[metric] || 0).filter(v => v > 0);
      if (values.length < 5) continue;
      const stats = mlStats(values);
      const threshold = 3.0;
      for (const p of players) {
        const val = p[metric] || 0;
        if (val <= 0) continue;
        const z = zScore(val, stats.mean, stats.std);
        if (z > threshold) {
          const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE player_id = ? AND metric_name = ? AND resolved = 0 AND created_at > datetime('now', '-24 hours')`).get(p.id, metric);
          if (!existing) {
            db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, player_id, metric_name, metric_value, expected_value, z_score)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
              'cheat', z > 5 ? 'critical' : z > 4 ? 'high' : 'medium',
              'Stat anomaly: ' + metric,
              p.username + ' has ' + metric + '=' + val + ' (mean=' + stats.mean.toFixed(1) + ', z=' + z.toFixed(2) + ')',
              p.id, metric, val, stats.mean, z
            );
            anomaliesFound++;
          }
        }
      }
    }

    // Accuracy anomaly (impossibly high)
    for (const p of players) {
      if ((p.shots_fired || 0) > 100) {
        const acc = (p.shots_hit || 0) / p.shots_fired;
        if (acc > 0.98) {
          const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE player_id = ? AND metric_name = 'accuracy' AND resolved = 0 AND created_at > datetime('now', '-24 hours')`).get(p.id);
          if (!existing) {
            db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, player_id, metric_name, metric_value, expected_value, z_score)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
              'cheat', 'high', 'Suspiciously high accuracy',
              p.username + ' has ' + (acc * 100).toFixed(1) + '% accuracy over ' + p.shots_fired + ' shots',
              p.id, 'accuracy', acc, 0.35, (acc - 0.35) / 0.15
            );
            anomaliesFound++;
          }
        }
      }
    }

    // Kill rate anomaly (kills per session)
    const sessionData = db.prepare(`SELECT player_id, COUNT(*) as sessions, SUM(kills) as total_kills, SUM(duration_s) as total_time
      FROM game_sessions WHERE kills > 0 GROUP BY player_id HAVING sessions >= 3`).all();
    const killRates = sessionData.map(s => s.total_kills / Math.max(s.total_time, 1));
    if (killRates.length >= 5) {
      const krStats = mlStats(killRates);
      for (const s of sessionData) {
        const kr = s.total_kills / Math.max(s.total_time, 1);
        const z = zScore(kr, krStats.mean, krStats.std);
        if (z > 3.5) {
          const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE player_id = ? AND metric_name = 'kill_rate' AND resolved = 0 AND created_at > datetime('now', '-24 hours')`).get(s.player_id);
          if (!existing) {
            db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, player_id, metric_name, metric_value, expected_value, z_score)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
              'cheat', z > 5 ? 'critical' : 'high', 'Abnormal kill rate',
              'Kill rate: ' + kr.toFixed(3) + '/s (mean=' + krStats.mean.toFixed(3) + ')',
              s.player_id, 'kill_rate', kr, krStats.mean, z
            );
            anomaliesFound++;
          }
        }
      }
    }
  }

  // 2) ECONOMY HEALTH — snapshot and detect inflation/deflation
  const arcTotal = db.prepare('SELECT COALESCE(SUM(arcoins),0) as v FROM player_stats').get().v;
  const arcEarned24h = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM arc_ledger WHERE amount > 0 AND created_at > datetime('now', '-24 hours')`).get().v;
  const arcSpent24h = db.prepare(`SELECT COALESCE(SUM(ABS(amount)),0) as v FROM arc_ledger WHERE amount < 0 AND created_at > datetime('now', '-24 hours')`).get().v;
  const arcStaked = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM stakes WHERE claimed = 0').get().v;
  const activePlayers = db.prepare(`SELECT COUNT(DISTINCT player_id) as v FROM game_sessions WHERE started_at > datetime('now', '-24 hours')`).get().v;
  const avgSession = db.prepare(`SELECT AVG(duration_s) as v FROM game_sessions WHERE started_at > datetime('now', '-24 hours') AND duration_s > 0`).get().v || 0;
  const avgWave = db.prepare('SELECT AVG(max_wave) as v FROM player_stats WHERE max_wave > 0').get().v || 0;
  const totalSess = db.prepare(`SELECT COUNT(*) as v FROM game_sessions WHERE started_at > datetime('now', '-24 hours')`).get().v;

  const txCount24h = db.prepare(`SELECT COUNT(*) as v FROM arc_ledger WHERE created_at > datetime('now', '-24 hours')`).get().v;
  const velocity = arcTotal > 0 ? (txCount24h / arcTotal) : 0;
  const inflationRate = arcTotal > 0 ? ((arcEarned24h - arcSpent24h) / arcTotal) : 0;

  const sinkRatio = arcEarned24h > 0 ? (arcSpent24h / arcEarned24h) : 1;
  const stakeRatio = arcTotal > 0 ? (arcStaked / arcTotal) : 0;
  let healthScore = 50;
  if (sinkRatio >= 0.4 && sinkRatio <= 1.0) healthScore += 20; else if (sinkRatio < 0.2) healthScore -= 30;
  if (stakeRatio >= 0.1 && stakeRatio <= 0.5) healthScore += 15; else if (stakeRatio > 0.7) healthScore -= 10;
  if (inflationRate < 0.05) healthScore += 15; else if (inflationRate > 0.2) healthScore -= 25;
  healthScore = Math.max(0, Math.min(100, healthScore));

  db.prepare(`INSERT INTO ml_economy_snapshots (total_arc, arc_earned_24h, arc_spent_24h, arc_staked, active_players, avg_session_s, avg_wave, total_sessions, inflation_rate, velocity, health_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(arcTotal, arcEarned24h, arcSpent24h, arcStaked, activePlayers, avgSession, avgWave, totalSess, inflationRate, velocity, healthScore);

  if (inflationRate > 0.15) {
    const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE category = 'economy' AND metric_name = 'inflation' AND resolved = 0 AND created_at > datetime('now', '-1 hour')`).get();
    if (!existing) {
      db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, metric_name, metric_value, expected_value, z_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        'economy', inflationRate > 0.3 ? 'critical' : 'high', 'High ARC inflation',
        'Net ARC inflation rate: ' + (inflationRate * 100).toFixed(1) + '% in 24h. Sinks may be insufficient.',
        'inflation', inflationRate, 0.05, inflationRate / 0.05
      );
      anomaliesFound++;
    }
  }
  if (sinkRatio < 0.15 && arcEarned24h > 10) {
    const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE category = 'economy' AND metric_name = 'sink_ratio' AND resolved = 0 AND created_at > datetime('now', '-1 hour')`).get();
    if (!existing) {
      db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, metric_name, metric_value, expected_value, z_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        'economy', 'high', 'Weak ARC sinks',
        'Only ' + (sinkRatio * 100).toFixed(1) + '% of earned ARC is being spent. Add more sinks.',
        'sink_ratio', sinkRatio, 0.5, (0.5 - sinkRatio) / 0.1
      );
      anomaliesFound++;
    }
  }

  // 3) PLAYER SEGMENTATION — cluster by behavior
  if (players.length >= 3) {
    const segmentTx = db.transaction(() => {
      for (const p of players) {
        const kills = p.total_kills || 0;
        const wave = p.max_wave || 0;
        const arc = p.arcoins || 0;
        const earned = p.total_earned || 0;
        const shots = p.shots_fired || 0;
        const accuracy = shots > 0 ? (p.shots_hit || 0) / shots : 0;
        const prestige = p.prestige_level || 0;

        let segment = 'casual';
        if (prestige >= 5 || (kills > 1000 && wave >= 4)) segment = 'hardcore';
        else if (earned > 100 || arc > 50) segment = 'spender';
        else if (kills > 200 || wave >= 3) segment = 'engaged';
        else if (kills < 10 && wave <= 1) segment = 'newbie';

        const engScore = Math.min(100, (
          Math.min(kills / 500, 1) * 25 +
          Math.min(wave / 5, 1) * 25 +
          Math.min(accuracy / 0.5, 1) * 20 +
          Math.min(prestige / 10, 1) * 15 +
          Math.min(earned / 200, 1) * 15
        ));

        let cheatScore = 0;
        if (accuracy > 0.95 && shots > 100) cheatScore += 40;
        if (kills > 0 && shots > 0 && kills / shots > 0.9) cheatScore += 30;
        const sessions = db.prepare('SELECT COUNT(*) as c FROM game_sessions WHERE player_id = ?').get(p.id);
        if (wave > 5 && sessions.c < 3) cheatScore += 30;
        cheatScore = Math.min(100, cheatScore);

        const lastSession = db.prepare('SELECT MAX(started_at) as last FROM game_sessions WHERE player_id = ?').get(p.id);
        let churnRisk = 0;
        if (lastSession && lastSession.last) {
          const daysSince = (Date.now() - new Date(lastSession.last + 'Z').getTime()) / 86400000;
          if (daysSince > 30) churnRisk = 95;
          else if (daysSince > 14) churnRisk = 75;
          else if (daysSince > 7) churnRisk = 50;
          else if (daysSince > 3) churnRisk = 25;
          else churnRisk = 5;
        } else {
          churnRisk = 60;
        }

        const spendScore = Math.min(100, (earned / 500) * 100);
        const skillLevel = wave >= 5 ? 'expert' : wave >= 3 ? 'intermediate' : 'beginner';

        db.prepare(`INSERT INTO ml_player_risk (player_id, segment, engagement_score, churn_risk, cheat_score, spend_score, skill_level, last_analyzed)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(player_id) DO UPDATE SET
          segment=excluded.segment, engagement_score=excluded.engagement_score,
          churn_risk=excluded.churn_risk, cheat_score=excluded.cheat_score,
          spend_score=excluded.spend_score, skill_level=excluded.skill_level,
          last_analyzed=datetime('now')`).run(p.id, segment, engScore, churnRisk, cheatScore, spendScore, skillLevel);
      }
    });
    segmentTx();
  }

  // 4) GAME BALANCE — weapon/feature usage distribution
  const weaponPop = db.prepare('SELECT weapon_id, COUNT(*) as count FROM weapons GROUP BY weapon_id ORDER BY count DESC').all();
  if (weaponPop.length) {
    const balTx = db.transaction(() => {
      for (const w of weaponPop) {
        db.prepare(`INSERT INTO ml_balance_snapshots (metric_type, metric_key, value, sample_size) VALUES (?, ?, ?, ?)`)
          .run('weapon_usage', w.weapon_id, w.count, players.length);
      }
    });
    balTx();
  }

  // 5) ERROR PATTERN ANALYSIS
  const errorGroups = db.prepare(`SELECT error_msg, COUNT(*) as c, MAX(last_seen) as latest
    FROM ml_error_logs GROUP BY error_msg ORDER BY c DESC LIMIT 20`).all();
  for (const eg of errorGroups) {
    if (eg.c >= 5) {
      const existing = db.prepare(`SELECT id FROM ml_anomalies WHERE category = 'bug' AND title = ? AND resolved = 0`).get('Recurring error: ' + eg.error_msg.slice(0, 80));
      if (!existing) {
        db.prepare(`INSERT INTO ml_anomalies (category, severity, title, description, metric_name, metric_value)
          VALUES (?, ?, ?, ?, ?, ?)`).run(
          'bug', eg.c >= 20 ? 'critical' : eg.c >= 10 ? 'high' : 'medium',
          'Recurring error: ' + eg.error_msg.slice(0, 80),
          'Error occurred ' + eg.c + ' times. Last seen: ' + eg.latest,
          'error_count', eg.c
        );
        anomaliesFound++;
      }
    }
  }

  const duration = Date.now() - startTime;
  db.prepare(`INSERT INTO ml_training_runs (model_name, status, records_in, anomalies_found, duration_ms, finished_at)
    VALUES (?, 'completed', ?, ?, ?, datetime('now'))`).run('full_analysis', recordsAnalyzed, anomaliesFound, duration);

  return { recordsAnalyzed, anomaliesFound, duration, healthScore };
}

// ── Telemetry Ingest ──────────────────────────────────────────────────
const telemetryLimiter = rateLimit({ windowMs: 60000, max: 60, message: { error: 'Telemetry rate limited' } });

app.post('/api/telemetry/event', telemetryLimiter, optionalAuth, (req, res) => {
  const { event_type, event_data, session_id } = req.body;
  if (!event_type || typeof event_type !== 'string') return res.status(400).json({ error: 'event_type required' });
  const safeType = event_type.slice(0, 50);
  const safeData = event_data ? JSON.stringify(event_data).slice(0, 2000) : null;
  const pid = req.player ? req.player.id : null;
  db.prepare('INSERT INTO ml_telemetry (player_id, session_id, event_type, event_data) VALUES (?, ?, ?, ?)')
    .run(pid, session_id || null, safeType, safeData);
  res.json({ ok: true });
});

app.post('/api/telemetry/error', telemetryLimiter, optionalAuth, (req, res) => {
  const { error_msg, error_stack, url, user_agent, context } = req.body;
  if (!error_msg || typeof error_msg !== 'string') return res.status(400).json({ error: 'error_msg required' });
  const safeMsg = error_msg.slice(0, 500);
  const safeStack = error_stack ? String(error_stack).slice(0, 2000) : null;
  const pid = req.player ? req.player.id : null;
  const existing = db.prepare('SELECT id, count FROM ml_error_logs WHERE error_msg = ? AND player_id IS ?').get(safeMsg, pid);
  if (existing) {
    db.prepare('UPDATE ml_error_logs SET count = count + 1, last_seen = datetime(\'now\'), error_stack = COALESCE(?, error_stack) WHERE id = ?')
      .run(safeStack, existing.id);
  } else {
    db.prepare('INSERT INTO ml_error_logs (player_id, error_msg, error_stack, url, user_agent, context) VALUES (?, ?, ?, ?, ?, ?)')
      .run(pid, safeMsg, safeStack, url ? String(url).slice(0, 500) : null, user_agent ? String(user_agent).slice(0, 300) : null, context ? String(context).slice(0, 500) : null);
  }
  res.json({ ok: true });
});

app.post('/api/telemetry/batch', telemetryLimiter, optionalAuth, (req, res) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events array required' });
  const maxEvents = Math.min(events.length, 50);
  const pid = req.player ? req.player.id : null;
  const ins = db.prepare('INSERT INTO ml_telemetry (player_id, session_id, event_type, event_data) VALUES (?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (let i = 0; i < maxEvents; i++) {
      const e = events[i];
      if (!e.event_type) continue;
      ins.run(pid, e.session_id || null, String(e.event_type).slice(0, 50), e.event_data ? JSON.stringify(e.event_data).slice(0, 2000) : null);
    }
  });
  tx();
  res.json({ ok: true, ingested: maxEvents });
});

// ══════════════════════════════════════════════════════════════════════
// ML ADMIN ENDPOINTS
// ══════════════════════════════════════════════════════════════════════

app.get('/api/admin/ml/dashboard', adminAuth, adminOnly, (req, res) => {
  const totalTelemetry = db.prepare('SELECT COUNT(*) as c FROM ml_telemetry').get().c;
  const telemetry24h = db.prepare(`SELECT COUNT(*) as c FROM ml_telemetry WHERE created_at > datetime('now', '-24 hours')`).get().c;
  const totalErrors = db.prepare('SELECT COUNT(*) as c FROM ml_error_logs').get().c;
  const errorSum = db.prepare('SELECT COALESCE(SUM(count),0) as c FROM ml_error_logs').get().c;
  const openAnomalies = db.prepare('SELECT COUNT(*) as c FROM ml_anomalies WHERE resolved = 0').get().c;
  const criticalAnomalies = db.prepare(`SELECT COUNT(*) as c FROM ml_anomalies WHERE resolved = 0 AND severity IN ('critical','high')`).get().c;
  const lastRun = db.prepare('SELECT * FROM ml_training_runs ORDER BY started_at DESC LIMIT 1').get();
  const latestEconomy = db.prepare('SELECT * FROM ml_economy_snapshots ORDER BY snapshot_at DESC LIMIT 1').get();
  const segmentCounts = db.prepare('SELECT segment, COUNT(*) as c FROM ml_player_risk GROUP BY segment ORDER BY c DESC').all();
  const recentAnomalies = db.prepare(`SELECT * FROM ml_anomalies WHERE resolved = 0 ORDER BY
    CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC LIMIT 10`).all();
  res.json({
    telemetry: { total: totalTelemetry, last_24h: telemetry24h },
    errors: { unique: totalErrors, total_occurrences: errorSum },
    anomalies: { open: openAnomalies, critical: criticalAnomalies, recent: recentAnomalies },
    last_run: lastRun, economy: latestEconomy, segments: segmentCounts,
  });
});

app.post('/api/admin/ml/analyze', adminAuth, adminOnly, (req, res) => {
  try {
    const result = mlRunAnalysis();
    res.json({ ok: true, ...result });
  } catch (err) { res.status(500).json({ error: 'Analysis failed: ' + err.message }); }
});

app.get('/api/admin/ml/anomalies', adminAuth, adminOnly, (req, res) => {
  const category = req.query.category || null;
  const resolved = req.query.resolved === '1' ? 1 : 0;
  let query = `SELECT a.*, p.username as player_name FROM ml_anomalies a LEFT JOIN players p ON a.player_id = p.id WHERE a.resolved = ?`;
  const params = [resolved];
  if (category) { query += ' AND a.category = ?'; params.push(category); }
  query += ` ORDER BY CASE a.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, a.created_at DESC LIMIT 200`;
  res.json(db.prepare(query).all(...params));
});

app.post('/api/admin/ml/anomalies/:id/resolve', adminAuth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare(`UPDATE ml_anomalies SET resolved = 1, resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`).run(req.player.id, id);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'ml_resolve_anomaly', 'Anomaly #' + id);
  res.json({ ok: true });
});

app.get('/api/admin/ml/economy', adminAuth, adminOnly, (req, res) => {
  const snapshots = db.prepare('SELECT * FROM ml_economy_snapshots ORDER BY snapshot_at DESC LIMIT 30').all();
  const latest = snapshots[0] || null;
  let trend = 'stable';
  if (snapshots.length >= 3) {
    const recent = snapshots.slice(0, 3).map(s => s.health_score);
    const older = snapshots.slice(-3).map(s => s.health_score);
    const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
    const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
    if (avgRecent > avgOlder + 5) trend = 'improving';
    else if (avgRecent < avgOlder - 5) trend = 'declining';
  }
  const earnSources = db.prepare(`SELECT reason, SUM(amount) as total, COUNT(*) as txns FROM arc_ledger
    WHERE amount > 0 AND created_at > datetime('now', '-7 days') GROUP BY reason ORDER BY total DESC LIMIT 15`).all();
  const spendSinks = db.prepare(`SELECT reason, SUM(ABS(amount)) as total, COUNT(*) as txns FROM arc_ledger
    WHERE amount < 0 AND created_at > datetime('now', '-7 days') GROUP BY reason ORDER BY total DESC LIMIT 15`).all();
  res.json({ snapshots, latest, trend, earn_sources: earnSources, spend_sinks: spendSinks });
});

app.get('/api/admin/ml/segments', adminAuth, adminOnly, (req, res) => {
  const segments = db.prepare(`SELECT r.segment, COUNT(*) as count,
    AVG(r.engagement_score) as avg_engagement, AVG(r.churn_risk) as avg_churn,
    AVG(r.cheat_score) as avg_cheat, AVG(ps.total_kills) as avg_kills,
    AVG(ps.max_wave) as avg_wave, AVG(ps.arcoins) as avg_arc
    FROM ml_player_risk r JOIN player_stats ps ON r.player_id = ps.player_id
    GROUP BY r.segment ORDER BY count DESC`).all();
  const highRisk = db.prepare(`SELECT r.*, p.username, ps.total_kills, ps.max_wave, ps.arcoins
    FROM ml_player_risk r JOIN players p ON r.player_id = p.id
    JOIN player_stats ps ON r.player_id = ps.player_id
    WHERE r.cheat_score >= 50 ORDER BY r.cheat_score DESC LIMIT 20`).all();
  const churning = db.prepare(`SELECT r.*, p.username, ps.total_kills, ps.arcoins
    FROM ml_player_risk r JOIN players p ON r.player_id = p.id
    JOIN player_stats ps ON r.player_id = ps.player_id
    WHERE r.churn_risk >= 70 ORDER BY r.churn_risk DESC LIMIT 20`).all();
  const topEngaged = db.prepare(`SELECT r.*, p.username, ps.total_kills, ps.max_wave
    FROM ml_player_risk r JOIN players p ON r.player_id = p.id
    JOIN player_stats ps ON r.player_id = ps.player_id
    ORDER BY r.engagement_score DESC LIMIT 20`).all();
  res.json({ segments, high_risk: highRisk, churning, top_engaged: topEngaged });
});

app.get('/api/admin/ml/errors', adminAuth, adminOnly, (req, res) => {
  const errors = db.prepare(`SELECT e.*, p.username FROM ml_error_logs e
    LEFT JOIN players p ON e.player_id = p.id ORDER BY e.count DESC, e.last_seen DESC LIMIT 100`).all();
  const byDay = db.prepare(`SELECT DATE(last_seen) as day, SUM(count) as total FROM ml_error_logs
    GROUP BY DATE(last_seen) ORDER BY day DESC LIMIT 14`).all();
  const totalUnique = db.prepare('SELECT COUNT(*) as c FROM ml_error_logs').get().c;
  const totalOccurrences = db.prepare('SELECT COALESCE(SUM(count),0) as c FROM ml_error_logs').get().c;
  res.json({ errors, by_day: byDay, total_unique: totalUnique, total_occurrences: totalOccurrences });
});

app.delete('/api/admin/ml/errors/:id', adminAuth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM ml_error_logs WHERE id = ?').run(parseInt(req.params.id));
  res.json({ ok: true });
});

app.get('/api/admin/ml/cheat-detection', adminAuth, adminOnly, (req, res) => {
  const suspects = db.prepare(`SELECT r.*, p.username, p.is_banned, ps.total_kills, ps.max_wave, ps.arcoins,
    ps.shots_fired, ps.shots_hit, ps.total_earned, ps.prestige_level
    FROM ml_player_risk r JOIN players p ON r.player_id = p.id
    JOIN player_stats ps ON r.player_id = ps.player_id
    WHERE r.cheat_score > 0 ORDER BY r.cheat_score DESC LIMIT 50`).all();
  const cheatAnomalies = db.prepare(`SELECT a.*, p.username FROM ml_anomalies a
    LEFT JOIN players p ON a.player_id = p.id
    WHERE a.category = 'cheat' AND a.resolved = 0
    ORDER BY a.severity DESC, a.created_at DESC LIMIT 50`).all();
  res.json({ suspects, anomalies: cheatAnomalies });
});

app.get('/api/admin/ml/balance', adminAuth, adminOnly, (req, res) => {
  const weaponUsage = db.prepare('SELECT weapon_id, COUNT(*) as count FROM weapons GROUP BY weapon_id ORDER BY count DESC').all();
  const totalPlayers = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
  const skillUsage = db.prepare('SELECT skill_id, COUNT(*) as count FROM skills GROUP BY skill_id ORDER BY count DESC').all();
  const waveDistribution = db.prepare(`SELECT max_wave as wave, COUNT(*) as players FROM player_stats
    WHERE max_wave > 0 GROUP BY max_wave ORDER BY max_wave`).all();
  const killDistribution = db.prepare(`SELECT
    CASE WHEN total_kills < 10 THEN '0-9' WHEN total_kills < 50 THEN '10-49'
         WHEN total_kills < 200 THEN '50-199' WHEN total_kills < 1000 THEN '200-999'
         ELSE '1000+' END as bucket,
    COUNT(*) as players FROM player_stats GROUP BY bucket`).all();
  const deathCauses = db.prepare(`SELECT death_cause, COUNT(*) as count FROM game_sessions
    WHERE death_cause IS NOT NULL GROUP BY death_cause ORDER BY count DESC LIMIT 15`).all();
  const weaponRates = weaponUsage.map(w => ({
    ...w, usage_pct: totalPlayers > 0 ? ((w.count / totalPlayers) * 100).toFixed(1) : 0
  }));
  res.json({ weapons: weaponRates, skills: skillUsage, wave_distribution: waveDistribution,
    kill_distribution: killDistribution, death_causes: deathCauses, total_players: totalPlayers });
});

app.get('/api/admin/ml/telemetry', adminAuth, adminOnly, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const eventType = req.query.type || null;
  const playerId = parseInt(req.query.player_id) || null;
  let query = 'SELECT t.*, p.username FROM ml_telemetry t LEFT JOIN players p ON t.player_id = p.id WHERE 1=1';
  const params = [];
  if (eventType) { query += ' AND t.event_type = ?'; params.push(eventType); }
  if (playerId) { query += ' AND t.player_id = ?'; params.push(playerId); }
  query += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(limit);
  const rows = db.prepare(query).all(...params);
  const eventTypes = db.prepare('SELECT event_type, COUNT(*) as c FROM ml_telemetry GROUP BY event_type ORDER BY c DESC').all();
  res.json({ events: rows, event_types: eventTypes });
});

app.get('/api/admin/ml/training-runs', adminAuth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM ml_training_runs ORDER BY started_at DESC LIMIT 50').all());
});

app.post('/api/admin/ml/purge', adminAuth, adminOnly, (req, res) => {
  const days = Math.max(1, Math.min(parseInt(req.body.days) || 7, 90));
  const deleted = db.prepare(`DELETE FROM ml_telemetry WHERE created_at < datetime('now', '-' || ? || ' days')`).run(days);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'ml_purge', 'Purged telemetry older than ' + days + ' days');
  res.json({ ok: true, deleted: deleted.changes });
});

// ══════════════════════════════════════════════════════════════════════
// ADMIN — ASSET MANAGEMENT & PLAYER ASSETS & WIRE MONEY & AI ROBOT
// ══════════════════════════════════════════════════════════════════════

// ── List game asset directories ───────────────────────────────────────
app.get('/api/admin/assets/list', adminAuth, adminOnly, (req, res) => {
  const fs = require('fs'), p = require('path');
  const baseDir = p.join(__dirname, '..');
  const categories = [
    { id: 'zombies', path: 'images/zombies', label: 'Zombie Sprites' },
    { id: 'vehicles', path: 'images/vehicles', label: 'Vehicle Sprites' },
    { id: 'background', path: 'images/background', label: 'Backgrounds' },
    { id: 'ui', path: 'images/ui', label: 'UI Elements' },
    { id: 'icons', path: 'icons', label: 'Icons' },
  ];
  const result = categories.map(cat => {
    const dir = p.join(baseDir, cat.path);
    let files = [];
    try { files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f)); } catch(e) {}
    return { ...cat, files, count: files.length };
  });
  res.json(result);
});

// ── Get responsive/display settings ───────────────────────────────────
app.get('/api/admin/display-settings', adminAuth, adminOnly, (req, res) => {
  const settings = {};
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'display_%' OR key LIKE 'canvas_%' OR key LIKE 'responsive_%'").all();
  rows.forEach(r => settings[r.key] = r.value);
  // Defaults if not set
  if (!settings.canvas_width) settings.canvas_width = '1024';
  if (!settings.canvas_height) settings.canvas_height = '550';
  if (!settings.canvas_scale_mode) settings.canvas_scale_mode = 'fit';
  if (!settings.responsive_breakpoint) settings.responsive_breakpoint = '700';
  res.json(settings);
});

app.post('/api/admin/display-settings', adminAuth, adminOnly, (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const tx = db.transaction((pairs) => { for (const [k, v] of pairs) upsert.run(k, String(v)); });
  const pairs = Object.entries(req.body).filter(([k]) => /^(display_|canvas_|responsive_)/.test(k));
  tx(pairs);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'display_settings', JSON.stringify(req.body));
  res.json({ ok: true });
});

// ── Asset Upload (backgrounds, trucks, tanks) ─────────────────────────
const assetUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fs = require('fs');
    const cat = req.body.category;
    const ALLOWED_CATS = { background: 'images/background', vehicles: 'images/vehicles' };
    const rel = ALLOWED_CATS[cat];
    if (!rel) return cb(new Error('Invalid category'));
    const dir = path.join(__dirname, '..', rel);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const cat = req.body.category;
    const target = (req.body.targetName || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!target) return cb(new Error('Missing target filename'));
    // Validate extension matches an image format
    const ext = path.extname(file.originalname).toLowerCase();
    if (!/^\.(png|jpg|jpeg|gif|webp|svg)$/.test(ext)) return cb(new Error('Invalid file type'));
    // Keep target extension or use uploaded extension
    const finalName = path.extname(target) ? target : target + ext;
    cb(null, finalName);
  }
});
const assetUpload = multer({
  storage: assetUploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|gif|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

app.post('/api/admin/assets/upload', adminAuth, adminOnly, assetUpload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(
    req.player.id, 'asset_upload',
    JSON.stringify({ category: req.body.category, filename: req.file.filename, size: req.file.size })
  );
  res.json({ ok: true, filename: req.file.filename, size: req.file.size });
});

// ── Asset Delete (remove bg to revert to procedural) ──────────────────
app.post('/api/admin/assets/delete', adminAuth, adminOnly, (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const cat = req.body.category;
  const fname = req.body.filename;
  const ALLOWED_CATS = { background: 'images/background', vehicles: 'images/vehicles' };
  const rel = ALLOWED_CATS[cat];
  if (!rel) return res.status(400).json({ error: 'Invalid category' });
  // Sanitize filename — only allow bg-N.png or simple safe names
  if (!fname || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp|svg)$/.test(fname)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const fpath = path.join(__dirname, '..', rel, fname);
  if (!fs.existsSync(fpath)) return res.status(404).json({ error: 'File not found' });
  fs.unlinkSync(fpath);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(
    req.player.id, 'asset_delete', JSON.stringify({ category: cat, filename: fname })
  );
  res.json({ ok: true, deleted: fname });
});

// ── Toggle tank raster override setting ───────────────────────────────
app.get('/api/admin/tank-raster', adminAuth, adminOnly, (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'tank_raster_override'").get();
  res.json({ enabled: row ? row.value === '1' : false });
});
app.post('/api/admin/tank-raster', adminAuth, adminOnly, (req, res) => {
  const val = req.body.enabled ? '1' : '0';
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('tank_raster_override', val);
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'tank_raster_toggle', val);
  res.json({ ok: true, enabled: req.body.enabled });
});

// ── Player full assets (crypto, items, skills, cosmetics, etc.) ──────
app.get('/api/admin/player/:id/assets', adminAuth, adminOnly, (req, res) => {
  const pid = parseInt(req.params.id);
  if (!pid) return res.status(400).json({ error: 'Invalid player id' });
  const player = db.prepare('SELECT id, username, wallet_address, is_admin, created_at FROM players WHERE id = ?').get(pid);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const stats = db.prepare('SELECT arcoins, credits, total_earned, total_kills, max_wave, prestige_level FROM player_stats WHERE player_id = ?').get(pid);
  const weapons = db.prepare('SELECT weapon_id, unlocked_at FROM weapons WHERE player_id = ?').all(pid);
  const cosmetics = db.prepare('SELECT item_type, item_id, equipped, purchased_at FROM cosmetics WHERE player_id = ?').all(pid);
  const skills = db.prepare('SELECT skill_id, level, unlocked_at FROM skills WHERE player_id = ?').all(pid);
  const achievements = db.prepare('SELECT achievement_id, earned_at FROM achievements WHERE player_id = ?').all(pid);
  const stakes = db.prepare('SELECT amount, apy, locked_at, unlock_at, claimed FROM stakes WHERE player_id = ?').all(pid);
  const loans = db.prepare('SELECT amount, interest_rate, repaid, taken_at FROM loans WHERE player_id = ?').all(pid);
  const arcLedger = db.prepare('SELECT amount, reason, created_at FROM arc_ledger WHERE player_id = ? ORDER BY created_at DESC LIMIT 50').all(pid);
  const nfts = db.prepare("SELECT item_type, item_id FROM cosmetics WHERE player_id = ? AND item_type LIKE '%nft%'").all(pid);
  res.json({ player, stats, weapons, cosmetics, skills, achievements, stakes, loans, arcLedger, nfts });
});

// ── Wire money (ARC or Credits) to player ─────────────────────────────
app.post('/api/admin/wire-money', adminAuth, adminOnly, (req, res) => {
  const { player_id, amount, currency, reason } = req.body;
  if (!player_id || !amount) return res.status(400).json({ error: 'player_id and amount required' });
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount === 0) return res.status(400).json({ error: 'Invalid amount' });
  const cur = (currency || 'arc').toLowerCase();
  const safeReason = String(reason || 'Admin wire transfer').slice(0, 200);
  if (cur === 'arc' || cur === 'arcoins') {
    db.prepare('UPDATE player_stats SET arcoins = arcoins + ? WHERE player_id = ?').run(numAmount, player_id);
    db.prepare('INSERT INTO arc_ledger (player_id, amount, reason) VALUES (?, ?, ?)').run(player_id, numAmount, safeReason);
  } else if (cur === 'credits') {
    db.prepare('UPDATE player_stats SET credits = credits + ? WHERE player_id = ?').run(numAmount, player_id);
  } else {
    return res.status(400).json({ error: 'Currency must be arc or credits' });
  }
  db.prepare('INSERT INTO admin_log (admin_id, action, target_id, details) VALUES (?, ?, ?, ?)').run(
    req.player.id, 'wire_money', player_id, cur + ' ' + numAmount + ': ' + safeReason
  );
  res.json({ ok: true, currency: cur, amount: numAmount });
});

// ══════════════════════════════════════════════════════════════════════
// AI PROMPT-GUIDED ROBOT — Natural language game config adjustment
// ══════════════════════════════════════════════════════════════════════
function parseAdminPrompt(prompt) {
  const lower = prompt.toLowerCase();

  // ── Detect percentage ──
  let pct = null;
  const pctMatch = lower.match(/(\d+)\s*(?:percent|%)/);
  if (pctMatch) pct = parseInt(pctMatch[1]) / 100;
  if (!pct) { const numMatch = lower.match(/by\s+(\d+)/); if (numMatch) pct = parseInt(numMatch[1]) / 100; }
  if (!pct) pct = 0.10; // default 10%

  // ── Detect direction ──
  let direction = null;
  if (/harder|difficult|aggressive|tough|brutal|intense|challenge|punish|increase.*difficult/.test(lower)) direction = 'harder';
  else if (/easier|simple|casual|relax|gentle|forgiving|decrease.*difficult|nerf/.test(lower)) direction = 'easier';
  else if (/faster|speed.*up|quicker/.test(lower)) direction = 'faster';
  else if (/slower|speed.*down/.test(lower)) direction = 'slower';
  else if (/more.*reward|generous|buff.*reward|increase.*reward|more.*money|more.*arc/.test(lower)) direction = 'more_rewards';
  else if (/less.*reward|stingy|nerf.*reward|decrease.*reward|less.*money/.test(lower)) direction = 'less_rewards';
  else if (/more.*spawn|more.*zombie|more.*enemy|increase.*spawn/.test(lower)) direction = 'more_spawns';
  else if (/less.*spawn|fewer.*zombie|fewer.*enemy|decrease.*spawn/.test(lower)) direction = 'less_spawns';
  else if (/increase|boost|buff|raise|amp/.test(lower)) direction = 'increase';
  else if (/decrease|reduce|lower|cut|drop/.test(lower)) direction = 'decrease';

  if (!direction) return { error: 'Could not understand intent. Try: "make game 10% harder", "increase rewards by 20%", "speed up zombies by 15%"' };

  // ── Detect target categories ──
  let targets = [];
  if (/zombie|spawn|wave|enemy/.test(lower)) targets.push('wave');
  if (/vehicle|truck|tank|drone/.test(lower)) targets.push('vehicles');
  if (/economy|reward|money|credit|arc|earn|cost|price/.test(lower)) targets.push('economy');
  if (/strike|artillery|himars|bradley/.test(lower)) targets.push('strikes');
  if (/speed/.test(lower) && !targets.length) targets.push('wave');
  if (!targets.length) targets = ['wave', 'vehicles']; // default: difficulty = wave + vehicles

  return { direction, pct, targets };
}

function applyPromptChanges(direction, pct, targets, adminId) {
  const changes = [];
  const allConfigs = db.prepare('SELECT * FROM game_config WHERE category IN (' + targets.map(() => '?').join(',') + ')').all(...targets);

  // Difficulty mappings
  const SPEED_KEYS = /speed|freq/i;
  const QTY_KEYS   = /qty|concurrent|hp|dmg/i;
  const REWARD_KEYS = /credit|arc|score|bonus/i;
  const COST_KEYS   = /cost/i;

  for (const cfg of allConfigs) {
    if (cfg.data_type !== 'number') continue;
    const val = parseFloat(cfg.value);
    if (isNaN(val) || val === 0) continue;
    let newVal = val;

    if (direction === 'harder') {
      // Harder: decrease speed/freq (faster zombies, faster spawns), increase qty/hp/dmg
      if (SPEED_KEYS.test(cfg.key)) newVal = val * (1 - pct);
      else if (QTY_KEYS.test(cfg.key)) newVal = val * (1 + pct);
      else continue;
    } else if (direction === 'easier') {
      if (SPEED_KEYS.test(cfg.key)) newVal = val * (1 + pct);
      else if (QTY_KEYS.test(cfg.key)) newVal = val * (1 - pct);
      else continue;
    } else if (direction === 'faster') {
      if (SPEED_KEYS.test(cfg.key)) newVal = val * (1 - pct);
      else continue;
    } else if (direction === 'slower') {
      if (SPEED_KEYS.test(cfg.key)) newVal = val * (1 + pct);
      else continue;
    } else if (direction === 'more_rewards') {
      if (REWARD_KEYS.test(cfg.key) && !COST_KEYS.test(cfg.key)) newVal = val * (1 + pct);
      else continue;
    } else if (direction === 'less_rewards') {
      if (REWARD_KEYS.test(cfg.key) && !COST_KEYS.test(cfg.key)) newVal = val * (1 - pct);
      else continue;
    } else if (direction === 'more_spawns') {
      if (QTY_KEYS.test(cfg.key)) newVal = val * (1 + pct);
      else continue;
    } else if (direction === 'less_spawns') {
      if (QTY_KEYS.test(cfg.key)) newVal = val * (1 - pct);
      else continue;
    } else if (direction === 'increase') {
      newVal = val * (1 + pct);
    } else if (direction === 'decrease') {
      newVal = val * (1 - pct);
    }

    // Clamp to min/max
    if (cfg.min_val != null) newVal = Math.max(cfg.min_val, newVal);
    if (cfg.max_val != null) newVal = Math.min(cfg.max_val, newVal);

    // Round appropriately
    newVal = cfg.key.includes('rate') || cfg.key.includes('speed') ? Math.round(newVal * 100) / 100 : Math.round(newVal);

    if (newVal !== val) {
      changes.push({ category: cfg.category, key: cfg.key, label: cfg.label, old: val, new: newVal });
      db.prepare('INSERT INTO config_history (category, key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)').run(cfg.category, cfg.key, String(val), String(newVal), adminId);
      db.prepare('UPDATE game_config SET value = ?, updated_at = datetime(\'now\'), updated_by = ? WHERE category = ? AND key = ?').run(String(newVal), adminId, cfg.category, cfg.key);
    }
  }
  return changes;
}

app.post('/api/admin/ai-prompt', adminAuth, adminOnly, (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length < 3) return res.status(400).json({ error: 'Prompt required (min 3 chars)' });
  const safePrompt = prompt.slice(0, 500);
  const parsed = parseAdminPrompt(safePrompt);
  if (parsed.error) {
    db.prepare('INSERT INTO ai_prompt_history (admin_id, prompt, intent, status) VALUES (?, ?, ?, ?)').run(req.player.id, safePrompt, 'error', 'failed');
    return res.json({ ok: false, error: parsed.error, suggestions: [
      'Make the game 10% harder',
      'Increase zombie spawn rate by 20%',
      'Make rewards more generous by 15%',
      'Speed up enemies by 25%',
      'Decrease vehicle HP by 10%'
    ]});
  }

  const changes = applyPromptChanges(parsed.direction, parsed.pct, parsed.targets, req.player.id);
  const intent = parsed.direction + ' ' + (parsed.pct * 100) + '% on ' + parsed.targets.join(', ');
  db.prepare('INSERT INTO ai_prompt_history (admin_id, prompt, intent, changes, status) VALUES (?, ?, ?, ?, ?)').run(
    req.player.id, safePrompt, intent, JSON.stringify(changes), changes.length ? 'applied' : 'no_changes'
  );
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'ai_prompt', intent + ' (' + changes.length + ' changes)');

  res.json({ ok: true, intent, changesCount: changes.length, changes, parsed: { direction: parsed.direction, pct: parsed.pct, targets: parsed.targets } });
});

app.get('/api/admin/ai-prompt/history', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT h.*, p.username as admin_name FROM ai_prompt_history h LEFT JOIN players p ON h.admin_id = p.id ORDER BY h.created_at DESC LIMIT 50').all();
  res.json(rows);
});

// ── Admin Broadcasts ──────────────────────────────────────────────────
app.get('/api/admin/broadcasts', adminAuth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT b.*, p.username as admin_name FROM admin_broadcasts b LEFT JOIN players p ON b.admin_id = p.id ORDER BY b.created_at DESC LIMIT 50').all();
  res.json(rows);
});

app.post('/api/admin/broadcast', adminAuth, adminOnly, (req, res) => {
  const { message, type, expires_hours } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const safeMsg = String(message).slice(0, 500);
  const safeType = ['info', 'warning', 'success', 'urgent'].includes(type) ? type : 'info';
  const expires = expires_hours ? `datetime('now', '+${parseInt(expires_hours)} hours')` : null;
  if (expires) {
    db.prepare(`INSERT INTO admin_broadcasts (admin_id, message, type, expires_at) VALUES (?, ?, ?, datetime('now', '+' || ? || ' hours'))`).run(req.player.id, safeMsg, safeType, parseInt(expires_hours));
  } else {
    db.prepare('INSERT INTO admin_broadcasts (admin_id, message, type) VALUES (?, ?, ?)').run(req.player.id, safeMsg, safeType);
  }
  db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(req.player.id, 'broadcast', safeType + ': ' + safeMsg.slice(0, 100));
  res.json({ ok: true });
});

app.post('/api/admin/broadcast/:id/toggle', adminAuth, adminOnly, (req, res) => {
  const bid = parseInt(req.params.id);
  db.prepare('UPDATE admin_broadcasts SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(bid);
  res.json({ ok: true });
});

// ── Active broadcasts (public, for game client) ──────────────────────
app.get('/api/broadcasts/active', (req, res) => {
  const rows = db.prepare("SELECT id, message, type, created_at FROM admin_broadcasts WHERE active = 1 AND (expires_at IS NULL OR expires_at > datetime('now')) ORDER BY created_at DESC LIMIT 5").all();
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════════════
// ML AUTO-REGULATION — Self-adjusting game balance via aggregate metrics
// ══════════════════════════════════════════════════════════════════════

// Get auto-regulation status & last run
app.get('/api/admin/ml/auto-regulate', adminAuth, adminOnly, (req, res) => {
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'ml_auto_regulate'").get();
    const enabled = setting ? setting.value === '1' : false;
    const lastRun = db.prepare("SELECT value FROM settings WHERE key = 'ml_auto_last_run'").get();
    const lastChanges = db.prepare("SELECT value FROM settings WHERE key = 'ml_auto_last_changes'").get();
    const history = db.prepare("SELECT * FROM config_history WHERE changed_by = -1 ORDER BY changed_at DESC LIMIT 50").all();
    res.json({
      enabled,
      lastRun: lastRun ? lastRun.value : null,
      lastChanges: lastChanges ? JSON.parse(lastChanges.value) : [],
      history
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Toggle auto-regulation on/off
app.post('/api/admin/ml/auto-regulate/toggle', adminAuth, adminOnly, (req, res) => {
  try {
    const current = db.prepare("SELECT value FROM settings WHERE key = 'ml_auto_regulate'").get();
    const newVal = (!current || current.value !== '1') ? '1' : '0';
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ml_auto_regulate', ?)").run(newVal);
    db.prepare('INSERT INTO admin_log (admin_id, action, details) VALUES (?, ?, ?)').run(
      req.player.id, 'ml_auto_regulate', newVal === '1' ? 'Enabled auto-regulation' : 'Disabled auto-regulation'
    );
    res.json({ ok: true, enabled: newVal === '1' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Run auto-regulation analysis (can be triggered manually or by cron)
app.post('/api/admin/ml/auto-regulate/run', adminAuth, adminOnly, (req, res) => {
  try {
    const result = runAutoRegulation();
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function runAutoRegulation() {
  const changes = [];
  const insights = [];

  // 1) Gather aggregate player metrics (last 24h)
  const sessions = db.prepare(`
    SELECT COUNT(*) as total, AVG(kills) as avgKills, AVG(duration_s) as avgDuration,
           AVG(max_wave) as avgWave, MAX(max_wave) as maxWave,
           AVG(CASE WHEN shots_fired > 0 THEN CAST(shots_hit AS REAL)/shots_fired ELSE 0 END) as avgAccuracy
    FROM game_sessions WHERE started_at > datetime('now', '-24 hours') AND duration_s > 10
  `).get();

  const sessions7d = db.prepare(`
    SELECT COUNT(*) as total, AVG(kills) as avgKills, AVG(duration_s) as avgDuration, AVG(max_wave) as avgWave
    FROM game_sessions WHERE started_at > datetime('now', '-7 days') AND duration_s > 10
  `).get();

  // 2) Compute skill composite (similar to adaptive-ai.js but server-side aggregate)
  const acc = sessions.avgAccuracy || 0;
  const killRate = sessions.avgDuration > 0 ? (sessions.avgKills || 0) / (sessions.avgDuration / 60) : 0; // kills per minute
  const waveProgress = Math.min((sessions.avgWave || 1) / 6, 1); // normalized to max 6 expected waves
  const skill = acc * 0.35 + Math.min(killRate / 30, 1) * 0.35 + waveProgress * 0.30;

  insights.push({ metric: 'sessions_24h', value: sessions.total || 0, label: 'Sessions (24h)' });
  insights.push({ metric: 'avg_kills', value: Math.round(sessions.avgKills || 0), label: 'Avg Kills' });
  insights.push({ metric: 'avg_wave', value: +(sessions.avgWave || 0).toFixed(1), label: 'Avg Wave Reached' });
  insights.push({ metric: 'avg_accuracy', value: +(acc * 100).toFixed(1), label: 'Avg Accuracy %' });
  insights.push({ metric: 'kill_rate_pm', value: +killRate.toFixed(1), label: 'Kills/Min' });
  insights.push({ metric: 'skill_composite', value: +skill.toFixed(3), label: 'Skill Composite (0-1)' });

  // 3) Trend detection (24h vs 7d)
  let trend = 'stable';
  if (sessions7d.total > 0 && sessions.total > 0) {
    const waveDelta = (sessions.avgWave || 0) - (sessions7d.avgWave || 0);
    const killDelta = (sessions.avgKills || 0) - (sessions7d.avgKills || 0);
    if (waveDelta > 0.5 && killDelta > 5) trend = 'players_improving';
    else if (waveDelta < -0.5 && killDelta < -5) trend = 'players_struggling';
    insights.push({ metric: 'trend', value: trend, label: 'Player Trend' });
    insights.push({ metric: 'wave_delta', value: +waveDelta.toFixed(2), label: 'Wave Delta (24h vs 7d)' });
  }

  // 4) Economy health signal
  const arcEarned = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM arc_ledger WHERE amount > 0 AND created_at > datetime('now', '-24 hours')`).get().v;
  const arcSpent = db.prepare(`SELECT COALESCE(SUM(ABS(amount)),0) as v FROM arc_ledger WHERE amount < 0 AND created_at > datetime('now', '-24 hours')`).get().v;
  const sinkRatio = arcEarned > 0 ? arcSpent / arcEarned : 1;
  insights.push({ metric: 'arc_earned_24h', value: +arcEarned.toFixed(1), label: 'ARC Earned (24h)' });
  insights.push({ metric: 'arc_spent_24h', value: +arcSpent.toFixed(1), label: 'ARC Spent (24h)' });
  insights.push({ metric: 'sink_ratio', value: +sinkRatio.toFixed(3), label: 'Sink Ratio' });

  // 5) Decision engine — apply adjustments only if enough data
  const enabled = db.prepare("SELECT value FROM settings WHERE key = 'ml_auto_regulate'").get();
  const isEnabled = enabled && enabled.value === '1';
  let decision = 'no_action';
  let reason = '';

  if (sessions.total < 5) {
    decision = 'insufficient_data';
    reason = 'Need at least 5 sessions in 24h for auto-regulation';
  } else if (isEnabled) {
    // Difficulty auto-adjust
    if (skill > 0.7 && trend === 'players_improving') {
      // Players dominating — nudge harder
      const pct = Math.min(0.08, (skill - 0.7) * 0.2); // max 8%
      const adj = applyPromptChanges('harder', pct, ['wave'], -1); // -1 = ML system
      changes.push(...adj);
      decision = 'harder';
      reason = 'Skill composite ' + skill.toFixed(3) + ' > 0.7 + improving trend → +' + (pct * 100).toFixed(1) + '% harder';
    } else if (skill < 0.3 && trend === 'players_struggling') {
      // Players struggling — nudge easier
      const pct = Math.min(0.08, (0.3 - skill) * 0.2);
      const adj = applyPromptChanges('easier', pct, ['wave'], -1);
      changes.push(...adj);
      decision = 'easier';
      reason = 'Skill composite ' + skill.toFixed(3) + ' < 0.3 + struggling trend → +' + (pct * 100).toFixed(1) + '% easier';
    } else if (sinkRatio < 0.3 && arcEarned > 100) {
      // Economy inflation — reduce rewards slightly
      const pct = Math.min(0.05, (0.3 - sinkRatio) * 0.1);
      const adj = applyPromptChanges('less_rewards', pct, ['economy'], -1);
      changes.push(...adj);
      decision = 'deflate_rewards';
      reason = 'Sink ratio ' + sinkRatio.toFixed(3) + ' < 0.3 → reducing rewards by ' + (pct * 100).toFixed(1) + '%';
    } else if (sinkRatio > 2.0 && arcEarned > 100) {
      // Economy deflation — boost rewards slightly
      const pct = Math.min(0.05, (sinkRatio - 2.0) * 0.05);
      const adj = applyPromptChanges('more_rewards', pct, ['economy'], -1);
      changes.push(...adj);
      decision = 'inflate_rewards';
      reason = 'Sink ratio ' + sinkRatio.toFixed(3) + ' > 2.0 → boosting rewards by ' + (pct * 100).toFixed(1) + '%';
    } else {
      decision = 'balanced';
      reason = 'Skill=' + skill.toFixed(3) + ', SinkRatio=' + sinkRatio.toFixed(3) + ', Trend=' + trend + ' — no adjustment needed';
    }

    // Log to settings
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ml_auto_last_run', ?)").run(new Date().toISOString());
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('ml_auto_last_changes', ?)").run(JSON.stringify({ decision, reason, changes, insights, timestamp: new Date().toISOString() }));
  } else {
    decision = 'disabled';
    reason = 'Auto-regulation is disabled. Enable it to allow ML-driven adjustments.';
  }

  return { ok: true, decision, reason, changes, insights, sessionsAnalyzed: sessions.total || 0, enabled: isEnabled };
}

// ══════════════════════════════════════════════════════════════════════
// SMART CONTRACT INFO (read-only ARC Token details for admin panel)
// ══════════════════════════════════════════════════════════════════════

app.get('/api/admin/contract/info', adminAuth, adminOnly, (req, res) => {
  res.json({
    token: {
      name: 'Anti-Ruscist Coin',
      symbol: 'ARC',
      decimals: 18,
      totalSupply: '1,000,000,000',
      network: 'Polygon (MATIC)',
      chainId: 137,
      standard: 'ERC-20'
    },
    allocations: [
      { name: 'Player Rewards Pool', pct: 40, wallet: 'Claimable via oracle', vesting: 'None — drip via gameplay' },
      { name: 'Treasury / Ecosystem', pct: 20, wallet: 'Timelock contract', vesting: '2-year timelock' },
      { name: 'Team & Advisors', pct: 15, wallet: 'Vesting contract', vesting: '4-year vest, 1-year cliff' },
      { name: 'Liquidity Provision', pct: 10, wallet: 'DEX LP', vesting: 'Locked 1 year' },
      { name: 'Community Events', pct: 10, wallet: 'Multi-sig', vesting: 'None' },
      { name: 'Ukraine Humanitarian', pct: 5, wallet: '0x165CD37b4C644C2921454429E7F9358d18A45e14', vesting: 'Immutable — cannot be changed' }
    ],
    contracts: [
      { name: 'ARC Token (ERC-20)', file: 'contracts/ARC_Token.sol', status: 'Ready for deployment' },
      { name: 'Kill NFT', file: 'contracts/ARC_KillNFT.sol', status: 'Ready for deployment' },
      { name: 'Ukrainian Defenders NFT', file: 'contracts/UkrainianDefendersNFT.sol', status: 'Ready for deployment' }
    ],
    inGameEconomy: (() => {
      const safe = (sql) => { try { return db.prepare(sql).get().v; } catch { return 0; } };
      return {
        totalArcCirculating: safe('SELECT COALESCE(SUM(arcoins),0) as v FROM player_stats'),
        totalArcStaked: safe('SELECT COALESCE(SUM(amount),0) as v FROM stakes WHERE claimed = 0'),
        totalArcEarnedAllTime: safe('SELECT COALESCE(SUM(amount),0) as v FROM arc_ledger WHERE amount > 0'),
        totalArcSpentAllTime: safe('SELECT COALESCE(SUM(ABS(amount)),0) as v FROM arc_ledger WHERE amount < 0'),
        ukraineDonations: safe('SELECT COALESCE(SUM(ukraine_portion),0) as v FROM crypto_purchases'),
        totalPurchases: safe('SELECT COUNT(*) as v FROM crypto_purchases')
      };
    })()
  });
});

// ══════════════════════════════════════════════════════════════════════
// ML OPTIMIZER MODULE (A/B testing, model serving, training pipeline)
// ══════════════════════════════════════════════════════════════════════
const { initMLOptimizer } = require('./ml-optimizer');
initMLOptimizer(app, db, adminAuth, adminOnly);

// ══════════════════════════════════════════════════════════════════════
// CONTRACT DEPLOY MODULE (compile, serve artifacts, record deployments)
// ══════════════════════════════════════════════════════════════════════
const { initContractDeploy } = require('./contract-deploy');
initContractDeploy(app, db, adminAuth, adminOnly);

// ══════════════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log('🎮 Anti-Ruscist API running on port ' + PORT);
  console.log('📂 Serving game from ' + path.join(__dirname, '..'));
  console.log('🗄️  Database: ' + DB_PATH);
  console.log('🧠 ML Optimizer module loaded');
});
