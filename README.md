# Image → WebP Converter --> v4.1 (Multi-Thread, CSP-Compliant)

A self-contained browser-based image → WebP converter powered by FFmpeg WASM (multi-threaded).  
All processing is performed locally — no files are uploaded.

## About This Application

### What is WebP?

WebP is a modern image format developed by Google that supports both lossy and lossless compression, as well as animation. It is designed to create smaller, richer images that make the web faster, offering significantly better compression than either GIF or PNG.

* **For more information:** [https://en.wikipedia.org/wiki/WebP](https://en.wikipedia.org/wiki/WebP)

### What is FFmpeg?

FFmpeg is a powerful, free, and open-source software project capable of handling virtually any multimedia format. This application uses a WebAssembly (WASM) version of FFmpeg, which allows it to run complex video and image processing tasks directly in your browser.

* **For more information:** [https://en.wikipedia.org/wiki/FFmpeg](https://en.wikipedia.org/wiki/FFmpeg)

---

## 🚀 Usage

## Quick Start (Windows / PowerShell)

1. download repository.
2. Navigate to the root directory of the repository (gif-to-webp-converter)
```
//powershell

cd $HOME\OneDrive\Documents\GitHub\gif-to-webp-converter\
```
3. Run program (strict CSP + COOP/COEP)
```
//powershell

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run serve
```
4. Open http://localhost:3000 in a browser.

---

## 🆕 Features --> v.4.1

- Basic Features
  - Converts GIF, PNG, and JPG/JPEG files to WebP (animated files & still images)
  - Batch conversions (multiple files simultaneously)
  - Multithreaded for speed and efficiency
  - Download Converted Files
  - Individual WebP files (Download text link on each file Queue)
  - Multiple files as Zip File (Download ALL button)
  - Add/Remove files in the Processing Queue
- Data Points per File
  - file size of original Gif file
  - file size of resulting converted WebP file
  - % reduction / difference between size of WebP vs. original GIF
  - resolution of Gif File
  - FPS of Gif File
  - Frame Duration (# of frames in an animated Gif)
  - indication of animation sequence or still image
- Data Point overall  
  - total time to convert all files in a batch
- Advanced WebP Conversion Features
  - WebP Quality (0 - 100)
  - Compression Level (0-6)
  - Resize Down (Proportional): set a max width in px; image is proportionally reduced only when source is wider (no upsizing)
  - Loop Animation (loop indefinitely vs. no looping)
  - Still Image (optimizes conversion for still images)
  - Lossless Compression (if not checked then Lossy)
  - Mixed Compression (combined Lossless and Lossy Compression based on content)

---

## 🆕 How it works --> v.4.1

1. Open http://localhost:3000 in a browser.

![image info](./images/GIF_WebP_Converter_UI_A_v001.png)
---
2. Drag and Drop GIF, PNG, or JPG/JPEG files in DROP AREA. (or click on drop area and search for files you want to convert)

![image info](./images/GIF_WebP_Converter_UI_B_v001.png)
---
3. Make changes to how you would like to process/convert your images in the Advanced Section by clicking on the bar titled "Advanced" and expanding to see the options. (NOTE: the defaults work well 90% of the time.)

![image info](./images/GIF_WebP_Converter_UI_C_v001.png)
---
4. Press "Start Conversion" button to begin processing your images/animated gifs.

![image info](./images/GIF_WebP_Converter_UI_D_v001.png)
---
5. When an item is completed in the queue, a "Download" link will appear underneath the thumbnail. When all items in the queue are complete, the "Download All" button will activate. You can download your converted files either way.

![image info](./images/GIF_WebP_Converter_UI_E_v001.png)

---

## 🆕 ChangeLog --> v.4.1

**Feature Enhancements**  
- Added ability to **remove individual files** from the processing queue before conversion:  
  - Each queued item now includes a **“Remove”** link (styled identically to “Download”).  
  - Clicking “Remove” instantly hides the item from the UI and excludes it from processing.  
  - All “Remove” links automatically hide when conversion begins.  
- **Per-file download improvements:**  
  - Each “.webp” download filename now appends a timestamp in `_MMDDYYYY_HHMM` format (e.g. `clip_v001_11112025_0655.webp`).  
- **Batch download improvements:**  
  - “Download ALL” zip files now include a timestamped suffix in the same format  
    (e.g. `converted_webp_files_11112025_064025.zip`).  
- **Header and layout refinements:**  
  - “Advanced” and “Processing Queue” headers are now centered.  
  - Clear Queue also clears any displayed “Files converted in …” aggregate timing message.  
- Internal updates to `ui-extensions.js` and `app.js` to support placement consistency between “Remove” and “Download”, and improve dynamic filename updates.


---
## 📂 Project Hierarchy

```text
gif-to-webp-converter/
├─ index.html
├─ server.cjs                   # Local Node server with COOP/COEP + CSP headers
├─ package.json
├─ package-lock.json            # Auto-generated by npm (optional in Git)
├─ version.json
├─ README.md
├─ CHANGELOG.md
│
├─ vendor/
│  ├─ css/
│  │  └─ tailwind.css           # Built via `npm run build:css`
│  ├─ ffmpeg/
│  │  ├─ README.txt             # Included so folder exists pre-populated
│  │  ├─ ffmpeg.js              # (you copy in)
│  │  ├─ ffmpeg-core.js         # (you copy in)
│  │  ├─ ffmpeg-core.wasm       # (you copy in)
│  │  ├─ ffmpeg-core.worker.js  # (you copy in)
│  │  ├─ 814.ffmpeg.js          # Loader chunk(s). Count may vary by version.
│  ├─ jszip/
│  │  └─ jszip.min.js           # Self-hosted JSZip (added via npm pack)
│  └─ jszip.mjs                 # ESM wrapper that re-exports window.JSZip
│
├─ src/
│  ├─ app.js                    # Main app logic and event handlers
│  ├─ boot.js                   # FFmpegWASM bootstrap (no inline script)
│  └─ modules/
│     ├─ ffmpegClient.js        # FFmpeg integration
│     ├─ gifInfo.js             # GIF metadata parsing
│     ├─ queueManager.js        # Conversion queue control
│     └─ ui.js                  # Dropzone, banners, and progress UI
│
├─ styles/
│  └─ input.css                 # Tailwind input (source for build)
│
├─ tailwind.config.js           # Tailwind configuration
├─ postcss.config.js            # PostCSS configuration
├─ validateManifest.cjs         # Validates version.json & vendor artifacts
│
├─ node_modules/                # Auto-generated by npm install; not in zips/Git
|   ├─ tailwindcss/
|   ├─ postcss/
|   ├─ autoprefixer/
|   └─ ... (many dependencies)
|   
└─ images/                # Screencaps for README.mdc
   ├─ GIF_WebP_Converter_UI_A_v001.png
   ├─ GIF_WebP_Converter_UI_B_v001.png
   ├─ GIF_WebP_Converter_UI_C_v001.png
   ├─ GIF_WebP_Converter_UI_D_v001.png
   ├─ GIF_WebP_Converter_UI_E_v001.png
   └─ GIF_WebP_Converter_Validation_A_v001.png
```

---
## Project Structure

Here is a breakdown of what each file and folder does in this application.

### Core Application Files (`src/`)

This directory contains all the JavaScript code that makes your application work.

* `src/app.js`: This is the **main controller** of the entire application. It's responsible for:
    * Loading FFmpeg.
    * Setting up all the main event listeners (drag-and-drop, file input, Start, Clear, Download All).
    * Initializing the conversion queue from `queueManager.js`.
    * Grabbing the user's settings (like quality, loop, etc.) from the UI.
    * Telling the queue to start when the "Start Conversion" button is clicked.
* `src/boot.js`: This is a tiny helper script. Its only job is to load the main `app.js` file as a "module" (`<script type="module">`). This is required to use modern `import` and `export` features.

### Core Logic Modules (`src/modules/`)

These files break the application's logic into clean, reusable pieces.

* `src/modules/ffmpegClient.js`: This is the **conversion engine**. It's the only file that knows how to talk to the FFmpeg library.
    * `initFFmpeg`: Loads the FFmpeg WebAssembly files from `/vendor/ffmpeg/`.
    * `convertToWebP`: Takes a GIF file and your settings, runs the `ffmpeg` command, and reports progress.
* `src/modules/ui.js`: This file is responsible for **all changes to the web page**. It doesn't know *how* to convert a file, but it knows how to *show* the process.
    * It creates the file items in the queue when you drop them.
    * It updates the progress bar (`updateItemProgress`).
    * It changes the status from "Queued" to "Processing" to "Converted".
    * It creates the "Download" link for a finished file (`setItemConverted`).
    * It shows error messages (`setItemError`).
    * It controls the pop-up banner that appears while FFmpeg is first loading.
* `src/modules/queueManager.js`: This file manages the **list of files** to be converted.
    * It lets you add files to the queue.
    * Its `run` function starts all the conversion tasks in parallel.
    * Its `clear` function removes all files from the UI.
* `src/modules/gifInfo.js`: This is a utility that **reads GIF metadata**. It quickly reads the file to get information like frame count and framerate (FPS) *without* needing to use the heavy FFmpeg library. This is why you see that info instantly when you add a file.
* `src/ui-extensions.js` & `src/modules/perFrameMixer.js`: These files are **currently not used** in the application. They are likely placeholders or remnants from an earlier version.

### Server & Configuration

* `server.cjs`: This is your **local web server** (run via `npm run serve`). Its job is to:
    1.  Serve your `index.html` file.
    2.  Serve all your other assets (JavaScript, CSS, and the FFmpeg files).
    3.  Set the special `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` security headers. These are **required** by browsers to enable `SharedArrayBuffer`, which FFmpeg.js needs for performance.
* `package.json`: This is the project's **manifest**. It lists your project's dependencies (like Tailwind CSS) and defines your `npm` scripts (`serve`, `build:css`).
* `index.html`: The **single HTML page** for the entire application. It contains the HTML structure for the dropzone, buttons, settings panel, and the results list.

### Styling & Vendor Files

* `styles/input.css`: This is your **source CSS file**. You write your Tailwind directives here (like `@tailwind base;`).
* `vendor/css/tailwind.css`: This is the **output CSS file** that is actually loaded by `index.html`. It is the generated result of running `npm run build:css`.
* `tailwind.config.js`: The **configuration file for Tailwind CSS**.
* `postcss.config.js`: The configuration file for PostCSS, the tool that runs Tailwind.
* `vendor/ffmpeg/`: This folder contains the **pre-compiled FFmpeg.js library**. These are the "magic" files that perform the actual conversion.
* `vendor/jszip/`: This folder contains the **JSZip library**, which is used by the "Download All" button to create a `.zip` file in your browser.

---
## 🧩 Additional Details

### Tip: FFmpeg load progress
The top banner shows `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` with a linear progress bar and a `n/3 complete` counter.

### Troubleshooting
- If FFmpeg fails to load: ensure `vendor/ffmpeg/` contains valid MT UMD chunks.
- If downloads fail: ensure JSZip is accessible from `vendor/jszip/`.
- For performance testing, use Chrome or Edge with multi-thread WebAssembly enabled.

### Self-hosted JSZip (CSP-safe)
This app uses `script-src 'self' 'wasm-unsafe-eval'`. Do **not** import JSZip from a CDN. Use the Quick Start steps above. The ESM wrapper is `/vendor/jszip.mjs` (already included).

### UI Extensions Module

`src/ui-extensions.js` encapsulates browser-side enhancements for the tool:

- **Resolution detection:** Determines GIF dimensions using object URLs.
- **File size management:** Displays GIF and WebP sizes, calculates percent reduction.
- **Collapsible sections:** Toggles the “Advanced” and “Processing Queue” UI.
- **Timing utilities:** Tracks and displays aggregate batch conversion time.

Exposed via `window.UIExt` for internal use in `app.js`.

### CSP Notes

- No inline scripts or `eval()` calls are used.
- All JS modules are imported via `<script type="module">`.
- Compatible with strict Content Security Policies.

---

## "Build From Scratch" (Windows / PowerShell)
**(do at your own risk)**<br>

Although the repository has all of the files needed to run properly using Google Chrome in Windows, if you want are looking to use this application in other browsers or on other OS's , I wanted to share how you can rebuild key components of the relied upon structure in the manner below (only showing windows OS currently). The localization of these elements reflect the desire of the tool to operate within a limited environment. There is a world where the tool could dynamically load or make calls to these services but that is not the intention of this tool. 

```
//powershell

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
## Validation (what to expect)

This is a limited diagnostic tool that confirms:
1. the existence of necessary files per the aforementioned "build from scratch"
2. the file size of said files are within range as expected to ensure that errors like downloading HTML files vs. the source js does not accidentally happen.

![image info](./images/GIF_WebP_Converter_Validation_A_v001.png)

---
## 🧾 License

MIT License. Use freely for both personal and commercial projects.
