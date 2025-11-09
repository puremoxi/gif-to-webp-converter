// validateManifest.cjs
// Boot-time validator for version.json and required FFmpeg artifacts.
const fs = require('fs');
const path = require('path');

function toRegex(glob) {
  // Very small glob -> regex (supports * only)
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + esc + '$');
}

function listFilesRecursive(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const st = fs.statSync(dir);
  if (st.isFile()) return [dir];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const s = fs.statSync(p);
      if (s.isDirectory()) stack.push(p); else out.push(p);
    }
  }
  return out;
}

function validate() {
  const root = __dirname;
  const manifestPath = path.join(root, 'version.json');
  const vendorDir = path.join(root, 'vendor', 'ffmpeg');

  if (!fs.existsSync(manifestPath)) {
    console.warn('[manifest] version.json not found — skipping validation.');
    return;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    console.error('[manifest] Failed to parse version.json:', e.message);
    return;
  }

  // Basic schema checks
  const errs = [];
  if (typeof manifest.schema_version !== 'number') errs.push('schema_version must be a number');
  if (!manifest.app || typeof manifest.app.version !== 'string') errs.push('app.version must be a string');
  if (!manifest.ffmpeg || !manifest.ffmpeg.required_vendor_artifacts) errs.push('ffmpeg.required_vendor_artifacts is required');

  if (errs.length) {
    console.error('[manifest] Schema errors:', errs.join('; '));
  } else {
    console.log(`[manifest] Loaded version ${manifest.app.version} (schema ${manifest.schema_version})`);
  }

  // Check COOP/COEP hint
  if (manifest.ffmpeg && manifest.ffmpeg.requires_coop_coep) {
    console.log('[manifest] Note: COOP/COEP required. This server sets the headers automatically.');
  }

  // Artifact existence checks
  const reqs = Array.isArray(manifest.ffmpeg?.required_vendor_artifacts) ? manifest.ffmpeg.required_vendor_artifacts : [];
  const files = listFilesRecursive(vendorDir).map(p => p.replace(root + path.sep, '').replace(/\\/g, '/'));

  for (const pattern of reqs) {
    const isGlob = pattern.includes('*');
    if (!isGlob) {
      const abs = path.join(root, pattern);
      if (!fs.existsSync(abs)) {
        console.warn(`[manifest] Missing vendor artifact: ${pattern}`);
      } else {
        // ok
      }
    } else {
      // glob support: verify at least one file matches
      const rx = toRegex(pattern);
      const any = files.some(f => rx.test(f));
      if (!any) {
        console.warn(`[manifest] No files matched glob: ${pattern}`);
      }
    }
  }

  // Friendly status
  console.log('[manifest] Validation complete.');
}

module.exports = { validate };
