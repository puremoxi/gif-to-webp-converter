import { perFrameMix } from "./perFrameMixer.js";
// src/modules/ffmpegClient.js
let ffmpegInstance;
let fetchFileFunc;

export async function initFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  if (!window.FFmpeg) {
    throw new Error("FFmpeg library not found. Ensure @ffmpeg/ffmpeg UMD is loaded in index.html");
  }

  const createFFmpeg = window.FFmpeg.createFFmpeg;
  // Try both namespaced locations for fetchFile (varies by UMD build)
  fetchFileFunc = window.FFmpeg?.FFmpegUtil?.fetchFile || window.FFmpegUtil?.fetchFile;
  if (!fetchFileFunc) {
    throw new Error("fetchFile not found. Ensure @ffmpeg/util UMD is available via the FFmpeg bundle.");
  }

  const ffmpeg = createFFmpeg({
    log: true,
    corePath: "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
  });

  ffmpeg.on("log", ({ message }) => console.debug("[ffmpeg]", message));

  await ffmpeg.load();
  ffmpegInstance = ffmpeg;

  console.log("✅ FFmpeg loaded and ready.");
  return ffmpegInstance;
}

/**
 * Convert to WebP with *smoothed* per-file progress and extended settings:
 * - seed progress to 5% after writeFile()
 * - during encode, map raw ratio [0..1] to [0.05..0.99]
 * - set to 100% after success
 * - compression level (0..6)
 * - loop toggle (checked => loop 0 infinite; unchecked => loop -1 no loop)
 * - preset picture when 'still image' checked
 */
export async function _convertToWebPSingle(ffmpeg, file, settings, onProgress) {
  const inputName = file.name;
  const baseName = inputName.replace(/\.gif$/i, "");
  const outputName = baseName + ".webp";

  await ffmpeg.writeFile(inputName, await fetchFileFunc(file));

  const smooth = (r) => {
    const mapped = 0.05 + (Math.max(0, Math.min(1, r)) * 0.94);
    return Math.max(0.05, Math.min(0.99, mapped));
  };
  const emit = (v) => { try { onProgress && onProgress(v); } catch {} };

  // Seed visible start
  emit(0.05);

  // Helper to build args common to both passes
  const commonArgs = (outName, losslessFlag) => {
    const args = ["-i", inputName, "-c:v", "libwebp"];

    // compression level
    if (Number.isFinite(settings.compressionLevel)) {
      args.push("-compression_level", String(settings.compressionLevel));
    }

    if (losslessFlag) {
      args.push("-lossless", "1");
    } else {
      args.push("-qscale", String(settings.quality));
    }

    // loop handling
    const loopValue = settings.loop ? "0" : "-1";
    args.push("-loop", loopValue);

    // still image preset
    if (settings.still) args.push("-preset", "picture");

    args.push(outName);
    return args;
  };

  if (settings.mixed) {
    // Pass 1: lossy
    const lossyOut = baseName + "_lossy.webp";
    const handler1 = ({ ratio }) => emit(0.05 + (smooth(ratio) - 0.05) * 0.45); // up to ~50%
    if (onProgress) ffmpeg.on("progress", handler1);
    try {
      await ffmpeg.exec(commonArgs(lossyOut, false));
    } finally {
      if (onProgress) try { ffmpeg.off("progress", handler1); } catch {}
    }

    // Pass 2: lossless
    const losslessOut = baseName + "_lossless.webp";
    const handler2 = ({ ratio }) => emit(0.50 + (smooth(ratio) - 0.05) * 0.49); // 50..~99%
    if (onProgress) ffmpeg.on("progress", handler2);
    try {
      await ffmpeg.exec(commonArgs(losslessOut, true));
    } finally {
      if (onProgress) try { ffmpeg.off("progress", handler2); } catch {}
    }

    // Read both, pick better heuristic (currently size-only)
    const lossyData = await ffmpeg.readFile(lossyOut);
    const losslessData = await ffmpeg.readFile(losslessOut);

    // finalize to 100%
    emit(1);

    // clean up
    try { await ffmpeg.deleteFile(inputName); } catch {}
    try { await ffmpeg.deleteFile(lossyOut); } catch {}
    try { await ffmpeg.deleteFile(losslessOut); } catch {}

    // Choose smaller output (you can refine with SSIM/PSNR scoring offline)
    const pickLossy = lossyData.byteLength <= losslessData.byteLength;
    const data = pickLossy ? lossyData : losslessData;
    const blob = new Blob([data.buffer], { type: "image/webp" });
    return { name: outputName, blob };
  } else {
    // Single-pass (lossy or lossless)
    const args = commonArgs(outputName, !!settings.lossless);
    const handler = ({ ratio }) => emit(smooth(ratio));
    if (onProgress) ffmpeg.on("progress", handler);
    try {
      await ffmpeg.exec(args);
    } finally {
      if (onProgress) try { ffmpeg.off("progress", handler); } catch {}
    }

    const data = await ffmpeg.readFile(outputName);
    emit(1);

    try { await ffmpeg.deleteFile(inputName); } catch {}
    try { await ffmpeg.deleteFile(outputName); } catch {}

    const blob = new Blob([data.buffer], { type: "image/webp" });
    return { name: outputName, blob };
  }
}


// Wrapper that attempts per-frame mixing if settings.mixed is true and WebPMux is available.
export async function convertToWebP(ffmpeg, file, settings, onProgress) {
  // If mixed mode requested, try per-frame approach first.
  if (settings && settings.mixed) {
    try {
      const inputName = file.name;
      await ffmpeg.writeFile(inputName, await fetchFileFunc(file));
      const blob = await perFrameMix(ffmpeg, inputName, settings, onProgress);
      if (blob) {
        // Success; clean input
        try { await ffmpeg.deleteFile(inputName); } catch {}
        return { name: inputName.replace(/\.gif$/i, ".webp"), blob };
      }
      // If per-frame mix fails or mux not present, fall through to single-pass fallback.
    } catch (e) {
      console.warn("Per-frame mixing failed or unavailable; falling back to single-pass.", e);
    }
  }
  // Fallback to the existing single/two-pass behavior
  return _convertToWebPSingle(ffmpeg, file, settings, onProgress);
}
