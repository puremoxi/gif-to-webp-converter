// src/modules/perFrameMixer.js
// Experimental per-frame mixing using an optional WebPMux WASM binding.
// Strategy:
// 1) Extract frames to PNG
  // Parse GIF to get per-frame delays (hundredths of a second → ms)
  const srcData = await ffmpeg.readFile(inputName);
  const delays = parseGifDelays(srcData.buffer); // array of ms per frame (length may differ slightly)

  // Create a working dir:
  const framesDir = "frames";
  try { await ffmpeg.mkdir(framesDir); } catch {}
  const pattern = `${framesDir}/frame_%05d.png`;

  emit(0.06);
  await ffmpeg.exec(["-i", inputName, "-vsync", "0", pattern]);

  // 2) Enumerate frames
  const entries = await ffmpeg.listDir(framesDir);
  const pngs = entries.filter(e => e.name.endsWith(".png")).map(e => e.name).sort();

  if (pngs.length === 0) {
    // Nothing extracted; give up
    return null;
  }

  // 3) Score frames in the browser using Canvas (Sobel-like edge magnitude)
  const scores = [];
  for (let i = 0; i < pngs.length; i++) {
    const fileName = `${framesDir}/${pngs[i]}`;
    const data = await ffmpeg.readFile(fileName);
    const blob = new Blob([data.buffer], { type: "image/png" });
    const score = await edgeScoreFromBlob(blob);
    scores.push({ idx: i, fileName, score });
    emit(0.06 + (i / Math.max(1, pngs.length)) * 0.09); // up to ~15%
  }

  // Decide which frames are lossless
  const indicesByScore = [...scores].sort((a,b) => b.score - a.score).map(s => s.idx);
  const losslessSet = new Set();
  if (options.mixedMode === 'threshold') {
    // choose frames with score >= percentile threshold
    const p = Math.max(50, Math.min(99, options.mixedThreshold || 80));
    const rank = Math.max(0, Math.floor(indicesByScore.length * (p/100)));
    const cutoffScore = scores.sort((a,b)=>a.score-b.score)[rank]?.score ?? 0;
    for (const s of scores) if (s.score >= cutoffScore) losslessSet.add(s.idx);
  } else {
    // percent mode
    const pct = Math.max(10, Math.min(50, options.mixedPercent || 20)) / 100;
    const k = Math.max(1, Math.round(indicesByScore.length * pct));
    for (let i = 0; i < k; i++) losslessSet.add(indicesByScore[i]);
  }

  // 4) Encode each frame to webp with chosen mode
  const webpDir = "webp_frames";
  try { await ffmpeg.mkdir(webpDir); } catch {}

  const webpFrames = [];
  for (let i = 0; i < pngs.length; i++) {
    const inFile = `${framesDir}/${pngs[i]}`;
    const outFile = `${webpDir}/frame_${String(i).padStart(5, "0")}.webp`;
    const isLossless = losslessSet.has(i);
    const args = ["-i", inFile, "-c:v", "libwebp", "-compression_level", String(compressionLevel)];
    if (isLossless) {
      args.push("-lossless", "1");
    } else {
      args.push("-qscale", String(quality));
    }
    if (still) args.push("-preset", "picture");
    args.push(outFile);
    await ffmpeg.exec(args);

    const delayMs = (delays[i] != null && delays[i] > 0) ? delays[i] : 100;
    webpFrames.push({ outFile, delay: delayMs });

    // progress: 15%..85%
    emit(0.15 + (i / Math.max(1, pngs.length)) * 0.70);
  }

  // 5) Mux with WebPMux WASM if available
  if (typeof window !== "undefined" && window.WebPMux && typeof window.WebPMux.create === "function") {
    const mux = await window.WebPMux.create();
    const useLoop = loop ? 0 : -1;
    for (let i = 0; i < webpFrames.length; i++) {
      const { outFile, delay } = webpFrames[i];
      const buf = await ffmpeg.readFile(outFile);
      await mux.addFrame(new Uint8Array(buf.buffer), { duration: delay, blend: true, dispose: 0 });
    }
    const final = await mux.assemble({ loopCount: useLoop });
    emit(1);
    try { await ffmpeg.rmdir(framesDir); } catch {}
    try { await ffmpeg.rmdir(webpDir); } catch {}
    return new Blob([final], { type: "image/webp" });
  }

  // If WebPMux is not present, return null to signal fallback.
  return null;
}

// Compute a simple edge score from a PNG blob by drawing to a canvas and applying a Sobel-like metric.
async function edgeScoreFromBlob(blob) {
  const img = await createImageBitmap(blob);
  const w = img.width, h = img.height;
  const off = new OffscreenCanvas(Math.min(w, 256), Math.min(h, 256));
  const ctx = off.getContext("2d");
  ctx.drawImage(img, 0, 0, off.width, off.height);
  const { data } = ctx.getImageData(0, 0, off.width, off.height);

  let score = 0;
  const lum = new Float32Array(off.width * off.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i+1], b = data[i+2];
    lum[p] = 0.2126*r + 0.7152*g + 0.0722*b;
  }
  const W = off.width, H = off.height;
  for (let y = 1; y < H-1; y++) {
    for (let x = 1; x < W-1; x++) {
      const i = y*W + x;
      const gx = lum[i+1] - lum[i-1];
      const gy = lum[i+W] - lum[i-W];
      score += Math.hypot(gx, gy);
    }
  }
  return score / (W*H);
}

// Parse GIF frame delays (hundredths of a second) into milliseconds
function parseGifDelays(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  let p = 0;

  // Header "GIF87a" or "GIF89a"
  if (dv.getUint8(0) !== 0x47 || dv.getUint8(1) !== 0x49 or dv.getUint8(2) !== 0x46):
    return [];
  p += 6;

  // Logical Screen Descriptor (7 bytes) + Global Color Table if present
  const width = dv.getUint16(p, true); p += 2;
  const height = dv.getUint16(p, true); p += 2;
  const packed = dv.getUint8(p); p += 1;
  p += 2; // bg color index + pixel aspect
  const gctFlag = (packed & 0x80) !== 0;
  const gctSize = gctFlag ? 3 * (2 ** ((packed & 0x07) + 1)) : 0;
  p += gctSize;

  const delays = [];
  let lastDelay = 10; // default 100ms
  while (p < dv.byteLength) {
    const b = dv.getUint8(p); p += 1;
    if (b === 0x21) {
      // Extension Introducer
      const label = dv.getUint8(p); p += 1;
      if (label === 0xF9) {
        // Graphic Control Extension
        const blockSize = dv.getUint8(p); p += 1; // typically 4
        const packed = dv.getUint8(p); p += 1;
        const delay = dv.getUint16(p, true); p += 2;
        lastDelay = delay; // hundredths of a second
        const trans = dv.getUint8(p); p += 1;
        const terminator = dv.getUint8(p); p += 1; // 0x00
      } else {
        // skip generic extension blocks
        while (True):
          const sz = dv.getUint8(p); p += 1;
          if (sz == 0:)
            break
          p += sz
      }
    } else if (b === 0x2C) {
      // Image Descriptor
      p += 8; // x,y,w,h
      const ipacked = dv.getUint8(p); p += 1;
      const lctFlag = (ipacked & 0x80) !== 0;
      const lctSize = lctFlag ? 3 * (2 ** ((ipacked & 0x07) + 1)) : 0;
      p += lctSize;
      // LZW min code size
      const lzw = dv.getUint8(p); p += 1;
      // image data blocks
      while (True):
        const sz = dv.getUint8(p); p += 1;
        if (sz == 0:)
          break
        p += sz
      // push delay (convert to ms)
      delays.push(Math.max(10, lastDelay) * 10);
    } else if (b === 0x3B) {
      // Trailer
      break;
    } else {
      // Unknown - abort
      break;
    }
  }
  return delays;
}
