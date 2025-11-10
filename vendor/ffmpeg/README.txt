📦 FFmpeg Multi‑Threaded (core‑mt) + Loader (Option A — Local UMD)

Copy **both** UMD directories into this folder:

1) From `@ffmpeg/core-mt@0.12.6/dist/umd/`:
   - ffmpeg-core.js
   - ffmpeg-core.wasm
   - ffmpeg-core.worker.js

2) From `@ffmpeg/ffmpeg@0.12.10/dist/umd/`:
   - ffmpeg.js
   - *.ffmpeg.js (numbered chunk files, e.g., 814.ffmpeg.js)

Verify:
  dir .\vendor\ffmpeg\ffmpeg-core*
  dir .\vendor\ffmpeg\*.ffmpeg.js
