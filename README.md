
# GIF → WebP Converter — v3.6.6 (Option A, Multi‑Thread)

> **Important (Option A — Recommended):**  
> Serve **both** the multi-threaded engine (**@ffmpeg/core-mt@0.12.6**) and the loader (**@ffmpeg/ffmpeg@0.12.10**) **locally** from `vendor/ffmpeg/` — including the loader’s `*.ffmpeg.js` chunks.

## 🆕 What’s New in v3.6.6
- Added a **runtime check** that warns if `vendor/css/tailwind.css` is missing or still a placeholder (shows a small banner with a tip to run `npm run build:css`).
- README Quick Start now explicitly includes the Tailwind build step.
- Version bumped; changelog updated.

## Before You Begin (Windows / PowerShell)
```powershell
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## ⚡ Quick Start (Option A — Local UMD for Loader + Engine)
```powershell
# 0) Build local CSS (Fix A)
npm i -D tailwindcss@3 postcss autoprefixer
npm run build:css

# 1) Multi-threaded core (engine)
npm init -y
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# 2) Loader (ffmpeg.js + chunks)
npm pack @ffmpeg/ffmpeg@0.12.10
tar -xf .\ffmpeg-ffmpeg-0.12.10.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# 3) Verify both core and chunks exist
dir .\vendor\ffmpeg\ffmpeg-core*
dir .\vendor\ffmpeg\*.ffmpeg.js
```

Run the server with COOP/COEP headers:
```bash
npm run serve
# http://localhost:3000
```

---
## 🎨 Self-hosted Tailwind (Fix A — Recommended)
To avoid COEP/CSP issues, Tailwind is **built locally** and served from `/vendor/css/tailwind.css`.

```powershell
npm i -D tailwindcss@3 postcss autoprefixer
npm run build:css
```
`styles/input.css` → `vendor/css/tailwind.css`. `index.html` already links it.

---
## 🧾 Version Manifest Schema (`version.json`)
```jsonc
{
  "schema_version": 1,
  "app": {
    "name": "gif-to-webp-converter",
    "version": "3.6.6",
    "mode": "multi-threaded",
    "build_time_utc": "2025-11-09T23:38:33Z"
  },
  "ffmpeg": {
    "loader": "@ffmpeg/ffmpeg@0.12.10 (UMD, local)",
    "core": "@ffmpeg/core-mt@0.12.6 (UMD, local)",
    "requires_coop_coep": true,
    "required_vendor_artifacts": [
      "vendor/ffmpeg/ffmpeg.js",
      "vendor/ffmpeg/*.ffmpeg.js",
      "vendor/ffmpeg/ffmpeg-core.js",
      "vendor/ffmpeg/ffmpeg-core.wasm",
      "vendor/ffmpeg/ffmpeg-core.worker.js"
    ]
  }
}
```

---
## 📂 Project Hierarchy
```text
gif-to-webp-converter/
├─ index.html
├─ server.cjs
├─ package.json
├─ validateManifest.cjs
├─ README.md
├─ CHANGELOG.md
├─ version.json
│
├─ vendor/
│  ├─ css/
│  │  └─ tailwind.css        # built by npm run build:css
│  └─ ffmpeg/
│     ├─ ffmpeg.js
│     ├─ ffmpeg-core.js
│     ├─ ffmpeg-core.wasm
│     ├─ ffmpeg-core.worker.js
│     ├─ 814.ffmpeg.js
│     ├─ 936.ffmpeg.js
│     ├─ … (other *.ffmpeg.js chunks)
│     └─ README.txt
│
└─ src/
   ├─ app.js
   └─ modules/
      ├─ ffmpegClient.js
      ├─ gifInfo.js
      ├─ queueManager.js
      └─ ui.js
```
