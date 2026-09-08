# Token compression — Off-gold set (locked)

> **Rule:** Off-gold = asks **not** on the gold sheet’s ship-shorts.
> **Pass:** ship a short that teaches *this* tight ask, **or** refuse the short (ask / longer-clean).
> No wording match to gold rows. No invented survey title.
> Spec pointer: `docs/token-compression-pipe-b.md` (Off-gold questions).
> Code: `OFF_GOLD_ASKS` in `src/lib/token-compression/goldRows.ts`.

## Table 1 — Off-gold drafts

| # | Draft | Expect |
|---|---|---|
| 1 | why do we have two atriums | Ship or ask (heart rooms — not row 6/7 verbatim). |
| 2 | what is a voltage | Ship one canvas, or ask vs current. |
| 3 | why doesn't the moon fall into the earth | New tight ask related to #21; not “things fall” from #11. |
| 4 | explain encapsulation in java | Ship encapsulation or ask vs class-vs-object. Do not reuse row 1’s classroom as if it were encapsulation. |
| 5 | how does a for loop work | Ship one canvas. |
| 6 | photosynthesis vs respiration | Ask which canvas — do not merge into row 16. |
| 7 | what is potential energy | Ship or ask vs kinetic. |
| 8 | explain binary search | Ship one canvas. |
| 9 | tell me all of organic chemistry | Refuse / ask — B-shaped blob. |
| 10 | my recursion is blowing the stack in production how do I fix it | Ask: concept canvas vs debug-this-stack. Do not dump a survey of CS. |

Human skim after script green (script does **not** stranger-pass): **#1 atrium**, **#3 moon**, **#9 organic chem**.

## Table 2 — Eval checklist

| Check | Pass | Fail |
|---|---|---|
| Process finishes | completed / structured result | Crash, hung streaming, empty pane |
| Pipe A | One tight ask or a real question | Invented course title (“All of organic chemistry”, “Introduction to codebases”) |
| Pipe B | `ship_short` that teaches that tight ask, or refuse short (ask / longer-clean) | Fluent-wrong shipped; soup shipped; fail banner |
| Hard harness | No known `mustNotClaim` from nearby gold rows if the text wanders there (e.g. moon must not say sun-at-center) | Phrase hit still ships |
| Job judge (eval only this week) | `sameTightAsk` yes + no failure/mustNot hit vs **this run’s** tight ask (board-mapping `sameJob` logged, not hard-fail) | Judge requires wording from rows 1–16 or #21; fluent-wrong / survey hit |
| User-facing | Normal tutor or clarify | “Eval failed” / “we failed to teach” |

**Green** means: named or asked, shipped or refused, no crash. No gold ship-short column to match.
