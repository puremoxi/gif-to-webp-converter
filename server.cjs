const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;

try { require('./validateManifest.cjs').validate(); }
catch (e) { console.warn('[manifest] validator warning:', e && e.message); }

http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(root, reqPath);
  if (reqPath === '/' || !path.extname(filePath)) filePath = path.join(root, 'index.html');

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }

    const ext = path.extname(filePath).toLowerCase();
    const mime =
      {
        '.html': 'text/html; charset=utf-8',
        '.js':   'application/javascript; charset=utf-8',
        '.mjs':  'application/javascript; charset=utf-8',
        '.css':  'text/css; charset=utf-8',
        '.wasm': 'application/wasm',
        '.json': 'application/json; charset=utf-8',
        '.ico':  'image/x-icon',
        '.png':  'image/png',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self'",",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
      ].join('; ')
    );

    if (ext === '.wasm' || ext === '.js') {
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    }

    res.end(data);
  });
}).listen(3000, () => {
  console.log('COOP/COEP server running at http://localhost:3000');
});
