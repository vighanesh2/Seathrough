import { z } from "zod";
import {
  assertTeachingUnit,
  parseTeachingUnit,
  teachingScopeSchema,
  type CanvasMapping,
  type TeachingScope,
  type TeachingUnit,
  type TeachingUnitCheck,
} from "@/lib/token-compression/teachingUnit";

/**
 * Where the teaching unit lives in the database.
 *
 * Contract home: `public.lessons` columns (see docs/supabase/006_lesson_teaching_unit.sql).
 * One place only — never also fold these fields into `lessons.plan` JSON.
 *
 * Not here:
 * - `lesson_turns` — Pipe B pane speech (ordered). Student = draft; tutor = compressed.
 * - `lesson_beats` — canvas + voice timeline; `diagram_action` is still/may_move at runtime.
 */

/** Pipe A / critic outcome stored on the lesson row. */
export const criticPassSchema = z.enum(["yes", "no", "asked_user"]);
export type CriticPass = z.infer<typeof criticPassSchema>;

/**
 * DB JSON for mapping — product keys (snake), not the TS teaching-unit camelCase.
 * { objects, meaning, still_may_move }
 */
export const lessonMappingDbSchema = z.object({
  objects: z.string().trim().min(1),
  meaning: z.string().trim().min(1),
  still_may_move: z.string().trim().min(1),
});

export type LessonMappingDb = z.infer<typeof lessonMappingDbSchema>;

/**
 * Nullable columns added by migration 006.
 * Existing lessons remain valid with all nulls until Pipe A/B write the contract.
 */
export const lessonTeachingContractSchema = z.object({
  content_name: z.string().trim().min(1).nullable(),
  scope: teachingScopeSchema.nullable(),
  core_concept_summary: z.string().trim().min(1).nullable(),
  next_step: z.string().trim().min(1).nullable(),
  mapping: lessonMappingDbSchema.nullable(),
  tight_ask: z.string().trim().min(1).nullable(),
  critic_pass: criticPassSchema.nullable(),
});

export type LessonTeachingContract = z.infer<typeof lessonTeachingContractSchema>;

/** Patch shape for `.update()` / `.insert()` on `lessons` — snake_case column names. */
export type LessonTeachingContractPatch = {
  content_name: string | null;
  scope: TeachingScope | null;
  core_concept_summary: string | null;
  next_step: string | null;
  mapping: LessonMappingDb | null;
  tight_ask: string | null;
  critic_pass: CriticPass | null;
};

export function canvasMappingToDb(mapping: CanvasMapping): LessonMappingDb {
  return {
    objects: mapping.objectsOnBoard,
    meaning: mapping.whatDrawingMeans,
    still_may_move: mapping.stillVsMayMove,
  };
}

export function canvasMappingFromDb(mapping: LessonMappingDb): CanvasMapping {
  return {
    objectsOnBoard: mapping.objects,
    whatDrawingMeans: mapping.meaning,
    stillVsMayMove: mapping.still_may_move,
  };
}

/**
 * Domain teaching unit → columns to write on `lessons`.
 * Does not touch `plan`, `human_summary`, or `title`.
 */
export function teachingUnitToLessonPatch(
  unit: TeachingUnit,
  extras?: {
    tightAsk?: string | null;
    criticPass?: CriticPass | null;
  },
): LessonTeachingContractPatch {
  const checked = assertTeachingUnit(unit);
  return {
    content_name: checked.contentName,
    scope: checked.scope,
    core_concept_summary: checked.coreConceptSummary,
    next_step: checked.nextStep,
    mapping: canvasMappingToDb(checked.mappingOnCanvas),
    tight_ask: extras?.tightAsk?.trim() || null,
    critic_pass: extras?.criticPass ?? null,
  };
}

/**
 * Read teaching-unit columns back into the domain TeachingUnit.
 * Returns a failed check if any required unit field is still null.
 */
export function teachingUnitFromLessonRow(row: {
  content_name?: string | null;
  scope?: unknown;
  core_concept_summary?: string | null;
  next_step?: string | null;
  mapping?: unknown;
}): TeachingUnitCheck {
  const mappingParse = lessonMappingDbSchema.safeParse(row.mapping);
  return parseTeachingUnit({
    contentName: row.content_name,
    scope: row.scope,
    coreConceptSummary: row.core_concept_summary,
    nextStep: row.next_step,
    mappingOnCanvas: mappingParse.success
      ? canvasMappingFromDb(mappingParse.data)
      : undefined,
  });
}

/**
 * Parse the full nullable contract (unit fields + Pipe A/critic columns).
 * Partial rows are allowed — that is the pre-Pipe state.
 */
export function parseLessonTeachingContract(
  input: unknown,
): {
  ok: boolean;
  contract?: LessonTeachingContract;
  issues: string[];
  unitComplete: boolean;
} {
  const parsed = lessonTeachingContractSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
      unitComplete: false,
    };
  }

  const unitCheck = teachingUnitFromLessonRow(parsed.data);
  return {
    ok: true,
    contract: parsed.data,
    issues: unitCheck.issues,
    unitComplete: unitCheck.ok,
  };
}

/**
 * Reminders for later Pipe wiring — not enforced at DB until columns are written.
 */
export const LESSON_CONTRACT_RULES = [
  "Store the teaching unit on lessons columns only — never also inside plan JSON.",
  "prompt remains the sloppy draft; tight_ask is Pipe A output.",
  "title remains display; content_name is the tight content name.",
  "human_summary is leftover planner copy — not core_concept_summary.",
  "lesson_turns hold pane speech only — do not park the five unit fields only there.",
  "lesson_beats hold timeline; after Pipe B, payload text matches critic-accepted shorts.",
  "diagram_action on beats is still vs may_move at runtime; mismatch with mapping is a product bug.",
] as const;
