📦 FFmpeg Local Files (Required)

Use the **PowerShell curl method** to reliably download raw files (avoids HTML placeholders):

1) Open PowerShell
2) Navigate to this folder:
   cd path\to\your\gif-to-webp-converter\vendor\ffmpeg
3) Run:
   curl.exe -L "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js" -o ffmpeg.js
   curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.js" -o ffmpeg-core.js
   curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.wasm" -o ffmpeg-core.wasm
   curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js" -o ffmpeg-core.worker.js

Expected files:
- ffmpeg.js (~275 KB)
- ffmpeg-core.js (~260 KB)
- ffmpeg-core.wasm (~6.5 MB)
- ffmpeg-core.worker.js (~3 KB)
