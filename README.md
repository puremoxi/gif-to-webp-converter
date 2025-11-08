# GIF → WebP Converter — v3.3 (Local FFmpeg only)

This build is **self-hosted**. No CDNs. You must place FFmpeg files in `vendor/ffmpeg/`.

## Place the 4 files in `vendor/ffmpeg/`
- `ffmpeg.js` (from `@ffmpeg/ffmpeg@0.12.10` UMD)
- `ffmpeg-core.js` (from `@ffmpeg/core-mt@0.12.6` UMD)
- `ffmpeg-core.wasm` (from `@ffmpeg/core-mt@0.12.6` UMD)
- `ffmpeg-core.worker.js` (from `@ffmpeg/core-mt@0.12.6` UMD)

## Start a local server
**Windows (PowerShell)**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx serve .
# open http://localhost:3000/
```

**macOS / Linux**
```bash
npx serve .
# or
python -m http.server 3000
# open http://localhost:3000/
```

## Notes
- The FFmpeg banner at the top shows per-file progress (core.js / wasm / worker.js).
- "Start Conversion" enables once FFmpeg is ready and files are queued.
