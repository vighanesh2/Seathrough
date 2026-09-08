# Token compression — Stranger G1–G3 checklist (human)

Product gates from `docs/token-compression-stranger-test.md`.
The eval script prints sibling / intuition / must-not for sample rows; **it does not pass G1–G3 for you.**

## When to run

After seed eval is useful (`--limit=seed`), then again after all 17 A rows look good on phrase + judge.

## Sample canvases (minimum)

1. **Java class** (`java-class`) — G1 Dog class sibling
2. **Heart pump** (`heart-pump`) — G2 two-pump mechanism; G3 not ion channels
3. **Orbit** (`orbit`, #21) — G2 Newton cannon stills; G3 not college orbital mechanics; sun not at ellipse center

## For each canvas

### G1 — Sibling (transfer)

Hide the pane. Ask the gold **Sibling** prompt.

- Pass: they can *start* without re-reading the pane (matches **Pass looks like**).
- Fail: they only repeat labels or freeze.

### G2 — Intuition path

Is the mapping a **mechanism** (still sequence), not a slogan?

- Pass: they can point at the stills / next-step canvas in **Intuition path**.
- Fail: “gravity makes it orbit” with no cannon sequence.

### G3 — Honest level

Does the canvas say what it will **not** do?

- Pass: scope exclude is audible / visible (Not GR, Not inheritance, …).
- Fail: picture pretends to be the whole course.

### Accuracy

Wrong-but-pretty is a hard fail (e.g. sun at center of ellipse).

## What the user must never see

Harness / critic refuse → pass-1, longer clean pane, or ask.

Never: “eval failed”, “we failed to teach”, self-grade toast.

## Runtime job judge (separate day)

Only after you mark all **17 A** rows: judge `sameJob` matches *your* reading of ship-short vs failure note.

Then set `TOKEN_COMPRESSION_RUNTIME_JOB_JUDGE=1`. Until then, live ship uses Pipe B critic + phrase/soup/voice only.
