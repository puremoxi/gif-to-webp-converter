# 🎞️ GIF → WebP Converter — Version 3.5

A **local-only web app** for converting GIFs into WebP images using FFmpeg WebAssembly (WASM).  
No network calls or uploads — everything runs directly in your browser.

---

## 🚀 Quick Start

### 1️⃣ Download and extract
Unzip `gif-to-webp-converter-v3_5.zip` to a convenient folder.

### 2️⃣ Install FFmpeg WASM core files
Inside `vendor/ffmpeg/`, open **PowerShell** and run:

```powershell
curl.exe -L "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js" -o ffmpeg.js
curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.js" -o ffmpeg-core.js
curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.wasm" -o ffmpeg-core.wasm
curl.exe -L "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd/ffmpeg-core.worker.js" -o ffmpeg-core.worker.js
```

Expected sizes:
- `ffmpeg.js` ≈ 275 KB  
- `ffmpeg-core.js` ≈ 260 KB  
- `ffmpeg-core.wasm` ≈ 6.5 MB  
- `ffmpeg-core.worker.js` ≈ 3 KB

### 3️⃣ Start a local server
In the project root, run one of the following:

#### Option 1 — Node.js Serve
```bash
npx serve .
```
Then open `http://localhost:3000` (or whichever port appears).

#### Option 2 — Python
```bash
python -m http.server 3000
```
Then open `http://localhost:3000`.

---

## 🧩 Features

| Feature | Description |
|----------|-------------|
| 🧠 **Fully local FFmpeg WASM** | Runs entirely in your browser — no uploads, no APIs. |
| 📁 **Drag-and-drop GIFs** | Queue up one or many `.gif` files. |
| ⚙️ **Custom conversion settings** | Adjust quality, compression level, lossless mode, and looping. |
| 📊 **Live progress indicators** | Banner and per-file bars show loading and conversion progress. |
| 🖼️ **Instant thumbnails** | Generates previews for each queued GIF. |
| 🧮 **Animated info parsing** | Reads frame count, FPS, and detects still vs animated. |
| 📦 **ZIP export** | Download all converted WebPs in a single ZIP file. |

---

## 🧱 Technical Architecture

### File Structure
```
gif-to-webp-converter/
├─ index.html
├─ package.json
├─ README.md
├─ vendor/
│  └─ ffmpeg/
│      ├─ ffmpeg.js
│      ├─ ffmpeg-core.js
│      ├─ ffmpeg-core.wasm
│      └─ ffmpeg-core.worker.js
└─ src/
   ├─ app.js
   └─ modules/
       ├─ ffmpegClient.js
       ├─ gifInfo.js
       ├─ queueManager.js
       └─ ui.js
```

### Load Order & Race Condition Fixes
We explicitly load scripts in deterministic order:
```html
<script src="/vendor/ffmpeg/ffmpeg.js"></script>
<script>
  if (window.FFmpegWASM && !window.FFmpeg) window.FFmpeg = window.FFmpegWASM;
</script>
<script type="module" src="/src/app.js"></script>
```
This ensures the UMD script executes before your module imports run.

### `ffmpegClient.js` Highlights
- Tolerant to either `window.FFmpeg` or `window.FFmpegWASM`
- Safe fetch polyfill if `fetchFile` is missing
- Proper `URL.revokeObjectURL()` cleanup
- Banner progress integration
- Absolute base path (`/vendor/ffmpeg`) to avoid module-relative issues

---

## 🧠 Troubleshooting

### ❌ `Loader error · window.FFmpeg missing (UMD did not execute)`
**Cause:** Race condition — `app.js` runs before FFmpeg UMD loads.  
**Fix:** Ensure your HTML includes the `<script>` order above, and that files are in `vendor/ffmpeg/` exactly as named.

### ❌ 404 errors in console (`ffmpeg-core.js` not found)
**Cause:** Wrong file path or name.  
**Fix:** Verify file names match **exactly** and that `vendor/ffmpeg/` is served by your local server.

### ⚠️ Slow load (~10–15 seconds)
First load may take time due to `ffmpeg-core.wasm` (~6.5 MB). Subsequent loads are cached by the browser.

---

## 🧰 Advanced Customization

You can change the default FFmpeg core path by editing:
```js
const base = "/vendor/ffmpeg";
```
in `src/modules/ffmpegClient.js`.

You can also alter the default conversion settings in `src/app.js` near `getSettings()`.

---

## 📜 License
MIT License © 2025

---

## 🙌 Credits
Built with ❤️ by Ryan McDougal & ChatGPT (GPT‑5)  
Powered by [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) and [TailwindCSS](https://tailwindcss.com).
