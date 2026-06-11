import { log } from './logger.js';

const AVIF_BASE = '/vendor/jsquash-avif';
let avifWorker = null;
let avifWorkerReady = null;
let nextWorkerMessageId = 1;
const pendingWorkerMessages = new Map();

const defaultOptions = {
  quality: 50,
  qualityAlpha: -1,
  denoiseLevel: 0,
  tileColsLog2: 0,
  tileRowsLog2: 0,
  speed: 6,
  subsample: 1,
  chromaDeltaQ: false,
  sharpness: 0,
  tune: 0,
  enableSharpYUV: false,
  bitDepth: 8,
  lossless: false,
};

export async function hasAvifEngineFiles() {
  const files = [
    `${AVIF_BASE}/codec/enc/avif_enc.js`,
    `${AVIF_BASE}/codec/enc/avif_enc.wasm`,
  ];
  try {
    const results = await Promise.all(files.map(async (file) => {
      const res = await fetch(file, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    }));
    return results.every(Boolean);
  } catch {
    return false;
  }
}

function postWorkerMessage(type, payload = {}, transfer = []) {
  const worker = getAvifWorker();
  const id = nextWorkerMessageId++;
  return new Promise((resolve, reject) => {
    pendingWorkerMessages.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...payload }, transfer);
  });
}

function getAvifWorker() {
  if (avifWorker) return avifWorker;
  avifWorker = new Worker('/src/modules/avifWorker.js', { type: 'module' });
  avifWorker.onmessage = (event) => {
    const { id, type, message, buffer } = event.data || {};
    const pending = pendingWorkerMessages.get(id);
    if (!pending) return;
    pendingWorkerMessages.delete(id);
    if (type === 'error') pending.reject(new Error(message || 'AVIF worker error.'));
    else pending.resolve({ type, buffer });
  };
  avifWorker.onerror = (event) => {
    const error = new Error(event.message || 'AVIF worker failed.');
    for (const { reject } of pendingWorkerMessages.values()) reject(error);
    pendingWorkerMessages.clear();
    avifWorkerReady = null;
    avifWorker?.terminate();
    avifWorker = null;
  };
  return avifWorker;
}

export async function initAvifEngine() {
  if (!avifWorkerReady) {
    avifWorkerReady = postWorkerMessage('init').then(() => {
      log('AVIF engine loaded OK', 'ok');
      return true;
    });
  }
  try {
    await avifWorkerReady;
  } catch (error) {
    avifWorkerReady = null;
    throw error;
  }
  return true;
}

function constrainDimensions(width, height, settings) {
  if (settings.noChangeDimensions) return { width, height };
  const maxW = settings.maxWidthEnabled && settings.resizeWidth > 0 ? settings.resizeWidth : null;
  const maxH = settings.maxHeightEnabled && settings.maxHeight > 0 ? settings.maxHeight : null;
  const scaleW = maxW ? maxW / width : 1;
  const scaleH = maxH ? maxH / height : 1;
  const scale = Math.min(1, scaleW, scaleH);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function fileToImageData(file, settings) {
  const bitmap = await createImageBitmap(file);
  try {
    const dims = constrainDimensions(bitmap.width, bitmap.height, settings);
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!settings.keepAlpha) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, dims.width, dims.height);
    }
    ctx.drawImage(bitmap, 0, 0, dims.width, dims.height);
    return ctx.getImageData(0, 0, dims.width, dims.height);
  } finally {
    bitmap.close?.();
  }
}

function avifOptions(settings) {
  const compression = Number.isFinite(settings.compressionLevel) ? settings.compressionLevel : 6;
  const quality = Math.max(0, Math.min(100, Number(settings.quality) || 90));
  return {
    ...defaultOptions,
    quality,
    qualityAlpha: settings.keepAlpha ? quality : -1,
    speed: Math.max(4, Math.min(10, Math.round(10 - compression))),
  };
}

function outputNameFor(file) {
  return String(file?.name || 'image').replace(/\.[^.]+$/i, '.avif');
}

async function encodeAvif(imageData, settings, onProgress) {
  const options = avifOptions(settings);
  let simulated = 0.45;
  const progressTimer = setInterval(() => {
    simulated = Math.min(0.95, simulated + 0.03);
    onProgress?.(simulated);
  }, 500);
  try {
    const source = imageData.data;
    const bytes = new Uint8Array(source.byteLength);
    bytes.set(source);
    const result = await postWorkerMessage('encode', {
      buffer: bytes.buffer,
      width: imageData.width,
      height: imageData.height,
      options,
    }, [bytes.buffer]);
    return new Blob([result.buffer], { type: 'image/avif' });
  } finally {
    clearInterval(progressTimer);
  }
}

async function convertOnce(file, settings, onProgress) {
  onProgress?.(0.1);
  await initAvifEngine();
  onProgress?.(0.25);
  const imageData = await fileToImageData(file, settings);
  onProgress?.(0.45);
  const blob = await encodeAvif(imageData, settings, onProgress);
  onProgress?.(0.98);
  return { name: outputNameFor(file), blob };
}

async function binarySearchQuality(file, settings, onProgress) {
  const targetBytes = settings.targetSizeKB * 1024;
  const maxIter = 8;
  let lo = 1, hi = 100, best = null;
  log(`[target size] searching AVIF for <=${settings.targetSizeKB} KB in up to ${maxIter} passes`, 'info');
  for (let i = 0; i < maxIter; i++) {
    if (lo > hi) break;
    const mid = Math.round((lo + hi) / 2);
    const result = await convertOnce(file, { ...settings, quality: mid }, (p) => {
      onProgress?.((i + p) / maxIter);
    });
    const kb = (result.blob.size / 1024).toFixed(1);
    const hit = result.blob.size <= targetBytes;
    log(`[target size] AVIF pass ${i + 1}: quality=${mid}  ->  ${kb} KB  ${hit ? 'under target' : 'over target'}`, 'info');
    if (hit) { best = result; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  if (!best) {
    log(`[target size] AVIF could not fit under ${settings.targetSizeKB} KB; using quality=1`, 'warn');
    best = await convertOnce(file, { ...settings, quality: 1 }, onProgress);
  }
  return best;
}

export async function convertToAvif(file, settings, onProgress) {
  if (settings.targetSizeEnabled && settings.targetSizeKB > 0) {
    return binarySearchQuality(file, settings, onProgress);
  }
  return convertOnce(file, settings, onProgress);
}
