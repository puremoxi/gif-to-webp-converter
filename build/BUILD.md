# Shrink Ray — Desktop Build Guide

Produces a self-contained `ShrinkRay.exe` (all assets embedded, no Node.js required
on the user's machine) and optionally a `ShrinkRay-Setup-4.2.0.exe` installer.

---

## Prerequisites

| Tool | Version | Where to get it |
|---|---|---|
| Node.js | 18 or 20 (build machine only) | https://nodejs.org |
| @yao-pkg/pkg | installed via npm | `npm install` (see step 1) |
| Inno Setup 6 | for installer only | https://jrsoftware.org/isinfo.php |

> Node.js is only needed on **your build machine** — end users do not need it.

---

## Step 1 — Install build dependencies

From the project root (WSL or Windows PowerShell):

```bash
npm install
```

This adds `@yao-pkg/pkg` (the pkg compiler) alongside the existing Tailwind devDependencies.

---

## Step 2 — (One-time) Create the app icon

The `.exe` and installer both need a Windows icon file at `build/icon.ico`.

**Option A — Use an online converter (quickest):**
1. Start with any square PNG (256×256 recommended).
2. Convert at https://www.icoconvert.com — include sizes 16, 32, 48, 256.
3. Save the result as `build/icon.ico`.

**Option B — Use ImageMagick (WSL):**
```bash
# Install if needed: sudo apt-get install imagemagick
convert source-256.png -define icon:auto-resize=256,48,32,16 build/icon.ico
```

> Without an icon the `.exe` will work fine but will show a generic Node.js icon.
> The installer script will error if `build/icon.ico` is missing — comment out
> the `SetupIconFile` line in `installer.iss` to skip it temporarily.

---

## Step 3 — Smoke-test the launcher without compiling

Verify the launcher works correctly in Node before bundling:

```bash
npm run build:exe:test
```

This runs `node launcher.cjs` directly. Your default browser should open at
`http://localhost:3000` and the app should work identically to `npm run serve`.
Press `Ctrl+C` to stop.

---

## Step 4 — Build the standalone .exe

```bash
npm run build:exe
```

What happens:
1. `@yao-pkg/pkg` reads the `pkg` config in `package.json`.
2. It compiles `launcher.cjs` and embeds all declared assets
   (`index.html`, `src/**`, `vendor/**`, `version.json`) into the binary.
3. Outputs `dist/ShrinkRay.exe` (~50–60 MB after GZip compression,
   mostly the embedded FFmpeg WASM engine).

The first run downloads the pkg Node 20 base binary (~20 MB, cached for future builds).

---

## Step 5 — (One-time) Patch the base binary for the Explorer icon

By default the output exe shows a generic Node.js green-cube icon. The fix is to
patch the **pkg base binary once** — after that, every `npm run build:exe` produces
an exe with the Shrink Ray icon automatically, with no per-release work.

### Option A — Automatic (WSL with Wine)

If Wine is installed, `npm run build:exe` already handles this. To run it standalone:

```bash
node build/set-icon.cjs
```

Wine is installed automatically on `npm install`. If it wasn't, install it first:

```bash
sudo apt-get install -y wine
```

### Option B — Manual (Windows PowerShell, one-time)

Run this once after your first build. You only need to repeat it if you clear the
pkg cache (`~/.pkg-cache`) or change the Node target version.

1. Download `rcedit-x64.exe` from
   [github.com/electron/rcedit/releases](https://github.com/electron/rcedit/releases)

2. In PowerShell:

   ```powershell
   mkdir C:\temp
   copy "\\wsl.localhost\Ubuntu-22.04\home\rmcdougal\.pkg-cache\v3.5\fetched-v20.18.0-win-x64" C:\temp\
   copy "\\wsl.localhost\Ubuntu-22.04\home\rmcdougal\projects\gif-to-webp-converter\build\icon.ico" C:\temp\
   cd C:\temp
   .\rcedit-x64.exe fetched-v20.18.0-win-x64 --set-icon icon.ico
   copy C:\temp\fetched-v20.18.0-win-x64 "\\wsl.localhost\Ubuntu-22.04\home\rmcdougal\.pkg-cache\v3.5\fetched-v20.18.0-win-x64"
   ```

3. Back in WSL, rebuild:

   ```bash
   npm run build:exe
   ```

   The output `dist/ShrinkRay.exe` will now show the Shrink Ray icon in Explorer
   and on the Desktop — no further action needed.

> **Why base binary, not the output exe?**
> rcedit uses the Windows `EndUpdateResource` API, which can struggle with large
> (76 MB) PE files — especially ones on OneDrive which holds a sync lock. The base
> binary is ~41 MB, standard Node.js PE, and lives outside OneDrive. Patching it
> once is both more reliable and permanent.
>
> **Why does rcedit fail on OneDrive?**
> OneDrive holds a background file lock on synced files. `EndUpdateResource` tries
> to rename the temp patched file over the original — the lock blocks it, causing
> "Unable to commit changes". Moving files to `C:\temp\` (outside OneDrive) before
> running rcedit avoids this entirely.

---

## Step 6 — Test the compiled .exe

```powershell
# In Windows PowerShell or by double-clicking in Explorer
.\dist\ShrinkRay.exe
```

Expected behavior:
- A small console window appears showing the Shrink Ray banner and URL.
- Your default browser opens automatically to `http://localhost:3000`.
- The full app loads and works (drag & drop, convert, download, etc.).
- Closing the console window stops the server.

> **Testing WASM multi-threading:** Open the browser DevTools Console and confirm
> there are no `SharedArrayBuffer` errors. If you see them, the COOP/COEP headers
> are not being set — check that `launcher.cjs` is setting them on every response.

---

## Step 6 — Build the installer (optional)

Requires Inno Setup 6 installed on Windows.

**Option A — Inno Setup IDE:**
1. Open `build/installer.iss` in the Inno Setup Compiler IDE.
2. Press `Ctrl+F9` (or Build → Compile).
3. The installer is written to `dist/ShrinkRay-Setup-4.2.0.exe`.

**Option B — Command line (CI-friendly):**
```powershell
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" build\installer.iss
```

The installer:
- Installs `ShrinkRay.exe` to `%LocalAppData%\Shrink Ray\` (no UAC prompt).
- Offers an upgrade path to `Program Files` via the directory dialog.
- Creates a Start Menu shortcut (and optional Desktop shortcut).
- Registers a standard uninstaller in Add/Remove Programs.
- Runs the app immediately after install (optional, user can uncheck).

---

## Updating the version number

When you bump the version, update it in **three places** so everything stays in sync:

| File | Field |
|---|---|
| `package.json` | `"version"` |
| `version.json` | `app.version` |
| `build/installer.iss` | `#define AppVersion` |

---

## Troubleshooting

**`pkg` can't find the node20 base binary (offline machine)**
```
pkg fetching base binary … Error
```
Pre-download on a connected machine:
```bash
npx @yao-pkg/pkg --targets node20-win-x64 --dry-run launcher.cjs
```
The cached binary lives in `~/.pkg-cache/`.

---

**WASM files not found at runtime (`404 Not found`)**

Make sure the asset glob in `package.json` covers the failing path:
```json
"pkg": {
  "assets": ["index.html", "version.json", "src/**/*", "vendor/**/*"]
}
```
Rebuild after updating. Use `npm run build:exe:test` first — if assets load
in `node launcher.cjs` they will load in the compiled binary too.

---

**Port 3000 already in use**

The launcher automatically falls back to a random free port. The console window
will show which port it selected. If you want to force a specific port:
```powershell
set PORT=3001 && ShrinkRay.exe
```

---

**Windows SmartScreen warns "Unknown publisher"**

Expected for unsigned binaries. Options:
- Click "More info → Run anyway" for personal use.
- Submit the binary to Microsoft's reputation program (free, takes weeks).
- Purchase an OV code-signing certificate and sign the `.exe` and installer.

---

## Build output summary

```
dist/
  ShrinkRay.exe                  # Standalone executable (share this directly)
  ShrinkRay-Setup-4.2.0.exe      # Installer (from Inno Setup step)
```
