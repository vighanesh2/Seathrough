# Token compression — Steps 0 & 1 (locked)

> **Cycle:** `mvp2-token-compression-v1`
> **Scope of this doc:** freeze the job + define the teaching unit.
> **Not in this cycle yet:** Pipe A UX, Pipe B trim, gold set of 20, voice budget number, diagram RAG (Points 2–3), smarter intent (Point 4).

Code source of truth:

- `src/lib/token-compression/job.ts` — Step 0
- `src/lib/token-compression/teachingUnit.ts` — Step 1
- `src/lib/token-compression/index.ts` — public exports

---

## Step 0 — Freeze the job of compression

**Do not change this sentence this cycle:**

> After compression, the right pane + voice still teach this concept on this canvas. Anything that does not do that is deleted. Shorter is not a feature if the lesson got vaguer.

That sentence is the spec.

| Reference | How we use it here |
|---|---|
| **TCRA-LLM** (Liu et al., EMNLP 2023 Findings) | Two rungs exist to **serve** the sentence: (1) summarization compression — keep teaching content, drop the rest; (2) semantic compression — drop words that do not change whether the concept is still taught. We are **not** shipping their mT5 checkpoint or sentence-transformer loop in Steps 0–1. |
| **LLMLingua** (Jiang et al., EMNLP 2023) | Reminder only: a sloppy ask produces sloppy output. Pipe A (later) tightens the ask; it does not telegram the student’s English. |

Constant: `COMPRESSION_JOB_SENTENCE` in `job.ts`.

### Explicit non-goals (this cycle)

Copied into `COMPRESSION_CYCLE_NON_GOALS`:

- full context brain / learner graph
- Lingua budget controller / EXIT classifier
- live web image search or diagram RAG runtime
- “compress any subject on earth”
- beating 3Blue1Brown on animation
- shipping Point 2–3 diagram library as part of this freeze
- Point 4 as a smarter intent model (Pipe A draft rewrite comes later)

---

## Step 1 — Teaching unit (locked)

Minimum lesson object a student or engineer must leave with after **one** canvas:

| Field | Meaning |
|---|---|
| **Content name** | Name of the lesson content (concept label), not a paragraph. |
| **Scope** | What is **in** / what is **out** for this canvas. Bounds the lesson. |
| **Core-concept summary** | **One sentence** — what the idea is for this ask. |
| **Next step** | The immediate teaching move after stating the concept. |
| **Mapping on canvas** | Contract between right pane and center pane (three lines below). |

**Relatability is not a sixth field.** It is whatever mapping still sits inside `mappingOnCanvas`. If a sentence does not serve one of the five fields above, it is generalist for this canvas.

### Mapping on this canvas (three lines)

Mapping = what the picture is **allowed** to show so the concept becomes visible — and what it **must not** show. Not a metaphor essay. Not “make it relatable” as a vibe.

1. **Objects on the board** — what is drawn (boxes, arrows, a stack of frames, two circles labeled “class” and “object”).
2. **What the drawing means** — each object maps to one idea in the core-concept summary.
3. **Still vs may move** — what stays frozen (stuck vision) vs what may change if a transition is ever allowed on this same canvas.

Schema: `teachingUnitSchema` / `canvasMappingSchema` in `teachingUnit.ts`.

### Hard vs soft (for later gold + critic)

- **Soft:** most teaching sentences are relevant.
- **Hard:** every field of the teaching unit is present; every sentence on the pane is required for this canvas — nothing extra, nothing missing.

Ship only on **hard**. Soft is a debug signal. That is how we avoid a shorter generalist.

WANDR-inspired note (token side only): entity first (content name + scope) before claims; evidence gate later = “does this sentence still support this unit?”; required-field hierarchy = the five keys above.

---

## What Steps 0–1 deliberately do **not** do

- No rewrite of the user prompt (Pipe A)
- No landfill → summarization → semantic trim pipeline (Pipe B)
- No gold set of 20 wedge asks (Step 2 — needs product authoring)
- No voice max-length number (Step 5)
- No stranger solve-without-pane test pick (Step 6)
- No wiring into `/api/lesson/stream` yet

`TEACHING_UNIT_SCHEMA_FIXTURE` in code is a **schema smoke example**, not ship gold.

---

## Bibliography (method references only)

Liu, J., Li, L., Xiang, T., Wang, B., & Qian, Y. (2023). TCRA-LLM: Token compression retrieval augmented large language model for inference cost reduction. In *Findings of the Association for Computational Linguistics: EMNLP 2023* (pp. 9796–9810). Association for Computational Linguistics. https://doi.org/10.18653/v1/2023.findings-emnlp.655

Jiang, H., Wu, Q., Lin, C.-Y., Yang, Y., & Qiu, L. (2023). LLMLingua: Compressing prompts for accelerated inference of large language models. In *Proceedings of the 2023 Conference on Empirical Methods in Natural Language Processing* (pp. 13358–13376). Association for Computational Linguistics. https://doi.org/10.18653/v1/2023.emnlp-main.825

---

## Where each piece lives (DB)

**One place for the teaching unit: `public.lessons` columns** — not also inside `plan` JSON.

Migration: `docs/supabase/006_lesson_teaching_unit.sql`
TS mappers: `src/lib/token-compression/lessonContract.ts`

| Table | Job | Compression fields |
|---|---|---|
| **`lessons`** | Contract — one row = one prompt, one canvas, one outcome | `content_name`, `scope` `{include,exclude}`, `core_concept_summary`, `next_step`, `mapping` `{objects, meaning, still_may_move}`, `tight_ask`, `critic_pass` (`yes` \| `no` \| `asked_user`). `prompt` = sloppy draft. `title` = display. `human_summary` ≠ unit. |
| **`lesson_turns`** | Pane text (ordered speech) | Tutor = Pipe B shorts. Student = draft Pipe A reads. Reuse existing `meta.kind` — do **not** store the five unit fields only here. |
| **`lesson_beats`** | Canvas + voice timeline | After Pipe B, payload text = critic-accepted shorts. `diagram_action` = still vs may_move at runtime. No new table for mapping mismatches (product bug). |

Existing lesson inserts stay valid: new columns are **nullable** until Pipe A/B write them. Orchestrator is not wired to these columns yet.

---

## Gold + Pipe A docs (authored)

- `docs/token-compression-gold-set.md` — 20 gold rows (A rewrite-and-run / B stop-and-ask)
- `docs/token-compression-pipe-a.md` — 5 UX locks for Pipe A

---

## Runtime (wired)

Token compression is **on by default** for `/api/lesson/stream`.

Disable without deleting code: `TOKEN_COMPRESSION_ENABLED=0`

Flow:

1. **Pipe A** — rewrite to tight ask, or `clarify` SSE + soft option chips (never “we failed”).
2. Lesson plan generated against the tight ask (`prompt` column still stores the sloppy draft).
3. **Pipe B** — landfill → teaching cut → filler cut → voice gate; on soft fail, loosen to Pass 1 (no Claudish dump).
4. Persist teaching-unit columns on `lessons` via `teachingUnitToLessonPatch`.
5. Tutor `lesson_turns.content` and beat payloads receive the compressed sentences.

Product docs: gold set, pipe-a, pipe-b, voice, stranger-test under `docs/`.
