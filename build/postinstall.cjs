'use strict';
// Runs automatically after `npm install`.
// Ensures Wine is present so the build:exe:icon script can inject the
// Windows icon into ShrinkRay.exe without a separate manual step.
// Wine is only needed on Linux/WSL — skipped silently on Windows and macOS.

const { execSync, spawnSync } = require('child_process');

if (process.platform !== 'linux') process.exit(0);

function hasWine() {
  try { execSync('which wine', { stdio: 'ignore' }); return true; }
  catch { return false; }
}

if (hasWine()) {
  console.log('  [setup] Wine already installed — icon injection ready.');
  process.exit(0);
}

console.log('  [setup] Wine not found. Installing (required for Windows icon injection)...');
console.log('  [setup] You may be prompted for your sudo password.\n');

const result = spawnSync('sudo', ['apt-get', 'install', '-y', 'wine'], { stdio: 'inherit' });

if (result.status === 0) {
  console.log('\n  [setup] Wine installed. Icon injection will run automatically with build:exe:icon.');
} else {
  console.warn('\n  [setup] Wine install failed or was cancelled.');
  console.warn('  [setup] Run manually:  sudo apt-get install -y wine');
  console.warn('  [setup] Then use build:exe:icon instead of build:exe for icon support.');
}
