# GIF → WebP Converter — v4.0 (Multi-Thread, CSP-Compliant)

A self-contained browser-based GIF → WebP converter powered by FFmpeg WASM (multi-threaded).  
All processing is performed locally — no files are uploaded.

---

## 🧱 Project Structure

```
project-root/
│
├─ index.html
│
├─ src/
│  ├─ app.js                    # Main app logic and event handlers
│  ├─ boot.js                   # FFmpegWASM bootstrap (no inline script)
│  ├─ ui-extensions.js          # Extended UI logic (collapsibles, timers, resolution, file size)
│  └─ modules/
│     ├─ ui.js                  # Core UI generation and manipulation
│     ├─ queueManager.js        # Conversion queue control
│     ├─ ffmpegClient.js        # FFmpeg WASM interface
│     ├─ gifInfo.js             # Extracts GIF metadata (fps, frame count, etc.)
│
├─ vendor/
│  ├─ ffmpeg/                   # FFmpeg UMD core-mt files
│  ├─ jszip/                    # JSZip dependencies
│
├─ server.cjs                   # Local Node test server (static host)
├─ postcss.config.js
├─ tailwind.config.js
├─ package.json
├─ version.json
└─ CHANGELOG.md
```

---

## 🚀 Usage

## Quick Start (Windows / PowerShell)
```powershell
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Tailwind (self-hosted)
npm i -D tailwindcss@3 postcss autoprefixer
npm run build:css

# FFmpeg Core (engine, MT UMD)
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

# JSZip (self-hosted)
npm pack jszip@3.10.1
tar -xf .\jszip-3.10.1.tgz
robocopy .\package\dist .\vendor\jszip jszip.min.js /NJH /NJS
rmdir /S /Q .\package

# Run (strict CSP + COOP/COEP)
npm run serve
# open http://localhost:3000
```

### Tip: FFmpeg load progress
The top banner shows `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` with a linear progress bar and a `n/3 complete` counter.

## Self-hosted JSZip (CSP-safe)
This app uses `script-src 'self' 'wasm-unsafe-eval'`. Do **not** import JSZip from a CDN.
Use the Quick Start steps above. The ESM wrapper is `/vendor/jszip.mjs` (already included).

---

## 🆕 Features in v4.0

- Added `ui-extensions.js` for modular UI improvements:
  - Displays GIF resolution before FPS metadata.
  - Shows file sizes in MB and post-conversion reduction summary (`GIF | WebP | % reduction`).
  - Collapsible “Advanced” (default closed) and “Processing Queue” (default open) sections.
  - Displays aggregate conversion time under “Processing Queue” in format:
    `Files converted in X minute(s) Y seconds`.
- Updated UI styling with lighter blue section headers.
- Updated copy text:
  - “Converter ready…” → “Ready. Please add files.”
  - Added “All files processed on local machine.”
  - Renamed “Download ZIP” → “Download ALL”.
- Removed redundant “Converted in …” line under the drop zone.

---

## 🧩 UI Extensions Module

`src/ui-extensions.js` encapsulates browser-side enhancements for the tool:

- **Resolution detection:** Determines GIF dimensions using object URLs.
- **File size management:** Displays GIF and WebP sizes, calculates percent reduction.
- **Collapsible sections:** Toggles the “Advanced” and “Processing Queue” UI.
- **Timing utilities:** Tracks and displays aggregate batch conversion time.

Exposed via `window.UIExt` for internal use in `app.js`.

---

## ⚙️ CSP Notes

- No inline scripts or `eval()` calls are used.
- All JS modules are imported via `<script type="module">`.
- Compatible with strict Content Security Policies.

---

## 🧪 Troubleshooting

- If FFmpeg fails to load: ensure `vendor/ffmpeg/` contains valid MT UMD chunks.
- If downloads fail: ensure JSZip is accessible from `vendor/jszip/`.
- For performance testing, use Chrome or Edge with multi-thread WebAssembly enabled.

---

## 🧾 License

MIT License. Use freely for both personal and commercial projects.
