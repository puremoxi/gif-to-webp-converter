
# GIF → WebP Converter — v3.6.4 (Option A, Multi‑Thread)

> **Important (Option A — Recommended):**  
> Serve **both** the multi-threaded engine (**@ffmpeg/core-mt@0.12.6**) and the loader (**@ffmpeg/ffmpeg@0.12.10**) **locally** from `vendor/ffmpeg/` — including the loader’s `*.ffmpeg.js` chunks.

## Before You Begin (Windows / PowerShell)
```powershell
# Open PowerShell in your project root (folder with index.html)
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\

# If PowerShell blocks scripts in this session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## ⚡ Quick Start (Option A — Local UMD for Loader + Engine)
```powershell
# 1) Multi-threaded core (engine)
npm init -y
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# 2) Loader (ffmpeg.js + chunks)
npm pack @ffmpeg/ffmpeg@0.12.10
tar -xf .\ffmpeg-0.12.10.tgz
robocopy .\package\dist\umd .\vendor\ffmpeg *.* /E /NJH /NJS
rmdir /S /Q .\package

# 3) Verify both core and chunks exist
dir .\vendor\ffmpeg\ffmpeg-core*
dir .\vendor\ffmpeg\*.ffmpeg.js
```

Run the server with COOP/COEP headers:
```bash
node server.cjs
```
Open http://localhost:3000 and check DevTools → Network:
- `ffmpeg-core.worker.js`, `ffmpeg-core.js`, `ffmpeg-core.wasm` → **200**
- Multiple `*.ffmpeg.js` chunk files → **200**
- Loader banner reaches “Converter ready. Please add files.”

---
## 🧾 Version Manifest Schema (`version.json`)

```jsonc
{
  "schema_version": 1,
  "app": { "name": "gif-to-webp-converter", "version": "3.6.4", "mode": "multi-threaded", "build_time_utc": "..." },
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
  },
  "artifacts": [ { "path": "index.html", "size": 0, "sha256": "…" } ],
  "changelog": "See CHANGELOG.md"
}
```

---
## 📂 Project Hierarchy
```text
gif-to-webp-converter/
├─ index.html
├─ server.cjs                   # COOP/COEP headers
├─ package.json
├─ validateManifest.cjs
├─ README.md
├─ CHANGELOG.md
├─ version.json
│
├─ vendor/
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
