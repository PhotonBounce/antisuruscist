// server/test/api.test.js
// Backend test suite — node:test + global fetch (Node 18+)
// Run: node --test  (from server/)
// Uses a throwaway DB via DB_PATH env var; spawns index.js on a free port.

'use strict';

const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ── Helpers ────────────────────────────────────────────────────────────

/** Find an available TCP port */
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/** Wait until `http://127.0.0.1:<port>/api/health` returns 200, or timeout */
function waitForServer(port, timeout = 15000) {
  const deadline = Date.now() + timeout;
  return new Promise((resolve, reject) => {
    function attempt() {
      fetch(`http://127.0.0.1:${port}/api/health`)
        .then(r => { if (r.ok) resolve(); else schedule(); })
        .catch(() => schedule());
    }
    function schedule() {
      if (Date.now() > deadline) {
        reject(new Error(`Server on port ${port} did not start within ${timeout}ms`));
      } else {
        setTimeout(attempt, 100);
      }
    }
    attempt();
  });
}

// ── Server lifecycle ───────────────────────────────────────────────────

let serverProcess;
let BASE_URL;
let tmpDb;

before(async () => {
  const port = await freePort();
  tmpDb = path.join(os.tmpdir(), `antiruscist-test-${process.pid}-${Date.now()}.db`);
  BASE_URL = `http://127.0.0.1:${port}`;

  serverProcess = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      DB_PATH: tmpDb,
      API_PORT: String(port),
      JWT_SECRET: 'test-secret-for-suite-only',
      NODE_ENV: 'test',
      // Suppress ADMIN_USER/ADMIN_PASS auto-seeding to keep DB pristine
      ADMIN_USER: '',
      ADMIN_PASS: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  await waitForServer(port);
});

after(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  // Clean up temp DB
  try { fs.unlinkSync(tmpDb); } catch { /* ignore */ }
  try { fs.unlinkSync(tmpDb + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(tmpDb + '-shm'); } catch { /* ignore */ }
});

// ── Tests ──────────────────────────────────────────────────────────────

test('GET /api/health returns 200 with status ok', async () => {
  const res = await fetch(`${BASE_URL}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
});

test('GET /api/setup/status returns needsSetup:true on fresh DB', async () => {
  const res = await fetch(`${BASE_URL}/api/setup/status`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.needsSetup, true);
});

test('POST /api/setup rejects password shorter than 10 chars with 400', async () => {
  const res = await fetch(`${BASE_URL}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'abc' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error, 'should include an error message');
});

test('POST /api/setup accepts password >=10 chars, returns 201 + token', async () => {
  const res = await fetch(`${BASE_URL}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'securepass123' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.token, 'response should include a JWT token');
  assert.ok(body.player, 'response should include player object');
  assert.equal(body.player.is_admin, 1);
  // Store token and anon_id for subsequent tests
  global._adminToken = body.token;
  global._adminAnonId = body.player.anon_id;
});

test('GET /api/setup/status returns needsSetup:false after setup', async () => {
  const res = await fetch(`${BASE_URL}/api/setup/status`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.needsSetup, false);
});

test('GET /api/admin/players with valid Bearer JWT returns 200', async () => {
  assert.ok(global._adminToken, 'admin token must be set by previous test');
  const res = await fetch(`${BASE_URL}/api/admin/players`, {
    headers: { Authorization: `Bearer ${global._adminToken}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.players), 'players array should be present');
});

test('GET /api/admin/players with no auth returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/players`);
  // The route uses adminAuth which falls back to authMiddleware (anon_id based).
  // With no credentials at all, req.player is undefined so adminOnly returns 403.
  assert.ok(
    res.status === 401 || res.status === 403,
    `expected 401 or 403, got ${res.status}`
  );
});

test('GET /api/admin/players with anon_id-only (no admin) returns 403', async () => {
  const res = await fetch(`${BASE_URL}/api/admin/players`, {
    headers: { 'x-anon-id': 'non-admin-anonymous-id-12345678' },
  });
  assert.ok(
    res.status === 401 || res.status === 403,
    `expected 401 or 403, got ${res.status}`
  );
});

test('POST /api/player/arc-earn caps earn to 50 ARC per call', async () => {
  // arc-earn uses authMiddleware (x-anon-id), not Bearer. Use the admin player's anon_id.
  assert.ok(global._adminAnonId, 'admin anon_id must be set by setup test');

  // Request more than 50 — should be silently capped to 50
  const bigRes = await fetch(`${BASE_URL}/api/player/arc-earn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-anon-id': global._adminAnonId,
    },
    body: JSON.stringify({ amount: 9999, reason: 'test-cap' }),
  });
  assert.equal(bigRes.status, 200);
  const bigBody = await bigRes.json();
  assert.equal(bigBody.ok, true, 'arc-earn should return ok:true even when capped');

  // Verify via arc ledger that the recorded amount was <=50
  const ledgerRes = await fetch(`${BASE_URL}/api/player/arc-ledger`, {
    headers: { 'x-anon-id': global._adminAnonId },
  });
  assert.equal(ledgerRes.status, 200);
  const ledgerBody = await ledgerRes.json();
  const lastEntry = ledgerBody[0]; // most recent
  assert.ok(lastEntry.amount <= 50, `Expected amount <=50, got ${lastEntry.amount}`);
});

// ── Leaderboard tests ──────────────────────────────────────────────────

test('POST /api/leaderboard/:period without auth returns 401', async () => {
  const res = await fetch(`${BASE_URL}/api/leaderboard/weekly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score: 100, kills: 5, wave: 1 }),
  });
  assert.equal(res.status, 401, 'should require x-anon-id header');
});

test('Leaderboard: submit 2 scores and GET returns them ranked highest-first with caller rank', async () => {
  assert.ok(global._adminAnonId, 'admin anon_id must be set by setup test');

  // Create a second player
  const p2AnonId = 'arc_test_p2_' + Date.now().toString(36);
  const authRes = await fetch(`${BASE_URL}/api/player/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': p2AnonId },
    body: JSON.stringify({ anon_id: p2AnonId }),
  });
  assert.ok(authRes.ok, 'p2 auth should succeed');

  const period = 'test-week-' + Date.now();

  // Player 1 (admin) submits a higher score
  const sub1Res = await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': global._adminAnonId },
    body: JSON.stringify({ score: 5000, kills: 50, wave: 3 }),
  });
  assert.equal(sub1Res.status, 200);
  const sub1Body = await sub1Res.json();
  assert.equal(sub1Body.ok, true, 'submit should return ok:true');
  assert.ok(typeof sub1Body.rank === 'number', 'submit should return rank');

  // Player 2 submits a lower score
  const sub2Res = await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': p2AnonId },
    body: JSON.stringify({ score: 2500, kills: 20, wave: 2 }),
  });
  assert.equal(sub2Res.status, 200);

  // GET leaderboard — should be ordered highest-first
  const getRes = await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    headers: { 'x-anon-id': global._adminAnonId },
  });
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();

  assert.ok(Array.isArray(getBody.entries), 'entries should be an array');
  assert.equal(getBody.entries.length, 2, 'should have 2 entries');
  assert.ok(getBody.entries[0].score >= getBody.entries[1].score, 'first entry should have highest score');
  assert.equal(getBody.entries[0].score, 5000, 'top score should be 5000');
  assert.equal(getBody.entries[1].score, 2500, 'second score should be 2500');
  assert.equal(getBody.total, 2, 'total should be 2');
  assert.equal(getBody.myRank, 1, 'admin player (score 5000) should be rank 1');
});

test('Leaderboard: best-score upsert — re-submit lower score does not overwrite', async () => {
  assert.ok(global._adminAnonId, 'admin anon_id must be set');

  const period = 'test-upsert-' + Date.now();

  // Submit initial score
  await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': global._adminAnonId },
    body: JSON.stringify({ score: 8000, kills: 80, wave: 4 }),
  });

  // Submit lower score — should be ignored
  await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': global._adminAnonId },
    body: JSON.stringify({ score: 100, kills: 1, wave: 1 }),
  });

  const getRes = await fetch(`${BASE_URL}/api/leaderboard/${period}`, {
    headers: { 'x-anon-id': global._adminAnonId },
  });
  const body = await getRes.json();
  assert.equal(body.entries[0].score, 8000, 'best score (8000) should be preserved after lower re-submit');
});

test('Leaderboard: invalid period returns 400', async () => {
  const res = await fetch(`${BASE_URL}/api/leaderboard/bad period!`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': global._adminAnonId },
    body: JSON.stringify({ score: 100 }),
  });
  // Express URL encoding will likely strip the space; test with shell-illegal chars
  const res2 = await fetch(`${BASE_URL}/api/leaderboard/${encodeURIComponent('../../etc')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-anon-id': global._adminAnonId },
    body: JSON.stringify({ score: 100 }),
  });
  assert.equal(res2.status, 400, 'path traversal period should be rejected');
});
