# 0001. Do not integrate a real WebPAnimEncoder module to replace the FFmpeg animated-WebP path

Status: Accepted
Date: 2026-09-01

## Context

ShrinkRay's animated WebP output goes through FFmpeg's `libwebp` encoder,
which encodes each frame independently rather than using libwebp's own
animation-aware `WebPAnimEncoder` API (frame diffing/blending, disposal
optimization, optional `minimize_size`/`allow_mixed` modes). Building a real
`WebPAnimEncoder`-based engine (Stage 4 of the frame-optimization plan) was
gated behind a benchmark spike (Stage 1b), since the integration cost —
new WASM dependency, an isolated worker, a parallel encode path, ongoing
maintenance — is only worth paying if the size win is real.

Full methodology, the evaluated module (`nieyuyao/webp-wasm`, chosen over
the unlicensed/stale `webpxmux.js`), fixture-level results, two harness bugs
found and fixed before trusting any number, the pre-committed decision
rules, and the specific reopening condition are all recorded in
[`shrinkray-frame-optimization-spec.md`](shrinkray-frame-optimization-spec.md)
(Stages 1, 1b, and 3) — that document is the source of truth for evidence;
this ADR records only the resulting decision.

**Headline result:** default-mode `WebPAnimEncoder`, benchmarked against 3
of 6 planned fixtures (video fixtures were excluded by an unrelated
FFmpeg-WASM environment limitation, not a candidate-module failure — see
the spec doc), produced a median size reduction of **0.18%** against a
pre-committed 15% threshold to proceed.

## Decision

Do not integrate a `WebPAnimEncoder`-based module to replace or augment the
FFmpeg animated-WebP encode path. Stage 4 is not being built.

This does not claim `WebPAnimEncoder` provides zero benefit in general, or
that its `minimize_size`/`allow_mixed` modes would — those were never
measurable without forking the evaluated module, which was explicitly
declined to keep the spike scoped. The claim is narrower: with the module
actually available, on real fixtures, with validated equivalent-quality
output, the measured benefit does not justify the integration cost.

## Consequences

- The FFmpeg per-frame-independent animated WebP encode path is unchanged.
- The evaluated module and its spike harness are throwaway
  (`scripts/spikes/`), not production dependencies.
- Reopening this productively requires one specific condition: real
  screen-recording/static-UI content with genuine duplicate or
  near-duplicate frames. The synthetic proxy built for this spike
  (`ui_demo.gif`) turned out to have less exploitable redundancy than
  intended once run through GIF palette quantization — see the spec doc's
  Stage 3 for why this is a well-defined reopening condition, not a vague
  "test more later."
- A pre-existing, unrelated bug surfaced as a byproduct: the current
  production FFmpeg baseline collapses final-frame duration to ~42ms
  regardless of the source's true value. Worth its own fix, independent of
  this decision — see the spec doc's Stage 3 side finding.
