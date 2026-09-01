// Browser-driven regression check for the still/GIF/APNG/video → WebP encode paths.
// Requires the dev server running (npm run serve) and playwright installed
// (npm install -D playwright, then npx playwright install chromium once).
//
// Usage:  node scripts/smoke-test.mjs  [http://localhost:3000]

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const FIXDIR = path.join(__dirname, '..', 'images', 'shrinkray-test-formats');

const cases = [
  { file: 'test_image.png', label: 'still PNG -> WebP' },
  { file: 'test_video.gif', label: 'GIF -> WebP (animated)' },
  { file: 'test_image.apng', label: 'APNG -> WebP (animated)' },
  { file: 'test_video.mp4', label: 'video MP4 -> WebP (animated)' },
];

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`Cannot reach ${BASE_URL} — is the dev server running? (npm run serve)\n${e.message}`);
    process.exit(1);
  }
}

async function runCase(browser, c) {
  const page = await browser.newContext().then(ctx => ctx.newPage());
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(String(err)));

  await page.goto(BASE_URL, { waitUntil: 'load' });

  // Diagnostics panel starts collapsed and its logging checkbox starts off;
  // flip it directly rather than fighting the collapsed-panel visibility check.
  await page.evaluate(() => {
    const t = document.getElementById('diag-toggle');
    if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
  });

  await page.locator('#fileInput').setInputFiles(path.join(FIXDIR, c.file));

  await page.waitForFunction(() => {
    const btn = document.getElementById('start-button');
    return btn && !btn.disabled;
  }, null, { timeout: 60000 }).catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 180000 }).catch(() => null);
  await page.locator('#start-button').click();
  const download = await downloadPromise;

  const diagText = await page.locator('#diag-log').innerText().catch(() => '');
  const doneLine = diagText.split('\n').find(l => l.includes('Done:')) || null;
  const errorLines = diagText.split('\n').filter(l => /\[ERROR/.test(l));

  await page.close();

  return {
    case: c.label,
    downloaded: !!download,
    downloadName: download ? download.suggestedFilename() : null,
    doneLine,
    diagErrors: errorLines,
    consoleErrors,
  };
}

async function main() {
  await assertServerUp();
  const browser = await chromium.launch();
  const results = [];
  for (const c of cases) {
    results.push(await runCase(browser, c));
  }
  await browser.close();

  for (const r of results) {
    console.log('====', r.case, '====');
    console.log('  download event:', r.downloaded, r.downloadName || '');
    console.log('  diag "Done" line:', r.doneLine);
    if (r.diagErrors.length) console.log('  diag ERROR lines:', r.diagErrors);
    if (r.consoleErrors.length) console.log('  console errors:', r.consoleErrors);
  }

  const failed = results.filter(r => !r.downloaded || !r.doneLine);
  console.log('\nSUMMARY:', failed.length === 0 ? 'ALL PASS' : `${failed.length} FAILED`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
