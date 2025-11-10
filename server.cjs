const http=require('http');const fs=require('fs');const path=require('path');
const root=__dirname;
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.webp':'image/webp'};
const csp=[
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "script-src-elem 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "style-src-elem 'self'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'"
].join('; ');
function fileFor(u){const clean=u.split('?')[0].split('#')[0];let p=path.normalize(path.join(root,clean));if(!p.startsWith(root))return null;const ext=path.extname(p);if(clean==='/'||!ext)p=path.join(root,'index.html');return p}
http.createServer((req,res)=>{const target=fileFor(req.url);if(!target){res.writeHead(400,{'Content-Type':'text/plain'});res.end('Bad request');return}
fs.readFile(target,(e,d)=>{if(e){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return}
const ext=path.extname(target).toLowerCase();res.setHeader('Content-Type',MIME[ext]||'application/octet-stream');
res.setHeader('Cache-Control','no-store');
res.setHeader('Cross-Origin-Opener-Policy','same-origin');
res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
res.setHeader('Cross-Origin-Resource-Policy','same-origin');
res.setHeader('Content-Security-Policy',csp);
res.end(d)})}).listen(3000,()=>console.log('COOP/COEP server on http://localhost:3000'));