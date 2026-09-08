import { z } from "zod";

/**
 * Step 1 — Teaching unit (locked).
 *
 * Minimum lesson object a student or engineer must leave with after one canvas.
 * Relatability is NOT a required field. It is whatever mapping still sits inside
 * `mappingOnCanvas` — the contract between the right pane and the center pane.
 *
 * A sentence that does not serve one of these fields is generalist for this
 * canvas and must not survive Pipe B.
 */

/** Ordered field ids — hierarchy of required keys (WANDR-style qualification). */
export const TEACHING_UNIT_FIELD_IDS = [
  "contentName",
  "scope",
  "coreConceptSummary",
  "nextStep",
  "mappingOnCanvas",
] as const;

export type TeachingUnitFieldId = (typeof TEACHING_UNIT_FIELD_IDS)[number];

/** Human labels for docs, gold sheets, and critic prompts. */
export const TEACHING_UNIT_FIELD_LABELS: Record<TeachingUnitFieldId, string> = {
  contentName: "Content name",
  scope: "Scope",
  coreConceptSummary: "Core-concept summary (one sentence)",
  nextStep: "Next step",
  mappingOnCanvas: "Mapping on canvas",
};

/**
 * What this lesson covers vs what it deliberately leaves out.
 * Scope is not a paragraph about the subject — it bounds the canvas.
 */
export const teachingScopeSchema = z.object({
  /** Concepts / cases this one canvas will teach. */
  include: z
    .string()
    .trim()
    .min(1, "scope.include is required")
    .describe("What is in for this canvas"),
  /** Nearby ideas that must not steal the lesson (survey, extra examples, etc.). */
  exclude: z
    .string()
    .trim()
    .min(1, "scope.exclude is required")
    .describe("What is out for this canvas"),
});

/**
 * Mapping on this canvas = what the picture is allowed to show so the concept
 * becomes visible — and what it must not show.
 *
 * Three lines only. Not a metaphor essay. Not “make it relatability” as a vibe.
 */
export const canvasMappingSchema = z.object({
  /** What is drawn (boxes, arrows, stack of frames, two circles labeled …). */
  objectsOnBoard: z
    .string()
    .trim()
    .min(1, "mapping.objectsOnBoard is required")
    .describe("Objects drawn on the one lesson canvas"),
  /**
   * Each object maps to one idea in the core-concept summary.
   * This is the pane ↔ board contract.
   */
  whatDrawingMeans: z
    .string()
    .trim()
    .min(1, "mapping.whatDrawingMeans is required")
    .describe("How each board object maps to the core-concept summary"),
  /**
   * Stuck vision: what stays frozen vs what may change if a transition is
   * ever allowed on this same canvas. Point 2 will use this later; Step 1
   * only records the contract.
   */
  stillVsMayMove: z
    .string()
    .trim()
    .min(1, "mapping.stillVsMayMove is required")
    .describe("What stays still vs what may transition on this canvas"),
});

/**
 * One-sentence core concept. Rejects empty / multi-paragraph dumps.
 * Soft length caps keep gold rows and critic inputs teachable aloud.
 */
function assertOneSentenceSummary(value: string, ctx: z.RefinementCtx) {
  const trimmed = value.trim();
  if (!trimmed) {
    ctx.addIssue({
      code: "custom",
      message: "coreConceptSummary must be one non-empty sentence",
    });
    return;
  }
  // Allow at most one terminal sentence boundary for the summary field.
  const sentenceEnds = trimmed.match(/[.!?](?=\s|$)/g)?.length ?? 0;
  if (sentenceEnds > 1) {
    ctx.addIssue({
      code: "custom",
      message:
        "coreConceptSummary must be one sentence (found multiple sentence endings)",
    });
  }
  if (trimmed.length > 280) {
    ctx.addIssue({
      code: "custom",
      message: "coreConceptSummary is too long for one spoken concept sentence",
    });
  }
}

export const teachingUnitSchema = z.object({
  /** Short name of the lesson content (e.g. “chain rule”, not a paragraph). */
  contentName: z
    .string()
    .trim()
    .min(1, "contentName is required")
    .max(120, "contentName must stay a name, not a lecture"),

  scope: teachingScopeSchema,

  /**
   * One sentence: what the idea is for this ask.
   * Survives into the right pane; Pipe B may not delete the idea-noun.
   */
  coreConceptSummary: z
    .string()
    .trim()
    .min(1)
    .superRefine(assertOneSentenceSummary),

  /**
   * The immediate pedagogical move after stating the concept
   * (why the next stroke / next line exists).
   */
  nextStep: z
    .string()
    .trim()
    .min(1, "nextStep is required")
    .max(400, "nextStep must stay one teaching move"),

  mappingOnCanvas: canvasMappingSchema,
});

export type TeachingScope = z.infer<typeof teachingScopeSchema>;
export type CanvasMapping = z.infer<typeof canvasMappingSchema>;
export type TeachingUnit = z.infer<typeof teachingUnitSchema>;

/** Result of a structural completeness check (not an LLM critic). */
export type TeachingUnitCheck = {
  ok: boolean;
  missing: TeachingUnitFieldId[];
  issues: string[];
  unit?: TeachingUnit;
};

/**
 * Fields that are NOT part of the teaching unit.
 * Kept as an explicit denylist so “relatability” cannot sneak in as a key.
 */
export const TEACHING_UNIT_FORBIDDEN_KEYS = [
  "relatability",
  "vibe",
  "engagement",
  "hook",
  "metaphorEssay",
] as const;

/**
 * Parse + validate. Prefer this at every boundary that claims to hold a unit.
 */
export function parseTeachingUnit(input: unknown): TeachingUnitCheck {
  const parsed = teachingUnitSchema.safeParse(input);
  if (parsed.success) {
    return { ok: true, missing: [], issues: [], unit: parsed.data };
  }

  const missing = new Set<TeachingUnitFieldId>();
  const issues: string[] = [];

  for (const issue of parsed.error.issues) {
    const path = issue.path.join(".") || "(root)";
    issues.push(`${path}: ${issue.message}`);
    const head = issue.path[0];
    if (
      typeof head === "string" &&
      (TEACHING_UNIT_FIELD_IDS as readonly string[]).includes(head)
    ) {
      missing.add(head as TeachingUnitFieldId);
    }
  }

  // If the whole object is wrong, surface every top-level field as missing.
  if (missing.size === 0 && (input == null || typeof input !== "object")) {
    for (const id of TEACHING_UNIT_FIELD_IDS) missing.add(id);
  }

  return {
    ok: false,
    missing: TEACHING_UNIT_FIELD_IDS.filter((id) => missing.has(id)),
    issues,
  };
}

/** Throws with a compact message — for smoke tests and strict callers. */
export function assertTeachingUnit(input: unknown): TeachingUnit {
  const check = parseTeachingUnit(input);
  if (!check.ok || !check.unit) {
    throw new Error(
      `Invalid teaching unit. missing=[${check.missing.join(", ")}] issues=${check.issues.slice(0, 8).join("; ")}`,
    );
  }
  return check.unit;
}

/**
 * Structural rule for later Pipe B critics:
 * a teaching sentence must serve at least one of these roles.
 * Relatability alone is never a role.
 */
export const TEACHING_SENTENCE_ROLES = [
  "content_name",
  "scope",
  "core_concept",
  "next_step",
  "canvas_mapping",
] as const;

export type TeachingSentenceRole = (typeof TEACHING_SENTENCE_ROLES)[number];

/**
 * Format the unit as the filter text that Pipe A/B will use later.
 * Does not compress narration — only serializes the locked contract.
 */
export function formatTeachingUnitForFilter(unit: TeachingUnit): string {
  return [
    `Content name: ${unit.contentName}`,
    `Scope in: ${unit.scope.include}`,
    `Scope out: ${unit.scope.exclude}`,
    `Core-concept summary: ${unit.coreConceptSummary}`,
    `Next step: ${unit.nextStep}`,
    `Mapping — objects on board: ${unit.mappingOnCanvas.objectsOnBoard}`,
    `Mapping — what the drawing means: ${unit.mappingOnCanvas.whatDrawingMeans}`,
    `Mapping — still vs may move: ${unit.mappingOnCanvas.stillVsMayMove}`,
  ].join("\n");
}

/**
 * Hard completeness for gold rows and critic inputs (Step 2+).
 * Soft relevance is not enough — every field must be present and non-empty.
 */
export function teachingUnitHardComplete(unit: TeachingUnit): boolean {
  return parseTeachingUnit(unit).ok;
}

/**
 * Example fixture for schema smoke only — NOT product gold.
 * Gold rows are authored in Step 2 with the user; do not treat this as ship copy.
 */
export const TEACHING_UNIT_SCHEMA_FIXTURE: TeachingUnit = {
  contentName: "chain rule on sin(x^2)",
  scope: {
    include: "Differentiate sin(x^2) using the chain rule once.",
    exclude:
      "Full survey of all derivative rules; unrelated trig identities; multiple worked examples not on this canvas.",
  },
  coreConceptSummary:
    "The chain rule multiplies the outer derivative by the inner derivative so d/dx sin(x^2) = cos(x^2) · 2x.",
  nextStep:
    "Name the outer function sin(u) and the inner u = x^2, then write the product of their derivatives.",
  mappingOnCanvas: {
    objectsOnBoard:
      "Two nested circles or boxes: outer labeled sin(u), inner labeled u = x^2; one arrow from inner to outer; product line cos(u)·u'.",
    whatDrawingMeans:
      "Outer box = outer function; inner box = inner function; arrow = dependence; product line = chain-rule multiply.",
    stillVsMayMove:
      "Outer/inner labels stay frozen; the product line may appear as the next step; do not swap in an unrelated function family on this canvas.",
  },
};
