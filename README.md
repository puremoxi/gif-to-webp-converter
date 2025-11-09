
# GIF → WebP Converter — v3.6 (Multi‑Thread)

This edition uses **@ffmpeg/core-mt** with Web Workers for the fastest performance. It requires you to place the **entire** UMD directory in `vendor/ffmpeg/` and to run the included COOP/COEP server.

## ⚡ Quick Start
```powershell
npm init -y
npm pack @ffmpeg/core-mt@0.12.6
tar -xf .\ffmpeg-core-mt-0.12.6.tgz
xcopy /E /I /Y ".\package\dist\umd\*" ".\vendor\ffmpeg\"
curl.exe -L "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js" -o vendor/ffmpeg/ffmpeg.js
```
Then:
```bash
node server.cjs
```
Open http://localhost:3000

### Verify in DevTools → Network
- `ffmpeg-core.worker.js` → 200
- `*.ffmpeg.js` chunks (e.g., `814.ffmpeg.js`) → 200
- No MIME/CORS errors → loader banner reaches “Converter ready.”

## Project Layout
(see also `vendor/ffmpeg/README.txt`)
- `vendor/ffmpeg/` must contain all UMD files from `@ffmpeg/core-mt@0.12.6/dist/umd/` **plus** `ffmpeg.js` (loader).
- `src/modules/ffmpegClient.js` loads `coreURL/wasmURL/workerURL` via direct URLs for reliability.
- `server.cjs` sets COOP/COEP headers.

## Switching to Single‑Thread (optional)
Use `@ffmpeg/core@0.12.6` (no worker; only JS+WASM) and remove `workerURL` in `ffmpegClient.js`. Slightly slower but no COOP/COEP needed.


---
## 🧾 Version Manifest Schema (`version.json`)

This file is **machine-readable** metadata about a given build. It is used by tools and the server to verify integrity and required assets.

```jsonc
{
  "schema_version": 1,           // Manifest schema version
  "app": {
    "name": "gif-to-webp-converter",
    "version": "3.6.2",
    "mode": "multi-threaded",    // or "single-threaded"
    "build_time_utc": "2025-11-09T22:00:00Z"
  },
  "ffmpeg": {
    "loader": "@ffmpeg/ffmpeg@0.12.10 (UMD)",
    "core": "@ffmpeg/core-mt@0.12.6 (UMD)",
    "requires_coop_coep": true,
    "required_vendor_artifacts": [
      "vendor/ffmpeg/ffmpeg.js",
      "vendor/ffmpeg/ffmpeg-core.js",
      "vendor/ffmpeg/ffmpeg-core.wasm",
      "vendor/ffmpeg/ffmpeg-core.worker.js",
      "vendor/ffmpeg/*.ffmpeg.js" // glob: at least one file must match
    ]
  },
  "artifacts": [
    { "path": "index.html", "size": 3197, "sha256": "…" },
    { "path": "server.cjs", "size": 713, "sha256": "…" },
    { "path": "README.md", "size": 2985, "sha256": "…" }
    // …etc
  ],
  "changelog": "See CHANGELOG.md in the project root for human-readable changes."
}
```

### Fields
- **schema_version**: integer, bumps if we change structure.
- **app**: product info (name, semantic version, build mode, timestamp).
- **ffmpeg**:
  - **loader**/**core**: exact versions expected.
  - **requires_coop_coep**: whether the app needs cross-origin isolation headers.
  - **required_vendor_artifacts**: list of *exact files* and/or **glob patterns** that must be present before conversions can run.
- **artifacts**: hashes & sizes of shipped source files (used by CI and support).
- **changelog**: pointer to the human-readable release notes.

---
## 🧪 Boot-time manifest validation

When you run:
```bash
node server.cjs
```
the server will:
1. Parse `version.json` and validate required fields.
2. Verify **required vendor artifacts** exist (supports the `*.ffmpeg.js` glob).
3. Print **warnings** if files are missing or if **COOP/COEP** is required but you’re not using this server.

Validation **does not stop** the server; it surfaces actionable warnings so you can fix the setup quickly.
