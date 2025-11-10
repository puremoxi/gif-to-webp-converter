
# GIF → WebP Converter — v3.6.7 (Option A, Multi‑Thread, Strict CSP)

**Strict CSP build**: No inline scripts or styles. WebAssembly allowed via `'wasm-unsafe-eval'` (no `'unsafe-eval'`). Tailwind is self-hosted.

## 🆕 What’s New in v3.6.7
- Removed all inline `<style>` and inline attributes to satisfy strict CSP.
- Moved FFmpeg bridge to `/src/boot.js` (no inline script).
- CSP updated: `script-src 'self' 'wasm-unsafe-eval'` and `style-src 'self'`.
- README expanded with CSP guidance.

## Quick Start (Windows / PowerShell)
```powershell
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Tailwind (Fix A)
npm i -D tailwindcss@3 postcss autoprefixer
npm run build:css

# FFmpeg Core (engine, MT)
npm init -y
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# FFmpeg Loader (ffmpeg.js + chunks)
npm pack @ffmpeg/ffmpeg@0.12.10
tar -xf .\ffmpeg-ffmpeg-0.12.10.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# Verify
dir .\vendor\ffmpeg\ffmpeg-core*
dir .\vendor\ffmpeg\*.ffmpeg.js

# Run
npm run serve
# open http://localhost:3000
```
