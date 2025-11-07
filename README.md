# GIF → WebP Converter (WASM, Local Only)

Browser-based GIF → WebP converter with per-file progress, compression level, looping toggle, and still-image optimization. All conversions happen **locally** via FFmpeg WebAssembly.

## Quick Start
- Use a static server (modules over `file://` may be restricted):
  ```bash
  npm i -g serve
  serve .
  # open the URL shown
  ```

## Settings
- **Lossless**: `-lossless 1`
- **WebP Quality (0..100)**: `-qscale <q>` (ignored when lossless)
- **Compression level (0..6)**: `-compression_level <n>` (higher = smaller but slower)
- **Loop animation**: `-loop 0` (infinite) when checked, `-loop -1` when unchecked
- **Still image**: `-preset picture`

## Notes
- Per-file progress is smoothed: 5% seed → 99% cap during encode → 100% on finish.
- Uses UMD builds from CDN for FFmpeg and JSZip.
