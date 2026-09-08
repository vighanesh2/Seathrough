/**
 * Token compression — job, teaching unit, lessons contract, Pipe A/B, voice gate.
 *
 * Gold / product docs:
 * - docs/token-compression-gold-set.md
 * - docs/token-compression-pipe-a.md
 * - docs/token-compression-pipe-b.md
 * - docs/token-compression-voice.md
 * - docs/token-compression-stranger-test.md
 */

export {
  COMPRESSION_CYCLE_NON_GOALS,
  COMPRESSION_JOB_CYCLE,
  COMPRESSION_JOB_LABEL,
  COMPRESSION_JOB_SENTENCE,
  formatCompressionJobBlock,
  isCompressionJobFrozen,
  type CompressionJobCycle,
} from "@/lib/token-compression/job";

export {
  TEACHING_SENTENCE_ROLES,
  TEACHING_UNIT_FIELD_IDS,
  TEACHING_UNIT_FIELD_LABELS,
  TEACHING_UNIT_FORBIDDEN_KEYS,
  TEACHING_UNIT_SCHEMA_FIXTURE,
  assertTeachingUnit,
  canvasMappingSchema,
  formatTeachingUnitForFilter,
  parseTeachingUnit,
  teachingScopeSchema,
  teachingUnitHardComplete,
  teachingUnitSchema,
  type CanvasMapping,
  type TeachingScope,
  type TeachingSentenceRole,
  type TeachingUnit,
  type TeachingUnitCheck,
  type TeachingUnitFieldId,
} from "@/lib/token-compression/teachingUnit";

export {
  LESSON_CONTRACT_RULES,
  canvasMappingFromDb,
  canvasMappingToDb,
  criticPassSchema,
  lessonMappingDbSchema,
  lessonTeachingContractSchema,
  parseLessonTeachingContract,
  teachingUnitFromLessonRow,
  teachingUnitToLessonPatch,
  type CriticPass,
  type LessonMappingDb,
  type LessonTeachingContract,
  type LessonTeachingContractPatch,
} from "@/lib/token-compression/lessonContract";

export {
  isRuntimeJobJudgeEnabled,
  isTokenCompressionEnabled,
} from "@/lib/token-compression/enabled";

export {
  INJECTION_FENCE,
  SMOKE_FORBIDDEN_HEART_PANE,
  SMOKE_FORBIDDEN_HEART_PHRASES,
  decideShipShort,
  formatUntrustedDraft,
  hitsForbiddenClaims,
  normalizePaneText,
  paneLooksLikeBareDefinition,
  paneLooksLikeSoup,
  type DecideShipShortInput,
  type DecideShipShortResult,
  type ForbiddenCheck,
} from "@/lib/token-compression/responseHarness";

export {
  checkRequirementCoverage,
  requiredEvidenceCount,
  type RequirementCoverageCheck,
  type RequirementEvidence,
} from "@/lib/token-compression/requirementCoverage";

export {
  GOLD_A_ROWS,
  GOLD_B_ROWS,
  OFF_GOLD_ASKS,
  OFF_GOLD_HUMAN_READ_IDS,
  STRANGER_SAMPLE_SLUGS,
  landfillFromBadLongPane,
  landfillFromOffGoldTightAsk,
  selectGoldARows,
  selectGoldBRows,
  type GoldARow,
  type GoldBRow,
  type OffGoldAsk,
  type OffGoldExpectKind,
} from "@/lib/token-compression/goldRows";

export {
  evalHardGate,
  judgeGoldAPane,
  judgeLiveTightAsk,
  judgeOffGoldPane,
  type EvalHardGate,
  type JobJudgeResult,
} from "@/lib/token-compression/goldJudge";

export {
  runPipeA,
  sanitizePipeAResult,
  looksLikeProdConceptVsDebug,
  looksLikePotentialVsKineticAsk,
  PIPE_A_FORBIDDEN_SURVEY_PHRASES,
  pipeAOptionSchema,
  pipeAResultSchema,
  type PipeAOption,
  type PipeAResult,
  type RunPipeAInput,
} from "@/lib/token-compression/pipeA";

export {
  runPipeB,
  stripClaudishLocally,
  localCompressLandfill,
  normalizePipeBRaw,
  type PipeBBeatOut,
  type PipeBResult,
  type RunPipeBInput,
} from "@/lib/token-compression/pipeB";

export { applyCompressedNarration } from "@/lib/token-compression/applyToPlan";

export {
  VOICE_MAX_SECONDS,
  VOICE_MAX_WORDS,
  countSpokenWords,
  estimateSpokenSeconds,
  evaluateVoiceGate,
  joinPaneScript,
  looksLikeKeywordSoup,
  type VoiceGateResult,
} from "@/lib/token-compression/voiceGate";
