# Token compression — Step 4: Pipe B behavior

#Landfill → teaching cut → filler cut → ship or reject. Paste below.

# Pipe B — product behavior

## Job
Pipe B writes the **right pane and the voice** for **one** tight ask.
It kills Claudish. It does not invent a new lesson.

Pipe A must already have named one lesson (content name + scope).
If Pipe A asked the user and is waiting, Pipe B does not run.

## Score (Step 0)
After Pipe B, the pane + voice still teach *this* concept on *this* canvas.
Shorter is a fail if the lesson got vaguer than the long draft.

## What must survive (Step 1 unit)
1. Content name
2. Scope
3. Core-concept summary (one sentence)
4. Next step
5. Mapping on this canvas (objects, meaning, still vs may_move)

A sentence ships only if it serves one of those five.
Relatability is not a sixth field. It only lives inside the mapping.

## Inputs
- Tight ask from Pipe A (or user-confirmed rewrite)
- Long draft generated against that ask (landfill)
- Gold ship-short + failure note when this ask is in the gold sheet

## Outputs
- Ship-short pane text (also the voice script)
- `critic_pass`: yes | no
- If no: do **not** replace the pane with the failed short

Where it lands in the app:
- Unit + `critic_pass` on `lessons`
- Compressed prose on `lesson_turns` (tutor)
- Same sentences in `lesson_beats` payload
- `diagram_action` must match mapping still / may_move

## Pass 1 — summarization
Rewrite the long draft down to teaching sentences for *this* ask.

Keep:
- What it is (core-concept summary)
- What is in / out (scope)
- Why the next step
- The mapping that makes it visible

Strip:
- Greetings, disclaimers, “it is important to note”
- Survey-of-the-field, history, extra examples not on this canvas
- Neighbor topics (inheritance on a class canvas; Maxwell on a charge canvas)
- Vendor / tool bake-offs

## Pass 2 — semantic trim
On what remains, drop words that do not change whether the concept is still taught.
Filler first. Never drop the noun that is the idea
(class, stack, charge, field, gravity, atrium, retrieve).

Do not turn the pane into a telegram of keywords.
Voice must still be readable as sentences.

## Critic (hard gate)
Answer only:

1. Does this short pane still teach *this* tight ask?
2. Are all five unit fields present or clearly implied without lying?
3. Can a voice read it without sounding like a bullet dump?
4. Is it *clearer or equal*, not vaguer, than the long draft?
5. Does it preserve every explicit deliverable in the tight ask—including
   requested counts, comparisons, inclusions, and one item “for each”?

Hard pass: every sentence is required for this canvas.
Soft pass is not enough to ship (relevant-but-extra survey text still dies).

If any answer is no → `critic_pass = no`.
Keep the long draft on screen or ask the user to narrow.
**Never ship the failed short.**

Pipe B returns exact pane evidence for each explicit deliverable. The harness
checks that the evidence is present and that multi-item requests have enough
distinct rows. A failed coverage check gets one focused author repair; if the
short and its independently gated fallback still fail, Pipe B returns the
original landfill unchanged instead of silently dropping requested content.
Board-script labels may guide the drawing, but cannot overwrite the accepted
pane/voice narration after these checks.

## Voice
The pane *is* the script. No second essay.
If the trim is speakable only as a list of nouns, reject.

## What Pipe B is not
- Not LLMLingua token-deletion on the student’s draft (that is not even Pipe A)
- Not “summarize this explanation” as a generic prompt
  (that yields a shorter generalist)
- Not a new diagram (images are points 2–3, later)
- Not the context brain
- Not length-as-a-KPI

## Gold-sheet test
For each rewrite-and-run gold row:
- Pipe B output should match the **ship-short** in job, not in wording
- Pipe B output must not match the **failure note**
- Token count and $ are logged; they do not override the critic

## Off-gold questions
Same passes, same critic.
No whitelist of concepts.
If the short fails, refuse the short. The 20 rows were the blueprint, not the catalog.

**Locked drafts + eval checklist:** [`docs/token-compression-off-gold.md`](token-compression-off-gold.md)  
**Fixture:** `OFF_GOLD_ASKS` in `src/lib/token-compression/goldRows.ts`

## Examples of reject (put these next to the gold failure notes)
- Fluent + wrong: “The heart oxygenates the blood.”
- Fluent + different lesson: “OOP has four pillars” on a class canvas
- Fluent + vaguer: “Gravity is a force” with no toward-center / same-rate
- Keyword soup: “Class object blueprint new instance classroom student”

## Done for this cycle when
- This file is the rule
- Pipe B has been run on the 16 A gold rows
- Each row is pass against ship-short, fail against failure note
- 10 new asks *without* handwritten shorts still either pass the critic or refuse the short