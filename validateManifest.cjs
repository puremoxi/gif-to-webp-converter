// validateManifest.cjs
// ENV:
//   STRICT=1   -> treat WARN as FAIL (exit 1 on WARN)
//   NO_HISTO=1 -> suppress histograms
//   QUIET=1    -> minimal output (only WARN/FAIL + summary; no OK; no histograms)

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const STRICT = process.env.STRICT === '1';
const QUIET = process.env.QUIET === '1';

// In quiet mode, we suppress histograms regardless of NO_HISTO
const SHOW_HISTO = QUIET ? false : (process.env.NO_HISTO === '1' ? false : true);

const KB = (n) => n * 1024;
const MB = (n) => n * 1024 * 1024;

/* ----- logging helpers ----- */
function logDetail(...args) { if (!QUIET) console.log(...args); }
function logSummary(...args) { console.log(...args); }
function logVendor(status, msg) {
  // In QUIET: print WARN/FAIL only. In verbose: print everything.
  if (QUIET) {
    if (status === 'WARN' || status === 'FAIL' || status === 'INFO') {
      // INFO lines can be noisy; include only on directory missing/found?
      // We'll suppress INFO in quiet to keep it clean.
      if (status === 'INFO') return;
      console.log(`[vendor] ${status.padEnd(5, ' ')} ${msg}`);
    }
  } else {
    console.log(`[vendor] ${status.padEnd(5, ' ')} ${msg}`);
  }
}

/* ----- manifest header ----- */
async function readVersion() {
  try {
    const raw = await fsp.readFile(path.join(ROOT, 'version.json'), 'utf8');
    const json = JSON.parse(raw);
    return { ok: true, version: json?.app?.version || json?.version || 'unknown', schema: json?.schema || 'unknown' };
  } catch {
    return { ok: false, version: 'unknown', schema: 'unknown' };
  }
}

/* ----- utils ----- */
async function exists(p) { try { await fsp.access(p, fs.constants.F_OK); return true; } catch { return false; } }
async function statSize(p) { return (await fsp.stat(p)).size; }
async function readFirstBytes(p, n = 512) {
  const fd = await fsp.open(p, 'r');
  try {
    const buf = Buffer.alloc(n);
    const { bytesRead } = await fd.read(buf, 0, n, 0);
    return buf.slice(0, bytesRead).toString('utf8');
  } finally { await fd.close(); }
}
function isLikelyHTML(s) {
  if (!s) return false;
  const head = s.slice(0, 512).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html') || head.includes('<head>') || head.includes('<title>');
}
async function listDir(p) { try { return await fsp.readdir(p); } catch { return []; } }
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

/* ----- histograms ----- */
const BUCKETS = [
  { label: '<10KB',     min: 0,        max: KB(10) },
  { label: '10–50KB',   min: KB(10),   max: KB(50) },
  { label: '50–200KB',  min: KB(50),   max: KB(200) },
  { label: '200KB–1MB', min: KB(200),  max: MB(1) },
  { label: '1–4MB',     min: MB(1),    max: MB(4) },
  { label: '>4MB',      min: MB(4),    max: Infinity },
];
function bucketSizes(sizes) {
  const counts = BUCKETS.map(() => 0);
  for (const sz of sizes) {
    const i = BUCKETS.findIndex(b => sz >= b.min && sz < b.max);
    if (i >= 0) counts[i] += 1;
  }
  return counts;
}
function renderHistogram(title, sizes) {
  if (!SHOW_HISTO) return;
  const counts = bucketSizes(sizes);
  const max = Math.max(1, ...counts);
  const bar = (n) => '█'.repeat(Math.round((n / max) * 24));
  logDetail(`[vendor] ${title}: size histogram`);
  BUCKETS.forEach((b, i) => {
    const c = counts[i];
    const pct = sizes.length ? String(Math.round((c / sizes.length) * 100)).padStart(3) : '  0';
    logDetail(`[vendor]   ${b.label.padEnd(11)} | ${bar(c).padEnd(24)} | ${String(c).padStart(3)} files (${pct}%)`);
  });
}

/* ----- size range helper ----- */
function checkSizeRange(size, spec) {
  const { minBytes, maxBytes } = spec;
  if (typeof minBytes === 'number' && size < minBytes) {
    return { ok: false, why: `too small (${size} B < ${minBytes} B)` };
    }
  if (typeof maxBytes === 'number' && size > maxBytes) {
    return { ok: false, why: `too large (${size} B > ${maxBytes} B)` };
  }
  return { ok: true };
}

/* ----- validation config (with ranges that fit your tiny builds) ----- */
const checks = [
  {
    label: 'FFmpeg (MT UMD)',
    requiredDir: 'vendor/ffmpeg',
    files: [
      // Loader can be very small depending on build (yours ~6.8KB). Allow 3KB–100KB.
      { path: 'vendor/ffmpeg/ffmpeg.js', minBytes: KB(3), maxBytes: KB(100) },

      // Core artifacts (names vary); WASM is typically larger; JS companion can be small.
      { glob: 'vendor/ffmpeg', pattern: /core.*\.wasm$/i, minBytes: MB(0.3) },
      { glob: 'vendor/ffmpeg', pattern: /core.*\.js$/i,   minBytes: KB(3)    },

      // Worker can be very small (yours ~3.8KB). Lower floor; optional presence.
      { glob: 'vendor/ffmpeg', pattern: /worker.*\.js$/i, minBytes: KB(3), optional: true },
    ],
  },
  {
    label: 'JSZip (self-hosted)',
    requiredDir: 'vendor/jszip',
    files: [
      {
        anyOf: [
          { path: 'vendor/jszip/jszip.min.js', minBytes: KB(10) },
          { path: 'vendor/jszip/jszip.mjs',    minBytes: KB(10) },
        ],
        message: 'Expect jszip.min.js or jszip.mjs available',
      },
    ],
  },
  {
    label: 'HEIC/HEIF decoder (jsquash-heic)',
    requiredDir: 'vendor/jsquash-heic',
    files: [
      { path: 'vendor/jsquash-heic/decode.js',           minBytes: 500 },
      { path: 'vendor/jsquash-heic/utils.js',            minBytes: KB(1) },
      { path: 'vendor/jsquash-heic/codec/dec/heic_dec.js',   minBytes: KB(10) },
      { path: 'vendor/jsquash-heic/codec/dec/heic_dec.wasm', minBytes: KB(100) },
    ],
  },
  {
    label: 'Tailwind CSS (optional but recommended)',
    requiredDir: 'vendor/css',
    files: [
      { path: 'vendor/css/tailwind.css', minBytes: KB(1), optional: true },
    ],
  },
];

/* ----- core validators ----- */
async function validateFilePresenceAndSize(fileSpec, sectionSizes) {
  const results = [];

  if (fileSpec.path) {
    const abs = path.join(ROOT, fileSpec.path);
    if (!(await exists(abs))) { results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `missing: ${rel(abs)}` }); return results; }
    const size = await statSize(abs);
    const range = checkSizeRange(size, fileSpec);
    if (!range.ok) { results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `${range.why}: ${rel(abs)}` }); return results; }
    const head = await readFirstBytes(abs);
    if (isLikelyHTML(head)) { results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `looks like HTML (check path): ${rel(abs)}` }); return results; }
    sectionSizes.push(size);
    results.push({ status: 'OK', msg: `${rel(abs)} (${size} B)` });
    return results;
  }

  if (fileSpec.anyOf) {
    const errs = [];
    for (const opt of fileSpec.anyOf) {
      const abs = path.join(ROOT, opt.path);
      if (!(await exists(abs))) { errs.push(`missing: ${rel(abs)}`); continue; }
      const size = await statSize(abs);
      const range = checkSizeRange(size, opt);
      if (!range.ok) { errs.push(`${range.why}: ${rel(abs)}`); continue; }
      const head = await readFirstBytes(abs);
      if (isLikelyHTML(head)) { errs.push(`looks like HTML: ${rel(abs)}`); continue; }
      sectionSizes.push(size);
      return [{ status: 'OK', msg: `${rel(abs)} (${size} B)` }];
    }
    return [{ status: 'FAIL', msg: fileSpec.message || `none of anyOf satisfied` }];
  }

  if (fileSpec.glob && fileSpec.pattern) {
    const dirAbs = path.join(ROOT, fileSpec.glob);
    const names = await listDir(dirAbs);
    const matches = names.filter(n => fileSpec.pattern.test(n)).map(n => path.join(dirAbs, n));
    if (matches.length === 0) return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `no matches for ${fileSpec.pattern} in ${rel(dirAbs)}` }];

    const withSizes = await Promise.all(matches.map(async m => ({ m, size: await statSize(m) })));
    withSizes.forEach(({ size }) => sectionSizes.push(size));
    const top = withSizes.sort((a, b) => b.size - a.size)[0];

    const range = checkSizeRange(top.size, fileSpec);
    if (!range.ok) return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `${range.why}: ${rel(top.m)}` }];
    const head = await readFirstBytes(top.m);
    if (isLikelyHTML(head)) return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `match looks like HTML: ${rel(top.m)}` }];
    return [{ status: 'OK', msg: `${rel(top.m)} (${top.size} B)` }];
  }

  return [{ status: 'WARN', msg: 'unknown fileSpec (skipped)' }];
}

async function validateSection(section, overallSizes) {
  const out = [];
  const sectionSizes = [];
  const dirAbs = path.join(ROOT, section.requiredDir || '');
  const dirExists = section.requiredDir ? await exists(dirAbs) : true;

  // INFO line suppressed in QUIET mode
  logDetail(`[vendor] INFO  Section: ${section.label}`);

  if (section.requiredDir) {
    if (!dirExists) { out.push({ status: 'FAIL', msg: `missing directory: ${rel(dirAbs)}` }); return { messages: out, sizes: sectionSizes }; }
    else out.push({ status: 'OK', msg: `found directory: ${rel(dirAbs)}` });
  }

  for (const fileSpec of (section.files || [])) {
    const res = await validateFilePresenceAndSize(fileSpec, sectionSizes);
    out.push(...res);
  }

  overallSizes.push(...sectionSizes);
  // Section histogram (suppressed in QUIET)
  if (SHOW_HISTO && sectionSizes.length) renderHistogram(section.label, sectionSizes);
  return { messages: out, sizes: sectionSizes };
}

/* ----- entry ----- */
async function validate() {
  const manifest = await readVersion();
  if (manifest.ok) logSummary(`[manifest] Loaded version ${manifest.version} (schema ${manifest.schema})`);
  else logSummary(`[manifest] version.json not found (skipping manifest header)`);
  logSummary(`[manifest] Note: COOP/COEP required; this server sets headers.`);

  let failed = 0, warned = 0;
  const overallSizes = [];

  for (const section of checks) {
    const { messages } = await validateSection(section, overallSizes);
    for (const m of messages) {
      if (m.status === 'FAIL') failed++;
      if (m.status === 'WARN') warned++;
      logVendor(m.status, m.msg);
    }
  }

  if (SHOW_HISTO && overallSizes.length) renderHistogram('Overall', overallSizes);

  const exitFail = failed || (STRICT && warned);
  logSummary(`[manifest] Validation ${exitFail ? 'FAILED' : 'complete'}. ${failed ? `(FAIL=${failed})` : ''}${STRICT ? ` (WARN=${warned}, STRICT=on)` : warned ? ` (WARN=${warned})` : ''}`);
  if (exitFail) process.exit(1);
}

if (require.main === module) {
  validate().catch(err => {
    console.error('[manifest] ERROR', err);
    process.exit(1);
  });
}
module.exports = { validate };
