'use strict';
/**
 * launcher.cjs — Shrink Ray standalone desktop launcher
 *
 * This file is compiled by @yao-pkg/pkg into a self-contained Windows .exe.
 * It embeds all static assets (HTML, JS, WASM, CSS) in the binary's snapshot
 * and serves them over a local HTTP server, then opens the user's default browser.
 *
 * For day-to-day development, use `npm run serve` (server.cjs) instead.
 * This file is only the entry point for the packaged .exe.
 */

const http          = require('http');
const fs            = require('fs');
const path          = require('path');
const os            = require('os');
const { exec }      = require('child_process');

// ── Preset storage ────────────────────────────────────────────────────────────
const PRESET_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'ShrinkRay', 'presets')
  : path.join(os.homedir(), '.config', 'ShrinkRay', 'presets');

try { fs.mkdirSync(PRESET_DIR, { recursive: true }); } catch (e) {
  console.warn('  [presets] Could not create preset directory at startup:', e.message);
}
console.log('  [presets] Storage directory:', PRESET_DIR);

function sanitizePresetName(name) {
  return String(name || '').replace(/[^a-zA-Z0-9 _\-]/g, '').trim().slice(0, 64);
}

function handleGetPresets(res) {
  try {
    fs.mkdirSync(PRESET_DIR, { recursive: true });
    const files = fs.readdirSync(PRESET_DIR).filter(f => f.endsWith('.json'));
    const presets = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(PRESET_DIR, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(presets));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

function handleSavePreset(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const name = sanitizePresetName(data.name);
      if (!name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid preset name — use letters, numbers, spaces, hyphens, or underscores' }));
        return;
      }
      fs.mkdirSync(PRESET_DIR, { recursive: true });
      const filePath = path.join(PRESET_DIR, name + '.json');
      fs.writeFileSync(filePath, JSON.stringify({ ...data.settings, name }, null, 2), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, name }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
}

function handleDeletePreset(name, res) {
  try {
    const safe = sanitizePresetName(name);
    const filePath = path.join(PRESET_DIR, safe + '.json');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}

// ── Asset root ───────────────────────────────────────────────────────────────
// In the pkg snapshot __dirname resolves to the virtual snapshot root,
// where all declared assets live. At development time it is simply the
// project directory — so `node launcher.cjs` also works for testing.
const ROOT = __dirname;

// ── Diagnostics ──────────────────────────────────────────────────────────────
// Print path info on startup so cross-compilation issues are immediately visible.
function printDiagnostics() {
  console.log('  [diag] process.pkg    :', !!process.pkg);
  console.log('  [diag] __dirname      :', __dirname);
  console.log('  [diag] process.execPath:', process.execPath);
  const testPath = path.join(ROOT, 'index.html');
  console.log('  [diag] index.html path:', testPath);
  try {
    const exists = fs.existsSync(testPath);
    console.log('  [diag] index.html found:', exists);
  } catch (e) {
    console.log('  [diag] index.html check error:', e.message);
  }
  try {
    const entries = fs.readdirSync(ROOT);
    console.log('  [diag] snapshot root contents:', entries.slice(0, 10).join(', '));
  } catch (e) {
    console.log('  [diag] readdirSync error:', e.message);
  }
  console.log('');
}

// ── Version (read from embedded version.json) ────────────────────────────────
let APP_VERSION = '4.2.0';
try {
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'version.json'), 'utf8'));
  APP_VERSION = vj?.app?.version ?? APP_VERSION;
} catch (_) { /* use default */ }

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.cjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.gif':  'image/gif',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.map':  'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

// ── Request handler ──────────────────────────────────────────────────────────
function createHandler() {
  // Normalise ROOT to forward slashes for safe prefix comparisons — the pkg
  // snapshot path may use forward slashes even in a Windows binary compiled
  // via cross-compilation from Linux, so we compare in a canonical form.
  const rootNorm  = ROOT.replace(/\\/g, '/');
  const rootPrefix = rootNorm.endsWith('/') ? rootNorm : rootNorm + '/';

  return (req, res) => {
    // COOP + COEP are required for SharedArrayBuffer, which multi-threaded
    // FFmpeg WASM depends on. Every response must carry these headers.
    res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy',  'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy',  'same-origin');

    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    // ── Preset API routes ────────────────────────────────────────────────────
    if (urlPath === '/api/presets' && req.method === 'GET')  { handleGetPresets(res); return; }
    if (urlPath === '/api/presets' && req.method === 'POST') { handleSavePreset(req, res); return; }
    if (urlPath.startsWith('/api/presets/') && req.method === 'DELETE') {
      handleDeletePreset(decodeURIComponent(urlPath.slice('/api/presets/'.length)), res);
      return;
    }

    let   relPath = urlPath.replace(/^\/+/, '');
    if (!relPath) relPath = 'index.html';
    if (urlPath === '/favicon.ico') relPath = 'icons/favicon.ico';

    // Strip any Windows backslashes that might have crept into the URL,
    // then join with forward slash (safe for both pkg snapshot and native fs).
    const safeRel  = relPath.replace(/\\/g, '/');
    const filePath = path.join(ROOT, safeRel);   // native path for fs.readFile
    const fileNorm = filePath.replace(/\\/g, '/'); // normalised for prefix check

    // Path traversal guard — never serve outside ROOT
    if (!fileNorm.startsWith(rootPrefix)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Log 404s so the console shows which path failed — helps debug snapshot issues.
        console.warn(`  [404] ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end(data);
    });
  };
}

// ── Browser launcher ─────────────────────────────────────────────────────────
function openBrowser(url) {
  let cmd;
  switch (process.platform) {
    case 'win32':  cmd = `start "" "${url}"`; break;
    case 'darwin': cmd = `open "${url}"`;     break;
    default:       cmd = `xdg-open "${url}"`; break;
  }
  exec(cmd, (err) => {
    if (err) console.warn('  [warn] Could not open browser automatically.');
    console.log('  If the browser did not open, navigate to: ' + url);
    console.log('');
  });
}

// ── Server startup with port fallback ────────────────────────────────────────
// Tries PREFERRED_PORT first. If it is taken, asks the OS for any free port.
const PREFERRED_PORT = Number(process.env.PORT) || 3000;

function startServer(port, isFallback) {
  const server = http.createServer(createHandler());

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && !isFallback) {
      startServer(0, true); // ask OS for a free port
    } else {
      console.error('\n  [error] Could not start server:', err.message);
      process.exit(1);
    }
  });

  // Bind to loopback only — the app is never reachable from other machines.
  server.listen(port, '127.0.0.1', () => {
    const addr       = server.address();
    const actualPort = typeof addr === 'object' && addr ? addr.port : port;
    const url        = `http://localhost:${actualPort}`;

    if (isFallback) {
      console.log(`  Port ${PREFERRED_PORT} is in use — using port ${actualPort} instead.`);
    }
    console.log(`  Ready at ${url}`);
    console.log('');
    console.log('  Opening your browser…');
    console.log('  Close this window at any time to stop Shrink Ray.');
    console.log('');

    openBrowser(url);
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────
console.log('');
console.log('  ╔══════════════════════════════╗');
console.log(`  ║   Shrink Ray  v${APP_VERSION}        ║`);
console.log('  ║   Local image converter      ║');
console.log('  ╚══════════════════════════════╝');
console.log('');
console.log('  Starting local server…');
printDiagnostics();

startServer(PREFERRED_PORT, false);
