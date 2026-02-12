// server.cjs
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

  const sslKeyPath = process.env.SSL_KEY || '';
  const sslCertPath = process.env.SSL_CERT || '';
  const useHttps = Boolean(sslKeyPath && sslCertPath);

  const requestHandler = (req, res) => {
    // Basic security headers (COOP/COEP for multi-threaded WASM)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Resolve path (strip leading slash so we don't escape ROOT)
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let relPath = urlPath.replace(/^\/+/, '');
    if (relPath === '') relPath = 'index.html';
    if (urlPath === '/favicon.ico') relPath = 'icons/favicon.ico';

    const normalized = path.normalize(relPath);
    const rootWithSep = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
    let filePath = path.join(ROOT, normalized);
    if (!filePath.startsWith(rootWithSep)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
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
  };

  const server = useHttps
    ? https.createServer(
        {
          key: fs.readFileSync(sslKeyPath),
          cert: fs.readFileSync(sslCertPath),
        },
        requestHandler
      )
    : http.createServer(requestHandler);

  const getNetworkAddress = () => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net && net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return null;
  };

  const printBanner = (port, usedFallback) => {
    const scheme = useHttps ? 'https' : 'http';
    const local = `${scheme}://localhost:${port}`;
    const ip = getNetworkAddress();
    const network = ip ? `${scheme}://${ip}:${port}` : '(not available)';
    console.log('Serving!');
    console.log(`- Local:   ${local}`);
    console.log(`- Network: ${network}`);
    if (usedFallback) {
      console.log(`This port was picked because ${PORT} is in use.`);
    }
  };

  const startServer = (port, usedFallback) => {
    const onError = (err) => {
      if (err && err.code === 'EADDRINUSE' && !usedFallback) {
        startServer(0, true);
        return;
      }
      console.error('[server] failed to start', err);
      process.exit(1);
    };

    server.once('error', onError);
    server.listen(port, () => {
      server.off('error', onError);
      const addr = server.address();
      const actualPort = addr && typeof addr === 'object' ? addr.port : port;
      printBanner(actualPort, usedFallback);
    });
  };

  startServer(PORT, false);
})();
