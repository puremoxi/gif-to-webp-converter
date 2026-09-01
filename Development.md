# Shrink Ray — Development Notes

This file is for my own reference. It holds setup instructions, architectural decisions, and notes on non-obvious constraints that I want to preserve as the project evolves.

---

## Contents

- [Quick Start — Option 01 (Windows / PowerShell — Run from Source)](#quick-start-option-01)
- [Quick Start — Option 02 (WSL Development + Windows Everyday Launcher)](#quick-start-option-02)
- [Project Hierarchy](#project-hierarchy)
- [Project Structure](#project-structure)
  - [Core Application Files (`src/`)](#core-application-files)
  - [Core Logic Modules (`src/modules/`)](#core-logic-modules)
  - [Server & Configuration](#server-and-configuration)
  - [Styling & Vendor Files](#styling-and-vendor-files)
- [Additional Details](#additional-details)
  - [Tip: FFmpeg Load Progress](#ffmpeg-load-progress)
  - [Troubleshooting](#troubleshooting)
  - [Known Limitations](#known-limitations)
  - [Self-hosted JSZip (CSP-safe)](#self-hosted-jszip)
  - [UI Extensions Module](#ui-extensions-module)
  - [CSP Notes](#csp-notes)
- [Desktop Executable — Explorer Icon Limitation](#desktop-executable--explorer-icon-limitation)
- [Build From Scratch (Windows / PowerShell)](#build-from-scratch)
- [Validation](#validation)

---

<a id="quick-start-option-01"></a>

## Quick Start — Option 01 (Windows / PowerShell — Run from Source)

Use this option when you want to run the tool directly from a Windows clone of the repository without building the exe. Requires Node.js and npm installed on Windows.

### 1. Clone the repository

```powershell
git clone https://github.com/puremoxi/ShrinkRay.git
```

### 2. Navigate to the project folder

```powershell
cd $HOME\OneDrive\Documents\GitHub\ShrinkRay\
```

### 3. Install dependencies (first run only)

```powershell
npm install
```

### 4. Start the server

```powershell
npm run serve
```

### 5. Open the app in a browser

```text
http://localhost:3000
```

---

<a id="quick-start-option-02"></a>

## Quick Start — Option 02 (WSL Development + Windows Everyday Launcher)

Use this option only when you are actively developing the tool in WSL/Ubuntu and also want to launch it from Windows as an everyday tool.

This workflow keeps one source of truth for development:

```text
WSL / Ubuntu development repo:
/home/rmcdougal/projects/ShrinkRay

Windows launcher location:
C:\Users\ryanm\tools\launchers\ShrinkRay.bat
```

The Windows `.bat` file is only a launcher. It does not duplicate the source repo. It calls a small WSL runner script, which loads `nvm`, switches into the project folder, and runs `npm run serve`.

### 1. Confirm the WSL project runs with the correct Node/npm

From WSL/Ubuntu:

```bash
cd ~/projects/ShrinkRay
which node
which npm
node -v
npm -v
```

Expected result should point to the WSL `nvm` install, similar to:

```text
/home/rmcdougal/.nvm/versions/node/v24.13.0/bin/node
/home/rmcdougal/.nvm/versions/node/v24.13.0/bin/npm
v24.13.0
11.6.2
```

### 2. Create the WSL runner script

From WSL/Ubuntu:

```bash
mkdir -p ~/bin

cat > ~/bin/run-ShrinkRay <<'EOF'
#!/usr/bin/env bash

export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "ERROR: nvm not found at $NVM_DIR/nvm.sh"
  exit 1
fi

cd "$HOME/projects/ShrinkRay" || exit 1

echo "Using node: $(which node)"
echo "Using npm:  $(which npm)"
echo "Node version: $(node -v)"
echo "npm version:  $(npm -v)"
echo

npm run serve
EOF

chmod +x ~/bin/run-ShrinkRay
```

### 3. Test the WSL runner directly

From WSL/Ubuntu:

```bash
~/bin/run-ShrinkRay
```

The server should start and print the local URL. Open the app in Windows at:

```text
http://localhost:3000
```

Stop the server with `Ctrl+C`.

### 4. Create the Windows launcher folder

From WSL/Ubuntu:

```bash
mkdir -p /mnt/c/Users/ryanm/tools/launchers
```

### 5. Create the Windows `.bat` launcher

From WSL/Ubuntu:

```bash
WINTOOLS="/mnt/c/Users/ryanm/tools"

cat > "$WINTOOLS/launchers/ShrinkRay.bat" <<'EOF'
@echo off
wsl.exe -d Ubuntu-22.04 -- bash --noprofile --norc /home/rmcdougal/bin/run-ShrinkRay
pause
EOF
```

### 6. Launch from Windows

From Windows PowerShell:

```powershell
C:\Users\ryanm\tools\launchers\ShrinkRay.bat
```

Then open:

```text
http://localhost:3000
```

### Why this option exists

This avoids maintaining two active copies of the same repo. The recommended model is:

```text
WSL / Ubuntu repo = development source of truth
Windows tools folder = launcher and everyday access point
GitHub = remote backup and version history
```

If the launcher fails by using Windows Node/npm instead of WSL Node/npm, confirm that the runner script prints WSL `nvm` paths for both `node` and `npm`.

---

<a id="project-hierarchy"></a>

## Project Hierarchy

```text
ShrinkRay/
├─ index.html
├─ launcher.cjs                 # Desktop exe entry point (pkg target)
├─ server.cjs                   # Local Node dev server with COOP/COEP headers
├─ package.json
├─ package-lock.json
├─ pkg.config.json              # Asset list for pkg bundling
├─ version.json
├─ README.md
├─ Development.md
├─ CHANGELOG.md
│
├─ vendor/
│  ├─ css/
│  │  └─ tailwind.css           # Built via `npm run build:css`
│  ├─ ffmpeg/
│  │  ├─ README.txt
│  │  ├─ ffmpeg.js
│  │  ├─ ffmpeg-core.js
│  │  ├─ ffmpeg-core.wasm
│  │  ├─ ffmpeg-core.worker.js
│  │  ├─ 814.ffmpeg.js          # Loader chunk(s). Count may vary by version.
│  ├─ jszip/
│  │  └─ jszip.min.js           # Self-hosted JSZip
│  └─ jszip.mjs                 # ESM wrapper that re-exports window.JSZip
│
├─ src/
│  ├─ app.js                    # Main app logic and event handlers
│  ├─ boot.js                   # FFmpegWASM bootstrap (no inline script)
│  ├─ ui-extensions.js          # Collapsibles, tooltips, size summaries, timers
│  └─ modules/
│     ├─ ffmpegClient.js        # FFmpeg WebP/AVIF conversion engine
│     ├─ avifClient.js          # AVIF WASM encoder integration
│     ├─ avifWorker.js          # Off-thread AVIF encoding worker
│     ├─ mediaInfo.js           # Unified media metadata (resolution, FPS, duration)
│     ├─ presetsManager.js      # Preset CRUD (fetch API calls + applyPreset)
│     ├─ queueManager.js        # Conversion queue control
│     ├─ svgRasterizer.js       # SVG → PNG rasterization before conversion
│     ├─ ui.js                  # Dropzone, banners, queue cards, and progress UI
│     ├─ logger.js              # Diagnostic log helpers (log / logAlways)
│     └─ perFrameMixer.js       # Auxiliary per-frame mixing logic
│
├─ styles/
│  └─ input.css                 # Tailwind input (source for build)
│
├─ tailwind.config.js
├─ postcss.config.js
├─ validateManifest.cjs         # Validates version.json & vendor artifacts
│
├─ build/
│  ├─ installer.iss             # Inno Setup installer script
│  ├─ set-icon.cjs              # Patches pkg base binary with Shrink Ray icon
│  ├─ postinstall.cjs
│  ├─ icon.ico
│  └─ icon-source.png
│
├─ dist/
│  └─ ShrinkRay.exe             # Packaged Windows executable
│
├─ node_modules/                # Auto-generated; not in Git
│
└─ images/                      # Screenshots for README
   ├─ UI_v51_01_landing.png
   ├─ UI_v51_02_settings_open.png
   ├─ UI_v51_03_settings_panel.png
   ├─ UI_v51_04_files_queued.png
   ├─ UI_v51_06_converting.png
   └─ UI_v51_07_complete.png
```

---

<a id="project-structure"></a>

## Project Structure

<a id="core-application-files"></a>

### Core Application Files (`src/`)

- `src/app.js`: The **main controller** of the entire application. Responsible for:
  - Loading FFmpeg and initializing the AVIF engine check.
  - Setting up all event listeners (drag-and-drop, file input, Start, Clear, Download All).
  - Initializing the preset system on load, populating the dropdown, and wiring up Save As, Delete, and Reset.
  - Reading all user settings from the UI via `getSettings()`.
  - Dispatching conversions through the queue.
  - Auto-saving each converted file to the output folder or downloads.
- `src/boot.js`: Tiny bootstrap script. Confirms the FFmpegWASM global is available before `app.js` runs.
- `src/ui-extensions.js`: Browser-side enhancements including collapsible panels, info icon tooltips, file-size summaries, remove/download link management, clipboard copy, and aggregate batch timing display. Exposed via `window.UIExt`.

<a id="core-logic-modules"></a>

### Core Logic Modules (`src/modules/`)

- `src/modules/ffmpegClient.js`: The **WebP conversion engine**. Talks to the stable FFmpeg WASM core in `vendor/ffmpeg/`.
  - `initFFmpeg`: Loads the FFmpeg WASM core and detects AVIF encoder support.
  - `convertToWebP`: Takes a source file and settings, runs the FFmpeg command, and reports progress. Includes a 15-second timeout around the virtual filesystem write step to prevent silent hangs.
- `src/modules/avifClient.js`: The **AVIF conversion engine** using the isolated `@jsquash/avif` WASM encoder in `vendor/jsquash-avif/`.
  - `hasAvifEngineFiles`: Checks whether the AVIF WASM engine files are present.
  - `convertToAvif`: Converts still images and first-frame of animated inputs to AVIF. Supports Target File Size via quality binary search.
- `src/modules/avifWorker.js`: Runs AVIF encoding off the UI thread so slow AVIF compression does not block the interface.
- `src/modules/mediaInfo.js`: **Unified media metadata reader**. Extracts resolution, FPS, frame count, and duration for all supported animated formats (GIF, APNG, video). Replaces the older `gifInfo.js`.
- `src/modules/presetsManager.js`: **Preset management**. Provides `listPresets`, `savePreset`, `deletePreset` (fetch calls to the server's `/api/presets` endpoints) and `applyPreset` (applies a settings object to all UI form fields and dispatches the correct change events for UI sync). Exports `DEFAULT_PRESET` with all factory default values.
- `src/modules/svgRasterizer.js`: **SVG rasterization**. Converts an SVG file to PNG via a Canvas element before passing it to the conversion engine, since FFmpeg WASM does not process SVG natively.
- `src/modules/queueManager.js`: Manages the **list of files** to convert. Accepts all supported input formats, runs conversions sequentially, and exposes `add`, `run`, `remove`, and `clear`.
- `src/modules/ui.js`: Responsible for **all DOM changes**: creating queue cards, updating progress bars, setting converted status, displaying download and copy links, and controlling the FFmpeg load banner.
- `src/modules/logger.js`: Diagnostic logging helpers. `log()` writes to the Diagnostics panel only when the diagnostic toggle is on. `logAlways()` always writes regardless of toggle state (used for preset operations and critical errors).
- `src/modules/perFrameMixer.js`: Auxiliary per-frame mixing logic retained in the repo.

<a id="server-and-configuration"></a>

### Server & Configuration

- `launcher.cjs`: The **desktop exe entry point** compiled by `@yao-pkg/pkg`. Serves all embedded assets from the pkg virtual snapshot, handles preset API routes (`GET/POST/DELETE /api/presets`), and opens the default browser on launch. This is the file that gets packaged — for dev use `server.cjs` instead.
- `server.cjs`: The **local dev server** (run via `npm run serve`). Serves files from disk, provides the same preset API routes, and sets the COOP/COEP headers required for SharedArrayBuffer / multi-threaded WASM.
- `package.json`: Project manifest. Defines `npm` scripts (`serve`, `build:css`, `build:exe`) and lists dev dependencies.
- `index.html`: The single HTML page. Contains the dropzone, action buttons, Settings panel (with preset bar), Diagnostics panel, and Queue.

**Critical architectural note — `launcher.cjs` vs `server.cjs`:** Any server-side feature (API routes, middleware, static file handling) must be added to **both** files independently. The exe packages only `launcher.cjs` — `server.cjs` is never loaded by the built binary. This has caused bugs before (preset API added to `server.cjs` only → 404 in the exe). When adding new server routes, always update both files.

<a id="styling-and-vendor-files"></a>

### Styling & Vendor Files

- `styles/input.css`: Source CSS with Tailwind directives.
- `vendor/css/tailwind.css`: Built output loaded by `index.html`. Generated by `npm run build:css`.
- `tailwind.config.js`: Tailwind CSS configuration.
- `postcss.config.js`: PostCSS configuration (runs Tailwind).
- `vendor/ffmpeg/`: Stable WebP FFmpeg WASM core (multi-threaded UMD build).
- `vendor/jsquash-avif/`: Isolated AVIF WASM encoder from `@jsquash/avif`.
- `vendor/jszip/`: Self-hosted JSZip library for the Download ALL zip feature.

---

<a id="additional-details"></a>

## Additional Details

<a id="ffmpeg-load-progress"></a>

### Tip: FFmpeg Load Progress

The top banner shows `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` with a linear progress bar and an `n/3 complete` counter while the engine initializes.

<a id="troubleshooting"></a>

### Troubleshooting

- If WebP FFmpeg fails to load: ensure `vendor/ffmpeg/` contains valid MT UMD chunks.
- If AVIF is unavailable: ensure `vendor/jsquash-avif/codec/enc/avif_enc.js` and `avif_enc.wasm` are present.
- If downloads fail: ensure JSZip is accessible from `vendor/jszip/`.
- If presets fail to save: check the terminal output for `[presets] Storage directory:` to confirm the path, and verify the directory is writable. The Diagnostics panel will always show the full error from the server.
- For performance testing, use Chrome or Edge with multi-thread WebAssembly enabled.

<a id="known-limitations"></a>

### Known Limitations

- **No metadata preservation (EXIF/ICC/XMP).** Verified via `ffmpeg -h muxer=webp` — the vendored FFmpeg build's WebP muxer exposes exactly one private option (`-loop`); it has no metadata support at all, and `-map_metadata 0` was confirmed (via a real conversion round-trip with known EXIF tags) to have no effect. The AVIF path (`vendor/jsquash-avif`) is a JS/WASM encoder whose API has no metadata parameters either, and its input pipeline decodes the source through `createImageBitmap()` + canvas, which strips EXIF/ICC before the encoder ever sees the image. Preserving metadata would require manually splicing the original EXIF bytes into the output container after encoding (a WebP RIFF chunk or AVIF ISOBMFF box) — not currently implemented.

<a id="self-hosted-jszip"></a>

### Self-hosted JSZip (CSP-safe)

This app uses `script-src 'self' 'wasm-unsafe-eval'`. Do **not** import JSZip from a CDN. Use the Quick Start steps above. The ESM wrapper is `/vendor/jszip.mjs` (already included).

<a id="ui-extensions-module"></a>

### UI Extensions Module

`src/ui-extensions.js` encapsulates browser-side enhancements:

- **Resolution detection:** Determines image dimensions using object URLs.
- **File size management:** Displays source and output sizes, calculates percent reduction.
- **Collapsible sections:** Toggles Settings, Diagnostics, and Queue panels.
- **Timing utilities:** Tracks and displays aggregate batch conversion time.
- **Remove and download link management:** Wires up per-item remove and download icon buttons.

Exposed via `window.UIExt` for use in `app.js`.

<a id="csp-notes"></a>

### CSP Notes

- No inline scripts or `eval()` calls are used.
- All JS modules are imported via `<script type="module">`.
- Compatible with strict Content Security Policies.

---

<a id="desktop-executable--explorer-icon-limitation"></a>

## Desktop Executable — Explorer Icon Limitation

The Windows `.exe` icon visible in Explorer, the taskbar, and the Start Menu is stored in the PE (Portable Executable) resource table — a section of the binary separate from the embedded app assets. Setting it correctly from Linux/WSL requires a tool that understands the exact binary layout `@yao-pkg/pkg` produces.

### Why the default icon appears (the green Node.js cube)

pkg produces a modified PE binary. Generic PE editors (`resedit`, `ResourceHacker`) that work on ordinary executables corrupt the pkg binary when they attempt to patch the resource section — the app stops launching entirely. The only tool confirmed safe for pkg/Electron binaries is `rcedit.exe`, which is itself a Windows executable and therefore cannot run natively on Linux or WSL without Wine.

### Setting the icon on Windows (one-time, post-build step)

1. Download `rcedit-x64.exe` from [github.com/electron/rcedit/releases](https://github.com/electron/rcedit/releases).
2. Copy `build/icon.ico` from the WSL project to the same Windows folder as `ShrinkRay.exe`.
3. In PowerShell:

   ```powershell
   .\rcedit-x64.exe ShrinkRay.exe --set-icon icon.ico
   ```

4. Press `F5` in Explorer — the Shrink Ray icon replaces the green cube.

### What is not affected

The Explorer icon is purely cosmetic metadata. The application inside the binary — the embedded HTML, JS, WASM, CSS, and server — is untouched. The icon displayed inside the browser (centered above "Shrink Ray" in the UI header) comes from the embedded `icons/app-icon.png` asset and works correctly on all platforms without any additional steps.

---

<a id="build-from-scratch"></a>

## Build From Scratch (Windows / PowerShell)

**(do at your own risk)**

Although the repository has all of the files needed to run properly using Google Chrome in Windows, if you want to rebuild key components from source:

```powershell
cd $HOME\OneDrive\Documents\GitHub\ShrinkRay\
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

# Validate File Structure
npm run validate

# Run (strict CSP + COOP/COEP)
npm run serve
# open http://localhost:3000
```

---

<a id="validation"></a>

## Validation (what to expect)

This is a limited diagnostic tool that confirms:

1. The existence of necessary files per the "build from scratch" steps above.
2. The file sizes of those files are within expected ranges, ensuring errors like accidentally downloading an HTML stub instead of the real JS file don't go unnoticed.

![Validation output](./images/GIF_WebP_Converter_Validation_A_v001.png)
