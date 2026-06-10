'use strict';
// Injects build/icon.ico into the pkg base binary so every subsequent
// `npm run build:exe` produces an exe with the correct Windows/Explorer icon.
// On Linux/WSL this runs automatically via Wine. Safe to re-run (idempotent).
const { rcedit } = require('rcedit');
const { execSync } = require('child_process');
const path = require('path');
const os   = require('os');
const fs   = require('fs');

const root    = path.resolve(__dirname, '..');
const icoPath = path.join(root, 'build', 'icon.ico');

// Patch the cached base binary so every build inherits the icon without
// needing a post-build step on Windows.
const baseBinary = path.join(
  os.homedir(), '.pkg-cache', 'v3.5', 'fetched-v20.18.0-win-x64'
);

function hasWine() {
  if (process.platform !== 'linux') return true;
  try { execSync('which wine', { stdio: 'ignore' }); return true; } catch { return false; }
}

if (!hasWine()) {
  console.warn('  [icon] Skipped — Wine not installed. Run: sudo apt-get install -y wine');
  console.warn('  [icon] Or patch the base binary manually on Windows (see build/BUILD.md Step 5).');
  process.exit(0);
}

if (!fs.existsSync(baseBinary)) {
  console.warn('  [icon] Base binary not found:', baseBinary);
  console.warn('  [icon] Run `npm run build:exe` once first to download it, then re-run.');
  process.exit(0);
}

console.log('  [icon] Patching base binary:', baseBinary);
rcedit(baseBinary, { icon: icoPath })
  .then(() => {
    console.log('  [icon] Done — all future builds will use the Shrink Ray icon.');
  })
  .catch(err => {
    console.error('  [icon] Failed:', err.message);
    process.exit(1);
  });
