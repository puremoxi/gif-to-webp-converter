
# GIF → WebP Converter (UMD fallback build)

- Adds **UMD fallback loader** (jsDelivr if unpkg is blocked).
- FFmpeg client **waits for UMD** and tries core from **jsDelivr → unpkg**.
- Mini feature set for debugging loader & conversion.

## Run
```bash
npx serve .
# open http://localhost:3000/
```
