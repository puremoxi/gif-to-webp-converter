# ShrinkRay — Claude context

Browser-based image/video converter. Node.js server (`launcher.cjs`) embeds all assets and serves them locally; the frontend is vanilla JS with FFmpeg WASM + jSquash WASM engines.

## Build & dev

```
npm run serve          # dev server (server.cjs), localhost:3000
npm run build:exe      # produces dist/ShrinkRay.exe via @yao-pkg/pkg
gh release upload v5.1.0 dist/ShrinkRay.exe --clobber  # publish
```

Wine not installed in WSL — the `[icon] Skipped` message during build is expected and harmless.

## Vendor layout

| Path | Purpose |
|------|---------|
| `vendor/ffmpeg/` | @ffmpeg/ffmpeg@0.12.10 + @ffmpeg/core-mt@0.12.6 UMD builds |
| `vendor/jsquash-avif/` | @jsquash/avif WASM encoder (optional, install separately) |
| `vendor/jsquash-heic/` | @discourse/heic WASM decoder |
| `vendor/jszip/` + `vendor/jszip.mjs` | JSZip for batch download |

`pkg.config.json` declares what gets bundled into the exe snapshot. Adding a new vendor directory requires an entry there.

## Architecture — non-obvious facts

**COOP/COEP required.** Multi-threaded FFmpeg WASM needs `SharedArrayBuffer`. Both `server.cjs` and `launcher.cjs` set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on every response. Without these, all conversions silently hang.

**Pre-processing pipeline.** SVG and HEIC/HEIF cannot go directly to FFmpeg. They are decoded first (SVG via canvas rasterization in `svgRasterizer.js`, HEIC/HEIF via `heicClient.js`), then the resulting PNG blob is handed to `_doConvertImage`. This mirrors each other and should stay that way for any future formats FFmpeg can't natively ingest.

**ArrayBuffer detachment gotcha.** `ffmpeg.writeFile(name, bytes)` transfers `bytes.buffer` to the Web Worker, detaching it. After that call, `bytes.length === 0`. Any timeout or size calculation that reads `fileBytes.length` after `writeFile` will silently get 0. Always derive sizes from `file.size` (on the original File/Blob) before calling `writeFile`.

**Engine reinit pattern.** When FFmpeg times out, `ffmpeg.terminate()` is called, which causes the FFmpeg library to throw `"called FFmpeg.terminate()"` to all in-flight operations on that instance. These errors do NOT automatically carry a `needsReinit` flag — `_tagEngineDeadError()` in `ffmpegClient.js` adds it. The reinit path in `app.js` (`catch` block on `needsReinit`) reloads the engine before the next file runs.

**Exec timeout scaling.** Non-animated stills use: `90s + 15s/MB` capped at 5 min. Animated/video uses 5 min flat. Timeouts must be cleared with `clearTimeout` in `finally` blocks — uncleaned timers will fire later and terminate an engine mid-use by a different file.

## WSL dev setup

Source lives in WSL (`~/projects/ShrinkRay`). The Windows launcher is at `C:\Users\ryanm\tools\launchers\ShrinkRay.bat` → calls `~/bin/run-ShrinkRay` in WSL. Changes to `launcher.cjs` or any vendored asset require a full `npm run build:exe` to take effect in the exe.
