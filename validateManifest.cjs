const fs=require('fs'),p=require('path');function ok(m){console.log('[ok]',m)}function warn(m){console.warn('[warn]',m)}function err(m){console.error('[err]',m)}
const root=__dirname;
try{const v=JSON.parse(fs.readFileSync(p.join(root,'version.json'),'utf8'));v&&v.version?ok('[validate] version.json OK'):warn('[validate] version.json missing version')}catch(e){err('[validate] version.json read/parse failed: '+e.message)}
const vend=x=>p.join(root,'vendor','ffmpeg',x);
const req=['ffmpeg.min.js','ffmpeg-core.js','ffmpeg-core.wasm','ffmpeg-core.worker.js'];
for(const f of req){const full=vend(f); if(!fs.existsSync(full)) err('[vendor] missing '+f); else ok('[vendor] '+f+' present');}
const wasm=vend('ffmpeg-core.wasm'); if(fs.existsSync(wasm)){const fd=fs.openSync(wasm,'r');const b=Buffer.alloc(4);fs.read(fd,b,0,4,0);fs.closeSync(fd); if(b[0]===0x00&&b[1]===0x61&&b[2]===0x73&&b[3]===0x6d) ok('[vendor] ffmpeg-core.wasm has valid WASM magic'); else err('[vendor] ffmpeg-core.wasm magic invalid');}
const jszip=p.join(root,'vendor','jszip','jszip.min.js'); fs.existsSync(jszip)?ok('Found JSZip (vendor/jszip/jszip.min.js)'):warn('JSZip not found. ZIP downloads disabled until added.');
