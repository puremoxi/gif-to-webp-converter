'use strict';
// Injects build/icon.ico into dist/ShrinkRay.exe using rcedit.
// On Linux/WSL, rcedit delegates to Wine automatically.
// Prerequisite: sudo apt-get install wine (one-time, in WSL).
const { rcedit } = require('rcedit');
const path = require('path');

const root    = path.resolve(__dirname, '..');
const exePath = path.join(root, 'dist', 'ShrinkRay.exe');
const icoPath = path.join(root, 'build', 'icon.ico');

const { execSync } = require('child_process');
function hasWine() {
  if (process.platform !== 'linux') return true; // Windows/Mac run rcedit natively
  try { execSync('which wine', { stdio: 'ignore' }); return true; } catch { return false; }
}

if (!hasWine()) {
  console.warn('  [icon] Skipped — Wine not installed. Run npm install to set it up.');
  process.exit(0);
}

rcedit(exePath, { icon: icoPath })
  .then(() => console.log('  Icon injected → dist/ShrinkRay.exe'))
  .catch(err => {
    console.error('  [icon] Failed:', err.message);
    process.exit(1);
  });
