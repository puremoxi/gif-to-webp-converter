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
export async function convertToWebP(ffmpeg, file, settings, onProgress) {
  const inputName = file.name;
  const outputName = inputName.replace(/\.gif$/i, ".webp");

  await ffmpeg.writeFile(inputName, await fetchFileFunc(file));

  // Seed a visible start so very short clips don't look stuck at 0%.
  try { onProgress && onProgress(0.05); } catch {}

  const args = ["-i", inputName, "-c:v", "libwebp"];

  // Compression level 0..6 applies to both lossy and lossless in libwebp
  if (Number.isFinite(settings.compressionLevel)) {
    args.push("-compression_level", String(settings.compressionLevel));
  }

  if (settings.lossless) {
    args.push("-lossless", "1");
  } else {
    args.push("-qscale", settings.quality.toString());
  }

  // Loop handling
  // loop 0 = infinite; loop -1 = no loop; loop 1 = loop once (play twice)
  const loopValue = settings.loop ? "0" : "-1";
  args.push("-loop", loopValue);

  // Still image preset optimization
  if (settings.still) {
    args.push("-preset", "picture");
  }

  args.push(outputName);

  // Smoothed progress mapping function
  const smooth = (r) => {
    const mapped = 0.05 + (Math.max(0, Math.min(1, r)) * 0.94); // 0.05..0.99
    return Math.max(0.05, Math.min(0.99, mapped));
  };

  const progressHandler = ({ ratio }) => {
    try { onProgress && onProgress(smooth(ratio)); } catch {}
  };
  if (onProgress) ffmpeg.on("progress", progressHandler);

  try {
    console.log("▶ Running FFmpeg:", args.join(" "));
    await ffmpeg.exec(args);
  } finally {
    if (onProgress) {
      try { ffmpeg.off("progress", progressHandler); } catch {}
    }
  }

  const data = await ffmpeg.readFile(outputName);

  // Finalize to 100%
  try { onProgress && onProgress(1); } catch {}

  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(outputName); } catch {}

  const blob = new Blob([data.buffer], { type: "image/webp" });
  return { name: outputName, blob };
}
