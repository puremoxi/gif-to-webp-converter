// Owns a dedicated FFmpeg-WASM (WebP) instance and a dedicated AVIF worker instance,
// used only for live-preview encodes. Kept fully separate from the real queue engines
// so a slow/hung preview can never block or corrupt an in-progress batch conversion.
import { initFFmpeg, convertToWebP } from './ffmpegClient.js';
import { createAvifEncoderInstance, encodeImageDataToAvif, hasAvifEngineFiles } from './avifClient.js';
import { downscaleForPreview } from './previewDownscale.js';
import { log } from './logger.js';

const WEBP_CORE_BASE = '/vendor/ffmpeg';
const PREVIEW_MAX_EDGE = 900;
const PREVIEW_EXEC_TIMEOUT_SEC = 20;

let previewFfmpeg = null;
let previewFfmpegPromise = null;
let previewAvifInstance = null;
let previewAvifFilesAvailable = false;

export async function initPreviewEngines() {
  if (!previewFfmpegPromise) {
    previewFfmpegPromise = initFFmpeg({ base: WEBP_CORE_BASE, label: 'Preview engine (WebP)' })
      .then((engine) => { previewFfmpeg = engine; return engine; })
      .catch((err) => {
        previewFfmpegPromise = null;
        log(`Live preview WebP engine failed to load: ${err?.message || err}`, 'warn');
        throw err;
      });
  }
  previewAvifFilesAvailable = await hasAvifEngineFiles();
  if (previewAvifFilesAvailable && !previewAvifInstance) {
    previewAvifInstance = createAvifEncoderInstance('Preview engine (AVIF)');
  }
  try { await previewFfmpegPromise; } catch { /* already logged */ }
  return previewEnginesStatus();
}

export function previewEnginesStatus() {
  return { webpReady: !!previewFfmpeg, avifAvailable: previewAvifFilesAvailable };
}

function previewAvifOptions(settings) {
  const quality = Math.max(0, Math.min(70, Number(settings.quality) || 90));
  return {
    quality,
    qualityAlpha: settings.keepAlpha ? quality : -1,
    denoiseLevel: 0,
    tileColsLog2: 0,
    tileRowsLog2: 0,
    speed: 10, // fastest — preview always trades quality/effort for latency
    subsample: 1,
    chromaDeltaQ: false,
    sharpness: 0,
    tune: 0,
    enableSharpYUV: false,
    bitDepth: 8,
    lossless: false,
  };
}

// Encodes one downscaled still using whichever engine matches settings.outputFormat.
// Always forces Fast-Mode-equivalent caps, regardless of the user's real Fast Mode toggle.
export async function encodePreview(file, settings) {
  const format = settings.outputFormat === 'avif' ? 'avif' : 'webp';

  if (format === 'avif') {
    if (!previewAvifFilesAvailable) throw new Error('AVIF preview engine is not installed.');
    if (!previewAvifInstance) previewAvifInstance = createAvifEncoderInstance('Preview engine (AVIF)');
    const { ctx, width, height } = await downscaleForPreview(file, PREVIEW_MAX_EDGE, settings.keepAlpha);
    const imageData = ctx.getImageData(0, 0, width, height);
    const blob = await encodeImageDataToAvif(previewAvifInstance, imageData, previewAvifOptions(settings));
    return { name: 'preview.avif', blob };
  }

  if (!previewFfmpeg) {
    if (previewFfmpegPromise) await previewFfmpegPromise.catch(() => {});
  }
  if (!previewFfmpeg) throw new Error('WebP preview engine is not ready.');

  const { canvas } = await downscaleForPreview(file, PREVIEW_MAX_EDGE, settings.keepAlpha);
  const pngBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not prepare preview canvas.'))), 'image/png');
  });
  const pngFile = new File([pngBlob], 'preview.png', { type: 'image/png' });
  const previewSettings = {
    ...settings,
    fastMode: true,
    noChangeDimensions: true,
    maxWidthEnabled: false,
    maxHeightEnabled: false,
    targetSizeEnabled: false,
    execTimeoutSec: PREVIEW_EXEC_TIMEOUT_SEC,
  };
  return convertToWebP(previewFfmpeg, pngFile, previewSettings);
}
