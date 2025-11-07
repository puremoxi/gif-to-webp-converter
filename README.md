# GIF → WebP Converter (WASM, Local Only)

A lightweight, browser-based GIF → WebP converter. All conversions happen **100% locally** via FFmpeg WebAssembly — your files never leave your machine.

## Features
- Convert GIF (including animated) to WebP
- Lossless toggle or lossy with quality slider (0–100)
- Parallel conversion using `Promise.all()`
- Download individual outputs or a **ZIP** with all converted files
- No server required

## Project Structure
```
gif-to-webp-converter/
  index.html
  README.md
  package.json
  src/
    app.js
    modules/
      ffmpegClient.js
      queueManager.js
      ui.js
```

## Quick Start
Use a small static server (ES modules over `file://` can be restricted by browsers):
```bash
npm i -g serve
serve .
# open the printed URL (e.g., http://localhost:3000)
```

> Alternatively:
```bash
python -m http.server 3000
# http://localhost:3000
```

## How It Works
- `@ffmpeg/ffmpeg` UMD is included in `index.html`.
- The WASM core is loaded by FFmpeg with `corePath` so the `.wasm` and `worker.js` files are resolved automatically.
- Conversions run entirely in the browser using FFmpeg's virtual FS.
- JSZip UMD is included to generate a ZIP archive client-side.

## Tuning Quality
- **Lossless**: toggles `-lossless 1` (quality slider ignored).
- **Lossy**: uses `-qscale <0..100>` where **higher means better quality** but larger files.
- You can experiment with `-compression_level 6` or `-preset` options for `libwebp` if desired.

## Debugging Guide

### 1) FFmpeg fails to load
- **Symptom**: Stuck on loading / network errors in Console.
- **Fixes**:
  - Ensure network allows loading from `unpkg.com`.
  - Try another browser (Chrome/Edge on desktop work best).
  - Serve over `http://localhost` instead of opening via `file://`.

### 2) WASM/worker blocked or MIME errors
- **Symptom**: Console shows “Incorrect MIME type” for `.wasm` or worker.
- **Fixes**:
  - Use a static server (see “Quick Start”) that sets correct MIME types.
  - Avoid object URLs for the core; let `corePath` point to the CDN path.

### 3) Cross-origin errors
- **Symptom**: `Cross-Origin Request Blocked` or CORS messages.
- **Fixes**:
  - Keep using CDN (`unpkg.com`) or host the `/dist/umd/` core files yourself with correct CORS headers.
  - Avoid mixing `https`/`http` origins.

### 4) Very large GIFs / memory limits
- **Symptom**: Tab crashes or conversion stalls.
- **Fixes**:
  - Convert in batches.
  - Close other heavy tabs.
  - Consider reducing quality or using lossless only when needed.

### 5) Quality/results aren't as expected
- Try adding flags in `src/modules/ffmpegClient.js` (inside `convertToWebP`):
  - Example: `args.push("-compression_level", "6");`
  - Example: `args.push("-preset", "picture");`

## Deployment
- **GitHub Pages / Netlify / Vercel**: Just deploy the folder as a static site.
- Ensure external CDNs (`unpkg.com`, `jsdelivr`) are reachable from your deployment environment.

## License
MIT
