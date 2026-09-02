# ShrinkRay — Frame Optimization (Animated WebP) — Staged Brief

**Status update:** All spikes are complete and the Stage 3 decision is made: **DO NOT PROCEED with Stage 4.** Stage 1b's real WebPAnimEncoder benchmark found a median 0.18% size reduction over the current FFmpeg baseline (nowhere near the 15% threshold), corroborating Stage 1's independent `mpdecimate` null result on the same synthetic high-redundancy fixture. Stage 4 is **not being pursued**. Animated AVIF is separately **descoped** — infeasible with the current toolchain without a much larger, separate project (see Stage 2's finding below). Full reasoning for both calls is in Stage 3.

**How to use this document:** this project concluded at Stage 3 with a DO NOT PROCEED verdict — Stage 4 was never built and the prompt for it is kept only as a historical record of what was scoped, not something to paste. Stages 0, 1, 1b, and 2 all ran to completion; their prompts are kept for reproducibility and as a reference for how this kind of staged, evidence-gated investigation was structured. If this work is ever revisited (see the specific reopening condition in Stage 3), start from Stage 3's verdict, not from re-running everything.

Grounded in the actual source (`ffmpegClient.js`, `avifClient.js`, `perFrameMixer.js`, `app.js`) as of this writing, not the README.

---

## Why staged this way

- The animated-encode path (`_doConvertImage` in `ffmpegClient.js`) has a documented history of regressions from small changes (v5.2 fixed three separate bugs introduced there: a filter that silently killed WASM SIMD performance, an incorrectly-removed `-preset picture`, an invalid `-loop -1` value). Stage 1 found a second, independent case of this same pattern — see below — reinforcing that this is a standing property of the environment, not a one-off.
- The big version of this feature (a real WebP animation-encoder path) multiplies WASM calls per file by roughly the frame count — a real risk to your existing timeout budget, untested until measured.
- There's already one dead, disconnected, syntactically broken module in the codebase (`perFrameMixer.js`) that was clearly a prior attempt at part of this. Cleaning that up first prevents Claude Code from getting confused by it or half-repairing it mid-task.
- Splitting the expensive, uncertain part (Stage 4) behind a data-driven checkpoint (Stage 3) means you only pay that cost if Stages 1–2 show it's worth it.

---

## Stage 0 — Hygiene: fix known gaps before adding anything new

**Goal:** fix two confirmed, existing bugs unrelated to new frame-optimization logic, so they don't get tangled up with new work later.

**Risk: very low.** Pure bug fixes to existing, well-understood code paths. No new dependencies, no new files.

**Tasks:**
1. `Max FPS` and `Max Duration` (Animated Output settings) are documented as applying to "GIF, APNG, video" but in `ffmpegClient.js`, the `-r` and `-t` flags are only pushed inside `if (isVideoInput)` blocks. Extend both to apply to all animated inputs (GIF, APNG, video), not just video.
2. `perFrameMixer.js` is dead code: never imported anywhere, contains actual JS syntax errors (mixed Python-style `or`/`:`/`True`), and depends on a `window.WebPMux` global that isn't bundled. Either delete it outright, or — if you'd rather keep it as reference for Stage 4 — rename it to `perFrameMixer.js.wip` (or similar, out of the JS module resolution path) and add a top-of-file comment noting it's unfinished/unwired/non-functional, so it can't be accidentally imported or "fixed" piecemeal later.
3. The "Mixed Compression" UI toggle (`mixed-toggle` in the Settings panel) is read into `settings.mixed` but never affects the actual encode — it only appears in a Diagnostics log line. Disable/grey out this control in the UI (or hide it) with a tooltip noting it's not yet implemented, rather than leaving it silently misleading. Do not attempt to wire it to real behavior in this stage — that's Stage 4's job, if it happens at all.

**Guardrails:**
- Don't touch anything else in `_doConvertImage`. This stage should be a minimal, reviewable diff.
- Run a manual smoke test after: convert one still, one GIF→WebP, one APNG→WebP, one video→WebP, confirming nothing else changed behavior.

**Effort:** low. Straightforward, well-scoped fixes.

### 📋 Prompt for Claude Code — Stage 0

```
I'm working on ShrinkRay (puremoxi/ShrinkRay), a browser-based image/video
compression tool using FFmpeg-WASM. I need three small, independent bug fixes
before I start any new feature work. Please do these as separate, reviewable
commits/diffs — don't combine them.

IMPORTANT — check current state before changing anything: this codebase may
already have some or all of these fixes applied from a prior session. Before
making any change, check git log/history and the current file contents for
each item below, and tell me what's already done vs. what's actually
missing. Only make changes for genuine gaps — treat this as "verify and
patch," not "build from scratch." If an item is already fully done, say so
and skip it rather than re-touching it.

1. In src/modules/ffmpegClient.js, the Max FPS (-r) and Max Duration (-t)
   settings are only applied when isVideoInput is true, even though the
   Settings panel documents them as applying to "GIF, APNG, video" animated
   inputs. Extend both flags to apply whenever isAnimatedInput is true and
   the encode is not a still (i.e. wherever isVideoInput-gated logic
   currently sets -r/-t, broaden the condition to cover GIF/APNG animated
   inputs too). Show me the diff before applying it.

2. src/modules/perFrameMixer.js is dead code: it is never imported anywhere
   in the codebase, and it contains real JavaScript syntax errors (Python-
   style `or`, `:`, and `True` mixed into otherwise-JS code; bare `return`
   statements outside any function). Please rename it to
   perFrameMixer.js.wip (out of the JS module resolution path) and add a
   comment at the top noting it's an unfinished, non-functional prior
   attempt at per-frame lossy/lossless mixing, kept for reference only.
   Confirm nothing imports it before renaming. If the file has already been
   renamed to perFrameMixer.js.wip (or deleted), this task is done — say so.

3. The "Mixed Compression" toggle in the Settings panel (element id
   mixed-toggle, read into settings.mixed in app.js) does not currently
   affect the actual encode in ffmpegClient.js — it only appears in a
   Diagnostics log line. Disable this control in the UI (or hide it) and
   add a tooltip/label noting it's not yet implemented. Do not attempt to
   wire it to real encoder behavior in this task.

After each fix (or each "already done" determination), do a quick sanity
check: confirm nothing else in _doConvertImage or the surrounding
still/animated encode paths changed. Keep each diff minimal and scoped only
to what's described above. Note: this codebase may also have Stage 1
frame-optimization changes (a filter-order fix, an experimental dedupe
setting) already applied to the same function — don't remove or alter those,
they're unrelated to these three fixes.
```

---

## Stage 1 — Duplicate-frame removal spike (`mpdecimate`) — ✅ COMPLETE

**Finding:** across all 5 available fixtures (GIF/APNG/MP4/WEBM/MOV), `mpdecimate` at default thresholds produced changes inside ±1% — noise, not signal. Confirmed via decode log for the GIF case: identical frame count (149 frames) on and off, with FFmpeg reporting "skipping unsupported chunk: ANMF" — the filter found nothing to remove in any of these files. The repo's existing `images/shrinkray-test-formats/` fixtures don't include the screen-recording/slow-pan/static-UI content the brief specifically wanted to test, so this result supports **"no benefit on typical/generic animated content,"** not **"no benefit under any real-world condition."**

**A more important finding, caught only because this was measured rather than assumed:** the brief's premise that "decimate before scale is typically cheaper" is backwards and dangerous in this WASM build. `mpdecimate,scale=...` (decimate first) on a ~4.7MB GIF blew through the full 300s exec timeout and was force-terminated — never completed. `scale=...,mpdecimate` (scale first) on the identical input completed in 2.4 seconds. This is now fixed in the production filter chain (`scale` always first) and documented in a comment at `ffmpegClient.js:172-189`; the root cause wasn't fully diagnosed (possibly related to the same class of WASM-SIMD-sensitive filter-ordering issue from the v5.2 regressions) and is flagged as unresolved rather than guessed at further. **This is the second time this WASM build has shown a catastrophic, non-gradual performance cliff from filter/arg ordering** (the first being the v5.2 SIMD regression) — worth treating as a standing risk for Stage 4, which involves substantially more moving parts in the same environment, not a one-off.

**Decision:** the experimental toggle stays in the codebase, off by default (cheap to keep, harmless), rather than being ripped out — genuine screen-recording content might still show a real gain and is worth one more quick run if a sample becomes available. **This result must not be used to decide whether Stage 4 is worthwhile** — `mpdecimate` and Stage 4's real diffing mechanism target different, non-overlapping redundancy, so a null result here neither supports nor rejects Stage 4. See Stage 1b and Stage 3 below for what the actual go/no-go decision should be based on instead.

**Original goal (for reference):** find out, with real numbers, whether FFmpeg's built-in `mpdecimate` filter meaningfully reduces animated WebP output size on real files — before any bigger architecture work.

**Risk: low.** Uses a filter that already exists in your FFmpeg build. No new dependencies, no new worker, no new files beyond a small experimental toggle.

**Tasks:**
1. Add `mpdecimate` as an optional stage in the existing `-vf` filter chain in `ffmpegClient.js`, applied only for animated (non-still) encodes, composed with the existing `scale` filter, **with `scale` always ordered first** — decimating before scaling was found to hang/timeout the WASM encoder on real input; see the finding above.
2. Gate it behind a clearly-labeled experimental toggle (e.g. in Diagnostics or a hidden dev flag) — **not** a default-on production setting yet. This stage is about measurement, not shipping.
3. Verify frame timing/duration integrity after decimation: `mpdecimate` drops frames and can affect PTS-based duration; confirm the output animation's total duration and loop behavior still match the source (test against `Max Duration` trimming too, since both interact with frame count/timing).
4. Log before/after file size and encode time to Diagnostics for each conversion when the toggle is on, so results are easy to collect without instrumenting anything external.
5. Run this against a small benchmark set you assemble yourself: a few real animated GIFs/videos you expect to have duplicate/near-duplicate frames (screen recordings, slow pans, UI demos), and a few you don't expect to (fast action, noisy video) — so you get a realistic range, not a best-case number. **Note: the existing repo fixtures didn't include the screen-recording/static-UI case — if you have or can source one, it's the single most valuable remaining test before treating this as fully closed.**

**Guardrails:**
- This must be a no-op for still images and for any encode where the toggle is off — verify explicitly.
- Don't touch the AVIF path in this stage (AVIF is still-only regardless, per Stage 2 below).

**Acceptance criteria:**
- [x] Toggle off → byte-identical behavior to current code (no filter chain change). *Reverified via `npm run smoke-test`.*
- [x] Toggle on, animated input → output duration and loop count match the source within an acceptable tolerance. *Confirmed for the GIF case (149 vs 149 frames); `-t`/`-r`/`-loop` are unaffected by internal `-vf` filter behavior.*
- [x] You have real before/after size numbers across your benchmark set. *All within ±1% on the 5 available fixtures — see finding above. Screen-recording/static-UI content, the intended best case, wasn't available and remains an open test.*

**Effort:** medium (the filter itself is simple; the timing/duration verification is where care is needed).

### 📋 Prompt for Claude Code — Stage 1

*(This prompt is kept for reference/reproducibility — Stage 1 is complete, see the finding above. If you ever rerun this spike against new fixtures, e.g. real screen-recording content, use this prompt with the corrected filter order below.)*

```
Continuing work on ShrinkRay. I want to test whether FFmpeg's mpdecimate
filter meaningfully reduces animated WebP output size by dropping duplicate/
near-duplicate frames, before committing to any bigger frame-optimization
work. This is an experiment, not a production feature yet.

IMPORTANT — check current state before changing anything: this experiment
may have already been run in a prior session, in which case the experimental
setting, the filter chain change, and the Diagnostics logging may already
exist in src/modules/ffmpegClient.js. Before making any change, check git
log/history and the current file contents and tell me what's already there.
If the dedupe experiment is already implemented, don't rebuild it — instead
just confirm the filter order is scale-before-mpdecimate (see the hard
requirement in item 1 below) and report current status rather than adding a
second, duplicate implementation.

In src/modules/ffmpegClient.js, in the animated (non-still) encode path of
_doConvertImage:

1. Add mpdecimate as an optional additional stage in the -vf filter chain,
   only for animated encodes, gated behind a new experimental setting (e.g.
   settings.experimentalDedupe) that defaults to false. Compose it correctly
   with the existing scale filter construction (don't break the existing
   wCap/hCap scale logic) — IMPORTANT: scale must run BEFORE mpdecimate in
   the filter chain. The reverse order (decimate before scale) was found to
   hang/timeout the WASM encoder on real input (a ~4.7MB GIF blew through
   the full 300s exec timeout with mpdecimate-then-scale, vs. 2.4s with
   scale-then-mpdecimate on the same input) — do not reverse this order,
   and if you find the order already reversed in existing code, that's a
   regression to fix, not a stylistic choice to leave alone.

2. When this setting is on, log the before/after output size and total
   encode time to the Diagnostics panel (use the existing log()/logAlways()
   pattern already used elsewhere in this file) so results are visible
   without external tooling.

3. Verify — and if needed, adjust — so that the output animation's total
   duration and loop count remain correct after decimation. mpdecimate
   drops frames based on PTS, which can interact with duration/loop
   settings; check this specifically against the existing Max Duration
   (-t) trimming logic. Flag if you find a real interaction risk rather
   than silently working around it.

4. Confirm explicitly (and if possible with a quick test) that this is a
   complete no-op when the experimental setting is off — no change to
   still-image encoding or to the default animated path.

Don't touch the AVIF encode path in this task — it's still-only regardless
and out of scope here. Show me the diff before applying it (or, if nothing
needs to change, show me what you checked and why), and call out anywhere
you're not fully confident the duration/timing logic is correct so I can
test that specifically.
```

*(Stage 1 is complete: `mpdecimate` found ~0% gain on the available fixtures. **This result does not decide Stage 4's fate** — see Stage 1b and Stage 3 below for why, and for what the real go/no-go evidence should be.)*

---

## Stage 1b — Minimal WebPAnimEncoder benchmark (do this before Stage 3, not the mpdecimate result)

**Goal:** directly determine whether a real WebP animation-encoder API produces meaningfully smaller animated WebP files than ShrinkRay's current FFmpeg `libwebp` path — without building any of Stage 4's production architecture. **This benchmark, rather than the `mpdecimate` result or a theoretical bounding-box analysis, is the decision gate for Stage 4.**

**Risk: low if kept isolated.** This is a measurement spike, similar to the Stage 2 AVIF harness. The deliverables are benchmark results and a written recommendation — not production code.

**Tasks:**

1. Source and evaluate a real WebP animation-encoder WASM module exposing `WebPAnimEncoder` or equivalent functionality. The module must support: complete composited RGBA frames; cumulative frame timestamps; loop count; `minimize_size`; `allow_mixed`, if available; correct animation assembly. Use only enough integration to run standalone benchmark encodes — do not build the Stage 4 worker, queue routing, settings interface, or other production scaffolding.

2. Run the benchmark against the **same fixture set used in Stage 1** so results can be compared directly. Also attempt to add at least one representative screen-recording or static-UI animation, since this content is likely to contain substantial cross-frame redundancy.

3. Generate and compare these output modes for every fixture:
   - Current ShrinkRay FFmpeg `libwebp` baseline.
   - WebPAnimEncoder with default animation-optimization settings.
   - WebPAnimEncoder with `minimize_size` enabled.
   - WebPAnimEncoder with `allow_mixed` enabled, if supported.

   Do not combine incompatible options. In particular, document that `minimize_size` disables keyframe insertion rather than treating size minimization and explicit keyframe placement as simultaneously active.

4. Keep every comparison equivalent. All output modes must use the same: decoded/composited source frames; canvas dimensions; frame timestamps and final-frame duration; maximum FPS behavior, if applied; maximum-duration trimming, if applied; loop count; quality setting; lossless setting; alpha behavior. Do not compare outputs if one mode changes resolution, drops additional frames, shortens the animation, or uses a materially different quality level.

5. Validate every generated output before treating its size as a successful result. Record: whether the file decodes successfully; output dimensions; frame count; total duration; loop count; whether transparency is preserved; whether visible frame-compositing, disposal, or timing errors are present. **A smaller output is not considered an improvement if its playback behavior or visible quality is incorrect.**

6. Measure actual output size and processing cost. Record for every fixture and encoder mode: exact output bytes; percentage change relative to FFmpeg; total encode time; source frame count; source dimensions; estimated decoded RGBA volume; peak memory, if the harness can measure it reliably.

7. Optionally calculate frame-redundancy diagnostics from the same fully composited RGBA frames to help explain the encoder results. At thresholds such as 0 and 8, calculate: identical frame count; average changed-pixel percentage; average changed-region bounding-box area; average unchanged canvas area. Define a pixel as changed when the maximum absolute difference across RGBA channels exceeds the selected threshold. **Label these values as diagnostic measurements only — do not describe unchanged canvas area or bounding-box area as expected file-size savings.**

8. Produce a final benchmark summary and recommendation, answering: which encoder mode produced the smallest valid output; what was the median size reduction across all fixtures; which content types benefited most; which fixtures showed little or negative benefit; what was the encode-time multiplier relative to FFmpeg; did memory use appear safe for eventual in-browser integration; **does the result justify proceeding to Stage 4?**

**Guardrails:**
- Standalone code under `scripts/spikes/` only. Do not modify anything under `src/`.
- No UI wiring, no queue integration, no production worker, no settings or preset changes.
- No changes to the existing FFmpeg or AVIF paths.
- Do not use the existing broken `perFrameMixer.js` as implementation code.
- Do not extract every frame to PNG unless no bounded-memory alternative is available. Prefer incremental or bounded-batch frame processing where the encoder binding permits it.
- Compare fully composited canvas frames, not uncomposited GIF or APNG frame rectangles.
- Record any decoder limitations, unsupported formats, or measurements that cannot be obtained reliably rather than silently approximating them.

**Acceptance criteria:**
- [ ] Real WebPAnimEncoder outputs are produced using the actual candidate encoder.
- [ ] Every output is validated for decoding, frame count, timing, looping, dimensions, and transparency.
- [ ] Exact byte-size and encode-time results are reported for every fixture and encoder mode.
- [ ] Results are compared against an equivalent FFmpeg baseline.
- [ ] At least one screen-recording or static-UI fixture is attempted.
- [ ] Peak memory is measured when practical; otherwise decoded-frame memory requirements are estimated and clearly labeled.
- [ ] Optional delta measurements, if included, are presented as diagnostics rather than predicted compression savings.
- [ ] Production code paths remain untouched.
- [ ] The final report gives an explicit proceed/do-not-proceed recommendation for Stage 4.

**Suggested results table:**

| Fixture | Encoder mode | Output bytes | Change vs FFmpeg | Encode time | Frames | Duration | Validation |
|---|---|---|---|---|---|---|---|
| Example GIF | FFmpeg baseline | — | Baseline | — | — | — | Pass/fail |
| Example GIF | WebPAnimEncoder default | — | — | — | — | — | Pass/fail |
| Example GIF | minimize_size | — | — | — | — | — | Pass/fail |
| Example GIF | allow_mixed | — | — | — | — | — | Pass/fail |

**Effort:** medium-high — real integration and validation work across multiple encoder modes, larger than a typical spike but still a fraction of Stage 4's production scope. Worth working through in reviewable increments (harness/module setup → baseline comparison → validation pass → redundancy diagnostics → final report) rather than as one delivery.

### 📋 Prompt for Claude Code — Stage 1b

*(This is a larger spike than the others — ask for it in the five increments below rather than pasting the whole thing and waiting for one big delivery. Increment markers are included so you can paste this once and still checkpoint progress.)*

```
Continuing work on ShrinkRay. I want a real, direct answer to whether a
proper WebP animation-encoder API (WebPAnimEncoder or equivalent) produces
meaningfully smaller animated WebP files than our current FFmpeg libwebp
path — before deciding whether to build Stage 4's full production
integration. This benchmark's result, not the Stage 1 mpdecimate result,
is what decides whether Stage 4 happens.

This is a measurement spike, same spirit as the Stage 2 AVIF harness. The
deliverable is benchmark results and a written recommendation — not
production code. Please work through this in five increments and check in
with me after each one rather than delivering everything at once:

INCREMENT 1 — Harness and module setup
Source and evaluate a real WebP animation-encoder WASM module exposing
WebPAnimEncoder or equivalent functionality. It must support: complete
composited RGBA frames; cumulative frame timestamps; loop count;
minimize_size; allow_mixed if available; correct animation assembly. Build
only enough integration to run standalone benchmark encodes under
scripts/spikes/ — do not build the Stage 4 worker, queue routing, settings
interface, or any other production scaffolding. Do not use the existing
broken src/modules/perFrameMixer.js.wip as implementation code — it's a
sketch, not working code. Confirm this module choice with me before moving
to Increment 2, since Stage 4 will later reuse whatever you pick here.

INCREMENT 2 — Fixture set and baseline
Use the same fixture set already used in Stage 1, for direct comparability.
Also attempt to source or add at least one representative screen-recording
or static-UI animation — that content type is most likely to show real
cross-frame redundancy and hasn't been tested yet in Stage 1. Compare fully
composited canvas frames, not uncomposited GIF or APNG frame rectangles —
this matters for correctness. Produce the current FFmpeg libwebp baseline
output size for every fixture first.

INCREMENT 3 — Encoder mode comparison and validation
For every fixture, generate and compare: WebPAnimEncoder with default
settings; WebPAnimEncoder with minimize_size enabled; WebPAnimEncoder with
allow_mixed enabled if supported. Do not combine incompatible options —
specifically, minimize_size disables keyframe insertion, so don't treat
size minimization and explicit keyframe placement as simultaneously active;
verify and document this rather than assuming it.

Keep every comparison equivalent: same decoded/composited source frames,
canvas dimensions, frame timestamps and final-frame duration, max FPS/max
duration behavior if applied, loop count, quality setting, lossless
setting, and alpha behavior across all modes. Do not compare outputs where
one mode changed resolution, dropped extra frames, shortened the
animation, or used a materially different quality level than the others.

Validate every generated output before trusting its size: confirm it
decodes successfully, and record output dimensions, frame count, total
duration, loop count, transparency preservation, and whether any visible
frame-compositing, disposal, or timing errors are present. A smaller
output does not count as an improvement if its playback or visible quality
is wrong — flag any such case explicitly rather than including it in a
"smaller" tally.

INCREMENT 4 — Measurement and optional diagnostics
For every fixture and encoder mode, record: exact output bytes; percentage
change vs. the FFmpeg baseline; total encode time; source frame count and
dimensions; estimated decoded RGBA volume; peak memory if the harness can
measure it reliably (otherwise estimate and clearly label it as an
estimate, don't silently approximate). If you have time, also calculate
frame-redundancy diagnostics from the composited RGBA frames at thresholds
such as 0 and 8 changed-pixel-difference: identical frame count, average
changed-pixel percentage, average changed-region bounding-box area, average
unchanged canvas area. Label these explicitly as diagnostic measurements
only — never describe unchanged canvas area or bounding-box area as
predicted file-size savings, since that's not what they measure.

INCREMENT 5 — Final report
Produce a results table (fixture × encoder mode × output bytes × % change
vs FFmpeg × encode time × frames × duration × validation pass/fail) and a
written summary answering: which encoder mode produced the smallest valid
output; the median size reduction across all fixtures; which content types
benefited most; which fixtures showed little or negative benefit; the
encode-time multiplier relative to FFmpeg; whether memory use looked safe
for eventual in-browser integration; and an explicit proceed / do-not-
proceed recommendation for Stage 4. Don't soften this into "it depends" —
give me a real recommendation based on what you measured.

Hard constraints throughout: standalone code under scripts/spikes/ only, no
edits anywhere under src/, no UI wiring, no queue integration, no
production worker, no settings/preset changes, no changes to the existing
FFmpeg or AVIF paths. If any measurement can't be obtained reliably (a
decoder limitation, an unsupported format, memory you can't read from this
environment), record that limitation explicitly rather than silently
approximating or omitting it.
```

*(Stage 1b has not been run yet — this prompt is ready to paste.)*

---

## Stage 2 — Animated AVIF feasibility spike — ✅ COMPLETE, DESCOPED

**Finding (from the actual spike, run via an isolated harness under `scripts/spikes/`):** not feasible with the current toolchain, for a more fundamental reason than the acceptance criteria below anticipated.

The bundled `@ffmpeg/core-mt@0.12.6` WASM core has **no AV1 encoder at all** — `libaom-av1 encoder present: false`, confirmed directly against `ffmpegClient.js`'s own `supportsAvifEncode` detection logic. This isn't a muxer/container limitation; the encoder is categorically absent from this build. Production AVIF encoding in ShrinkRay never goes through FFmpeg at all — it runs entirely through the separate, isolated `avifClient.js` → `@jsquash/avif` engine, which decodes via `createImageBitmap()` + Canvas `getImageData()` into a single frame and calls a single-image-only `encode()` function. There is no sequence/multi-frame encode API exposed by that package either.

So the `-c:v libaom-av1` branch inside `_doConvertImage` is dead code in production today (only reachable if `supportsAvifEncode` were true, which it never is with this bundled core), and animated AVIF isn't a "tune the existing call" problem on either path. The real options, in order of cost:

- **Vendor/build a custom AV1-capable FFmpeg-WASM core** (`--enable-libaom` or similar) — a real Emscripten build-pipeline commitment, not an npm version bump, and native `libaom-av1` benchmarks run at roughly realtime on a strong multi-core desktop CPU for video — a WASM/browser encode would likely be substantially slower still. Likely too slow to ship even if built.
- **Extend the `@jsquash/avif` wrapper to expose libavif's existing sequence-encoding API** — smaller in scope (the AV1 encoder is already in that WASM binary and working for stills; only the JS binding is single-image-only), but still a real "build and maintain a custom WASM binding" project with genuine unknowns, not a known-quantity task.
- **Park it.** Given the cost of both real options and that ShrinkRay's still-AVIF pipeline already delivers AVIF's main value (best-in-class still compression), this is the call for now.

**Decision: descoped.** Stage 4 below is scoped to animated WebP only. If animated AVIF is revisited later, treat it as its own separate, explicitly time-boxed spike (the "extend the jsquash wrapper" option above), not as part of this document — and go in expecting a real build project, not a flag change.

*(Housekeeping: the throwaway `scripts/spikes/` harness can be deleted now that the finding is written down here; if useful, a short permanent note — e.g. `docs/spikes/avif-animated-findings.md` — summarizing this outcome is worth keeping in the repo so this isn't re-investigated from scratch later.)*

---

## Stage 3 — Decision gate — ✅ RESOLVED: DO NOT PROCEED

*(This section is kept in its original form below the verdict, since the reasoning for why `mpdecimate` couldn't be used as evidence remains true and relevant to how this decision was actually reached.)*

*Recorded as [ADR-0001](0001-do-not-integrate-webpanimencoder.md) — this document remains the source of truth for the underlying evidence; the ADR records only the decision.*

**Verdict: DO NOT PROCEED with Stage 4, based on Stage 1b's real WebPAnimEncoder benchmark, applying the pre-committed decision rules exactly.**

Stage 1b ran default-mode `WebPAnimEncoder` against 3 validly-testable fixtures (`test_video.gif`, `test_image.apng`, `ui_demo.gif` — video fixtures were excluded due to an unrelated FFmpeg-WASM frame-extraction limitation, detailed below) and found:

- **Unweighted median size reduction: 0.18%** — far below the 5% floor, let alone the 15% PROCEED threshold. Precedence rule 1 (any DO NOT PROCEED condition satisfied → DO NOT PROCEED) fires decisively on this alone.
- **Corroborating evidence, not just a lone number:** `ui_demo.gif` — the fixture purpose-built to showcase cross-frame redundancy — landed at 0.001% under real `WebPAnimEncoder` diffing, matching Stage 1's independent ~0% `mpdecimate` finding on the *same file*. Two structurally different mechanisms (duplicate-frame removal vs. real animation-aware diffing) converged on the same null result. This is meaningfully stronger evidence than either spike alone, and directly resolves the "different, non-overlapping redundancy" concern raised earlier in this document — they were tested separately, on the same content, and agreed.
- **Validation was real, not assumed:** quality-equivalence was confirmed via PSNR (all 3 fixtures ~37–45dB, consistent between FFmpeg and WebPAnimEncoder outputs), ruling out "smaller because more degraded" as an explanation. A harness bug (an `hasAlpha` flag misread causing catastrophic PSNR) was caught and fixed before any number was trusted.
- **Encode cost is also worse, not just neutral:** WebPAnimEncoder ran 1.10×–1.74× slower than the current FFmpeg baseline across the tested fixtures — a real added cost with no offsetting size benefit.

**Validation coverage was 3/6, not 6/6 — disclosed honestly, and judged not to change the verdict.** All 3 video fixtures were excluded due to a repeatable FFmpeg-WASM frame-extraction hang unrelated to WebPAnimEncoder itself (this WASM build's video-decode-to-frames path only works via the app's exact single-call production command; any other extraction attempt from decoded h264 hangs — a tooling limitation, not evidence about the candidate encoder). This is correctly BORDERLINE-class evidence per the pre-committed rules, not a DO-NOT-PROCEED trigger on its own — but it does mean a PROCEED verdict was never reachable regardless of the size numbers, since PROCEED requires 6/6 clean validation. Practically, this gap doesn't change confidence in the DO NOT PROCEED call: redundancy is a property of decoded pixel content, not container format, and 0.18% is far enough from any threshold that video fixtures would need to dramatically outperform all three tested content types to reverse the conclusion — there's no mechanistic reason to expect that.

**What this verdict does and doesn't claim:** it does not claim `WebPAnimEncoder` is worthless, and it does not claim `minimize_size`/`allow_mixed`/`kmin`/`kmax` would provide zero benefit — those remain genuinely untested, per the wrapper's API limitations discovered in Increment 3. What the evidence supports is narrower and sufficient: *default-mode* WebPAnimEncoder, on real fixtures, with validated equivalent-quality output, does not deliver savings anywhere near what would justify Stage 4's production-integration and custom-WASM-maintenance cost.

**The one specific, well-defined condition under which this is worth revisiting:** real screen-recording/static-UI content with genuine duplicate or near-duplicate frames. The synthetic `ui_demo.gif` built to proxy this content type turned out to have less real redundancy than intended once run through GIF palette quantization — both Stage 1 and Stage 1b independently flagged this same gap. If a real, licensable sample of this content type becomes available, it's the one input that could plausibly change this picture. This is a specific reopening condition, not a vague "test more later" — absent that sample, this decision stands.

**Side finding, unrelated to this decision, worth its own backlog item:** Stage 1b's benchmark surfaced that the current *production* FFmpeg baseline silently collapses final-frame duration to ~42ms regardless of the source's true value (e.g., an APNG's real 500ms final frame encodes as 42ms) — WebPAnimEncoder preserved true duration correctly in the same test, which is how this was noticed. This is a pre-existing bug in what ships today, discovered as a byproduct of this investigation, and is worth fixing independent of anything else in this document.

**Housekeeping:** the Increment 3 spike code has been deleted. The finding above is the permanent record — if this is ever revisited, start here, not by re-running the benchmark from scratch.

<details>
<summary>Original reasoning for why <code>mpdecimate</code> couldn't be used as evidence (kept for context — this is why Stage 1b was necessary in the first place)</summary>

**Do not use `mpdecimate`'s result to decide whether Stage 4 is worthwhile** was the original hard rule here, since `mpdecimate` and a real WebP animation-encoder address different, non-overlapping compression opportunities:

| Optimization | What it does |
|---|---|
| `mpdecimate` | Removes entire duplicate or near-duplicate frames |
| WebPAnimEncoder (Stage 4) | Optimizes changed regions, frame dependencies, keyframes, disposal, and per-frame encoding |
| Mixed mode (Stage 4) | Selects lossy or lossless encoding independently per frame |

An animation can contain zero duplicate frames and still benefit substantially from changed-region optimization — a screen recording where the cursor moves 2px per frame has no identical frames for `mpdecimate` to find, but a huge amount of redundancy a real diffing encoder would exploit. This is why Stage 1's near-zero result alone couldn't settle anything, and why Stage 1b's real-encoder benchmark was necessary. As it turned out, once actually measured with the real encoder, the two independent mechanisms agreed — but that agreement is evidence from Stage 1b, not something Stage 1 could have told us on its own.

</details>

---

## Stage 4 — Full frame-optimization engine, animated WebP only — ❌ NOT PURSUED (Stage 3 verdict: DO NOT PROCEED)

**This stage was never built.** It's kept below only as a historical record of what was scoped, in case this is revisited under the specific reopening condition in Stage 3 (real screen-recording content becoming available). Do not paste the prompt below unless that condition is met and a fresh Stage 1b-style benchmark against that specific content type also shows a real result — the original Stage 1b benchmark's null result stands as the current, actionable verdict.

**Goal:** real frame differencing, changed-region cropping, disposal optimization, keyframe placement, and (optionally) mixed lossy/lossless-per-frame, for **animated WebP output only**, via a proper WebP animation-encoder API — not FFmpeg's per-frame `libwebp` wrapper, which doesn't expose these controls. Animated AVIF is explicitly out of scope for this stage — see Stage 2's finding.

**Risk: real — this is the expensive stage the earlier staging was built to protect against.** Treat everything below as mandatory risk containment, not optional nice-to-haves.

**Tasks:**
1. Reuse the WASM module already sourced and evaluated in Stage 1b's benchmark (don't re-evaluate from scratch — Stage 1b's harness has already validated it works and measured its output). Pin its version explicitly, same discipline as `vendor/ffmpeg` and `vendor/jsquash-avif`.
2. Build this as a **new, isolated worker** — a third engine alongside the existing queue-conversion worker and the live-preview worker — so it cannot contend with or destabilize either. Do not route this through the existing `_doConvertImage` function; give it its own module and its own call path that the Queue can invoke for animated WebP specifically.
3. Frame pipeline: extract frames (reuse the existing `ffmpeg.exec(['-i', input, '-vsync', '0', pattern])` pattern already present in `perFrameMixer.js` as a starting reference, not as code to un-comment), then feed each frame + delay through the real animation-encoder API with `minimize_size`/`kmin`/`kmax`/`mixed` options exposed as real settings (finally giving the "Mixed Compression" toggle real behavior, if you choose to re-enable it here).
4. Benchmark WASM call count and total time against a range of animated file lengths, and set/adjust timeouts deliberately rather than inheriting the existing 5-minute animated budget by default — this pipeline does many more WASM calls per file than the current single-pass approach.
5. Full regression pass across the existing supported matrix (GIF, APNG, video → WebP/AVIF, stills, batch, Fast Mode, Target File Size) to confirm this new path doesn't destabilize anything it doesn't touch.

**Guardrails:**
- New code only. Zero edits to the existing still-image or current-animated encode logic in `_doConvertImage`.
- New worker, isolated from both existing workers (queue + preview).
- Version-pin the new WASM dependency the same way existing ones are pinned.
- Ship behind a clearly-labeled setting/flag initially, not as the silent new default — same lesson as the dead Mixed Compression toggle: don't ship a control unless it's verified to do what it claims.
- Animated AVIF is out of scope. Don't generalize this engine's design to "any animated format" or leave hooks for an AVIF path — Stage 2 found that's a materially different, larger project (a missing/single-image-only AV1 encoder, not a container/muxer detail), and speculative AVIF-readiness here would add complexity for a path that isn't being built.
- This WASM build has now shown two independent, catastrophic (not gradual) performance cliffs from seemingly-minor filter/arg ordering choices (the v5.2 SIMD regression, and Stage 1's `mpdecimate`-before-`scale` timeout/hang). Treat this as a standing risk, not a fluke: benchmark every new filter-chain or multi-call ordering decision in this pipeline directly against real input rather than assuming "should be fine" or "should be faster" — this pipeline has more such decisions than any prior stage.

**Effort:** high, and worth `ultrathink` or `/effort high` for the worker-isolation and frame-pipeline design specifically, same reasoning as the concurrency logic in the live-preview spec.

### 📋 Prompt for Claude Code — Stage 4

```
Continuing work on ShrinkRay. I've decided (based on Stage 1b's real
WebPAnimEncoder benchmark, not Stage 1's mpdecimate result — those test
different things) to build real frame-optimization for animated WebP
output ONLY: frame differencing, changed-region cropping, disposal
optimization, keyframe placement, and mixed lossy/lossless-per-frame —
via a proper WebP animation-encoder API, not FFmpeg's per-frame libwebp
wrapper (which doesn't expose these controls).

Animated AVIF is explicitly out of scope and already ruled out — a prior
spike found the bundled FFmpeg-WASM core has no AV1 encoder at all, and
production AVIF encoding runs through a separate single-image-only engine
(avifClient.js / @jsquash/avif) with no sequence API. Don't generalize this
new engine's design to accommodate a future AVIF path, and don't add any
AVIF-related hooks, options, or abstractions "just in case" — that's
speculative complexity for a path that was deliberately not built. If
animated AVIF ever becomes worth doing, it will be planned as its own
separate project.

Hard constraints, please follow these exactly:

1. Do not modify the existing still-image or current-animated encode logic
   in src/modules/ffmpegClient.js's _doConvertImage. This must be new,
   additive code with its own call path, not edits threaded through the
   existing function. That function has a history of regressions from
   small changes (see the v5.2 changelog) and must stay untouched.

2. Build this as a new, isolated Web Worker — separate from both the
   existing queue-conversion worker and the live-preview worker
   (src/modules/previewController.js / previewClient.js) — so it cannot
   contend with either for WASM heap/thread resources.

3. Reuse the WASM module already sourced and evaluated in Stage 1b's benchmark
   spike — don't re-evaluate or re-source it from scratch, Stage 1b already
   validated it works and measured its real output. Pin its version
   explicitly, following the same pattern as vendor/ffmpeg and
   vendor/jsquash-avif. Do not try to repair src/modules/perFrameMixer.js.wip
   directly — its frame-extraction and GIF-delay-parsing logic is fine as
   reference, but it's missing its function wrapper and has real syntax
   errors; treat it as a sketch, not a starting file.

4. Implement the frame pipeline: extract frames via FFmpeg (reuse the
   `-vsync 0` frame-extraction pattern), then feed each frame + delay
   through the real animation-encoder API with min_size/kmin/kmax/mixed
   exposed as actual settings. If this extraction step applies scaling
   and/or the experimental dedupe filter, compose the filter chain with
   scale first and mpdecimate second. Do not place mpdecimate before
   scale; that ordering previously caused a catastrophic timeout in this
   FFmpeg-WASM build.

5. Benchmark: report how many WASM calls and roughly how long this takes
   for a few representative animated file lengths, and propose an
   appropriate timeout for this specific path rather than assuming the
   existing 5-minute animated budget is right — this pipeline does many
   more encoder calls per file than the current single-pass approach.

6. After implementing, run a full regression check across: stills, GIF to
   WebP, GIF to AVIF, APNG to WebP, video to WebP, video to AVIF, batch
   conversion, Fast Mode, and Target File Size — confirming none of these
   changed behavior, since none of them should be touched by this work.

7. Ship this behind a clearly-labeled, off-by-default setting — don't wire
   it as the new default animated-WebP path yet.

Please work through this in reviewable pieces — worker/dependency setup
first, then the frame pipeline, then settings wiring, then the benchmark
and regression pass — and show me the diff at each piece rather than
delivering it all at once.
```
