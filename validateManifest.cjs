
// Combined validator: version.json + vendor/ffmpeg integrity checks

const fs = require('fs');
const path = require('path');

const VENDOR_FFMPEG_DIR = path.resolve('./vendor/ffmpeg');
const VENDOR_JSZIP_DIR  = path.resolve('./vendor/jszip');

const REQUIRED_FFMPEG = [
  'ffmpeg.js',
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-core.worker.js',
];

function logOK(msg){ console.log(`\x1b[32m[ok]\x1b[0m ${msg}`); }
function logWARN(msg){ console.warn(`\x1b[33m[warn]\x1b[0m ${msg}`); }
function logERR(msg){ console.error(`\x1b[31m[err]\x1b[0m ${msg}`); }

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    logERR(`[validate] version.json parse error: ${e.message}`);
    return null;
  }
}

function exists(file) { try { return fs.statSync(file).isFile(); } catch { return false; } }
function existsDir(dir) { try { return fs.statSync(dir).isDirectory(); } catch { return false; } }

function headBytes(file, n = 4) {
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, 0);
  fs.closeSync(fd);
  return buf;
}

// --- Heuristics for vendor/ffmpeg integrity ---
function checkFFmpegFiles() {
  let fatal = false;

  if (!existsDir(VENDOR_FFMPEG_DIR)) {
    logERR(`[vendor] Missing folder: ${VENDOR_FFMPEG_DIR}`);
    return { fatal: true };
  }

  // Presence check
  const notFound = REQUIRED_FFMPEG.filter(f => !exists(path.join(VENDOR_FFMPEG_DIR, f)));
  if (notFound.length) {
    logERR(`[vendor] Missing required files in vendor/ffmpeg: ${notFound.join(', ')}`);
    fatal = true;
  } else {
    logOK(`[vendor] Found required FFmpeg files: ${REQUIRED_FFMPEG.join(', ')}`);
  }

  // Quick integrity checks (heuristics, version-agnostic)
  for (const f of REQUIRED_FFMPEG) {
    const p = path.join(VENDOR_FFMPEG_DIR, f);
    if (!exists(p)) continue;

    const stat = fs.statSync(p);
    const MIN = {
      'ffmpeg.js': 50 * 1024,
      'ffmpeg-core.js': 50 * 1024,
      'ffmpeg-core.worker.js': 1 * 1024,
      'ffmpeg-core.wasm': 10 * 1024 * 1024
    };
    const min = MIN[f] || 1024;
    if (stat.size < min) {
      logWARN(`[vendor] ${f} seems too small (${stat.size} bytes < ${min}). It may be an HTML error page or wrong file.`);
    } else {
      logOK(`[vendor] ${f} size OK (${stat.size} bytes)`);
    }

    if (f === 'ffmpeg-core.wasm') {
      const magic = headBytes(p, 4);
      const isWasm = magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6D;
      if (!isWasm) {
        logERR(`[vendor] ${f} is not a valid WASM (magic bytes mismatch).`);
        fatal = true;
      } else {
        logOK(`[vendor] ${f} has valid WASM magic.`);
      }
    } else if (f.endsWith('.js')) {
      const head = headBytes(p, 16).toString('utf8').toLowerCase();
      if (head.includes('<!doctype') || head.includes('<html')) {
        logERR(`[vendor] ${f} looks like an HTML file (likely downloaded wrong).`);
        fatal = true;
      } else {
        // Plausibility only; contents vary by version
        logOK(`[vendor] ${f} content looks plausible.`);
      }
    }
  }

  const chunks = fs.readdirSync(VENDOR_FFMPEG_DIR).filter(n => /\.ffmpeg\.js$/i.test(n));
  if (chunks.length) logOK(`[vendor] Detected loader chunk(s): ${chunks.join(', ')}`);
  else console.log(`[info] No loader chunks (*.ffmpeg.js) detected. This is fine for some versions.`);

  return { fatal };
}

function checkJSZipFolder() {
  if (!existsDir(VENDOR_JSZIP_DIR)) {
    logWARN(`[vendor] Missing folder: ${VENDOR_JSZIP_DIR}. The app will still run, but ZIP export will alert until jszip.min.js is added.`);
  } else {
    const file = path.join(VENDOR_JSZIP_DIR, 'jszip.min.js');
    if (!exists(file)) {
      logWARN(`[vendor] JSZip not found (vendor/jszip/jszip.min.js). ZIP export will fall back or alert.`);
    } else {
      logOK(`[vendor] Found JSZip (vendor/jszip/jszip.min.js).`);
    }
  }
}

// --- version.json checks ---
function checkManifest() {
  const v = readJSON('./version.json');
  if (!v) return { fatal: true };

  const missing = [];
  if (!v.app?.version) missing.push('app.version');
  if (!v.vendor?.ffmpeg?.files?.length) missing.push('vendor.ffmpeg.files');
  if (!v.vendor?.jszip?.files?.length) missing.push('vendor.jszip.files');

  if (missing.length) {
    logERR(`[validate] Missing fields: ${missing.join(', ')}`);
    return { fatal: true };
  }
  logOK('[validate] version.json OK');
  return { fatal: false };
}

// ---- run all checks ----
let fatal = false;
fatal ||= checkManifest().fatal;
fatal ||= checkFFmpegFiles().fatal;
checkJSZipFolder();

if (fatal) {
  process.exitCode = 1;
  logERR('Validation failed. See messages above.');
} else {
  logOK('Validation complete.');
}
