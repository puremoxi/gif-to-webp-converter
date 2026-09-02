# Architecture Decision Records

This folder records *decisions*, not investigations. An ADR captures what was
decided, why, and what it means going forward — it exists so a future
contributor (human or Claude Code session) doesn't have to reconstruct the
reasoning from git history or re-litigate a settled question.

**vs. `docs/spikes/`:** a spike records an *investigation* — what was tried
and measured, tied to a specific experiment. An ADR records the *decision*
that followed. A spike's finding is often the evidence an ADR cites, but the
ADR is about the decision itself, not the experiment. Not every spike ends in
a decision worth recording as an ADR; not every ADR is preceded by a spike.

## When to write one

Write an ADR when a decision would otherwise get silently re-litigated later:
choosing between two viable approaches, deciding *not* to build something
that was seriously considered, adopting or rejecting a dependency, or
settling on a constraint that isn't obvious from reading the code.

Don't write one for routine implementation choices that are self-evident from
the diff — ADRs are for decisions, not changelog entries.

## Format

```markdown
# NNNN. Short, decision-phrased title

Status: Proposed | Accepted | Superseded by NNNN | Rejected
Date: YYYY-MM-DD

## Context

What prompted this decision — the problem, constraint, or question. Link to
a spike (`../spikes/...`) if one produced the evidence.

## Decision

What was decided, stated plainly.

## Consequences

What this makes easier, harder, or forecloses. Include what was rejected and
why, if relevant — that's often the most valuable part for a future reader.
```

Number sequentially (`0001-`, `0002-`, ...), never reuse or renumber. If a
later decision reverses an earlier one, add a new ADR and mark the old one's
status as `Superseded by NNNN` rather than editing it.

## Existing ADRs

- [0001](0001-do-not-integrate-webpanimencoder.md) — do not integrate a real
  WebPAnimEncoder module to replace the FFmpeg animated-WebP path. Full
  evidence trail in [`shrinkray-frame-optimization-spec.md`](shrinkray-frame-optimization-spec.md),
  a staged working log kept alongside the ADR rather than folded into it.
