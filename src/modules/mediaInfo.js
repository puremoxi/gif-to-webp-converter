// Returns { width, height, frames, animated, fps, duration } for any supported input format.

async function parseGif(file) {
  const buf = await file.arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint8(0) !== 0x47 || dv.getUint8(1) !== 0x49 || dv.getUint8(2) !== 0x46) return null;
  const width  = dv.getUint16(6, true);
  const height = dv.getUint16(8, true);
  let p = 6;
  const packed = dv.getUint8(p + 4); p += 7;
  const gct = (packed & 0x80) !== 0; if (gct) p += 3 * (2 ** ((packed & 0x07) + 1));
  let frames = 0, delays = [], last = 10;
  while (p < dv.byteLength) {
    const b = dv.getUint8(p++);
    if (b === 0x21) {
      const label = dv.getUint8(p++);
      if (label === 0xF9) { dv.getUint8(p++); p++; last = dv.getUint16(p, true); p += 2; p += 2; }
      else { for (;;) { const sz = dv.getUint8(p++); if (sz === 0) break; p += sz; } }
    } else if (b === 0x2C) {
      p += 8; const ip = dv.getUint8(p++); const lct = (ip & 0x80) !== 0;
      if (lct) p += 3 * (2 ** ((ip & 0x07) + 1));
      p++; for (;;) { const sz = dv.getUint8(p++); if (sz === 0) break; p += sz; }
      frames++; delays.push((last === 0 ? 2 : last) * 10);
    } else { break; }
  }
  const animated = frames > 1;
  const totalMs  = delays.reduce((a, b) => a + b, 0);
  const fps      = animated && totalMs > 0 ? frames / (totalMs / 1000) : 0;
  return { width, height, frames, animated, fps, duration: totalMs > 0 ? totalMs / 1000 : null };
}

async function parseApng(file) {
  const buf = await file.arrayBuffer();
  const dv  = new DataView(buf);
  if (dv.getUint32(0) !== 0x89504E47 || dv.getUint32(4) !== 0x0D0A1A0A) return null;
  let p = 8, width = null, height = null, numFrames = null;
  const frameDelays = [];
  while (p + 8 <= dv.byteLength) {
    const len  = dv.getUint32(p, false);
    const type = String.fromCharCode(dv.getUint8(p+4), dv.getUint8(p+5), dv.getUint8(p+6), dv.getUint8(p+7));
    const d    = p + 8;
    if      (type === 'IHDR') { width = dv.getUint32(d, false); height = dv.getUint32(d + 4, false); }
    else if (type === 'acTL') { numFrames = dv.getUint32(d, false); }
    else if (type === 'fcTL') {
      const num = dv.getUint16(d + 20, false);
      const den = dv.getUint16(d + 22, false) || 100;
      frameDelays.push(num / den);
    }
    else if (type === 'IEND') break;
    p = d + len + 4;
  }
  const animated = numFrames != null && numFrames > 1;
  const frames   = numFrames || 1;
  const total    = frameDelays.reduce((a, b) => a + b, 0);
  const fps      = animated && total > 0 ? frames / total : 0;
  return { width, height, frames, animated, fps, duration: total > 0 ? total : null };
}

function fromVideo(file) {
  return new Promise(resolve => {
    const url   = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted   = true;
    video.preload = 'metadata';
    const done = () => {
      URL.revokeObjectURL(url);
      const w = video.videoWidth  || null;
      const h = video.videoHeight || null;
      const d = Number.isFinite(video.duration) ? video.duration : null;
      resolve({ width: w, height: h, frames: null, animated: true, fps: null, duration: d });
    };
    video.onloadedmetadata = done;
    video.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null, frames: null, animated: true, fps: null, duration: null }); };
    video.src = url;
  });
}

function fromImage(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null, frames: 1, animated: false, fps: 0, duration: null }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: null, height: null, frames: 1, animated: false, fps: 0, duration: null }); };
    img.src = url;
  });
}

const FALLBACK = { width: null, height: null, frames: 1, animated: false, fps: 0, duration: null };

export async function getMediaInfo(file) {
  const name = String(file.name || '');
  const type = String(file.type || '').toLowerCase();
  try {
    if (type === 'image/gif'  || /\.gif$/i.test(name))          return (await parseGif(file))  || FALLBACK;
    if (type === 'image/apng' || /\.apng$/i.test(name))         return (await parseApng(file)) || FALLBACK;
    if (/^video\//.test(type) || /\.(mp4|mov|webm)$/i.test(name)) return await fromVideo(file);
    return await fromImage(file);
  } catch {
    return { ...FALLBACK };
  }
}
