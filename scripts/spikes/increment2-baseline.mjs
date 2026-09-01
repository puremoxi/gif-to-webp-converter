// THROWAWAY SPIKE — Increment 2 of the WebPAnimEncoder-vs-FFmpeg benchmark.
// Produces the current production FFmpeg libwebp baseline (default app
// settings, no experimental toggles) for every fixture, so later increments
// have a fixed reference to compare wasm-webp's real WebPAnimEncoder output
// against. Drives the real app UI, same methodology as Stage 1's benchmark,
// for direct comparability. Requires the dev server running (npm run serve).
import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const STAGE1_FIXDIR = path.join(__dirname, '..', '..', 'images', 'shrinkray-test-formats');
const SPIKE_FIXDIR = path.join(__dirname, 'fixtures');
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shrinkray-inc2-baseline-'));

// Same 5 fixtures as Stage 1 (for direct comparability) plus the new
// synthetic screen-recording/static-UI fixture Stage 1 never tested.
const fixtures = [
  { file: path.join(STAGE1_FIXDIR, 'test_video.gif'), label: 'test_video.gif' },
  { file: path.join(STAGE1_FIXDIR, 'test_image.apng'), label: 'test_image.apng' },
  { file: path.join(STAGE1_FIXDIR, 'test_video.mp4'), label: 'test_video.mp4' },
  { file: path.join(STAGE1_FIXDIR, 'test_video.webm'), label: 'test_video.webm' },
  { file: path.join(STAGE1_FIXDIR, 'test_video.mov'), label: 'test_video.mov' },
  { file: path.join(SPIKE_FIXDIR, 'ui_demo.gif'), label: 'ui_demo.gif (synthetic screen-recording/static-UI)' },
];

async function runBaseline(browser, fixturePath, label) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('[pageerror]', String(e)));
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.evaluate(() => {
    const t = document.getElementById('diag-toggle');
    if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.locator('#fileInput').setInputFiles(fixturePath);
  await page.waitForFunction(() => {
    const btn = document.getElementById('start-button');
    return btn && !btn.disabled;
  }, null, { timeout: 60000 }).catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
  const t0 = Date.now();
  await page.locator('#start-button').click();
  const download = await downloadPromise;
  const encodeMs = Date.now() - t0;

  const savedPath = path.join(OUTDIR, `${label.replace(/[^\w.-]/g, '_')}.webp`);
  await download.saveAs(savedPath);

  const diagText = await page.locator('#diag-log').innerText().catch(() => '');
  const cmdLine = diagText.split('\n').reverse().find(l => l.includes('ffmpeg -y')) || null;
  const doneLine = diagText.split('\n').find(l => l.includes('[SUCCESS]') || l.includes('Done:')) || null;

  await page.close();
  return { savedPath, encodeMs, cmdLine, doneLine };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const f of fixtures) {
      console.log(`\n=== ${f.label} ===`);
      const inputSize = fs.statSync(f.file).size;
      const r = await runBaseline(browser, f.file, f.label);
      const outputSize = fs.statSync(r.savedPath).size;
      const reduction = (100 * (1 - outputSize / inputSize)).toFixed(1);
      console.log(`  input:  ${(inputSize/1024).toFixed(1)} KB`);
      console.log(`  output: ${(outputSize/1024).toFixed(1)} KB  (${reduction}% vs input)`);
      console.log(`  encode wall time: ${r.encodeMs} ms`);
      console.log(`  ${r.cmdLine}`);
      results.push({ label: f.label, inputSize, outputSize, reduction, encodeMs: r.encodeMs, savedPath: r.savedPath });
    }
  } finally {
    await browser.close();
  }

  console.log('\n=== INCREMENT 2 BASELINE SUMMARY (FFmpeg libwebp path, default settings) ===');
  for (const r of results) {
    console.log(`${r.label}: ${(r.inputSize/1024).toFixed(1)}KB -> ${(r.outputSize/1024).toFixed(1)}KB (${r.reduction}%)  ${r.encodeMs}ms  saved:${r.savedPath}`);
  }
}

main();
