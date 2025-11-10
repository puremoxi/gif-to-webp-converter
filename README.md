# GIF → WebP Converter — v3.6.12-2 (Option A, Multi‑Thread, Strict CSP)

**Strict CSP build**: No inline scripts or styles. WebAssembly allowed via `'wasm-unsafe-eval'`. Tailwind and JSZip are self‑hosted.
**Tip**: The top banner shows FFmpeg engine file loading with a progress bar and `n/3 complete` counter.

## Quick Start (Windows / PowerShell)
[Same steps as previous version; included here for convenience.]

1) Tailwind build, 2) copy UMD files for `@ffmpeg/core-mt@0.12.6` and `@ffmpeg/ffmpeg@0.12.10` into `vendor/ffmpeg/`, 3) self-host `jszip.min.js` into `vendor/jszip/`, 4) `npm run serve` then open `http://localhost:3000`. See full README from v3.6.12-1 if needed.
