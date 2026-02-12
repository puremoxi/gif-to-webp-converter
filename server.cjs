// server.cjs
const http = require('http');
const fs = require('fs');
const path = require('path');

(async () => {
  // ----- OPTIONAL VALIDATION (opt-in only) -----
  const shouldValidate =
    process.env.RUN_VALIDATE === '1' ||
    process.argv.includes('--validate');

  if (shouldValidate) {
    try {
      const { validate } = require('./validateManifest.cjs');
      await validate();
    } catch (e) {
      console.error('[server] validation failed', e);
      process.exit(1);
    }
  }

  // ----- Basic static server (localhost:3000) -----
  const ROOT = process.cwd();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Simple mime map
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',
    '.mjs':  'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.gif':  'image/gif',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.map':  'application/json; charset=utf-8',
  };

  const server = http.createServer((req, res) => {
    // Basic security headers (COOP/COEP for multi-threaded WASM)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Resolve path
    let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (req.url === '/' || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
      res.end(data);
    });
  });

  server.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
})();
