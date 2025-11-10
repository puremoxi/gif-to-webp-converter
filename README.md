# GIF → WebP Converter — v3.6.9 (Option A, Multi‑Thread, Strict CSP, ESM)

Strict CSP build (no inline scripts/styles). FFmpeg loader via **ESM**; multi‑thread core from `@ffmpeg/core-mt`.

## Quick Start (Windows / PowerShell)
```powershell
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Tailwind (self-hosted)
npm i -D tailwindcss@3 postcss autoprefixer
npm run build:css

# FFmpeg Core (engine, multi-thread)
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# FFmpeg ESM loader
npm pack @ffmpeg/ffmpeg@0.12.10
tar -xf .\ffmpeg-ffmpeg-0.12.10.tgz
robocopy .\package\dist\esm .\vendor\ffmpeg ffmpeg.min.js /NJH /NJS
rmdir /S /Q .\package

# Optional: JSZip (self-hosted)
npm pack jszip@3.10.1
tar -xf .\jszip-3.10.1.tgz
robocopy .\package\dist .\vendor\jszip jszip.min.js /NJH /NJS
rmdir /S /Q .\package

npm run validate
npm run serve
# open http://localhost:3000
```

### Tip: FFmpeg load progress
The top banner shows `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` with a linear progress bar and `n/3 complete`.

## What changed in this build
- Header now includes: “Please refer to README for proper installation of this tool.”
- **Processing Queue** section added under Advanced (collapsible, defaults expanded).
- Each queued file now shows **resolution** nearest to the thumbnail (before FPS), then FPS, then frames.

## Project Hierarchy
(see repo tree after unzip — includes `vendor/jszip/` folder even if empty)
