📦 FFmpeg Multi‑Threaded (core‑mt) Setup

Copy the **ENTIRE** `@ffmpeg/core-mt@0.12.6/dist/umd/` directory into this folder. Those numbered chunk files (e.g., `814.ffmpeg.js`) are required by the worker.

### Commands (PowerShell)
npm init -y
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
xcopy /E /I /Y ".\package\dist\umd\*" ".\vendor\ffmpeg\"

# Add the UMD loader:
curl.exe -L "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js" -o ffmpeg.js

### Verify
dir .\*.ffmpeg.js   # should list several numbered chunk files
