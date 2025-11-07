
# GIF to WebP Converter

Convert animated GIFs into optimized WebP files **locally** using your browser and FFmpeg WASM.  
All processing happens on your computer — nothing is uploaded to a server.

---

## Quick Start

### Windows (PowerShell / Windows Terminal)

This project can be served locally using **Node.js (npx)**, **Python**, or **a globally installed server**.

Choose one of the following depending on what’s available or convenient for your setup:

---

#### ⚙️ Option A — `npx serve .` (Recommended)

**When to use:**  
✅ You have **Node.js installed**, but don’t want to install anything globally.  
✅ You want a **quick one-liner** that automatically launches a local web server.

**How it works:**  
`npx` comes with Node.js and lets you run any package temporarily.  
`npx serve .` spins up a tiny static server for the current folder — no permanent install, no admin rights needed.

**Command:**
```powershell
npx serve .
# Serving! http://localhost:3000
```

**Pros:**
- Zero setup beyond Node.js  
- Cleans itself up after you close the terminal  
- Ideal for quick local testing

**Cons:**
- Requires Node.js installed  
- Temporary each time (not global)

---

#### 🐍 Option B — `python -m http.server 3000`

**When to use:**  
✅ You have **Python 3** installed (common on Windows).  
✅ You prefer not to use Node.js or npm.

**How it works:**  
Python includes a built-in lightweight web server.  
The command serves the current directory on port 3000.

**Command:**
```powershell
python -m http.server 3000
# Then open http://localhost:3000
```

**Pros:**
- No Node.js required  
- Works out-of-the-box on most systems  
- Perfect for quick one-off runs

**Cons:**
- Slightly slower for large files  
- No auto-reload or compression (fine for testing)

---

#### 🌐 Option C — `npm i -g serve`

**When to use:**  
✅ You test web apps often and want a reusable command.  
✅ You’re comfortable installing global Node packages.

**How it works:**  
Installs the `serve` package globally. Afterwards, just type `serve .` in any folder.

**Command:**
```powershell
npm i -g serve
serve .
```

**Pros:**
- Persistent and convenient across projects  
- Works on all platforms (Windows/macOS/Linux)  
- Starts faster after first install

**Cons:**
- Requires admin rights for global install  
- Slightly larger footprint than npx

---

### 💡 Summary: Which Should You Choose?

| Scenario | Recommended Option |
|-----------|--------------------|
| You just want to test quickly | **A – `npx serve .`** |
| You don’t have Node.js but have Python | **B – `python -m http.server`** |
| You test often or prefer convenience | **C – `npm i -g serve`** |

---

### macOS / Linux (bash / zsh)
```bash
npx serve .
# or
python3 -m http.server 3000
# or
npm i -g serve && serve .
```

---

## How It Works

1. The app loads the **FFmpeg WebAssembly module** directly in your browser.
2. You can drag-and-drop `.gif` files into the interface.
3. Each GIF is analyzed for resolution, file size, and animated frame count.
4. FFmpeg performs the conversion locally, generating `.webp` files — all offline.
5. You can download individual files or zip all results at once.

---

## Key Features

- 🔒 100% local processing (no uploads)
- ⚡ Converts static and animated GIFs to WebP
- 🎚 Adjustable Quality, Compression Level, and Lossless Mode
- 🔁 Loop or non-loop animation control
- 🧠 Mixed Compression: per-frame lossy/lossless optimization (WebPMux WASM)
- ⏱ Accurate frame timing from parsed GIF metadata
- 📦 Batch conversion + ZIP download support
- 🧩 Fully modular ES module architecture

---

## Advanced Options

**Located under the “Advanced” dropdown:**

| Control | Description |
|----------|--------------|
| WebP Quality | Sets `-qscale` (0–100). Higher = better quality, larger file. |
| Compression Level | Sets `-compression_level` (0–6). Higher = slower, smaller file. |
| Loop Animation | Controls playback looping (`-loop 0` for infinite). |
| Still Image | Optimizes for static content using `-preset picture`. |
| Lossless Compression | Uses `-lossless 1`. Ignores quality setting. |
| Mixed Compression | Combines lossy and lossless per frame (via WebPMux). |
| Mixed Tuning Mode | Lets you fine-tune frame selection via **percentage** or **edge-score threshold**. |

---

## Development Notes

- Built with **vanilla JS (ES Modules)**, **TailwindCSS**, and **FFmpeg WASM**.
- No frameworks or build tools required — open `index.html` directly in a local web server.
- Works best in Chrome, Edge, or Firefox (due to WASM threading performance).

---

## Tested Environments

| OS | Browser | Notes |
|----|----------|-------|
| Windows 10/11 | Chrome / Edge | Full feature compatibility |
| macOS 13+ | Chrome / Safari | Full feature compatibility |
| Linux (Ubuntu 22+) | Firefox / Chromium | Works with slight delay on initial FFmpeg load |

---

## License

MIT © 2025 GIF-to-WebP Converter Team
