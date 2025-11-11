// validateManifest.cjs
// Usage (package.json):
//   "validate": "node -e \"require('./validateManifest.cjs').validate()\""
// Or run directly:
//   node validateManifest.cjs
//
// ENV:
//   STRICT=1      -> treat WARN as FAIL (exit 1)
//   NO_HISTO=1    -> suppress histograms
//
// Report:
// - Manifest header (version.json) if present
// - Vendor sections (FFmpeg / JSZip / Tailwind) with OK/WARN/FAIL
// - Per-section & overall size histograms (unless NO_HISTO=1)
// - Exit code: 1 on any FAIL (or any WARN if STRICT=1)

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = process.cwd();
const STRICT = process.env.STRICT === '1';
const SHOW_HISTO = process.env.NO_HISTO === '1' ? false : true;

const BYTES = (n) => n;
const KB = (n) => n * 1024;
const MB = (n) => n * 1024 * 1024;

async function readVersion() {
  try {
    const p = path.join(ROOT, 'version.json');
    const raw = await fsp.readFile(p, 'utf8');
    const json = JSON.parse(raw);
    return { ok: true, version: json?.app?.version || json?.version || 'unknown', schema: json?.schema || 'unknown' };
  } catch {
    return { ok: false, version: 'unknown', schema: 'unknown' };
  }
}

async function exists(p) {
  try { await fsp.access(p, fs.constants.F_OK); return true; }
  catch { return false; }
}

async function statSize(p) {
  const st = await fsp.stat(p);
  return st.size;
}

async function readFirstBytes(p, n = 512) {
  const fd = await fsp.open(p, 'r');
  try {
    const buf = Buffer.alloc(n);
    const { bytesRead } = await fd.read(buf, 0, n, 0);
    return buf.slice(0, bytesRead).toString('utf8');
  } finally {
    await fd.close();
  }
}

function isLikelyHTML(s) {
  if (!s) return false;
  const head = s.slice(0, 512).toLowerCase();
  return head.includes('<!doctype html') || head.includes('<html') || head.includes('<head>') || head.includes('<title>');
}

async function listDir(p) {
  try { return await fsp.readdir(p); } catch { return []; }
}
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/'); }

/** ---------- Size histogram helpers ---------- */
const BUCKETS = [
  { label: '<10KB',   min: 0,        max: KB(10) },
  { label: '10–50KB', min: KB(10),   max: KB(50) },
  { label: '50–200KB',min: KB(50),   max: KB(200) },
  { label: '200KB–1MB',min: KB(200), max: MB(1) },
  { label: '1–4MB',   min: MB(1),    max: MB(4) },
  { label: '>4MB',    min: MB(4),    max: Infinity },
];

function bucketSizes(sizes) {
  const counts = BUCKETS.map(() => 0);
  for (const sz of sizes) {
    const idx = BUCKETS.findIndex(b => sz >= b.min && sz < b.max);
    if (idx >= 0) counts[idx] += 1;
  }
  return counts;
}

function renderHistogram(title, sizes) {
  if (!SHOW_HISTO) return;
  const counts = bucketSizes(sizes);
  const max = Math.max(1, ...counts);
  const bar = (n) => '█'.repeat(Math.round((n / max) * 24)); // scale to 24 chars
  console.log(`[vendor] ${title}: size histogram`);
  BUCKETS.forEach((b, i) => {
    const c = counts[i];
    const pct = sizes.length ? String(Math.round((c / sizes.length) * 100)).padStart(3) : '  0';
    console.log(`[vendor]   ${b.label.padEnd(11)} | ${bar(c).padEnd(24)} | ${String(c).padStart(3)} files (${pct}%)`);
  });
}

/** ---------- Vendor section config ---------- */
const checks = [
  {
    label: 'FFmpeg (MT UMD)',
    requiredDir: 'vendor/ffmpeg',
    files: [
      { path: 'vendor/ffmpeg/ffmpeg.js', minBytes: KB(10) },
      { glob: 'vendor/ffmpeg', pattern: /core.*\.wasm$/i, minBytes: MB(0.5) },
      { glob: 'vendor/ffmpeg', pattern: /core.*\.js$/i,   minBytes: KB(10) },
      { glob: 'vendor/ffmpeg', pattern: /worker.*\.js$/i, minBytes: KB(5), optional: true },
    ],
  },
  {
    label: 'JSZip (self-hosted)',
    requiredDir: 'vendor/jszip',
    files: [
      {
        anyOf: [
          { path: 'vendor/jszip/jszip.min.js', minBytes: KB(20) },
          { path: 'vendor/jszip/jszip.mjs',    minBytes: KB(20) },
        ],
        message: 'Expect jszip.min.js or jszip.mjs available',
      },
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

/** ---------- Validation core ---------- */
async function validateFilePresenceAndSize(fileSpec, sectionSizes, messages) {
  const results = [];

  // explicit path
  if (fileSpec.path) {
    const abs = path.join(ROOT, fileSpec.path);
    const ok = await exists(abs);
    if (!ok) {
      results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `missing: ${rel(abs)}` });
      return results;
    }
    const size = await statSize(abs);
    if (size < (fileSpec.minBytes || 0)) {
      results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `too small (${size} B): ${rel(abs)}` });
      return results;
    }
    const head = await readFirstBytes(abs);
    if (isLikelyHTML(head)) {
      results.push({ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `looks like HTML (check dev-server/404): ${rel(abs)}` });
      return results;
    }
    sectionSizes.push(size);
    results.push({ status: 'OK', msg: `${rel(abs)} (${size} B)` });
    return results;
  }

  // anyOf
  if (fileSpec.anyOf) {
    const options = fileSpec.anyOf;
    const errs = [];
    for (const opt of options) {
      const abs = path.join(ROOT, opt.path);
      if (!(await exists(abs))) { errs.push(`missing: ${rel(abs)}`); continue; }
      const size = await statSize(abs);
      if (size < (opt.minBytes || 0)) { errs.push(`too small (${size} B): ${rel(abs)}`); continue; }
      const head = await readFirstBytes(abs);
      if (isLikelyHTML(head)) { errs.push(`looks like HTML: ${rel(abs)}`); continue; }
      sectionSizes.push(size);
      return [{ status: 'OK', msg: `${rel(abs)} (${size} B)` }];
    }
    return [{ status: 'FAIL', msg: fileSpec.message || `none of anyOf satisfied: ${options.map(o => o.path).join(', ')}` }];
  }

  // folder scan with pattern
  if (fileSpec.glob && fileSpec.pattern) {
    const dirAbs = path.join(ROOT, fileSpec.glob);
    const names = await listDir(dirAbs);
    const matches = names.filter(n => fileSpec.pattern.test(n)).map(n => path.join(dirAbs, n));
    if (matches.length === 0) {
      return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `no matches for ${fileSpec.pattern} in ${rel(dirAbs)}` }];
    }
    // choose largest match as canonical success (and record ALL sizes for histogram)
    const withSizes = await Promise.all(matches.map(async m => ({ m, size: await statSize(m) })));
    withSizes.forEach(({ size }) => sectionSizes.push(size));
    const top = withSizes.sort((a, b) => b.size - a.size)[0];
    if (top.size < (fileSpec.minBytes || 0)) {
      return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `match too small (${top.size} B): ${rel(top.m)}` }];
    }
    const head = await readFirstBytes(top.m);
    if (isLikelyHTML(head)) {
      return [{ status: fileSpec.optional ? 'WARN' : 'FAIL', msg: `match looks like HTML: ${rel(top.m)}` }];
    }
    return [{ status: 'OK', msg: `${rel(top.m)} (${top.size} B)` }];
  }

  return [{ status: 'WARN', msg: 'unknown fileSpec (skipped)' }];
}

async function validateSection(section, overallSizes) {
  const out = [];
  const sectionSizes = [];
  const dirAbs = path.join(ROOT, section.requiredDir || '');
  const dirExists = section.requiredDir ? await exists(dirAbs) : true;

  out.push({ status: 'INFO', msg: `Section: ${section.label}` });

  if (section.requiredDir) {
    if (!dirExists) {
      out.push({ status: 'FAIL', msg: `missing directory: ${rel(dirAbs)}` });
      return { messages: out, sizes: sectionSizes };
    } else {
      out.push({ status: 'OK', msg: `found directory: ${rel(dirAbs)}` });
    }
  }

  for (const fileSpec of (section.files || [])) {
    const res = await validateFilePresenceAndSize(fileSpec, sectionSizes, out);
    out.push(...res);
  }

  // add to overall sizes
  overallSizes.push(...sectionSizes);

  // Section histogram
  if (SHOW_HISTO && sectionSizes.length) {
    renderHistogram(`${section.label}`, sectionSizes);
  }
  return { messages: out, sizes: sectionSizes };
}

/** ---------- Public API ---------- */
async function validate() {
  const manifest = await readVersion();
  if (manifest.ok) {
    console.log(`[manifest] Loaded version ${manifest.version} (schema ${manifest.schema})`);
  } else {
    console.log(`[manifest] version.json not found (skipping manifest header)`);
  }
  console.log(`[manifest] Note: COOP/COEP required; this server sets headers.`);

  let failed = 0;
  let warned = 0;
  const overallSizes = [];

  for (const section of checks) {
    const { messages } = await validateSection(section, overallSizes);
    for (const r of messages) {
      const tag = r.status.padEnd(5, ' ');
      if (r.status === 'FAIL') failed++;
      if (r.status === 'WARN') warned++;
      console.log(`[vendor] ${tag} ${r.msg}`);
    }
  }

  if (SHOW_HISTO && overallSizes.length) {
    renderHistogram('Overall', overallSizes);
  }

  const exitFail = failed || (STRICT && warned);
  console.log(`[manifest] Validation ${exitFail ? 'FAILED' : 'complete'}. ${failed ? `(FAIL=${failed})` : ''}${STRICT ? ` (WARN=${warned}, STRICT=on)` : warned ? ` (WARN=${warned})` : ''}`);
  if (exitFail) process.exit(1);
}

if (require.main === module) {
  validate().catch(err => {
    console.error('[manifest] ERROR', err);
    process.exit(1);
  });
}

module.exports = { validate };
