// ── Anti-Ruscist Game — Database Schema & Migrations ──────────────────
// SQLite via better-sqlite3. Single file: server/game.db
// Run once on first start, or call initDB() from index.js.

const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'game.db');

function initDB() {
  const db = new Database(DB_PATH, { verbose: null });

  // Performance pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // ════════════════════════════════════════════════════════════════
  // PLAYERS — core player record
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id       TEXT    UNIQUE NOT NULL,
      username      TEXT    DEFAULT 'Fighter',
      email         TEXT,
      password_hash TEXT,
      wallet_addr   TEXT,
      ref_code      TEXT    UNIQUE,
      referred_by   TEXT,
      lang          TEXT    DEFAULT 'en',
      ui_theme      TEXT    DEFAULT 'default',
      ui_accent     TEXT,
      created_at    TEXT    DEFAULT (datetime('now')),
      last_login    TEXT    DEFAULT (datetime('now')),
      is_admin      INTEGER DEFAULT 0,
      is_banned     INTEGER DEFAULT 0,
      ban_reason    TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_players_anon ON players(anon_id);
    CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
    CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_addr);
    CREATE INDEX IF NOT EXISTS idx_players_ref ON players(ref_code);
  `);

  // ════════════════════════════════════════════════════════════════
  // PLAYER_STATS — in-game counters, prestige, streaks
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_stats (
      player_id       INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
      credits         INTEGER DEFAULT 500,
      arcoins         REAL    DEFAULT 0,
      total_earned    REAL    DEFAULT 0,
      total_kills     INTEGER DEFAULT 0,
      total_wins      INTEGER DEFAULT 0,
      max_wave        INTEGER DEFAULT 0,
      prestige_level  INTEGER DEFAULT 0,
      login_streak    INTEGER DEFAULT 0,
      streak_multi    REAL    DEFAULT 1.0,
      shots_fired     INTEGER DEFAULT 0,
      shots_hit       INTEGER DEFAULT 0,
      shots_ukraine   INTEGER DEFAULT 0,
      chain_claims    INTEGER DEFAULT 0,
      lb_rank         INTEGER DEFAULT 999
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // WAVE_HIGH_SCORES — per-wave best scores
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS wave_high_scores (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      wave_num  INTEGER NOT NULL,
      score     INTEGER NOT NULL DEFAULT 0,
      set_at    TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, wave_num)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // ARC_LEDGER — every ARC transaction
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS arc_ledger (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      amount    REAL    NOT NULL,
      reason    TEXT,
      created_at TEXT   DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_player ON arc_ledger(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // ACHIEVEMENTS — earned achievements
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      achievement_id  TEXT    NOT NULL,
      earned_at       TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, achievement_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ach_player ON achievements(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // STREAK_BADGES — login streak badges
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS streak_badges (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      badge_id  TEXT    NOT NULL,
      earned_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, badge_id)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // COSMETICS — purchased/owned cosmetic items
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS cosmetics (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      cosmetic_id TEXT    NOT NULL,
      equipped    INTEGER DEFAULT 0,
      bought_at   TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, cosmetic_id)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // COSMETICS_CATALOG — master list of available cosmetic items
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS cosmetics_catalog (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      cosmetic_id TEXT    NOT NULL UNIQUE,
      type        TEXT    NOT NULL DEFAULT 'weapon_skin',
      label       TEXT,
      price       REAL    NOT NULL DEFAULT 0,
      rarity      TEXT    NOT NULL DEFAULT 'common',
      active      INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // ARC_PURCHASES — crypto purchase records
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS arc_purchases (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER REFERENCES players(id),
      pol_amount  REAL    NOT NULL,
      arc_amount  REAL    NOT NULL,
      tx_hash     TEXT,
      label       TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // JOKES — user-submitted jokes for the ticker
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS jokes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      text        TEXT    NOT NULL,
      username    TEXT    DEFAULT 'Anonymous',
      approved    INTEGER DEFAULT 0,
      flagged     INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // SKILLS — unlocked skill tree nodes
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      skill_id  TEXT    NOT NULL,
      unlocked_at TEXT  DEFAULT (datetime('now')),
      UNIQUE(player_id, skill_id)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // WEAPONS — unlocked weapons
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS weapons (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      weapon_id   TEXT    NOT NULL,
      unlocked_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, weapon_id)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // NFTS — minted/owned NFTs
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS nfts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      token_id    TEXT,
      contract    TEXT,
      tier        TEXT,
      name        TEXT,
      image_url   TEXT,
      minted_at   TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_nfts_player ON nfts(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // STAKES — ARC staking positions
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS stakes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL,
      apy         REAL    DEFAULT 0.12,
      staked_at   TEXT    DEFAULT (datetime('now')),
      matures_at  TEXT    NOT NULL,
      claimed     INTEGER DEFAULT 0,
      claimed_at  TEXT,
      reward      REAL    DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_stakes_player ON stakes(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // CONTRACTS — timed WoT-style contracts
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS contracts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      contract_id   TEXT    NOT NULL,
      description   TEXT,
      type          TEXT,
      target        INTEGER,
      progress      INTEGER DEFAULT 0,
      arc_reward    REAL    DEFAULT 0,
      money_reward  INTEGER DEFAULT 0,
      accepted_at   TEXT    DEFAULT (datetime('now')),
      expires_at    TEXT    NOT NULL,
      done          INTEGER DEFAULT 0,
      claimed       INTEGER DEFAULT 0,
      failed        INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_contracts_player ON contracts(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // LOANS — financial loans (from contract penalties etc.)
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      amount      INTEGER NOT NULL,
      interest    INTEGER DEFAULT 0,
      total       INTEGER NOT NULL,
      reason      TEXT,
      taken_at    TEXT    DEFAULT (datetime('now')),
      repaid      INTEGER DEFAULT 0,
      repaid_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_loans_player ON loans(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // DAILY_MISSIONS — daily mission state
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_missions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      mission_date  TEXT    NOT NULL,
      mission_index INTEGER NOT NULL,
      mission_id    TEXT    NOT NULL,
      type          TEXT,
      target        INTEGER,
      progress      INTEGER DEFAULT 0,
      done          INTEGER DEFAULT 0,
      claimed       INTEGER DEFAULT 0,
      arc_reward    REAL    DEFAULT 0,
      UNIQUE(player_id, mission_date, mission_index)
    );
    CREATE INDEX IF NOT EXISTS idx_missions_player_date ON daily_missions(player_id, mission_date);
  `);

  // ════════════════════════════════════════════════════════════════
  // BATTLE_PASS — season battle pass progression
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS battle_pass (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      season      INTEGER NOT NULL DEFAULT 1,
      xp          INTEGER DEFAULT 0,
      tier        INTEGER DEFAULT 0,
      total_kills INTEGER DEFAULT 0,
      is_premium  INTEGER DEFAULT 0,
      purchased_at TEXT,
      UNIQUE(player_id, season)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // CLANS — clan groups
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS clans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      tag         TEXT    NOT NULL,
      code        TEXT    UNIQUE,
      leader_id   INTEGER NOT NULL REFERENCES players(id),
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_clans_code ON clans(code);
  `);

  // ════════════════════════════════════════════════════════════════
  // CLAN_MEMBERS — who's in which clan
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS clan_members (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      clan_id   INTEGER NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
      player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      role      TEXT    DEFAULT 'member',
      joined_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // PVP_CHALLENGES — player vs player challenges
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS pvp_challenges (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      challenger_id INTEGER NOT NULL REFERENCES players(id),
      opponent_id   INTEGER REFERENCES players(id),
      wager         REAL    DEFAULT 0,
      status        TEXT    DEFAULT 'pending',
      challenger_score INTEGER,
      opponent_score   INTEGER,
      winner_id     INTEGER REFERENCES players(id),
      created_at    TEXT    DEFAULT (datetime('now')),
      resolved_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pvp_challenger ON pvp_challenges(challenger_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // MINIGAME_STATS — Play21, Cups, Teter(Math), Putin Pool
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS minigame_stats (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      game        TEXT    NOT NULL,
      played      INTEGER DEFAULT 0,
      won         INTEGER DEFAULT 0,
      lost        INTEGER DEFAULT 0,
      ua_donated  REAL    DEFAULT 0,
      UNIQUE(player_id, game)
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // PUTIN_DEATH_POOL — death date bets
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS putin_death_pool (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      bet_amount  INTEGER NOT NULL,
      bet_date    TEXT    NOT NULL,
      placed_at   TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ppool_player ON putin_death_pool(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // MARKET_LISTINGS — P2P marketplace listings
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS market_listings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_id   INTEGER NOT NULL REFERENCES players(id),
      item_type   TEXT    NOT NULL,
      item_id     TEXT    NOT NULL,
      price_arc   REAL,
      price_cred  INTEGER,
      status      TEXT    DEFAULT 'active',
      buyer_id    INTEGER REFERENCES players(id),
      listed_at   TEXT    DEFAULT (datetime('now')),
      sold_at     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_market_status ON market_listings(status);
    CREATE INDEX IF NOT EXISTS idx_market_seller ON market_listings(seller_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // DONATIONS — UA donation tracking
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER REFERENCES players(id),
      amount      REAL    NOT NULL,
      currency    TEXT    DEFAULT 'USD',
      tx_hash     TEXT,
      method      TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // LEADERBOARD — weekly/global leaderboard snapshots
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      period      TEXT    NOT NULL,
      score       INTEGER DEFAULT 0,
      kills       INTEGER DEFAULT 0,
      wave        INTEGER DEFAULT 0,
      rank        INTEGER,
      snapshot_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id, period)
    );
    CREATE INDEX IF NOT EXISTS idx_lb_period ON leaderboard(period, rank);
  `);

  // ════════════════════════════════════════════════════════════════
  // SPIN_WHEEL — daily spin history
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS spin_wheel (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      prize       TEXT,
      amount      REAL,
      spun_at     TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_spin_player ON spin_wheel(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // REFERRALS — referral tracking
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id   INTEGER NOT NULL REFERENCES players(id),
      referred_id   INTEGER NOT NULL REFERENCES players(id),
      bonus_paid    REAL    DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now')),
      UNIQUE(referred_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ref_referrer ON referrals(referrer_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // NEWS / ANNOUNCEMENTS
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      body        TEXT,
      author_id   INTEGER REFERENCES players(id),
      pinned      INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // ADMIN_LOG — admin action audit trail
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER NOT NULL REFERENCES players(id),
      action      TEXT    NOT NULL,
      target_id   INTEGER,
      details     TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_adminlog_admin ON admin_log(admin_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // GAME_SESSIONS — play session tracking (analytics)
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      started_at  TEXT    DEFAULT (datetime('now')),
      ended_at    TEXT,
      wave_reached INTEGER DEFAULT 0,
      score       INTEGER DEFAULT 0,
      kills       INTEGER DEFAULT 0,
      death_cause TEXT,
      duration_s  INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_player ON game_sessions(player_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // SETTINGS — key-value store for global game config (admin)
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // GAME_CONFIG — structured game balance parameters (admin-editable)
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_config (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      key         TEXT    NOT NULL,
      value       TEXT    NOT NULL,
      data_type   TEXT    NOT NULL DEFAULT 'number',
      label       TEXT,
      description TEXT,
      min_val     REAL,
      max_val     REAL,
      updated_at  TEXT    DEFAULT (datetime('now')),
      updated_by  INTEGER REFERENCES players(id),
      UNIQUE(category, key)
    );
    CREATE INDEX IF NOT EXISTS idx_gc_cat ON game_config(category);
  `);

  // ════════════════════════════════════════════════════════════════
  // CONFIG_HISTORY — audit trail for config changes
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      key         TEXT    NOT NULL,
      old_value   TEXT,
      new_value   TEXT    NOT NULL,
      changed_by  INTEGER REFERENCES players(id),
      changed_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ch_cat ON config_history(category, key);
  `);

  // Seed default settings
  const ins = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const settingsDefaults = [
    ['ua_donation_pct', '10'],
    ['staking_apy', '12'],
    ['loan_interest_pct', '15'],
    ['contract_penalty_pct', '50'],
    ['spin_cooldown_hours', '24'],
    ['max_active_contracts', '3'],
    ['prestige_max_level', '40'],
    ['prestige_bonus_per_level', '5'],
    ['battle_pass_season', '1'],
    ['maintenance_mode', '0'],
    ['motd', 'Slava Ukraini! 🇺🇦'],
  ];
  const insSettingsTx = db.transaction((items) => {
    for (const [k, v] of items) ins.run(k, v);
  });
  insSettingsTx(settingsDefaults);

  // Seed default game config
  const gcIns = db.prepare(`INSERT OR IGNORE INTO game_config
    (category, key, value, data_type, label, description, min_val, max_val) VALUES (?,?,?,?,?,?,?,?)`);
  const gameConfigDefaults = [
    // ── Wave: Spawn Frequency (ms between spawns) ──
    ['wave', 'w1_freq_min', '2400', 'number', 'Wave 1 Spawn Freq Min (ms)', 'Minimum milliseconds between zombie spawns in wave 1', 500, 10000],
    ['wave', 'w1_freq_max', '3200', 'number', 'Wave 1 Spawn Freq Max (ms)', 'Maximum milliseconds between zombie spawns in wave 1', 500, 10000],
    ['wave', 'w2_freq_min', '2000', 'number', 'Wave 2 Spawn Freq Min (ms)', null, 500, 10000],
    ['wave', 'w2_freq_max', '2800', 'number', 'Wave 2 Spawn Freq Max (ms)', null, 500, 10000],
    ['wave', 'w3_freq_min', '1800', 'number', 'Wave 3 Spawn Freq Min (ms)', null, 500, 10000],
    ['wave', 'w3_freq_max', '2600', 'number', 'Wave 3 Spawn Freq Max (ms)', null, 500, 10000],
    ['wave', 'w4_freq_min', '1500', 'number', 'Wave 4 Spawn Freq Min (ms)', null, 500, 10000],
    ['wave', 'w4_freq_max', '2200', 'number', 'Wave 4 Spawn Freq Max (ms)', null, 500, 10000],

    // ── Wave: Zombie Quantities ──
    ['wave', 'w1_qty_min', '12',  'number', 'Wave 1 Zombies Min', 'Minimum zombies in wave 1', 1, 100],
    ['wave', 'w1_qty_max', '16', 'number', 'Wave 1 Zombies Max', 'Maximum zombies in wave 1', 1, 100],
    ['wave', 'w2_qty_min', '16', 'number', 'Wave 2 Zombies Min', null, 1, 100],
    ['wave', 'w2_qty_max', '22', 'number', 'Wave 2 Zombies Max', null, 1, 100],
    ['wave', 'w3_qty_min', '20', 'number', 'Wave 3 Zombies Min', null, 1, 100],
    ['wave', 'w3_qty_max', '26', 'number', 'Wave 3 Zombies Max', null, 1, 100],
    ['wave', 'w4_qty_min', '24', 'number', 'Wave 4 Zombies Min', null, 1, 100],
    ['wave', 'w4_qty_max', '30', 'number', 'Wave 4 Zombies Max', null, 1, 100],
    ['wave', 'max_concurrent', '7', 'number', 'Max Concurrent Zombies', 'Maximum zombies on screen at once', 1, 30],
    ['wave', 'spawn_delay_w2plus', '800', 'number', 'Wave 2+ Spawn Delay (ms)', 'Delay before first spawn in wave 2+', 0, 5000],

    // ── Wave: Zombie Speed (CSS animation seconds) ──
    ['wave', 'w1_speed_min', '4', 'number', 'Wave 1 Zombie Speed Min (s)', 'CSS walk animation duration — lower = faster', 1, 20],
    ['wave', 'w1_speed_max', '6', 'number', 'Wave 1 Zombie Speed Max (s)', null, 1, 20],
    ['wave', 'w2_speed_min', '3', 'number', 'Wave 2 Zombie Speed Min (s)', null, 1, 20],
    ['wave', 'w2_speed_max', '5', 'number', 'Wave 2 Zombie Speed Max (s)', null, 1, 20],
    ['wave', 'w3_speed_min', '2', 'number', 'Wave 3 Zombie Speed Min (s)', null, 1, 20],
    ['wave', 'w3_speed_max', '4', 'number', 'Wave 3 Zombie Speed Max (s)', null, 1, 20],
    ['wave', 'w4_speed_min', '1', 'number', 'Wave 4 Zombie Speed Min (s)', null, 1, 20],
    ['wave', 'w4_speed_max', '3', 'number', 'Wave 4 Zombie Speed Max (s)', null, 1, 20],

    // ── Vehicles: Trucks ──
    ['vehicles', 'max_trucks', '2', 'number', 'Max Trucks on Screen', null, 0, 10],
    ['vehicles', 'truck_hp_base', '6', 'number', 'Truck Base HP', 'HP = base + wave * multiplier', 1, 100],
    ['vehicles', 'truck_hp_per_wave', '2', 'number', 'Truck HP per Wave', null, 0, 20],
    ['vehicles', 'truck_speed_base', '0.72', 'number', 'Truck Base Speed', 'px/frame', 0.1, 5],
    ['vehicles', 'truck_speed_per_wave', '0.1', 'number', 'Truck Speed per Wave', null, 0, 2],
    ['vehicles', 'truck_start_wave', '2', 'number', 'Trucks Start Wave', 'Wave number when trucks begin spawning', 1, 4],

    // ── Vehicles: Tanks ──
    ['vehicles', 'max_tanks', '1', 'number', 'Max Tanks on Screen', null, 0, 5],
    ['vehicles', 'tank_hp_base', '18', 'number', 'Tank Base HP', 'HP = base + wave * multiplier', 1, 200],
    ['vehicles', 'tank_hp_per_wave', '4', 'number', 'Tank HP per Wave', null, 0, 50],
    ['vehicles', 'tank_speed_base', '0.28', 'number', 'Tank Base Speed', 'px/frame', 0.05, 3],
    ['vehicles', 'tank_speed_per_wave', '0.04', 'number', 'Tank Speed per Wave', null, 0, 1],
    ['vehicles', 'tank_start_wave', '3', 'number', 'Tanks Start Wave', null, 1, 4],

    // ── Vehicles: Enemy Drones ──
    ['vehicles', 'drone_hp_base', '1', 'number', 'Drone Base HP', null, 1, 20],
    ['vehicles', 'drone_hp_w3_bonus', '1', 'number', 'Drone HP +Bonus at W3', null, 0, 10],
    ['vehicles', 'drone_hp_w4_bonus', '1', 'number', 'Drone HP +Bonus at W4', null, 0, 10],
    ['vehicles', 'drone_dmg_w1', '18', 'number', 'Drone Damage W1-2', null, 1, 100],
    ['vehicles', 'drone_dmg_w3', '26', 'number', 'Drone Damage W3', null, 1, 100],
    ['vehicles', 'drone_dmg_w4', '34', 'number', 'Drone Damage W4', null, 1, 100],
    ['vehicles', 'drone_spawn_min', '10000', 'number', 'Drone Spawn Gap Min (ms)', null, 1000, 60000],
    ['vehicles', 'drone_spawn_max', '15000', 'number', 'Drone Spawn Gap Max (ms)', null, 1000, 60000],

    // ── Economy: Starting Values ──
    ['economy', 'start_credits', '500', 'number', 'Starting Credits (₴)', null, 0, 10000],
    ['economy', 'start_lives', '3', 'number', 'Starting Lives', null, 1, 20],
    ['economy', 'start_hp', '100', 'number', 'Starting Player HP', null, 10, 500],
    ['economy', 'arc_per_wave', '1', 'number', 'ARC Earned per Wave', null, 0, 100],

    // ── Economy: Kill Rewards ──
    ['economy', 'kill_credits_max', '10', 'number', 'Max Credits per Kill', null, 1, 100],
    ['economy', 'headshot_credit_bonus', '3', 'number', 'Headshot Credit Bonus', null, 0, 50],
    ['economy', 'groin_credit_bonus', '2', 'number', 'Groin Shot Credit Bonus', null, 0, 50],
    ['economy', 'base_kill_score', '100', 'number', 'Base Kill Score', null, 10, 1000],
    ['economy', 'combo_score_bonus', '25', 'number', 'Combo Kill Score Bonus', null, 0, 200],
    ['economy', 'headshot_score_bonus', '150', 'number', 'Headshot Score Bonus', null, 0, 500],

    // ── Economy: ARC Financial ──
    ['economy', 'staking_apy', '12', 'number', 'Staking APY (%)', null, 0, 100],
    ['economy', 'loan_interest', '15', 'number', 'Loan Interest (%)', null, 0, 100],
    ['economy', 'loan_interest_rate', '0.15', 'number', 'Loan Interest Rate (decimal)', 'Used in code as multiplier', 0, 1],
    ['economy', 'max_active_loans', '5', 'number', 'Max Active Loans', null, 1, 20],
    ['economy', 'arc_earn_cap', '50', 'number', 'Max ARC per API Call', null, 1, 500],
    ['economy', 'welcome_bonus_arc', '5', 'number', 'Welcome Bonus ARC', 'ARC awarded to new players', 0, 100],
    ['economy', 'referral_bonus_arc', '2', 'number', 'Referral Bonus ARC', 'ARC awarded per referral', 0, 50],
    ['economy', 'wave_clear_arc_w1', '1', 'number', 'Wave 1 Clear ARC', null, 0, 20],
    ['economy', 'wave_clear_arc_w2', '1', 'number', 'Wave 2 Clear ARC', null, 0, 20],
    ['economy', 'wave_clear_arc_w3', '1', 'number', 'Wave 3 Clear ARC', null, 0, 20],
    ['economy', 'wave_clear_arc_w4', '2', 'number', 'Wave 4 Clear ARC', null, 0, 20],
    ['economy', 'continue_cost_arc', '25', 'number', 'Continue Cost (ARC)', 'ARC spent to revive after death (once/run)', 0, 200],
    ['economy', 'daily_deal_discount', '30', 'number', 'Daily Deal Discount (%)', 'Percentage off for daily rotating deal', 10, 50],
    ['economy', 'extra_spin_cost', '5', 'number', 'Extra Spin Cost (ARC)', 'ARC per additional daily spin', 1, 50],
    ['economy', 'max_paid_spins', '3', 'number', 'Max Paid Spins/Day', 'Maximum extra spins purchasable per day', 1, 10],

    // ── Call-in Strikes ──
    ['strikes', 'arty_cost', '500', 'number', 'Artillery Cost (₴)', null, 0, 10000],
    ['strikes', 'arty_cooldown', '18000', 'number', 'Artillery Cooldown (ms)', null, 1000, 120000],
    ['strikes', 'drones_cost', '350', 'number', 'Drone Swarm Cost (₴)', null, 0, 10000],
    ['strikes', 'drones_cooldown', '25000', 'number', 'Drone Swarm Cooldown (ms)', null, 1000, 120000],
    ['strikes', 'himars_cost', '1200', 'number', 'HIMARS Cost (₴)', null, 0, 10000],
    ['strikes', 'himars_cooldown', '60000', 'number', 'HIMARS Cooldown (ms)', null, 1000, 300000],
    ['strikes', 'bradley_cost', '800', 'number', 'Bradley Cost (₴)', null, 0, 10000],
    ['strikes', 'bradley_cooldown', '45000', 'number', 'Bradley Cooldown (ms)', null, 1000, 120000],
    ['strikes', 'fpv_cost', '450', 'number', 'FPV Drone Cost (₴)', null, 0, 10000],
    ['strikes', 'fpv_cooldown', '28000', 'number', 'FPV Drone Cooldown (ms)', null, 1000, 120000],
    ['strikes', 'rover_cost', '200', 'number', 'Rover Cost (₴)', null, 0, 10000],
    ['strikes', 'rover_cooldown', '20000', 'number', 'Rover Cooldown (ms)', null, 1000, 120000],
    ['strikes', 'firedrone_cost', '600', 'number', 'Fire Drone Cost (₴)', null, 0, 10000],
    ['strikes', 'firedrone_cooldown', '35000', 'number', 'Fire Drone Cooldown (ms)', null, 1000, 120000],

    // ── Battle Pass ──
    ['battlepass', 'season', '1', 'number', 'Current Season', 'Active battle pass season number', 1, 99],
    ['battlepass', 'premium_cost', '50', 'number', 'Premium Pass Cost (ARC)', 'ARC required for premium upgrade', 1, 500],
    ['battlepass', 'max_tier', '30', 'number', 'Max Tier', 'Total tiers in the pass', 5, 100],
    ['battlepass', 'kills_per_tier', '50', 'number', 'Kills per Tier', 'Kills needed to advance one tier', 10, 500],
    ['battlepass', 'xp_per_tier', '1000', 'number', 'XP per Tier', 'XP needed to advance one tier', 100, 10000],
    ['battlepass', 'free_arc_per_tier', '0.5', 'number', 'Free ARC per Tier', null, 0, 10],
    ['battlepass', 'premium_arc_per_tier', '1', 'number', 'Premium ARC per Tier', null, 0, 20],
    ['battlepass', 'premium_skin_tiers', '5,10,15,20,25,30', 'text', 'Premium Skin Reward Tiers', 'Comma-separated tier numbers that award cosmetics', null, null],
    ['battlepass', 'season_duration_days', '90', 'number', 'Season Duration (days)', null, 7, 365],

    // ── Daily Missions ──
    ['missions', 'missions_per_day', '3', 'number', 'Missions per Day', 'Random missions generated daily', 1, 10],
    ['missions', 'min_arc_reward', '2', 'number', 'Min ARC Reward', null, 1, 50],
    ['missions', 'max_arc_reward', '5', 'number', 'Max ARC Reward', null, 1, 100],
    ['missions', 'kill_target_min', '10', 'number', 'Kill Target Min', null, 5, 200],
    ['missions', 'kill_target_max', '50', 'number', 'Kill Target Max', null, 10, 500],
    ['missions', 'wave_target_min', '2', 'number', 'Wave Target Min', null, 1, 10],
    ['missions', 'wave_target_max', '4', 'number', 'Wave Target Max', null, 1, 20],
    ['missions', 'headshot_target_min', '3', 'number', 'Headshot Target Min', null, 1, 50],
    ['missions', 'headshot_target_max', '10', 'number', 'Headshot Target Max', null, 1, 100],
    ['missions', 'score_target_min', '3000', 'number', 'Score Target Min', null, 500, 50000],
    ['missions', 'score_target_max', '10000', 'number', 'Score Target Max', null, 1000, 100000],

    // ── Skill Tree ──
    ['skills', 'base_xp_per_level', '500', 'number', 'Base XP per Level', 'XP needed for first skill point', 100, 5000],
    ['skills', 'xp_scaling', '1.25', 'number', 'XP Scaling Factor', 'Multiplicative XP increase per level', 1.0, 3.0],
    ['skills', 'max_skill_level', '10', 'number', 'Max Skill Level', null, 1, 50],
    ['skills', 'crit_chance_per_point', '3', 'number', 'Crit Chance per Point (%)', null, 1, 20],
    ['skills', 'reload_speed_per_point', '5', 'number', 'Reload Speed per Point (%)', null, 1, 30],
    ['skills', 'credit_bonus_per_point', '5', 'number', 'Credit Bonus per Point (%)', null, 1, 30],
    ['skills', 'hp_regen_per_point', '0.5', 'number', 'HP Regen per Point (per wave)', null, 0.1, 5],
    ['skills', 'xp_bonus_per_point', '5', 'number', 'XP Bonus per Point (%)', null, 1, 30],
    ['skills', 'arc_bonus_per_point', '3', 'number', 'ARC Bonus per Point (%)', null, 1, 20],
    ['skills', 'blast_radius_per_point', '5', 'number', 'Blast Radius per Point (%)', null, 1, 30],

    // ── Prestige ──
    ['prestige', 'max_level', '40', 'number', 'Max Prestige Level', null, 1, 100],
    ['prestige', 'wave_requirement', '4', 'number', 'Wave Required to Prestige', 'Must clear this wave to prestige', 1, 10],
    ['prestige', 'credit_bonus_per_level', '5', 'number', 'Credit Bonus per Level (%)', null, 1, 30],
    ['prestige', 'multiplier_cap', '1.5', 'number', 'Prestige Multiplier Cap', 'Maximum multiplier from prestige bonuses', 1.0, 5.0],
    ['prestige', 'hp_scaling_per_level', '0.03', 'number', 'Enemy HP Scaling per Level', 'Multiplicative HP increase per prestige', 0.01, 0.2],
    ['prestige', 'speed_scaling_per_level', '0.01', 'number', 'Enemy Speed Scaling per Level', null, 0.005, 0.1],
    ['prestige', 'reset_credits', '1', 'number', 'Reset Credits on Prestige', '1=yes, 0=keep credits', 0, 1],
    ['prestige', 'reset_weapons', '0', 'number', 'Reset Weapons on Prestige', '1=yes, 0=keep weapons', 0, 1],
    ['prestige', 'bonus_base', '50', 'number', 'Prestige Bonus Base ARC', 'Base ARC awarded on prestige', 0, 500],
    ['prestige', 'bonus_per_level', '10', 'number', 'Prestige Bonus per Level', 'Extra ARC per prestige level', 0, 100],

    // ── Staking ──
    ['staking', 'apr_7d', '12', 'number', '7-Day APR (%)', null, 0, 200],
    ['staking', 'apr_30d', '24', 'number', '30-Day APR (%)', null, 0, 200],
    ['staking', 'apr_90d', '48', 'number', '90-Day APR (%)', null, 0, 200],
    ['staking', 'early_penalty_pct', '0.25', 'number', 'Early Withdrawal Penalty', 'Fraction of principal lost (0.25 = 25%)', 0, 1],

    // ── Endless Mode ──
    ['endless', 'start_wave', '5', 'number', 'Endless Starts at Wave', 'Wave number where endless mode begins', 1, 20],
    ['endless', 'zombie_base', '30', 'number', 'Base Zombies (endless start)', null, 10, 200],
    ['endless', 'zombie_per_wave', '6', 'number', 'Extra Zombies per Wave', 'Added per wave beyond start', 1, 50],
    ['endless', 'speed_floor', '0.8', 'number', 'Minimum Zombie Speed (s)', 'Lower bound for CSS animation duration', 0.3, 3],
    ['endless', 'speed_decay', '0.15', 'number', 'Speed Decay per Wave', 'Seconds subtracted from speed per wave', 0.05, 1],
    ['endless', 'max_concurrent', '12', 'number', 'Max Concurrent (endless)', null, 5, 30],
    ['endless', 'concurrent_per_wave', '1', 'number', 'Extra Concurrent per Wave', null, 0, 5],
    ['endless', 'boss_every_n', '5', 'number', 'Boss Every N Waves', 'Spawn a boss zombie every N endless waves', 1, 20],
    ['endless', 'hp_scaling', '1.15', 'number', 'HP Scaling Multiplier', 'Multiplicative HP increase per wave', 1.0, 2.0],
    ['endless', 'arc_bonus_per_wave', '0.25', 'number', 'ARC Bonus per Wave', 'Extra ARC earned per endless wave', 0, 5],

    // ── Spin Wheel ──
    ['spinwheel', 'cooldown_hours', '24', 'number', 'Cooldown (hours)', null, 1, 168],
    ['spinwheel', 'prize_arc_1', '1', 'number', 'ARC Prize Tier 1', null, 1, 100],
    ['spinwheel', 'prize_arc_2', '3', 'number', 'ARC Prize Tier 2', null, 1, 100],
    ['spinwheel', 'prize_arc_3', '5', 'number', 'ARC Prize Tier 3', null, 1, 100],
    ['spinwheel', 'prize_arc_4', '10', 'number', 'ARC Prize Tier 4 (Rare)', null, 1, 100],
    ['spinwheel', 'prize_arc_5', '25', 'number', 'ARC Prize Tier 5 (Jackpot)', null, 1, 500],
    ['spinwheel', 'weight_tier_1', '30', 'number', 'Weight Tier 1', 'Drop weight (higher = more common)', 1, 100],
    ['spinwheel', 'weight_tier_2', '25', 'number', 'Weight Tier 2', null, 1, 100],
    ['spinwheel', 'weight_tier_3', '15', 'number', 'Weight Tier 3', null, 1, 100],
    ['spinwheel', 'weight_tier_4', '8', 'number', 'Weight Tier 4', null, 1, 100],
    ['spinwheel', 'weight_tier_5', '3', 'number', 'Weight Tier 5', null, 1, 100],
  ];
  const insGcTx = db.transaction((items) => {
    for (const row of items) gcIns.run(...row);
  });
  insGcTx(gameConfigDefaults);

  // ════════════════════════════════════════════════════════════════
  // SEED: COSMETICS CATALOG (matches _COSMETICS array in main.js)
  // ════════════════════════════════════════════════════════════════
  const cosmIns = db.prepare('INSERT OR IGNORE INTO cosmetics_catalog (cosmetic_id, type, label, price, rarity) VALUES (?, ?, ?, ?, ?)');
  const cosmDefaults = [
    ['title_sniper',     'title',       'Sniper',           25,  'uncommon'],
    ['title_general',    'title',       'General',          50,  'rare'],
    ['title_legend',     'title',       'Legend',           100, 'legendary'],
    ['hud_gold',         'skin',        'Gold HUD',         40,  'rare'],
    ['hud_blue',         'skin',        'Blue HUD',         30,  'uncommon'],
    ['hud_red',          'skin',        'Red HUD',          30,  'uncommon'],
    ['badge_wolf',       'badge',       'Wolf Badge',       35,  'uncommon'],
    ['badge_eagle',      'badge',       'Eagle Badge',      35,  'uncommon'],
    ['badge_trident',    'badge',       'Trident Badge',    50,  'rare'],
    ['vfx_trail_fire',   'vfx',         'Fire Trail',       60,  'epic'],
    ['vfx_trail_gold',   'vfx',         'Gold Trail',       60,  'epic'],
    ['kill_msg_ua',      'kill_message','UA Kill Msg',      20,  'common'],
    ['kill_msg_boom',    'kill_message','BOOM Kill Msg',    20,  'common'],
    ['kill_msg_ork',     'kill_message','Ork Down Msg',     25,  'common'],
    ['xh_neon',          'crosshair',   'Neon Crosshair',   35,  'uncommon'],
    ['xh_laser',         'crosshair',   'Laser Crosshair',  35,  'uncommon'],
    ['xh_gold',          'crosshair',   'Gold Crosshair',   45,  'rare'],
    ['xh_cyber',         'crosshair',   'Cyber Crosshair',  40,  'uncommon'],
    ['xh_fire',          'crosshair',   'Fire Crosshair',   55,  'epic'],
    ['xh_ua',            'crosshair',   'UA Crosshair',     60,  'epic'],
    ['wskin_gold_ak',    'weapon_skin', 'Gold AK-47',       40,  'rare'],
    ['wskin_gold_m16',   'weapon_skin', 'Gold M-16',        40,  'rare'],
    ['wskin_gold_shot',  'weapon_skin', 'Gold Shotgun',     35,  'rare'],
    ['wskin_gold_lmg',   'weapon_skin', 'Gold LMG',         35,  'rare'],
    ['wskin_gold_revo',  'weapon_skin', 'Gold Revolver',    30,  'uncommon'],
    ['wskin_gold_gl',    'weapon_skin', 'Gold Launcher',    35,  'rare'],
    ['wskin_diamond_ak', 'weapon_skin', 'Diamond AK-47',    50,  'legendary'],
    ['wskin_inferno',    'weapon_skin', 'Inferno M-16',     30,  'uncommon'],
    ['boost_xp2x',      'consumable',  '2x ARC Boost',     15,  'common'],
  ];
  const insCosmTx = db.transaction((items) => {
    for (const row of items) cosmIns.run(...row);
  });
  insCosmTx(cosmDefaults);

  // ════════════════════════════════════════════════════════════════
  // ML TELEMETRY — raw game events from clients
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_telemetry (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      session_id  TEXT,
      event_type  TEXT    NOT NULL,
      event_data  TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mlt_player ON ml_telemetry(player_id);
    CREATE INDEX IF NOT EXISTS idx_mlt_type   ON ml_telemetry(event_type);
    CREATE INDEX IF NOT EXISTS idx_mlt_time   ON ml_telemetry(created_at);
  `);

  // ════════════════════════════════════════════════════════════════
  // ML ERROR LOGS — client-side JS errors
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_error_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      error_msg   TEXT    NOT NULL,
      error_stack TEXT,
      url         TEXT,
      user_agent  TEXT,
      context     TEXT,
      count       INTEGER DEFAULT 1,
      first_seen  TEXT    DEFAULT (datetime('now')),
      last_seen   TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mle_msg  ON ml_error_logs(error_msg);
    CREATE INDEX IF NOT EXISTS idx_mle_time ON ml_error_logs(last_seen);
  `);

  // ════════════════════════════════════════════════════════════════
  // ML ANOMALIES — detected anomalies (cheats, bugs, economy)
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_anomalies (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      severity    TEXT    DEFAULT 'medium',
      title       TEXT    NOT NULL,
      description TEXT,
      player_id   INTEGER REFERENCES players(id) ON DELETE SET NULL,
      metric_name TEXT,
      metric_value REAL,
      expected_value REAL,
      z_score     REAL,
      resolved    INTEGER DEFAULT 0,
      resolved_by INTEGER REFERENCES players(id),
      resolved_at TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mla_cat  ON ml_anomalies(category);
    CREATE INDEX IF NOT EXISTS idx_mla_sev  ON ml_anomalies(severity);
    CREATE INDEX IF NOT EXISTS idx_mla_res  ON ml_anomalies(resolved);
  `);

  // ════════════════════════════════════════════════════════════════
  // ML ECONOMY SNAPSHOTS — periodic economy health captures
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_economy_snapshots (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      total_arc       REAL    DEFAULT 0,
      arc_earned_24h  REAL    DEFAULT 0,
      arc_spent_24h   REAL    DEFAULT 0,
      arc_staked      REAL    DEFAULT 0,
      active_players  INTEGER DEFAULT 0,
      avg_session_s   REAL    DEFAULT 0,
      avg_wave        REAL    DEFAULT 0,
      total_sessions  INTEGER DEFAULT 0,
      inflation_rate  REAL    DEFAULT 0,
      velocity        REAL    DEFAULT 0,
      health_score    REAL    DEFAULT 0,
      snapshot_at     TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mles_time ON ml_economy_snapshots(snapshot_at);
  `);

  // ════════════════════════════════════════════════════════════════
  // ML PLAYER RISK — per-player risk/engagement/churn scores
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_player_risk (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      segment         TEXT    DEFAULT 'unknown',
      engagement_score REAL   DEFAULT 0,
      churn_risk      REAL    DEFAULT 0,
      cheat_score     REAL    DEFAULT 0,
      spend_score     REAL    DEFAULT 0,
      skill_level     TEXT    DEFAULT 'beginner',
      last_analyzed   TEXT    DEFAULT (datetime('now')),
      UNIQUE(player_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mlpr_seg ON ml_player_risk(segment);
  `);

  // ════════════════════════════════════════════════════════════════
  // ML TRAINING RUNS — log of analysis/training jobs
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_training_runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      model_name  TEXT    NOT NULL,
      status      TEXT    DEFAULT 'running',
      records_in  INTEGER DEFAULT 0,
      anomalies_found INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      details     TEXT,
      started_at  TEXT    DEFAULT (datetime('now')),
      finished_at TEXT
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // ML BALANCE SNAPSHOTS — weapon/feature usage analytics
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ml_balance_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_type TEXT    NOT NULL,
      metric_key  TEXT    NOT NULL,
      value       REAL    DEFAULT 0,
      sample_size INTEGER DEFAULT 0,
      snapshot_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mlbs_type ON ml_balance_snapshots(metric_type, snapshot_at);
  `);

  // ════════════════════════════════════════════════════════════════
  // AI PROMPT HISTORY — admin prompt-guided robot audit trail
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_prompt_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER REFERENCES players(id),
      prompt      TEXT    NOT NULL,
      intent      TEXT,
      changes     TEXT,
      status      TEXT    DEFAULT 'applied',
      created_at  TEXT    DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_aph_admin ON ai_prompt_history(admin_id);
  `);

  // ════════════════════════════════════════════════════════════════
  // ADMIN BROADCASTS — announcements sent to players
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_broadcasts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER REFERENCES players(id),
      message     TEXT    NOT NULL,
      type        TEXT    DEFAULT 'info',
      active      INTEGER DEFAULT 1,
      expires_at  TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // CONTRACT DEPLOYMENTS — on-chain deployment records
  // ════════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_deployments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_name    TEXT    NOT NULL,
      network          TEXT    NOT NULL,
      chain_id         INTEGER NOT NULL,
      address          TEXT    NOT NULL,
      deployer         TEXT    NOT NULL,
      tx_hash          TEXT    NOT NULL,
      block_number     INTEGER,
      constructor_args TEXT,
      status           TEXT    DEFAULT 'deployed',
      deployed_at      TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ════════════════════════════════════════════════════════════════
  // ADMIN BOOTSTRAP — create first admin from env vars if none exist
  // ════════════════════════════════════════════════════════════════
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  if (adminUser && adminPass) {
    const existingAdmin = db.prepare('SELECT id FROM players WHERE is_admin = 1').get();
    if (!existingAdmin) {
      const existing = db.prepare('SELECT id, is_admin FROM players WHERE username = ?').get(adminUser);
      if (existing) {
        // User exists but is not admin — promote
        if (!existing.is_admin) {
          db.prepare('UPDATE players SET is_admin = 1 WHERE id = ?').run(existing.id);
          console.log('🔑 Promoted existing user "' + adminUser + '" to admin');
        }
      } else {
        // Create new admin account
        const anonId = uuidv4();
        const refCode = anonId.slice(0, 8).toUpperCase();
        const hash = bcrypt.hashSync(adminPass, 10);
        db.prepare(
          `INSERT INTO players (anon_id, username, password_hash, ref_code, is_admin)
           VALUES (?, ?, ?, ?, 1)`
        ).run(anonId, adminUser.trim(), hash, refCode);
        const player = db.prepare('SELECT id FROM players WHERE anon_id = ?').get(anonId);
        if (player) {
          db.prepare('INSERT INTO player_stats (player_id) VALUES (?)').run(player.id);
        }
        console.log('🔑 Default admin account "' + adminUser + '" created');
      }
    }
  }

  db.close();
  console.log('✅ Database initialized at', DB_PATH);
  return DB_PATH;
}

module.exports = { initDB, DB_PATH };
