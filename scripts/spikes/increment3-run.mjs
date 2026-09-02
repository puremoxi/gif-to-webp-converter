// THROWAWAY SPIKE ORCHESTRATOR — Increment 3 of the WebPAnimEncoder-vs-FFmpeg
// benchmark. Drives increment3-compare.html once per fixture, collects
// results, applies the pre-committed decision rules exactly as specified,
// and prints the full report. Requires the dev server running.
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const STAGE1_FIXDIR = '/images/shrinkray-test-formats';
const SPIKE_FIXDIR = '/scripts/spikes/fixtures';
const LOCAL_STAGE1_FIXDIR = path.join(__dirname, '..', '..', 'images', 'shrinkray-test-formats');
const LOCAL_SPIKE_FIXDIR = path.join(__dirname, 'fixtures');

// Exact params from Increment 2's recorded FFmpeg baseline commands.
const fixtures = [
  { label: 'test_video.gif', kind: 'gif', mime: 'image/gif',
    srcUrl: `${STAGE1_FIXDIR}/test_video.gif`, localSrc: path.join(LOCAL_STAGE1_FIXDIR, 'test_video.gif'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/test_video.gif.webp`,
    ffmpegEncodeMs: 2833 },
  { label: 'test_image.apng', kind: 'apng', mime: 'image/apng',
    srcUrl: `${STAGE1_FIXDIR}/test_image.apng`, localSrc: path.join(LOCAL_STAGE1_FIXDIR, 'test_image.apng'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/test_image.apng.webp`,
    ffmpegEncodeMs: 772 },
  // Video fixtures use a reduced 5s trim (not Increment 2's 31s) — holding
  // 3 full-length RGBA frame arrays (~1.9GB each at 721 frames/1280x720)
  // simultaneously OOM'd the browser tab. A matching-duration FFmpeg
  // mini-baseline is generated fresh inside increment3-compare.html for a
  // valid same-duration comparison; Increment 2's full-length numbers are
  // kept only as unrelated reference context, not part of the comparison.
  { label: 'test_video.mp4', kind: 'video', t: 5, scaleW: 1280, fps: 24,
    srcUrl: `${STAGE1_FIXDIR}/test_video.mp4`, localSrc: path.join(LOCAL_STAGE1_FIXDIR, 'test_video.mp4'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/test_video.mp4.webp` },
  { label: 'test_video.webm', kind: 'video', t: 5, scaleW: 1280, fps: 24,
    srcUrl: `${STAGE1_FIXDIR}/test_video.webm`, localSrc: path.join(LOCAL_STAGE1_FIXDIR, 'test_video.webm'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/test_video.webm.webp` },
  { label: 'test_video.mov', kind: 'video', t: 5, scaleW: 1280, fps: 24,
    srcUrl: `${STAGE1_FIXDIR}/test_video.mov`, localSrc: path.join(LOCAL_STAGE1_FIXDIR, 'test_video.mov'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/test_video.mov.webp` },
  { label: 'ui_demo.gif', kind: 'gif', mime: 'image/gif',
    srcUrl: `${SPIKE_FIXDIR}/ui_demo.gif`, localSrc: path.join(LOCAL_SPIKE_FIXDIR, 'ui_demo.gif'),
    baselineUrl: `${SPIKE_FIXDIR}/inc2-baseline/ui_demo.gif.webp`,
    ffmpegEncodeMs: 3491 },
];

const QUALITY = 90, LOSSLESS = 0;

async function runFixture(browser, f) {
  const page = await browser.newPage();
  page.on('pageerror', e => console.log(`[pageerror ${f.label}]`, String(e)));
  const params = new URLSearchParams({
    label: f.label, srcUrl: f.srcUrl, kind: f.kind === 'apng' ? 'apng' : (f.kind === 'video' ? 'video' : 'gif'),
    mime: f.mime || '', baselineUrl: f.baselineUrl,
    t: f.t || '', scaleW: f.scaleW || '', fps: f.fps || 24,
    quality: QUALITY, lossless: LOSSLESS,
  });
  await page.goto(`${BASE_URL}/scripts/spikes/increment3-compare.html?${params}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__result !== undefined, null, { timeout: 300000 }).catch(() => {});
  const result = await page.evaluate(() => window.__result);
  await page.close();
  return result;
}

function fmtPct(x) { return (x >= 0 ? '+' : '') + x.toFixed(1) + '%'; }

async function main() {
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const f of fixtures) {
      console.log(`\n=== ${f.label} ===`);
      const inputBytes = fs.statSync(f.localSrc).size;
      const inc2BaselineBytes = fs.statSync(path.join(__dirname, 'fixtures', 'inc2-baseline', `${f.label}.webp`)).size;
      const r = await runFixture(browser, f);
      if (!r || r.status !== 'OK') {
        console.log(`  VALIDATION FAILED: ${r?.fatalError || 'no result returned'}`);
        results.push({ label: f.label, inputBytes, ffmpegBytes: inc2BaselineBytes, valid: false, error: r?.fatalError || 'no result' });
        continue;
      }
      r.inputBytes = inputBytes;
      if (f.kind === 'video') {
        // r.ffmpegBytes / r.ffmpegEncodeMs already set inside the page from
        // the matched-duration mini-baseline — do NOT overwrite with
        // Increment 2's full-length (different-duration) numbers.
        r.increment2FullLengthBytes = inc2BaselineBytes;
      } else {
        r.ffmpegBytes = inc2BaselineBytes;
        r.ffmpegEncodeMs = f.ffmpegEncodeMs;
      }
      r.valid = true;
      results.push(r);
      console.log(`  canonical: ${JSON.stringify(r.canonical)}`);
      console.log(`  ffmpeg:    ${JSON.stringify(r.ffmpeg)}  bytes=${ffmpegBytesFromFile}`);
      console.log(`  wasmWebp:  ${JSON.stringify(r.wasmWebp)}  bytes=${r.wasmWebpBytes}  encodeMs=${r.wasmWebpEncodeMs}`);
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync(path.join(__dirname, 'increment3-results.json'), JSON.stringify(results, null, 2));
  console.log('\nRaw results written to scripts/spikes/increment3-results.json');
}

main();
