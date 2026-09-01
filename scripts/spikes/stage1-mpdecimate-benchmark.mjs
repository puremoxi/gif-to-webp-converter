// THROWAWAY BENCHMARK DRIVER — Stage 1 (mpdecimate spike).
// Drives the real app UI (not a bypass) once with the experimental dedupe
// toggle off and once with it on, for each fixture, and compares output
// size, encode time, decoded duration, and decoded frame count.
// Requires the dev server running (npm run serve).
import { chromium } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const FIXDIR = path.join(__dirname, '..', '..', 'images', 'shrinkray-test-formats');
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shrinkray-stage1-'));

// Existing repo fixtures. Not a curated "screen recording vs fast action" set —
// see write-up for that caveat — but they cover GIF/APNG/MP4/WEBM/MOV animated inputs.
const fixtures = (process.env.SPIKE_FIXTURES || 'test_video.gif,test_image.apng,test_video.mp4,test_video.webm,test_video.mov').split(',');

async function runConversion(browser, file, dedupe) {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', String(e)));
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.evaluate(() => {
    const t = document.getElementById('diag-toggle');
    if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  if (dedupe) {
    await page.evaluate(() => {
      const t = document.getElementById('experimental-dedupe-toggle');
      if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  }
  await page.locator('#fileInput').setInputFiles(path.join(FIXDIR, file));
  await page.waitForFunction(() => {
    const btn = document.getElementById('start-button');
    return btn && !btn.disabled;
  }, null, { timeout: 60000 }).catch(() => {});

  const downloadPromise = page.waitForEvent('download', { timeout: 300000 });
  await page.locator('#start-button').click();
  const download = await downloadPromise;
  const downloadPath = path.join(OUTDIR, `${path.parse(file).name}-${dedupe ? 'on' : 'off'}-${Date.now()}.webp`);
  await download.saveAs(downloadPath);

  const diagText = await page.locator('#diag-log').innerText().catch(() => '');
  const dedupeLine = diagText.split('\n').find(l => l.includes('[experimental mpdecimate]')) || null;
  const cmdLine = diagText.split('\n').reverse().find(l => l.includes('ffmpeg -y')) || null;

  await page.close();
  return { downloadPath, dedupeLine, cmdLine };
}

async function decodeReport(browser, filePath) {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/scripts/spikes/decode-report.html`, { waitUntil: 'load' });
  await page.locator('#f').setInputFiles(filePath);
  await page.waitForFunction(() => document.getElementById('out')?.textContent.includes('DONE'), null, { timeout: 60000 });
  const text = await page.locator('#out').innerText();
  await page.close();
  const duration = (text.match(/Parsed duration:\s*([\d:.]+|unknown)/) || [])[1] || 'unknown';
  const frames = (text.match(/Decoded frame count:\s*(\d+|unknown)/) || [])[1] || 'unknown';
  return { duration, frames, raw: text };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  try {
    for (const file of fixtures) {
      console.log(`\n=== ${file} ===`);
      const off = await runConversion(browser, file, false);
      const on = await runConversion(browser, file, true);

      const offSize = fs.statSync(off.downloadPath).size;
      const onSize = fs.statSync(on.downloadPath).size;
      const reduction = (100 * (1 - onSize / offSize)).toFixed(1);

      const offDecode = await decodeReport(browser, off.downloadPath);
      const onDecode = await decodeReport(browser, on.downloadPath);

      console.log(`  off: ${(offSize/1024).toFixed(1)} KB   duration=${offDecode.duration}  frames=${offDecode.frames}`);
      console.log(`  on:  ${(onSize/1024).toFixed(1)} KB   duration=${onDecode.duration}  frames=${onDecode.frames}   (${reduction}% vs off)`);
      console.log(`  dedupe log: ${on.dedupeLine}`);

      results.push({ file, offSize, onSize, reduction, offDecode, onDecode, dedupeLine: on.dedupeLine, cmdLine: on.cmdLine });
    }
  } finally {
    await browser.close();
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.file}: ${(r.offSize/1024).toFixed(1)}KB -> ${(r.onSize/1024).toFixed(1)}KB (${r.reduction}%)  duration off=${r.offDecode.duration} on=${r.onDecode.duration}  frames off=${r.offDecode.frames} on=${r.onDecode.frames}`);
  }
}

main();
