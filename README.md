# GIF → WebP Converter — v3.4 (Local FFmpeg, no CDNs)

## Quick Start

**GIF to WebP Converter** is a local-first web app that converts animated or still GIFs into optimized WebP files using FFmpeg **entirely in your browser**. All processing is done on your machine — no uploads, no privacy concerns.

### 1) Put FFmpeg files in `vendor/ffmpeg/`
Place these **exact versions**:
- `ffmpeg.js` from `@ffmpeg/ffmpeg@0.12.10` (UMD)
- `ffmpeg-core.js` from `@ffmpeg/core-mt@0.12.6` (UMD)
- `ffmpeg-core.wasm` from `@ffmpeg/core-mt@0.12.6` (UMD)
- `ffmpeg-core.worker.js` from `@ffmpeg/core-mt@0.12.6` (UMD)

### 2) Start a static server
**Windows (PowerShell)**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx serve .
# then open http://localhost:3000/
```

**macOS/Linux**
```bash
npx serve .
# or
python -m http.server 3000
# then open http://localhost:3000/
```

### 3) FFmpeg loader progress
A banner at the top shows **which core file is loading**, **percentage**, and **“X / 3 complete.”**

---

## How It Works
- Loads the FFmpeg WebAssembly core locally from `vendor/ffmpeg/`.
- Uses a **robust UMD loader** (checks file presence/shape and exposes a ready flag).
- Converts GIFs to WebP via libwebp flags (`-lossless`, `-qscale`, `-compression_level`, `-loop`, `-preset picture`).
- Parallel conversion with `Promise.all()`.
- Per-file progress bars and ZIP-all download.

## Advanced Options
1. **WebP Quality** (0–100)
2. **Compression Level** (0–6) — *0 (fastest) → 6 (best compression)*
3. **Loop Animation**
4. **Still Image**
5. **Lossless Compression**
6. **Mixed Compression** (UI toggle; see `perFrameMixer.js` for planning API)

## Troubleshooting
- **FFmpeg UMD not found**: Ensure `./vendor/ffmpeg/ffmpeg.js` exists, ~275 KB, and `index.html` loads it **before** `src/app.js`.
- **Wrong FFmpeg build**: If console reports *“legacy createFFmpeg”*, re-download `@ffmpeg/ffmpeg@0.12.10` UMD.
- **OneDrive placeholders**: Right-click each file → **Always keep on this device**.
- **MIME errors**: Use `npx serve` or `python -m http.server` to serve `.wasm` properly.
- **Start disabled**: It enables when FFmpeg is loaded **and** you’ve queued at least one GIF.

## Directory Layout
```
gif-to-webp-converter/
├── index.html
├── README.md
├── package.json
├── src/
│   ├── app.js
│   └── modules/
│       ├── ffmpegClient.js
│       ├── ui.js
│       ├── queueManager.js
│       └── gifInfo.js
├── vendor/
│   └── ffmpeg/
│       ├── ffmpeg.js
│       ├── ffmpeg-core.js
│       ├── ffmpeg-core.wasm
│       └── ffmpeg-core.worker.js
└── assets/
```

MIT © 2025
