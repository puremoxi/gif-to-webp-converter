## v4.1.0 — 2025-11-11

**Feature Enhancements**  
- Added support for still-image inputs beyond GIF:
  - Queue now accepts **PNG** and **JPG/JPEG** files in addition to GIF.
  - Conversion output naming now works generically for image extensions (`.gif`, `.png`, `.jpg`, `.jpeg` → `.webp`).
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


## v4.0.0 — 2025-11-10

- Introduced `src/ui-extensions.js` for modular UI behavior:
  - Displays GIF resolution before FPS metadata.
  - Shows file size in MB and post-conversion reduction summary (`GIF | WebP | % reduction`).
  - Added collapsible “Advanced” (default closed) and “Processing Queue” (default open) sections.
  - Displays aggregate conversion time under “Processing Queue” in format:
    “Files converted in X minute(s) Y seconds”.
- Updated header text and layout:
  - “Converter ready…” → “Ready. Please add files.”
  - Added “All files processed on local machine.”
  - Renamed “Download ZIP” → “Download ALL”.
- Updated styling:
  - Section headers use lighter blue backgrounds for better contrast.
- Removed redundant “Converted in …” line under drop zone.
- Maintained strict CSP and self-hosted JSZip / FFmpeg environment.
- Version bump in `package.json` and `version.json` → **4.0.0**.

---

## v3.6.9 — 2025-11-10

- Added multi-threaded FFmpeg support.
- Strict CSP compliance (no unsafe-eval, no inline scripts).
- Added self-hosted vendor path structure.
- Improved performance of parallel conversions.

---

## **v3.6-MT (2025-11-09)**
**Major Milestone — Multi-Threaded FFmpeg Integration**
- Integrated **@ffmpeg/core-mt@0.12.6** (UMD build) for true multi-threaded performance.
- Added **COOP/COEP Node server (`server.cjs`)** for cross-origin isolation support.
- Introduced complete support for **chunked FFmpeg worker files** (`814.ffmpeg.js`, `936.ffmpeg.js`, etc.).
- Created a **live progress banner** showing the 3-stage FFmpeg load process.
- Ensured deterministic UMD script execution using strict script ordering in `index.html`.
- Fixed **drag-and-drop and click-to-upload** interactions with transparent overlay inputs.
- Hardened error handling for “UMD did not execute” and “2 / 3 complete” conditions.
- Added **vendor/ffmpeg/README.txt** with full PowerShell setup commands and validation steps.
- Expanded root **README.md**: project hierarchy, troubleshooting, and performance tuning.
- Implemented automatic changelog tracking for future versions.

## **v3.5 (2025-11-06)**  
**Race Condition & Stability Fixes**
- Resolved **loader race** between FFmpeg UMD and app module initialization.
- Added robust 12-second polling for delayed UMD execution.
- Corrected incorrect relative path from `src/modules` → `/vendor/ffmpeg/`.
- Enhanced FFmpeg loader status banner (animated UI, distinct file-load phases).
- Completed migration to a modular architecture in `src/modules/`.

## **v3.4 (2025-11-02)**  
**UI and Usability Improvements**
- Rebuilt **dropzone visuals** for clearer hover/focus feedback.
- Introduced placeholder thumbnails with real image preview rendering.
- Added **queue manager** with dynamic per-file progress tracking.
- Added **lossless / mixed compression toggles** and slider synchronization logic.

## **v3.3 (2025-10-30)**  
**Stable Conversion Pipeline**
- Finalized working **FFmpeg WASM conversion** from GIF → WebP.
- Added encoder arguments for **quality, compression, looping, and stills**.
- Implemented per-file download buttons and **“Download ZIP”** aggregation via JSZip.
- Improved performance on large or long-frame GIFs.

## **v3.2 (2025-10-25)**  
**Project Modularization**
- Split all inline scripts into `src/modules/` (UI, FFmpeg, Queue, GIF Info).
- Added independent drag-and-drop logic and file validation layers.
- Refined internal event routing for better maintainability and scalability.

## **v3.1 (2025-10-20)**  
**First Working Prototype**
- Achieved first fully working **GIF → WebP conversion** in the browser.
- Introduced base **progress indicator** and result listing.
- Added temporary “Loading converter engine…” banner.
- Enabled direct in-browser FFmpeg execution (no server dependency).

## **v3.0 (2025-10-15)**  
**Foundation Release**
- Established base project structure and initial `vendor/ffmpeg/` integration.
- Added simple static serving for FFmpeg WASM binaries.
- Integrated **@ffmpeg/ffmpeg** core.
- Created first setup instructions and README.

## **v2.0 (2025-09-30)**  
**Early Feature Expansion**
- Added **basic file drop and select support** for user GIF uploads.
- Implemented **initial conversion settings** (quality and loop options).
- Added progress tracking placeholder and rough completion notifications.
- First attempt at **temporary FFmpeg script embedding** within HTML (pre-UMD).
- Introduced basic CSS styling for the conversion area and progress bars.
- First test build that produced successful single GIF → WebP conversions in Chrome.

## **v1.0 (2025-09-15)**  
**Initial Concept & Proof of Feasibility**
- Created **proof-of-concept** browser app for GIF → WebP conversion.
- Integrated minimal **FFmpeg WASM single-thread core**.
- Simple HTML + inline JS layout (no modular structure yet).
- Implemented console-only progress output.
- Confirmed ability to perform client-side WebP encoding without server upload.
- Validated FFmpeg WASM loading, memory constraints, and supported codecs.

---

## 📘 Summary of Evolution
| Phase | Focus | Key Outcome |
|-------|--------|-------------|
| **v1.x** | Prototype | Verified browser-side conversion feasibility. |
| **v2.x** | Early UX & feature integration | Added upload, UI, and core options. |
| **v3.0–v3.2** | Refactor & modularization | Fully separated app logic for scalability. |
| **v3.3–v3.5** | Optimization & resilience | Stable conversion, queueing, progress, and race-fixes. |
| **v3.6-MT** | Performance overhaul | Introduced multi-threaded WASM, chunk handling, and server isolation.

