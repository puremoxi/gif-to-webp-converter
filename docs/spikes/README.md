# Spikes

This folder records *investigations* — what was tried, what was measured,
and what was found. Each entry corresponds to a throwaway experiment, usually
built under `scripts/spikes/`, that answers a specific question before
committing to (or ruling out) real production work.

**vs. `docs/adr/`:** a spike records the investigation; an ADR records the
*decision* that followed it. A spike's finding is often the evidence an ADR
cites. Not every spike leads to a decision worth recording as an ADR — some
just answer a question ("does this even work?") without a durable
architectural commitment on either side.

## Convention

- The spike's *code* is throwaway by design (`scripts/spikes/`) and gets
  deleted once its finding is written up here — don't keep dead experiment
  harnesses around as if they were real tooling.
- The *finding* is permanent: what was tried, the concrete result (numbers,
  not vibes), and why the investigation was parked, closed out, or handed
  off to a decision (link the resulting ADR if one was written).
- Write it so a future session re-reads this before re-running the same
  experiment from scratch a year later having forgotten why it was shelved.

## Existing spikes

- [avif-animated-findings.md](avif-animated-findings.md) — animated AVIF via
  FFmpeg-WASM: not feasible with the current build (no AV1 encoder present).
