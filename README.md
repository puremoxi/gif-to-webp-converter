# Shrink Ray --> v5.1 (Presets, Expanded Formats, Multi-Thread)

A self-contained browser-based image and video converter powered by FFmpeg WASM (multi-threaded).  
All processing is performed locally — no files are uploaded.

---

## Contents

- [About This Application](#about)
  - [What is WebP?](#what-is-webp)
  - [What is AVIF?](#what-is-avif)
  - [What is FFmpeg?](#what-is-ffmpeg)
- [Usage](#usage)
  - [Quick Start — Option 01 (Windows / PowerShell)](#quick-start-option-01)
- [Features v5.1](#features)
- [How It Works v5.1](#how-it-works)
- [ChangeLog v5.1](#changelog)
- [Developer Reference](#developer-reference)
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
    - [Self-hosted JSZip (CSP-safe)](#self-hosted-jszip)
    - [UI Extensions Module](#ui-extensions-module)
    - [CSP Notes](#csp-notes)
  - [Desktop Executable — Explorer Icon Limitation](#desktop-executable--explorer-icon-limitation)
  - [Build From Scratch (Windows / PowerShell)](#build-from-scratch)
  - [Validation](#validation)
- [License](#license)

---

<a id="about"></a>

## About This Application

<a id="what-is-webp"></a>

### What is WebP?

WebP is a modern image format developed by Google that supports both lossy and lossless compression, as well as animation. It is designed to create smaller, richer images that make the web faster, offering significantly better compression than either GIF or PNG.

- **For more information:** [https://en.wikipedia.org/wiki/WebP](https://en.wikipedia.org/wiki/WebP)

<a id="what-is-avif"></a>

### What is AVIF?

AVIF is a modern image format based on the AV1 codec. It is often very efficient for still images and is now available as an output option in Shrink Ray.

- **For more information:** [https://en.wikipedia.org/wiki/AVIF](https://en.wikipedia.org/wiki/AVIF)

<a id="what-is-ffmpeg"></a>

### What is FFmpeg?

FFmpeg is a powerful, free, and open-source software project capable of handling virtually any multimedia format. This application uses a WebAssembly (WASM) version of FFmpeg, which allows it to run complex video and image processing tasks directly in your browser.

- **For more information:** [https://en.wikipedia.org/wiki/FFmpeg](https://en.wikipedia.org/wiki/FFmpeg)

---

<a id="usage"></a>

## 🚀 Usage

<a id="quick-start-option-01"></a>

## Quick Start - Option 01 (Windows / PowerShell)

Use this option when you are running the tool from a Windows-based project folder or from a Windows-use copy of the repository.

1. Download or clone the repository.
2. Navigate to the root directory of the repository (`gif-to-webp-converter`).

```powershell
cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
```

3. Run the program with strict CSP + COOP/COEP headers.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run serve
```

4. Open the local app in a browser.

```text
http://localhost:3000
```

---

<a id="features"></a>

## 🆕 Features --> v5.1

- Basic Features
  - Converts GIF, PNG, JPG/JPEG, WebP, BMP, TIFF, APNG, ICO, TGA, SVG, MP4, MOV, and WebM files to WebP or AVIF.
  - SVG files are automatically rasterized to PNG before conversion.
  - Video files (MP4, MOV, WebM) are converted to animated WebP, or still WebP/AVIF from the first frame.
  - Batch conversions (multiple files simultaneously)
  - Multithreaded for speed and efficiency
  - Automatic per-file download immediately after conversion completes.
  - Individual converted files remain available through the "Download" link on each Queue item.
  - Multiple files as Zip File (Download ALL button)
  - Add/Remove files in the Queue
  - Clear Queue is enabled only when queued items exist.
- Data Points per File
  - File size of original file
  - File size of resulting converted file
  - % reduction / difference between converted file vs. original file
  - Resolution of source file
  - FPS of animated inputs
  - Frame count of animated inputs
  - Duration (seconds) of animated inputs
  - Indication of animation sequence or still image
- Data Points Overall
  - Total time to convert all files in a batch
- Settings — File Output
  - Output Folder dropdown: Same As Source or Select Folder.
  - Select Folder uses the browser File System Access API where supported; otherwise the browser's normal download behavior is used.
  - File Format dropdown: WebP or AVIF.
  - WebP uses the existing stable FFmpeg core in `vendor/ffmpeg/`.
  - AVIF uses an isolated AVIF-only WASM engine in `vendor/jsquash-avif/`; WebP remains on the existing FFmpeg core.
- Settings — Quality & Compression
  - Quality (0–100), mapped to WebP qscale or AVIF CRF as appropriate.
  - Compression Level (0–6)
- Settings — Animation & Mode
  - Loop Animation (WebP only; disabled for AVIF)
  - Lossless Compression (WebP only; disabled for AVIF)
  - Mixed Compression (WebP only; disabled for AVIF)
- Settings — Animated Output
  - Max FPS: caps output frame rate for animated inputs (GIF, APNG, video). Lower values reduce file size significantly.
  - Max Duration (sec): trims animated output to a set number of seconds. Applies to video, GIF, and APNG inputs.
- Settings — Dimensions & File Size
  - Do Not Change Dimensions toggle
  - Keep Alpha Channel toggle: preserves or strips transparency in the output.
  - Max Height Constraint toggle + slider (px)
  - Max Width Constraint toggle + slider (px)
  - Target File Size toggle + slider (KB): auto-adjusts quality via binary search to hit the target. Overrides the quality slider.
- Presets
  - Save any combination of settings as a named preset using the **Save As** button in the Settings panel.
  - Load a saved preset by selecting it from the Preset dropdown — settings apply immediately.
  - Delete any saved preset using the **Delete** button (disabled for Default).
  - **Reset** button restores all settings to factory defaults and snaps the dropdown back to Default.
  - Presets are stored as individual JSON files on the user's machine at `%APPDATA%\ShrinkRay\presets\` (Windows) or `~/.config/ShrinkRay/presets/` (Mac/Linux).
  - Preset operations (save, delete, errors) are always logged to the Diagnostics panel.
- UI and Usability
  - Preset bar at the top of the Settings panel: dropdown, Save As, Delete, Reset.
  - Editable numeric value fields next to sliders; typed values update sliders dynamically.
  - Slider number inputs hide native up/down spinner buttons for a cleaner UI.
  - Diagnostics uses a switch/toggle instead of a checkbox.
  - Diagnostics, Queue, Settings, and action button colors were refined for a quieter slate UI.
  - Queue progress, file names, and status use the Shrink Ray header color.
  - Dropzone and header helper popups were simplified and restyled.
  - Video files show a thumbnail extracted from the first frame.
  - Non-decodable formats display a styled placeholder tile with the file extension.
- Desktop Executable (v5.1)
  - Self-contained Windows `.exe` built with `@yao-pkg/pkg` — no Node.js required on the user's machine.
  - All assets (HTML, JS, WASM, CSS) embedded directly in the binary.
  - Opens the default browser automatically on launch and binds to `127.0.0.1` only.
  - Preset storage directory is created automatically on first launch and printed to the terminal.
  - Shrink Ray icon displayed in the browser UI header above the app name.
  - Inno Setup installer script included for optional packaged distribution.

---

<a id="how-it-works"></a>

## 🆕 How it works --> v5.1

**1. Open the app — the interface loads ready to accept files.**

The Shrink Ray interface loads with a Drag & Drop zone and collapsed Settings, Diagnostics, and Queue panels. The status badge reads "Ready. Please add files." The conversion engine loads in the background; once ready, the **Start Conversion** button becomes active.

![Shrink Ray — empty state](./images/UI_v51_01_landing.png)

---

**2. Drop your files onto the drop zone (or click to browse).**

Drag GIF, PNG, JPG, WebP, BMP, TIFF, APNG, ICO, TGA, SVG, MP4, MOV, or WebM files directly onto the drop zone. Each file becomes a card in the Queue showing its filename, file size, resolution, frame count, FPS, duration, and whether it is an animation or still image. The **×** button on each card lets you remove individual files before conversion starts.

![Shrink Ray — files added to queue](./images/UI_v51_04_files_queued.png)

---

**3. (Optional) Expand Settings to configure the conversion.**

Click the **Settings** bar to reveal all conversion controls. See the [Settings Reference](#settings-reference) below for a description of each option. The defaults work well for most files — Quality 90, WebP output, Max Width 1200 px, Max FPS 24.

At the top of the panel is the **Preset bar**:

- Select a saved preset from the dropdown to instantly apply a full configuration.
- Adjust any settings and click **Save As** to store your current configuration as a named preset.
- Click **Delete** to remove the currently selected preset.
- Click **Reset** to restore all settings to factory defaults and snap the dropdown back to Default.

![Shrink Ray — Settings panel open](./images/UI_v51_02_settings_open.png)

---

**4. Click "Start Conversion" to begin processing.**

Files are converted sequentially. Each card shows a live progress bar and percentage counter as its file is processed. Completed files show their size summary immediately — you can download them while the remaining files are still converting.

![Shrink Ray — conversion in progress](./images/UI_v51_06_converting.png)

---

**5. Review results and download your converted files.**

When each file finishes, its card updates to **Converted** and shows three data points: original file size, output file size, and the percent change. Use the **download icon** on each card to save that file, or use **Download ALL** to package every converted file into a single timestamped zip.

![Shrink Ray — conversion complete](./images/UI_v51_07_complete.png)

### Size reduction vs. size increase

- **↓ reduction** (e.g., `148 KB | 42 KB | ↓ 71.6%`) — the converted file is smaller than the original. This is the expected outcome for most PNG, GIF, BMP, TIFF, and video inputs when converting to WebP or AVIF.
- **↑ larger** (shown in orange, e.g., `890 KB | 1140 KB | ↑ 28.1% larger`) — the converted file is larger than the original. This can happen when the source is already a highly compressed format (such as a small JPEG or a previously optimized WebP) and the output settings add overhead (e.g., lossless mode or a high quality value). To reduce this, lower the Quality slider, disable Lossless Compression, or switch output formats.

Both outcomes are normal — Shrink Ray always reports the true sizes so you can make an informed decision about which output to keep.

---

<a id="settings-reference"></a>

### Settings Reference

![Shrink Ray — Settings panel](./images/UI_v51_03_settings_panel.png)

| Section | Control | What it does |
|---|---|---|
| **Preset** | Dropdown | Select a saved preset to instantly apply all stored settings. |
| **Preset** | Save As | Save the current settings as a named preset stored on disk. |
| **Preset** | Delete | Remove the currently selected preset (disabled for Default). |
| **Preset** | Reset | Restore all settings to factory defaults. |
| **File Output** | Output Folder | **Same As Source** saves each output file next to its source. **Select Folder** lets you choose a destination folder via the browser File System Access API. |
| **File Output** | File Format | Choose **WebP** (default, best compatibility) or **AVIF** (often smaller for still images). WebP-only options (Lossless, Mixed, Loop) are disabled when AVIF is selected. |
| **Quality & Compression** | Quality (0–100) | Controls lossy compression strength. Higher values preserve more detail at larger file sizes. Maps to WebP `qscale` or AVIF `CRF`. Default: 90. |
| **Quality & Compression** | Compression Level (0–6) | Controls the encoding effort. Higher values produce smaller files but take longer. Default: 6. |
| **Animation & Mode** | Loop Animation | When on, animated WebP outputs loop continuously. WebP only. |
| **Animation & Mode** | Lossless Compression | Encodes the output losslessly (no quality loss, larger file). WebP only. |
| **Animation & Mode** | Mixed Compression | Allows the encoder to mix lossy and lossless frames per-frame for animated outputs. WebP only. |
| **Animated Output** | Max FPS | Caps the output frame rate for animated inputs (GIF, APNG, video). Reducing FPS is one of the most effective ways to reduce animated file size. Default: 24. |
| **Animated Output** | Max Duration (sec) | Trims animated output to a maximum length in seconds. Useful for keeping looping GIFs short. Default: 3600 (effectively no limit). |
| **Dimensions & File Size** | Do Not Change Dimensions | When on, the output is not resized regardless of Max Width or Max Height settings. |
| **Dimensions & File Size** | Keep Alpha Channel | When on, transparency is preserved in the output. When off (default), the alpha channel is stripped, which can reduce file size for images that do not need transparency. |
| **Dimensions & File Size** | Max Height Constraint | When enabled, the output is scaled down (maintaining aspect ratio) so its height does not exceed the slider value. Default: 1080 px. |
| **Dimensions & File Size** | Max Width Constraint | When enabled (default), the output is scaled down (maintaining aspect ratio) so its width does not exceed the slider value. Default: 1200 px. |
| **Dimensions & File Size** | Target File Size | When enabled, quality is automatically adjusted via binary search to hit the target size in KB. Overrides the Quality slider. Useful for hitting a specific file size budget. |

---

<a id="changelog"></a>

## 🆕 ChangeLog --> v5.1

### Changes in v5.1 (June 2026)

#### Presets
- Added a **Preset bar** at the top of the Settings panel containing four controls: a dropdown, **Save As**, **Delete**, and **Reset**.
- Users can save any combination of settings as a named preset via **Save As** (prompts for a name).
- Selecting a preset from the dropdown immediately applies all saved settings to the UI.
- **Delete** removes the currently selected preset (disabled when Default is selected).
- **Reset** restores all settings to factory defaults and snaps the dropdown back to Default at any time.
- Presets are stored as individual `.json` files at `%APPDATA%\ShrinkRay\presets\` on Windows, or `~/.config/ShrinkRay/presets/` on Mac/Linux.
- The preset storage directory is created automatically on first launch; the path is printed to the terminal on startup.
- All preset operations (save attempt, save success, delete attempt, delete success, errors) are now always logged to the Diagnostics panel regardless of whether the diagnostic toggle is on.
- Preset save errors now include the underlying server-side error message (e.g., filesystem error detail) rather than a generic failure string.

#### Expanded Input Formats
- Added support for BMP, TIFF, APNG, ICO, TGA, and SVG still image formats.
- Added support for MP4, MOV, and WebM video formats — converted to animated WebP, or still WebP/AVIF from the first frame.
- SVG files are automatically rasterized to PNG internally before being passed to the conversion engine.
- Video files display a thumbnail extracted from the first frame in the Queue card.
- Non-decodable formats (formats the browser cannot natively render) display a styled placeholder tile showing the file extension.

#### New Settings Controls
- Added **Keep Alpha Channel** toggle: when off (default), transparency is stripped for smaller output files; when on, transparency is preserved in the WebP or AVIF output.
- Added **Max FPS** slider (Animated Output section): caps the output frame rate for animated inputs. Lower values meaningfully reduce file size for GIFs and video.
- Added **Max Duration (sec)** slider (Animated Output section): trims animated output to a maximum number of seconds. Applies to video, GIF, and APNG.

#### Media Info
- Replaced the GIF-only metadata reader with a unified `mediaInfo.js` module that extracts resolution, FPS, frame count, and duration for all supported animated formats.
- Duration and width from queued files now dynamically set the Max Duration and Max Width slider maximums to match the actual content in the queue.

#### Conversion Stability
- Added a 15-second timeout around the internal FFmpeg virtual filesystem write step (`writeFile`) to prevent silent indefinite hangs on certain file formats.
- Added a `Loading: <filename> → <format>` diagnostic log entry immediately before the write step, making it possible to pinpoint exactly where a conversion stalls.

---

### Changes in v5.0 (June 2026)

- Added self-contained Windows desktop executable (`ShrinkRay.exe`) built with `@yao-pkg/pkg`.
- All app assets (HTML, JS, WASM, CSS) are embedded in the binary — no Node.js required on the end-user machine.
- Executable launches a local HTTP server on `127.0.0.1:3000` and opens the default browser automatically.
- Added Shrink Ray icon to the browser UI header, centered above the app name.
- Added `build/` directory with Inno Setup installer script, icon source, and desktop build documentation.
- Added `pkg.config.json` for reliable asset embedding during the pkg build.

---

### Changes Since the February 16 Update (v4.2)

- Rebranded the browser UI from "Image → WebP Converter" / "PicPress" to **Shrink Ray**.
- Added a privacy subhead: "No upload. Privacy first. Your files are processed locally and stay on your computer."
- Added **AVIF output** alongside WebP.
- Added a **File Output** area in Settings:
  - Output Folder dropdown with Same As Source and Select Folder.
  - Folder picker field and Browse button shown only when Select Folder is chosen.
  - File Format dropdown with WebP and AVIF.
- Added **Target File Size** quality search for both WebP and AVIF conversions.
- Renamed **WebP Quality** to **Quality** and mapped it to WebP `-qscale` and AVIF `-crf`.
- Disabled WebP-only controls automatically when AVIF is selected (Lossless, Mixed, Loop).
- Added editable numeric slider value fields for Quality, Compression Level, Max Height, Max Width, and Max File Size.
- Removed native number-input spinner buttons from those value fields.
- Added Max Height Constraint and Do Not Change Dimensions controls.
- Renamed **Advanced** to **Settings** and **Processing Queue** to **Queue**.
- Added automatic Clear Queue enable/disable behavior based on queue contents.
- Refined Queue styling: file names, status, and progress bar use the Shrink Ray header color.
- Replaced the Diagnostics checkbox with a palette-matched switch/toggle.
- Restyled Diagnostics Clear and Copy buttons to match primary action-button styling.
- Added selected-folder saving through the browser File System Access API when supported.
- Added per-file **Remove** links that hide when conversion begins.
- Per-file download filenames now append a `_MMDDYYYY_HHMM` timestamp.
- "Download ALL" zip files include the same timestamp suffix.
- Settings and Queue headers are centered.
- Clear Queue also clears the aggregate timing message.

---

<a id="developer-reference"></a>

## 👨‍💻 Developer Reference

---

<a id="quick-start-option-02"></a>

### Quick Start - Option 02 (WSL Development + Windows Everyday Launcher)

Use this option only when you are actively developing the tool in WSL/Ubuntu and also want to launch it from Windows as an everyday tool.

This workflow keeps one source of truth for development:

```text
WSL / Ubuntu development repo:
/home/rmcdougal/projects/gif-to-webp-converter

Windows launcher location:
C:\Users\ryanm\tools\launchers\gif-to-webp-converter.bat
```

The Windows `.bat` file is only a launcher. It does not duplicate the source repo. It calls a small WSL runner script, which loads `nvm`, switches into the project folder, and runs `npm run serve`.

#### 1. Confirm the WSL project runs with the correct Node/npm

From WSL/Ubuntu:

```bash
cd ~/projects/gif-to-webp-converter
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

#### 2. Create the WSL runner script

From WSL/Ubuntu:

```bash
mkdir -p ~/bin

cat > ~/bin/run-gif-to-webp-converter <<'EOF'
#!/usr/bin/env bash

export NVM_DIR="$HOME/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "ERROR: nvm not found at $NVM_DIR/nvm.sh"
  exit 1
fi

cd "$HOME/projects/gif-to-webp-converter" || exit 1

echo "Using node: $(which node)"
echo "Using npm:  $(which npm)"
echo "Node version: $(node -v)"
echo "npm version:  $(npm -v)"
echo

npm run serve
EOF

chmod +x ~/bin/run-gif-to-webp-converter
```

#### 3. Test the WSL runner directly

From WSL/Ubuntu:

```bash
~/bin/run-gif-to-webp-converter
```

The server should start and print the local URL. Open the app in Windows at:

```text
http://localhost:3000
```

Stop the server with:

```text
Ctrl+C
```

#### 4. Create the Windows launcher folder

From WSL/Ubuntu:

```bash
mkdir -p /mnt/c/Users/ryanm/tools/launchers
```

#### 5. Create the Windows `.bat` launcher

From WSL/Ubuntu:

```bash
WINTOOLS="/mnt/c/Users/ryanm/tools"

cat > "$WINTOOLS/launchers/gif-to-webp-converter.bat" <<'EOF'
@echo off
wsl.exe -d Ubuntu-22.04 -- bash --noprofile --norc /home/rmcdougal/bin/run-gif-to-webp-converter
pause
EOF
```

#### 6. Launch from Windows

From Windows PowerShell:

```powershell
C:\Users\ryanm\tools\launchers\gif-to-webp-converter.bat
```

Then open:

```text
http://localhost:3000
```

#### Why this option exists

This avoids maintaining two active copies of the same repo. The recommended model is:

```text
WSL / Ubuntu repo = development source of truth
Windows tools folder = launcher and everyday access point
GitHub = remote backup and version history
```

If the launcher fails by using Windows Node/npm instead of WSL Node/npm, confirm that the runner script prints WSL `nvm` paths for both `node` and `npm`.

---

<a id="project-hierarchy"></a>

### 📂 Project Hierarchy

```text
gif-to-webp-converter/
├─ index.html
├─ launcher.cjs                 # Desktop exe entry point (pkg target)
├─ server.cjs                   # Local Node dev server with COOP/COEP headers
├─ package.json
├─ package-lock.json
├─ pkg.config.json              # Asset list for pkg bundling
├─ version.json
├─ README.md
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
   ├─ Shrink_Ray_UI_A_v001.png
   ├─ Shrink_Ray_UI_B_v001.png
   ├─ Shrink_Ray_UI_C_v001.png
   ├─ Shrink_Ray_UI_D_v001.png
   ├─ Shrink_Ray_UI_E_v001.png
   ├─ Shrink_Ray_UI_E5a_v001.png
   └─ Shrink_Ray_UI_E5b_v001.png
```

---

<a id="project-structure"></a>

### Project Structure

Here is a breakdown of what each file and folder does in this application.

<a id="core-application-files"></a>

#### Core Application Files (`src/`)

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

#### Core Logic Modules (`src/modules/`)

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

#### Server & Configuration

- `launcher.cjs`: The **desktop exe entry point** compiled by `@yao-pkg/pkg`. Serves all embedded assets from the pkg virtual snapshot, handles preset API routes (`GET/POST/DELETE /api/presets`), and opens the default browser on launch. This is the file that gets packaged — for dev use `server.cjs` instead.
- `server.cjs`: The **local dev server** (run via `npm run serve`). Serves files from disk, provides the same preset API routes, and sets the COOP/COEP headers required for SharedArrayBuffer / multi-threaded WASM.
- `package.json`: Project manifest. Defines `npm` scripts (`serve`, `build:css`, `build:exe`) and lists dev dependencies.
- `index.html`: The single HTML page. Contains the dropzone, action buttons, Settings panel (with preset bar), Diagnostics panel, and Queue.

<a id="styling-and-vendor-files"></a>

#### Styling & Vendor Files

- `styles/input.css`: Source CSS with Tailwind directives.
- `vendor/css/tailwind.css`: Built output loaded by `index.html`. Generated by `npm run build:css`.
- `tailwind.config.js`: Tailwind CSS configuration.
- `postcss.config.js`: PostCSS configuration (runs Tailwind).
- `vendor/ffmpeg/`: Stable WebP FFmpeg WASM core (multi-threaded UMD build).
- `vendor/jsquash-avif/`: Isolated AVIF WASM encoder from `@jsquash/avif`.
- `vendor/jszip/`: Self-hosted JSZip library for the Download ALL zip feature.

---

<a id="additional-details"></a>

### 🧩 Additional Details

<a id="ffmpeg-load-progress"></a>

#### Tip: FFmpeg load progress
The top banner shows `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` with a linear progress bar and an `n/3 complete` counter while the engine initializes.

<a id="troubleshooting"></a>

#### Troubleshooting
- If WebP FFmpeg fails to load: ensure `vendor/ffmpeg/` contains valid MT UMD chunks.
- If AVIF is unavailable: ensure `vendor/jsquash-avif/codec/enc/avif_enc.js` and `avif_enc.wasm` are present.
- If downloads fail: ensure JSZip is accessible from `vendor/jszip/`.
- If presets fail to save: check the terminal output for `[presets] Storage directory:` to confirm the path, and verify the directory is writable. The Diagnostics panel will always show the full error from the server.
- For performance testing, use Chrome or Edge with multi-thread WebAssembly enabled.

<a id="self-hosted-jszip"></a>

#### Self-hosted JSZip (CSP-safe)
This app uses `script-src 'self' 'wasm-unsafe-eval'`. Do **not** import JSZip from a CDN. Use the Quick Start steps above. The ESM wrapper is `/vendor/jszip.mjs` (already included).

<a id="ui-extensions-module"></a>

#### UI Extensions Module

`src/ui-extensions.js` encapsulates browser-side enhancements:

- **Resolution detection:** Determines image dimensions using object URLs.
- **File size management:** Displays source and output sizes, calculates percent reduction.
- **Collapsible sections:** Toggles Settings, Diagnostics, and Queue panels.
- **Timing utilities:** Tracks and displays aggregate batch conversion time.
- **Remove and download link management:** Wires up per-item remove and download icon buttons.

Exposed via `window.UIExt` for use in `app.js`.

<a id="csp-notes"></a>

#### CSP Notes

- No inline scripts or `eval()` calls are used.
- All JS modules are imported via `<script type="module">`.
- Compatible with strict Content Security Policies.

---

<a id="build-from-scratch"></a>

### "Build From Scratch" (Windows / PowerShell)
**(do at your own risk)**<br>

Although the repository has all of the files needed to run properly using Google Chrome in Windows, if you want to rebuild key components from source:

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

# Validate File Structure
npm run validate

# Run (strict CSP + COOP/COEP)
npm run serve
# open http://localhost:3000
```

---

### Desktop Executable — Explorer Icon Limitation

The Windows `.exe` icon visible in Explorer, the taskbar, and the Start Menu is stored in the PE (Portable Executable) resource table — a section of the binary separate from the embedded app assets. Setting it correctly from Linux/WSL requires a tool that understands the exact binary layout `@yao-pkg/pkg` produces.

#### Why the default icon appears (the green Node.js cube)

pkg produces a modified PE binary. Generic PE editors (`resedit`, `ResourceHacker`) that work on ordinary executables corrupt the pkg binary when they attempt to patch the resource section — the app stops launching entirely. The only tool confirmed safe for pkg/Electron binaries is `rcedit.exe`, which is itself a Windows executable and therefore cannot run natively on Linux or WSL without Wine.

#### Setting the icon on Windows (one-time, post-build step)

1. Download `rcedit-x64.exe` from [github.com/electron/rcedit/releases](https://github.com/electron/rcedit/releases).
2. Copy `build/icon.ico` from the WSL project to the same Windows folder as `ShrinkRay.exe`.
3. In PowerShell:

   ```powershell
   .\rcedit-x64.exe ShrinkRay.exe --set-icon icon.ico
   ```

4. Press `F5` in Explorer — the Shrink Ray icon replaces the green cube.

#### What is not affected

The Explorer icon is purely cosmetic metadata. The application inside the binary — the embedded HTML, JS, WASM, CSS, and server — is untouched. The icon displayed inside the browser (centered above "Shrink Ray" in the UI header) comes from the embedded `icons/app-icon.png` asset and works correctly on all platforms without any additional steps.

---

<a id="validation"></a>

### Validation (what to expect)

This is a limited diagnostic tool that confirms:
1. The existence of necessary files per the "build from scratch" steps above.
2. The file sizes of those files are within expected ranges, ensuring errors like accidentally downloading an HTML stub instead of the real JS file don't go unnoticed.

![image info](./images/GIF_WebP_Converter_Validation_A_v001.png)

---

<a id="license"></a>

## 🧾 License

MIT License. Use freely for both personal and commercial projects.
