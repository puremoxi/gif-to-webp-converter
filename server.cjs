const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
try { require('./validateManifest.cjs').validate(); } catch (e) { console.warn('[manifest] validator failed:', e && e.message); }
http.createServer((req, res) => {
  let filePath = path.join(root, req.url.split('?')[0]);
  if (req.url === '/' || !path.extname(filePath)) filePath = path.join(root, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.html':'text/html', '.js':'application/javascript', '.wasm':'application/wasm', '.css':'text/css' };
    res.setHeader('Content-Type', map[ext] || 'application/octet-stream');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'wasm-unsafe-eval'; " +
      "style-src 'self'; " +
      "img-src 'self' blob: data:; " +
      "connect-src 'self'; " +
      "worker-src 'self' blob:; " +
      "media-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    );
    res.end(data);
  });
}).listen(3000, () => console.log('COOP/COEP server on http://localhost:3000'));
