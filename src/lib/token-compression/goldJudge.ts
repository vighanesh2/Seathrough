import { z } from "zod";
import { completeJsonObject } from "@/lib/token-compression/llmJson";
import {
  decideShipShort,
  hitsForbiddenClaims,
  paneLooksLikeBareDefinition,
  paneLooksLikeSoup,
} from "@/lib/token-compression/responseHarness";
import type { GoldARow } from "@/lib/token-compression/goldRows";

/**
 * Eval-only job judge (temp 0). Four-question rubric.
 * Do NOT wire into live ship_short until human agreement on all 17 A rows
 * + TOKEN_COMPRESSION_RUNTIME_JOB_JUDGE=1.
 */

const judgeSchema = z.object({
  sameTightAsk: z.enum(["yes", "no"]),
  sameJobAsShipShort: z.enum(["yes", "no"]),
  hitsFailureOrMustNot: z.enum(["yes", "no"]),
  notes: z.string().optional(),
});

export type JobJudgeResult = {
  sameTightAsk: "yes" | "no";
  sameJobAsShipShort: "yes" | "no";
  hitsFailureOrMustNot: "yes" | "no";
  /** Derived: yes only if 1+2 yes and 3 no */
  sameJob: "yes" | "no";
  notes?: string;
};

const JUDGE_SYSTEM = `You are an independent job judge for SeeThrough token compression eval.
Answer ONLY the rubric. Be strict and consistent.
Do not rewrite the pane. Do not teach. Judge only.

sameJobAsShipShort = yes when the pane teaches the SAME teaching job as the
gold ship-short: core idea + board mapping mechanism + a clear next teaching move.
Wording may differ.

A correct glossary definition WITHOUT the board mapping
(e.g. "two pumps four chambers" with no right→lungs / left→body) is sameJob=no.

Do NOT fail solely because a later/follow-on canvas is omitted, if the gold
nextStep for THIS canvas is present (e.g. orbit cannon stills / speed steps
are enough; "ellipse with sun at a focus" may be next canvas).

Return flat JSON:
{
  "sameTightAsk": "yes" | "no",
  "sameJobAsShipShort": "yes" | "no",
  "hitsFailureOrMustNot": "yes" | "no",
  "notes": string
}`;

function deriveSameJob(
  parsed: z.infer<typeof judgeSchema>,
): "yes" | "no" {
  if (
    parsed.sameTightAsk === "yes" &&
    parsed.sameJobAsShipShort === "yes" &&
    parsed.hitsFailureOrMustNot === "no"
  ) {
    return "yes";
  }
  return "no";
}

/**
 * Gold A: compare pane to gold ship-short job + failure / must-not.
 */
export async function judgeGoldAPane(input: {
  row: GoldARow;
  paneScript: string;
}): Promise<JobJudgeResult> {
  const { row, paneScript } = input;
  const raw = await completeJsonObject({
    system: JUDGE_SYSTEM,
    user: [
      "Rubric (answer each yes/no):",
      "1. sameTightAsk — Does the pane teach the same tight ask as gold (not a neighbor lesson)?",
      "2. sameJobAsShipShort — Same JOB as the gold ship-short (not same wording)?",
      "3. hitsFailureOrMustNot — Does the pane hit the failure note or any must-not-claim (including paraphrase)?",
      "",
      `Tight ask:\n${row.tightAsk}`,
      `Gold ship-short (job target, not wording target):\n${row.shipShort}`,
      `Failure note:\n${row.failureNote}`,
      `Must not claim:\n${row.mustNotClaim.join(" | ")}`,
      `Actual pane:\n${paneScript}`,
    ].join("\n"),
    temperature: 0,
  });

  const parsed = judgeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      sameTightAsk: "no",
      sameJobAsShipShort: "no",
      hitsFailureOrMustNot: "yes",
      sameJob: "no",
      notes: `judge_schema_fail: ${parsed.error.message}`,
    };
  }

  return {
    ...parsed.data,
    sameJob: deriveSameJob(parsed.data),
  };
}

/**
 * Off-gold: no handwritten ship-short.
 * Judge against THIS RUN's tight ask only — never gold row wording.
 */
export async function judgeOffGoldPane(input: {
  tightAsk: string;
  paneScript: string;
  expectNote?: string;
}): Promise<JobJudgeResult> {
  const raw = await completeJsonObject({
    system: JUDGE_SYSTEM,
    user: [
      "Rubric (off-gold — no gold ship-short wording target):",
      "1. sameTightAsk — Does the pane teach THIS tight ask only?",
      "2. sameJobAsShipShort — Treat as: teaches the tight ask with a board mechanism",
      "   (objects/steps you could draw), not only a bare definition and not a survey.",
      "   Do NOT require wording from the gold sheet (rows 1–16 or #21).",
      "   Do NOT require the word 'mapping'.",
      "3. hitsFailureOrMustNot — Fluent-wrong, keyword soup, or invented survey title?",
      "",
      `Tight ask (from this run):\n${input.tightAsk}`,
      input.expectNote ? `Product expect note:\n${input.expectNote}` : "",
      `Actual pane:\n${input.paneScript}`,
    ]
      .filter(Boolean)
      .join("\n"),
    temperature: 0,
  });

  const parsed = judgeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      sameTightAsk: "no",
      sameJobAsShipShort: "no",
      hitsFailureOrMustNot: "yes",
      sameJob: "no",
      notes: `judge_schema_fail: ${parsed.error.message}`,
    };
  }

  return {
    ...parsed.data,
    sameJob: deriveSameJob(parsed.data),
  };
}

export type EvalHardGate = {
  forbiddenHit: boolean;
  forbiddenPhrase: string | null;
  soupHit: boolean;
  harnessWouldShip: boolean;
  harnessReason: string;
};

/** Deterministic gates shared by eval report (and mirrors live week-one ship). */
export function evalHardGate(input: {
  paneScript: string;
  forbiddenPhrases: readonly string[];
  criticYes: boolean;
  voiceOk: boolean;
}): EvalHardGate {
  const forbidden = hitsForbiddenClaims(
    input.paneScript,
    input.forbiddenPhrases,
  );
  const soupHit = paneLooksLikeSoup(input.paneScript);
  const decision = decideShipShort({
    criticYes: input.criticYes,
    voiceOk: input.voiceOk,
    forbiddenHit: forbidden.hit,
    soupHit,
    bareDefinitionHit: paneLooksLikeBareDefinition(input.paneScript),
    runtimeJobJudgeEnabled: false,
  });

  return {
    forbiddenHit: forbidden.hit,
    forbiddenPhrase: forbidden.hit ? forbidden.phrase : null,
    soupHit,
    harnessWouldShip: decision.ship,
    harnessReason: decision.reason,
  };
}

/**
 * Live (post human-gate) judge: tight ask only — no gold ship-short.
 * Only call when isRuntimeJobJudgeEnabled().
 */
export async function judgeLiveTightAsk(input: {
  tightAsk: string;
  paneScript: string;
}): Promise<JobJudgeResult> {
  const raw = await completeJsonObject({
    system: JUDGE_SYSTEM,
    user: [
      "Rubric (live ship — no gold ship-short):",
      "1. sameTightAsk — Does the pane teach THIS tight ask only?",
      "2. sameJobAsShipShort — Treat as: teaches the tight ask and ONLY that?",
      "3. hitsFailureOrMustNot — Fluent-wrong, keyword soup, or survey of neighbor topics?",
      "",
      `Tight ask:\n${input.tightAsk}`,
      `Actual pane:\n${input.paneScript}`,
    ].join("\n"),
    temperature: 0,
  });

  const parsed = judgeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      sameTightAsk: "no",
      sameJobAsShipShort: "no",
      hitsFailureOrMustNot: "yes",
      sameJob: "no",
      notes: `judge_schema_fail: ${parsed.error.message}`,
    };
  }

  return {
    ...parsed.data,
    sameJob: deriveSameJob(parsed.data),
  };
}
