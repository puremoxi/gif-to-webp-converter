# Spike finding: animated AVIF is not feasible with the current build

**Date:** 2026-09-01
**Status:** Parked — do not re-attempt without first changing the encoder stack (see below).

## What was tried

Stage 2 of the frame-optimization plan asked whether the FFmpeg-WASM build already
in this repo (`vendor/ffmpeg/`, `@ffmpeg/core-mt@0.12.6`) could produce a valid,
playable multi-frame ("avis" brand) AVIF file by dropping the `-frames:v 1`
restriction on the existing `-c:v libaom-av1` encode path in `ffmpegClient.js`,
and how slow that would be. A throwaway, isolated HTML page (loading only the raw
FFmpeg UMD build — no `app.js`/`ui.js`/Settings panel) ran the same
encoder-detection check `ffmpegClient.js` uses internally, then attempted the
animated AVIF encode.

## Result

The premise didn't hold, for a more basic reason than "multi-frame doesn't work":

```
libaom-av1 encoder present: false
```

**The shipped `@ffmpeg/core-mt@0.12.6` WASM core has no AV1 encoder in it at
all** — not "can't mux multiple frames," just categorically absent. This checks
out against the codebase itself:

- [`ffmpegClient.js`](../../src/modules/ffmpegClient.js) gates the `-c:v libaom-av1`
  branch of `_doConvertImage` behind `ffmpeg.supportsAvifEncode`
  (`detectAvifEncodeSupport`), which is only ever `true` if the loaded core
  reports `libaom-av1`/`libsvtav1`/`librav1e` in `-encoders`. With the shipped
  core, it's always `false`, so that branch is dead code in production today.
- README.md confirms it directly: *"AVIF uses an isolated AVIF-only WASM engine
  in `vendor/jsquash-avif/`; WebP remains on the existing FFmpeg core."*

## The jsquash-wrapper nuance

Production AVIF encoding does not go through FFmpeg at all. It runs entirely
through [`avifClient.js`](../../src/modules/avifClient.js) →
`@jsquash/avif`'s `avif_enc` WASM module (`vendor/jsquash-avif/`), fed by
`createImageBitmap()` + Canvas `getImageData()`. That's a single-frame-only
pipeline by construction — there is no video/animation decode path in it, and
no mechanism to feed it a sequence of frames. Animating AVIF output isn't a
matter of passing an extra flag to the existing AVIF path; it's a different
pipeline entirely.

## Why this is parked, not abandoned

Animated AVIF is possible in principle — but only by deliberately vendoring a
different, AV1-capable FFmpeg-WASM core build (or a separate multi-frame AV1
encoder/muxer WASM module), which is a materially bigger decision than "tune an
existing FFmpeg call": new binary to vet and license-check, larger download
size, a new build/vendor pipeline entry (see `pkg.config.json` — anything new
under `vendor/` needs an entry there), and its own correctness/perf spike
before this exact Stage 2 question could even be re-asked meaningfully.

**Before re-running anything like this spike:** confirm whether a different
core/module has actually been vendored. If `vendor/ffmpeg/` is still the
`@ffmpeg/core-mt@0.12.6` build and `vendor/jsquash-avif/` is still the only
AVIF path, the `libaom-av1 encoder present: false` result will reproduce
exactly, and the answer hasn't changed.

## What was deleted

The throwaway Playwright harness that produced this finding
(`scripts/spikes/avif-animated-spike.html` and `scripts/spikes/run-spike.mjs`)
was deleted after this note was written up — it was disposable by design and
added nothing beyond what's recorded here. No production code paths were
touched by the spike.
