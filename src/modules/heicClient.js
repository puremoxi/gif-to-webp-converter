import { log } from './logger.js';

const HEIC_BASE = '/vendor/jsquash-heic';

export function isHeicFile(file) {
  if (!file) return false;
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(String(file.name || ''));
}

export async function hasHeicEngineFiles() {
  const files = [
    `${HEIC_BASE}/codec/dec/heic_dec.js`,
    `${HEIC_BASE}/codec/dec/heic_dec.wasm`,
  ];
  try {
    const results = await Promise.all(files.map(async (f) => {
      const res = await fetch(f, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    }));
    return results.every(Boolean);
  } catch {
    return false;
  }
}

let decodeFn = null;

async function getDecoder() {
  if (decodeFn) return decodeFn;
  const mod = await import(`${HEIC_BASE}/decode.js`);
  decodeFn = mod.default;
  return decodeFn;
}

export async function decodeHeicToBlob(file) {
  log(`Decoding HEIC: ${file.name}`, 'info');
  const decode = await getDecoder();
  const arrayBuffer = await file.arrayBuffer();
  const imageData = await decode(new Uint8Array(arrayBuffer));
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
  });
  log(`HEIC decoded OK: ${file.name} → ${imageData.width}×${imageData.height}`, 'ok');
  return blob;
}
