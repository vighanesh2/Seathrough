/**
 * Smoke: token-compression Steps 0 + 1 only.
 * Run: npm run smoke:token-compression
 */
import assert from "node:assert/strict";
import {
  COMPRESSION_CYCLE_NON_GOALS,
  COMPRESSION_JOB_CYCLE,
  COMPRESSION_JOB_SENTENCE,
  LESSON_CONTRACT_RULES,
  TEACHING_UNIT_FIELD_IDS,
  TEACHING_UNIT_FORBIDDEN_KEYS,
  TEACHING_UNIT_SCHEMA_FIXTURE,
  VOICE_MAX_WORDS,
  applyCompressedNarration,
  assertTeachingUnit,
  evaluateVoiceGate,
  formatCompressionJobBlock,
  formatTeachingUnitForFilter,
  isCompressionJobFrozen,
  looksLikeKeywordSoup,
  parseLessonTeachingContract,
  parseTeachingUnit,
  pipeAResultSchema,
  teachingUnitFromLessonRow,
  teachingUnitHardComplete,
  teachingUnitSchema,
  teachingUnitToLessonPatch,
} from "../src/lib/token-compression/index";
// --- Step 0: freeze ---------------------------------------------------------

assert.equal(
  COMPRESSION_JOB_CYCLE,
  "mvp2-token-compression-v1",
  "cycle id is locked for this freeze",
);

assert.equal(
  COMPRESSION_JOB_SENTENCE,
  "After compression, the right pane + voice still teach this concept on this canvas. Anything that does not do that is deleted. Shorter is not a feature if the lesson got vaguer.",
  "product sentence must not drift",
);

assert.equal(isCompressionJobFrozen(), true);
assert.equal(isCompressionJobFrozen("shorter is better"), false);

const jobBlock = formatCompressionJobBlock();
assert.ok(jobBlock.includes(COMPRESSION_JOB_SENTENCE));
assert.ok(jobBlock.includes("Not a score: token count"));

assert.ok(
  COMPRESSION_CYCLE_NON_GOALS.some((g) => g.includes("Lingua")),
  "non-goals keep Lingua/EXIT off the board",
);
assert.ok(
  COMPRESSION_CYCLE_NON_GOALS.some((g) => g.includes("diagram")),
  "non-goals keep diagram RAG off this freeze",
);

// --- Step 1: field lock -----------------------------------------------------

assert.deepEqual(
  [...TEACHING_UNIT_FIELD_IDS],
  [
    "contentName",
    "scope",
    "coreConceptSummary",
    "nextStep",
    "mappingOnCanvas",
  ],
  "five teaching-unit fields only — no relatability key",
);

assert.ok(
  !(TEACHING_UNIT_FIELD_IDS as readonly string[]).includes("relatability"),
);
assert.ok(TEACHING_UNIT_FORBIDDEN_KEYS.includes("relatability"));

// Fixture is schema smoke, not gold — but it must hard-complete.
const fixture = assertTeachingUnit(TEACHING_UNIT_SCHEMA_FIXTURE);
assert.equal(teachingUnitHardComplete(fixture), true);
assert.equal(fixture.mappingOnCanvas.objectsOnBoard.length > 0, true);
assert.equal(fixture.mappingOnCanvas.whatDrawingMeans.length > 0, true);
assert.equal(fixture.mappingOnCanvas.stillVsMayMove.length > 0, true);

const filterText = formatTeachingUnitForFilter(fixture);
assert.ok(filterText.includes("Content name:"));
assert.ok(filterText.includes("Scope out:"));
assert.ok(filterText.includes("Mapping — still vs may move:"));

// --- Rejects: empty / vague / multi-sentence summary / missing mapping ------

assert.equal(parseTeachingUnit(null).ok, false);
assert.equal(parseTeachingUnit({}).ok, false);

const missingMapping = parseTeachingUnit({
  contentName: "limits",
  scope: { include: "one-sided limits at a point", exclude: "series" },
  coreConceptSummary: "A limit is the value a function approaches.",
  nextStep: "Show left and right approach on a graph.",
  // mappingOnCanvas omitted
});
assert.equal(missingMapping.ok, false);
assert.ok(missingMapping.missing.includes("mappingOnCanvas"));

const multiSentence = teachingUnitSchema.safeParse({
  ...TEACHING_UNIT_SCHEMA_FIXTURE,
  coreConceptSummary:
    "The chain rule multiplies derivatives. It also works for three compositions. Remember the product rule too.",
});
assert.equal(
  multiSentence.success,
  false,
  "core-concept summary must stay one sentence",
);

const emptyExclude = parseTeachingUnit({
  ...TEACHING_UNIT_SCHEMA_FIXTURE,
  scope: { include: "chain rule once", exclude: "   " },
});
assert.equal(emptyExclude.ok, false);
assert.ok(emptyExclude.missing.includes("scope"));

const brokenMapping = parseTeachingUnit({
  ...TEACHING_UNIT_SCHEMA_FIXTURE,
  mappingOnCanvas: {
    objectsOnBoard: "two boxes",
    whatDrawingMeans: "",
    stillVsMayMove: "labels freeze",
  },
});
assert.equal(brokenMapping.ok, false);
assert.ok(
  brokenMapping.issues.some((i) => i.includes("whatDrawingMeans")),
  "all three mapping lines are required",
);

// Relatability must not be accepted as a teaching-unit field via schema.
const withRelatabilityJunk = {
  ...TEACHING_UNIT_SCHEMA_FIXTURE,
  relatability: "make it fun and friendly",
};
const stripped = teachingUnitSchema.parse(withRelatabilityJunk);
assert.equal(
  "relatability" in stripped,
  false,
  "zod object strips unknown relatability key",
);

// --- lessons DB contract (migration 006) — unit lives on lessons columns only -----

assert.ok(
  LESSON_CONTRACT_RULES.some((r) => r.includes("never also inside plan JSON")),
  "contract rules forbid dual storage in plan JSON",
);
assert.ok(
  LESSON_CONTRACT_RULES.some((r) => r.includes("lesson_turns")),
  "contract rules keep unit off turns-only storage",
);

const patch = teachingUnitToLessonPatch(TEACHING_UNIT_SCHEMA_FIXTURE, {
  tightAsk: "Java class — blueprint vs one object. Not inheritance.",
  criticPass: "yes",
});
assert.equal(patch.content_name, TEACHING_UNIT_SCHEMA_FIXTURE.contentName);
assert.deepEqual(patch.scope, TEACHING_UNIT_SCHEMA_FIXTURE.scope);
assert.equal(
  patch.core_concept_summary,
  TEACHING_UNIT_SCHEMA_FIXTURE.coreConceptSummary,
);
assert.equal(patch.next_step, TEACHING_UNIT_SCHEMA_FIXTURE.nextStep);
assert.deepEqual(patch.mapping, {
  objects: TEACHING_UNIT_SCHEMA_FIXTURE.mappingOnCanvas.objectsOnBoard,
  meaning: TEACHING_UNIT_SCHEMA_FIXTURE.mappingOnCanvas.whatDrawingMeans,
  still_may_move: TEACHING_UNIT_SCHEMA_FIXTURE.mappingOnCanvas.stillVsMayMove,
});
assert.equal(patch.tight_ask?.includes("Java class"), true);
assert.equal(patch.critic_pass, "yes");
// Domain keys must not leak into the DB patch
assert.equal("contentName" in patch, false);
assert.equal("mappingOnCanvas" in patch, false);

const roundTrip = teachingUnitFromLessonRow(patch);
assert.equal(roundTrip.ok, true);
assert.deepEqual(roundTrip.unit, TEACHING_UNIT_SCHEMA_FIXTURE);

const emptyContract = parseLessonTeachingContract({
  content_name: null,
  scope: null,
  core_concept_summary: null,
  next_step: null,
  mapping: null,
  tight_ask: null,
  critic_pass: null,
});
assert.equal(emptyContract.ok, true, "pre-Pipe lessons: all nulls are valid");
assert.equal(emptyContract.unitComplete, false);

const askedUser = parseLessonTeachingContract({
  ...patch,
  critic_pass: "asked_user",
  tight_ask: null,
});
assert.equal(askedUser.ok, true);
assert.equal(askedUser.contract?.critic_pass, "asked_user");

const badCritic = parseLessonTeachingContract({
  ...patch,
  critic_pass: "maybe",
});
assert.equal(badCritic.ok, false, "critic_pass is yes | no | asked_user only");

// --- Voice gate (Step 5) + Pipe A schema ------------------------------------

assert.equal(
  looksLikeKeywordSoup("class object blueprint instance classroom student"),
  true,
  "keyword soup fails voice gate",
);
assert.equal(
  looksLikeKeywordSoup(
    "A class is the blueprint. An object is one thing built from it.",
  ),
  false,
  "ship-short sentences pass soup check",
);

const overCap = evaluateVoiceGate(
  Array(VOICE_MAX_WORDS + 40)
    .fill("word")
    .join(" "),
);
assert.equal(overCap.ok, false);
assert.ok(overCap.reasons.some((r) => r.startsWith("over_word_cap")));

const shipShortVoice = evaluateVoiceGate(
  "A class is the blueprint. An object is one thing built from it. On this canvas the classroom is the class. Next: write one new.",
);
assert.equal(shipShortVoice.ok, true);

const askShape = pipeAResultSchema.parse({
  decision: "ask",
  message: "Which one canvas should we teach?",
  options: [
    {
      id: "pump",
      label: "Two pumps / four rooms",
      tightAsk: "Heart — two pumps, four chambers. Not ion channels.",
    },
    {
      id: "path",
      label: "Follow one drop",
      tightAsk: "Path of blood through the heart only.",
    },
  ],
});
assert.equal(askShape.decision, "ask");

const runShape = pipeAResultSchema.parse({
  decision: "run",
  tightAsk: "Java class — blueprint vs one object. Not inheritance.",
  contentName: "Java class",
  scope: {
    include: "class vs one object",
    exclude: "inheritance",
  },
});
assert.equal(runShape.decision, "run");

const applied = applyCompressedNarration(
  {
    title: "Java class",
    language: "java",
    humanSummary: "old summary dump",
    beats: [
      {
        id: "b1",
        order: 1,
        kind: "intro",
        narration: "In object-oriented programming it is important to note…",
        imageAction: "none",
        actions: [],
      },
    ],
  },
  [{ id: "b1", narration: "A class is the blueprint." }],
  "Blueprint vs one built thing.",
);
assert.equal(applied.beats[0]?.narration, "A class is the blueprint.");
assert.equal(applied.humanSummary, "Blueprint vs one built thing.");

// Pipe B normalize: empty mapping fields must not dump us to local-only path
import {
  localCompressLandfill,
  normalizePipeBRaw,
} from "../src/lib/token-compression/pipeB";

const normalized = normalizePipeBRaw(
  {
    contentName: "Java class",
    scopeInclude: "blueprint vs object",
    scopeExclude: "inheritance",
    coreConceptSummary: "A class is the blueprint; an object is one instance.",
    nextStep: "Write one new.",
    mappingObjects: "",
    mappingMeaning: "",
    mappingStillMayMove: "",
    beats: [{ id: "b1", narration: "A class is the blueprint." }],
    humanSummary: "Blueprint vs one built thing.",
    criticTeachScore: "yes",
  },
  {
    tightAsk: "Java class — blueprint vs one object. Not inheritance.",
    contentName: "Java class",
    scope: {
      include: "blueprint vs object",
      exclude: "inheritance",
    },
    landfillBeats: [
      { id: "b1", kind: "intro", narration: "In OOP it is important to note…" },
    ],
    landfillHumanSummary: "long dump",
  },
);
assert.ok(String(normalized.mappingObjects).length > 0);
assert.ok(String(normalized.mappingMeaning).length > 0);
assert.ok(String(normalized.mappingStillMayMove).length > 0);
assert.equal(normalized.criticTeachScore, "yes");

const explicitFallback = localCompressLandfill({
  tightAsk:
    "Show three deployment checks with one failure example for each check.",
  contentName: "Deployment checks",
  scope: { include: "three checks", exclude: "deployment survey" },
  landfillBeats: [
    {
      id: "check-1",
      kind: "example",
      narration: "Check one catches a missing environment variable.",
    },
    {
      id: "check-2",
      kind: "example",
      narration: "Check two catches a failed database connection.",
    },
    {
      id: "check-3",
      kind: "example",
      narration: "Check three catches a stale migration.",
    },
  ],
  landfillHumanSummary: "All three checks block a broken release.",
});
assert.equal(explicitFallback.recovery, "keep_landfill");
assert.match(explicitFallback.paneScript, /missing environment variable/);
assert.match(explicitFallback.paneScript, /failed database connection/);
assert.match(explicitFallback.paneScript, /stale migration/);

// --- Response harness (no LLM) ----------------------------------------------

import {
  SMOKE_FORBIDDEN_HEART_PANE,
  SMOKE_FORBIDDEN_HEART_PHRASES,
  checkRequirementCoverage,
  decideShipShort,
  hitsForbiddenClaims,
  isRuntimeJobJudgeEnabled,
  requiredEvidenceCount,
} from "../src/lib/token-compression/index";

const heartHit = hitsForbiddenClaims(
  SMOKE_FORBIDDEN_HEART_PANE,
  SMOKE_FORBIDDEN_HEART_PHRASES,
);
assert.equal(heartHit.hit, true);
assert.ok(
  heartHit.phrase && /oxygenat/i.test(heartHit.phrase),
  "must log which phrase fired",
);

const heartRefuse = decideShipShort({
  criticYes: true,
  voiceOk: true,
  forbiddenHit: heartHit.hit,
  soupHit: false,
  runtimeJobJudgeEnabled: false,
});
assert.equal(heartRefuse.ship, false);
assert.equal(heartRefuse.reason, "forbidden_phrase");

const ciaAsk =
  "Explain the CIA triad with one real-world example for each; exclude other security principles.";
assert.equal(requiredEvidenceCount(ciaAsk), 3);
const incompleteCia = checkRequirementCoverage(
  ciaAsk,
  "Integrity keeps data unchanged. A bank hashes transaction logs.",
  [
    {
      requirement: "Integrity example",
      evidence: "A bank hashes transaction logs.",
    },
  ],
);
assert.equal(incompleteCia.ok, false);
assert.equal(incompleteCia.validEvidence, 1);

const completeCiaPane = [
  "Confidentiality keeps records secret; a clinic encrypts patient files.",
  "Integrity exposes changes; a bank hashes transaction logs.",
  "Availability keeps access working; a hospital runs backup servers.",
].join(" ");
assert.equal(
  checkRequirementCoverage(ciaAsk, completeCiaPane, [
    {
      requirement: "Confidentiality example",
      evidence:
        "Confidentiality keeps records secret; a clinic encrypts patient files.",
    },
    {
      requirement: "Integrity example",
      evidence: "Integrity exposes changes; a bank hashes transaction logs.",
    },
    {
      requirement: "Availability example",
      evidence:
        "Availability keeps access working; a hospital runs backup servers.",
    },
  ]).ok,
  true,
);
assert.equal(
  decideShipShort({
    criticYes: true,
    voiceOk: true,
    forbiddenHit: false,
    requirementCoverageHit: true,
  }).reason,
  "requirement_coverage",
);

// Single word must NOT false-positive (phrase lists stay specific)
const javaOk = hitsForbiddenClaims(
  "A class is the blueprint. An object is one thing built from it.",
  ["class = object", "a class is an object"],
);
assert.equal(javaOk.hit, false, "object alone must not fire");

assert.equal(
  isRuntimeJobJudgeEnabled(),
  false,
  "runtime job judge default off (eval-only week one)",
);

import { sanitizePipeAResult } from "../src/lib/token-compression/pipeA";

const cleanedAsk = sanitizePipeAResult({
  decision: "ask",
  message: "Try Managing Overhead as a canvas",
  options: [
    {
      id: "bad",
      label: "Managing Overhead",
      tightAsk: "Managing Overhead for junk removal",
    },
    {
      id: "ok",
      label: "One concrete ops skill on this board",
      tightAsk: "One concrete ops skill — not a survey course.",
    },
  ],
});
assert.equal(cleanedAsk.decision, "ask");
if (cleanedAsk.decision === "ask") {
  assert.ok(
    cleanedAsk.options.every(
      (o) =>
        !/managing overhead/i.test(o.label) &&
        !/managing overhead/i.test(o.tightAsk),
    ),
  );
  assert.ok(!/managing overhead/i.test(cleanedAsk.message));
}

import { looksLikeProdConceptVsDebug } from "../src/lib/token-compression/pipeA";

assert.equal(
  looksLikeProdConceptVsDebug(
    "my recursion is blowing the stack in production how do I fix it",
  ),
  true,
);
const prodDebugAsk = sanitizePipeAResult(
  {
    decision: "run",
    tightAsk: "Recursion stack overflow — include debugging in production",
    contentName: "Recursion stack overflow",
    scope: { include: "debug", exclude: "other" },
  },
  "my recursion is blowing the stack in production how do I fix it",
);
assert.equal(prodDebugAsk.decision, "ask");
if (prodDebugAsk.decision === "ask") {
  assert.ok(prodDebugAsk.options.length >= 2);
}

import { looksLikePotentialVsKineticAsk } from "../src/lib/token-compression/pipeA";

assert.equal(looksLikePotentialVsKineticAsk("what is potential energy"), true);
assert.equal(
  looksLikePotentialVsKineticAsk("gravitational potential energy on a hill"),
  false,
);
const peAsk = sanitizePipeAResult(
  {
    decision: "run",
    tightAsk: "Potential energy — definition, types, and examples.",
    contentName: "Potential Energy",
    scope: { include: "all types", exclude: "kinetic" },
  },
  "what is potential energy",
);
assert.equal(peAsk.decision, "ask");
if (peAsk.decision === "ask") {
  assert.ok(peAsk.options.some((o) => /potential/i.test(o.label)));
  assert.ok(peAsk.options.some((o) => /kinetic/i.test(o.label)));
}

const obviousSurveyAsk = sanitizePipeAResult(
  {
    decision: "ask",
    message: "Which aspect?",
    options: [
      {
        id: "fundamentals",
        label: "Fundamentals of integral calculus",
        tightAsk: "Fundamentals of integral calculus.",
      },
      {
        id: "techniques",
        label: "Techniques of integration",
        tightAsk: "Substitution and integration by parts.",
      },
    ],
  },
  "explain integral calculus",
);
assert.equal(obviousSurveyAsk.decision, "ask");
if (obviousSurveyAsk.decision === "ask") {
  assert.ok(
    obviousSurveyAsk.options.every(
      (option) =>
        !/\b(fundamentals|techniques|applications) of\b/i.test(option.label),
    ),
  );
}

import { paneLooksLikeBareDefinition } from "../src/lib/token-compression/responseHarness";
import {
  correctIntegralAreaClaims,
  ensureSignedAreaSummary,
  hasSignedAreaSemantics,
} from "../src/lib/math/integralAreaAccuracy";

const correctedIntegral = ensureSignedAreaSummary(
  "An integral measures the area under a curve. Add the slices to get the total area. Next: try one.",
);
assert.ok(hasSignedAreaSemantics(correctedIntegral));
assert.doesNotMatch(correctedIntegral, /\btotal area\b/i);
assert.match(
  correctIntegralAreaClaims("The result is the total shaded area."),
  /signed area/i,
);

assert.equal(
  paneLooksLikeBareDefinition(
    "Potential energy is stored energy due to position. It has several types and examples.",
  ),
  true,
);
assert.equal(
  paneLooksLikeBareDefinition(
    "We draw a hill for gravitational PE and a spring for elastic PE on the board.",
  ),
  false,
);
assert.equal(
  decideShipShort({
    criticYes: true,
    voiceOk: true,
    forbiddenHit: false,
    soupHit: false,
    bareDefinitionHit: true,
  }).reason,
  "bare_definition",
);

import {
  formatNarrationForDisplay,
  sameNarrationText,
} from "../src/lib/math/formatNarrationForDisplay";

const learnerClaim =
  "Now I see how spatial arrangement around a carbon decides if molecules are identical. Next: assign R/S configuration.";
const objectiveRecap =
  "Spatial arrangement around a carbon decides if molecules are identical. Next: assign R/S configuration.";
assert.equal(formatNarrationForDisplay(learnerClaim), objectiveRecap);
assert.equal(
  formatNarrationForDisplay("I have mastered this topic. Next: try an example."),
  "Next: try an example.",
);
assert.equal(
  formatNarrationForDisplay("Now we draw the carbon bonds."),
  "Now we draw the carbon bonds.",
  "valid teacher-action narration must remain",
);
assert.equal(sameNarrationText(learnerClaim, objectiveRecap), true);

console.log("smoke:token-compression ok");
console.log(`  cycle: ${COMPRESSION_JOB_CYCLE}`);
console.log(`  fields: ${TEACHING_UNIT_FIELD_IDS.join(", ")}`);
console.log("  lessons contract: columns only (not plan JSON)");
console.log("  pipe A/B schemas + voice gate: ok");
console.log("  pipe B normalize fills empty mapping*: ok");
console.log("  harness: heart oxygenates → refuse ship_short: ok");
console.log("  pipe A sanitize strips survey titles: ok");
console.log("  pipe A prod recursion → ask concept vs debug: ok");
console.log("  pipe A bare PE → ask vs kinetic: ok");
console.log("  pipe A obvious survey-option fallback: ok");
console.log("  harness: bare glossary → refuse ship_short: ok");
console.log("  integral signed-area final-output invariant: ok");
console.log("  learner-state claims removed + exact recap dedupe: ok");
