
📦 FFmpeg Multi‑Threaded (core‑mt) + Loader (Option A — Local UMD)

Copy **both** UMD directories into this folder:

1) From `@ffmpeg/core-mt@0.12.6/dist/umd/`:
   - ffmpeg-core.js
   - ffmpeg-core.wasm
   - ffmpeg-core.worker.js

2) From `@ffmpeg/ffmpeg@0.12.10/dist/umd/`:
   - ffmpeg.js
   - *.ffmpeg.js (many numbered chunk files, e.g., 814.ffmpeg.js)

### Commands (PowerShell, run in project root)
npm init -y

npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

npm pack @ffmpeg/ffmpeg@0.12.10
tar -xf .\ffmpeg-0.12.10.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

### Verify
dir .\vendor\ffmpeg\ffmpeg-core*
dir .\vendor\ffmpeg\*.ffmpeg.js   # MUST list several numbered chunk files
