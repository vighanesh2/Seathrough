/**
 * Step 0 — Freeze the job of compression.
 *
 * This file is the single source of truth for the product sentence that
 * governs every later pipe (A rewrite, B pane/voice trim). Do not edit the
 * sentence mid-cycle. If the product changes, start a new cycle and bump
 * COMPRESSION_JOB_CYCLE.
 */

/** Cycle id for this freeze. Bump only when starting a new compression cycle. */
export const COMPRESSION_JOB_CYCLE = "mvp2-token-compression-v1" as const;

/**
 * The spec. TCRA-LLM’s two rungs (summarization, then semantic word-drop)
 * exist to serve this sentence. LLMLingua exists only as a reminder that a
 * sloppy ask produces sloppy output. Shorter is not the score.
 */
export const COMPRESSION_JOB_SENTENCE =
  "After compression, the right pane + voice still teach this concept on this canvas. Anything that does not do that is deleted. Shorter is not a feature if the lesson got vaguer." as const;

/** Short label for logs / UI chrome. Never replace COMPRESSION_JOB_SENTENCE with this. */
export const COMPRESSION_JOB_LABEL = "teach-this-concept-on-this-canvas" as const;

/**
 * Explicit non-goals for this cycle. Kept next to the freeze so later work
 * cannot quietly widen the job.
 */
export const COMPRESSION_CYCLE_NON_GOALS = [
  "full context brain / learner graph",
  "Lingua budget controller / EXIT classifier",
  "live web image search or diagram RAG runtime",
  "compress any subject on earth",
  "beating 3Blue1Brown on animation",
  "shipping Point 2–3 diagram library as part of this freeze",
  "Point 4 as a smarter intent model (Pipe A is draft rewrite only, later)",
] as const;

export type CompressionJobCycle = typeof COMPRESSION_JOB_CYCLE;

/**
 * Runtime guard used by smoke tests and (later) Pipe B accept gates.
 * Returns true only when the exact frozen sentence is still in force.
 */
export function isCompressionJobFrozen(
  sentence: string = COMPRESSION_JOB_SENTENCE,
): boolean {
  return sentence === COMPRESSION_JOB_SENTENCE;
}

/** Human-readable block for docs, prompts, and critic preambles. */
export function formatCompressionJobBlock(): string {
  return [
    `Compression job (${COMPRESSION_JOB_CYCLE}):`,
    COMPRESSION_JOB_SENTENCE,
    "",
    "Score: does the short pane + voice still teach this concept on this canvas?",
    "Not a score: token count, fluency alone, or a generic summarize pass.",
  ].join("\n");
}
