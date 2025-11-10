📦 FFmpeg Multi‑Threaded (core‑mt) + Loader (Option A — Local UMD)

Place these files in this folder (keep names exactly):

From @ffmpeg/core-mt@0.12.6 (dist/umd/):
  - ffmpeg-core.js
  - ffmpeg-core.wasm
  - ffmpeg-core.worker.js

From @ffmpeg/ffmpeg@0.12.10 (dist/umd/):
  - ffmpeg.js
  - *.ffmpeg.js (e.g., 814.ffmpeg.js — number may vary by version)

Verify after copying:
  dir .\vendor\ffmpeg\ffmpeg-core*
  dir .\vendor\ffmpeg\*.ffmpeg.js
