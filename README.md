
# GIF to WebP Converter (Browser + FFmpeg WASM)

Convert animated GIFs into optimized WebP files **locally** in your browser. Nothing is uploaded.

---

## Quick Start

> 💡 **Tip: FFmpeg Load Progress Bar**  
> On first open, FFmpeg must load in your browser. You’ll see a **blue progress bar** below the drop area with **(1/3 → 3/3)** and percent. It’s cached after the first run, so future loads are fast.

### Where to browse after starting your server

After starting the server **from the project folder**, open:
```
http://localhost:3000/
```
If you started the server from a **parent folder**, navigate to the subpath where your `index.html` lives, for example:
```
http://localhost:3000/OneDrive/Documents/GitHub/gif-to-webp-converter/index.html
```

### Windows (PowerShell / Windows Terminal)
Run the static server **from the project folder** so `index.html` is at the server root.

**Option A — npx (recommended)**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx serve .
# then open http://localhost:3000/
```

**Option B — Python**
```powershell
python -m http.server 3000
# then open http://localhost:3000/
```

**Option C — Global serve**
```powershell
npm i -g serve
serve .
```

### macOS / Linux
```bash
npx serve .
# or
python3 -m http.server 3000
# or
npm i -g serve && serve .
```

---

## What to Expect When You Click “Start Conversion”

1) Each file in the queue displays a **progress bar** (0 → 100%).  
2) Your selected settings—**Loop**, **Lossless**, **Still**, **Quality**, **Compression Level**, etc.—are applied.  
3) Once a file finishes, a **Download** link appears on its row.  
4) After all files complete, click **Download ZIP** to grab everything together.  
5) If **Mixed Compression** is enabled, the converter will prefer the smaller/best result (lossy vs. lossless) unless per‑frame mixing is configured.

---

## Features

- In‑app FFmpeg banner with **percent** + **(X/3)** file step
- Thumbnails (FFmpeg or canvas fallback) for queued items
- Queue metadata: **fps**, **frame count (0000)**, **animation/still**
- Mutually‑exclusive toggles: Lossless ↔ Mixed, Loop ↔ Still
- One‑click **Download ZIP** (JSZip)
- ES Modules layout

---

## Troubleshooting

### PowerShell: “running scripts is disabled”

If you see:
```
File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled...
```

**Temporary (recommended)**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npx serve .
```

**Permanent for your account**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
npx serve .
```

**Use Command Prompt (cmd.exe) instead**
```cmd
npx serve .
```

### Engine fails to load
- Ensure CDN access (`unpkg.com`). If blocked, swap to `cdn.jsdelivr.net` in `src/modules/ffmpegClient.js` (the `coreBase` URL).
- Try Incognito (disable extensions), then hard refresh with cache bypass.
- Check DevTools → Network for status codes; confirm all **three** files load:
  - `ffmpeg-core.js`
  - `ffmpeg-core.wasm`
  - `ffmpeg-core.worker.js`

---

## License

MIT © 2025
