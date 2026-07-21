/**
 * Codespace Heartbeat Server — port 9999
 * Any HTTP request to this port counts as codespace activity.
 * 
 * Also runs self-ping loop + file-touch loop internally.
 * Start: node scripts/heartbeat.js &
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9999;
const KEEP_FILE = path.join(__dirname, '..', '.keep-alive');
const EVIDENCE_FILE = path.join(__dirname, '..', '.heartbeat-evidence.log');
const SELF_PING_INTERVAL = 4 * 60 * 1000; // 4 min
const FILE_TOUCH_INTERVAL = 3 * 60 * 1000; // 3 min

let pingCount = 0;
const startTime = Date.now();

function logEvidence(source) {
  const line = `${new Date().toISOString()} source=${source} pings=${pingCount}\n`;
  fs.appendFile(EVIDENCE_FILE, line, () => {});
}

// HTTP server — external pings land here
const server = http.createServer((req, res) => {
  pingCount++;
  const uptime = Math.round((Date.now() - startTime) / 60000);
  
  // Touch file on every request (activity signal) — async to avoid blocking
  fs.writeFile(KEEP_FILE, `alive:${Date.now()}\n`, () => {});
  logEvidence('http');
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'alive',
    uptimeMinutes: uptime,
    totalPings: pingCount,
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`[heartbeat] Listening on :${PORT} — ping this URL to keep codespace alive`);
});

// Internal file-touch loop (backup keep-alive)
setInterval(() => {
  fs.writeFile(KEEP_FILE, `internal:${Date.now()}\n`, () => {});
  logEvidence('internal-touch');
}, FILE_TOUCH_INTERVAL);

// Self-ping loop — the server pings itself to generate network activity
setInterval(() => {
  http.get(`http://localhost:${PORT}/self-ping`, () => {}).on('error', () => {});
}, SELF_PING_INTERVAL);

// Also write to a temp file to trigger filesystem watcher events
const VSCODE_DIR = path.join(__dirname, '..', '.vscode');
fs.mkdirSync(VSCODE_DIR, { recursive: true });
setInterval(() => {
  const tmpPath = path.join(VSCODE_DIR, '.heartbeat');
  fs.writeFile(tmpPath, String(Date.now()), () => {});
  logEvidence('vscode-watcher');
}, 2 * 60 * 1000); // every 2 min

console.log('[heartbeat] Self-ping every 4min, file-touch every 3min, VS Code watcher every 2min');
