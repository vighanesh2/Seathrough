import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CARDIOPULMONARY_FLOW_ORDER,
  VISION_FLOW_ORDER,
  cardiacPhaseAt,
  valveStateForPhase,
  visionPhaseAt,
} from "../src/lib/anatomy/physiology";
import {
  citationsForKnowledge,
  retrieveCardiopulmonaryKnowledge,
} from "../src/lib/anatomy/knowledge/cardiopulmonary";
import { retrieveEyeKnowledge } from "../src/lib/anatomy/knowledge/eye";
import {
  anatomyModelAnswerSchema,
  anatomyQuestionRequestSchema,
} from "../src/lib/anatomy/schemas";
import { normalizeAnatomyModelAnswer } from "../src/lib/anatomy/answer";
import {
  revealForBeat,
  threeSceneFromChoice,
  threeSceneFromLessonPlan,
} from "../src/lib/three-scenes/decide";
import { lessonPlanSchema } from "../src/lib/schemas/lesson";

function indexOf(id: (typeof CARDIOPULMONARY_FLOW_ORDER)[number]): number {
  return CARDIOPULMONARY_FLOW_ORDER.indexOf(id);
}

function visionIndex(id: (typeof VISION_FLOW_ORDER)[number]): number {
  return VISION_FLOW_ORDER.indexOf(id);
}

const aliased = threeSceneFromChoice({
  use: true,
  id: "pulmonary",
  title: "Pulmonary flow",
});
assert.equal(aliased?.id, "cardiopulmonary");
assert.equal(aliased?.maxReveal, 6);
assert.equal(revealForBeat(aliased!, 1, 6), 1);
assert.equal(revealForBeat(aliased!, 6, 6), 6);

const eyeAliased = threeSceneFromChoice({
  use: true,
  id: "vision",
  title: "How we see",
});
assert.equal(eyeAliased?.id, "eye");
assert.equal(eyeAliased?.maxReveal, 6);

const whiteboardHeartPlan = lessonPlanSchema.parse({
  title: "How the heart pumps blood",
  language: "general",
  humanSummary: "The heart and lungs work together to move and oxygenate blood.",
  threeScene: null,
  beats: [
    {
      id: "flow",
      order: 1,
      kind: "process",
      narration:
        "The right ventricle pumps blood through the pulmonary artery to the lungs.",
      imageAction: "none",
    },
  ],
});
assert.equal(
  threeSceneFromLessonPlan(whiteboardHeartPlan)?.id,
  "cardiopulmonary",
);

const whiteboardEyePlan = lessonPlanSchema.parse({
  title: "How the eye sees",
  language: "general",
  humanSummary: "Light focuses on the retina as an inverted image.",
  threeScene: null,
  beats: [
    {
      id: "path",
      order: 1,
      kind: "process",
      narration:
        "Light bends through the cornea and lens, then lands upside down on the retina.",
      imageAction: "none",
    },
  ],
});
assert.equal(threeSceneFromLessonPlan(whiteboardEyePlan)?.id, "eye");

assert.ok(indexOf("right-atrium") < indexOf("right-ventricle"));
assert.ok(indexOf("right-ventricle") < indexOf("alveoli"));
assert.ok(indexOf("alveoli") < indexOf("left-atrium"));
assert.ok(indexOf("left-atrium") < indexOf("aorta"));

assert.ok(visionIndex("cornea") < visionIndex("lens"));
assert.ok(visionIndex("lens") < visionIndex("retina"));
assert.ok(visionIndex("retina") < visionIndex("optic-nerve"));
assert.ok(visionIndex("optic-nerve") < visionIndex("visual-cortex"));

assert.equal(cardiacPhaseAt(0.2), "filling");
assert.equal(cardiacPhaseAt(0.52), "atrial-systole");
assert.equal(cardiacPhaseAt(0.65), "ventricular-systole");
assert.equal(cardiacPhaseAt(0.85), "ejection");
assert.deepEqual(valveStateForPhase("filling"), {
  tricuspidOpen: true,
  mitralOpen: true,
  pulmonaryOpen: false,
  aorticOpen: false,
});
assert.deepEqual(valveStateForPhase("ejection"), {
  tricuspidOpen: false,
  mitralOpen: false,
  pulmonaryOpen: true,
  aorticOpen: true,
});

assert.equal(visionPhaseAt(0.1), "incoming");
assert.equal(visionPhaseAt(0.3), "focusing");
assert.equal(visionPhaseAt(0.5), "inverted");
assert.equal(visionPhaseAt(0.7), "transducing");
assert.equal(visionPhaseAt(0.9), "cortical");

const arteryEvidence = retrieveCardiopulmonaryKnowledge(
  "Why do pulmonary arteries carry deoxygenated blood?",
);
assert.ok(arteryEvidence.some((entry) => entry.id === "artery-vein-naming"));
assert.ok(citationsForKnowledge(arteryEvidence).length > 0);
assert.deepEqual(retrieveCardiopulmonaryKnowledge("quantum chromodynamics"), []);

const invertedEvidence = retrieveEyeKnowledge(
  "Why is the image on the retina upside down?",
);
assert.ok(invertedEvidence.some((entry) => entry.id === "inverted-image"));
assert.ok(citationsForKnowledge(invertedEvidence).length > 0);
assert.deepEqual(retrieveEyeKnowledge("quantum chromodynamics"), []);

assert.equal(
  anatomyQuestionRequestSchema.safeParse({ question: "" }).success,
  false,
);
assert.equal(
  anatomyQuestionRequestSchema.safeParse({ question: "x".repeat(601) }).success,
  false,
);
assert.equal(
  anatomyQuestionRequestSchema.safeParse({
    question: "How does blood flow?",
    selectedStructure: "not-a-structure",
  }).success,
  false,
);
assert.equal(
  anatomyQuestionRequestSchema.safeParse({
    question: "How does blood flow?",
    selectedStructure: "right-ventricle",
    sceneMode: "pulmonary-circulation",
  }).success,
  true,
);
assert.equal(
  anatomyQuestionRequestSchema.safeParse({
    question: "How does the eye see?",
    selectedStructure: "retina",
    sceneMode: "light-path",
    sceneId: "eye",
  }).success,
  true,
);
const tolerantAnswer = anatomyModelAnswerSchema.parse(
  normalizeAnatomyModelAnswer(
    {
      explanation: "The right ventricle ejects blood toward the lungs.",
      structures: ["right ventricle", { id: "pulmonary-artery" }],
      animation_mode: "unexpected-provider-label",
      reveal: 20,
    },
    "pulmonary-circulation",
  ),
);
assert.equal(tolerantAnswer.animationMode, "pulmonary-circulation");
assert.deepEqual(tolerantAnswer.focusStructures, [
  "right-ventricle",
  "pulmonary-trunk",
]);
assert.equal(tolerantAnswer.reveal, 6);

const eyeAnswer = anatomyModelAnswerSchema.parse(
  normalizeAnatomyModelAnswer(
    {
      answer: "The retinal image is inverted by the optics of the eye.",
      focusStructures: ["retina", "lens"],
      animationMode: "light-path",
      reveal: 4,
    },
    "overview",
    "eye",
  ),
);
assert.equal(eyeAnswer.animationMode, "light-path");
assert.deepEqual(eyeAnswer.focusStructures, ["retina", "lens"]);

const assetDir = resolve(process.cwd(), "public/models/cardiopulmonary");
const manifest = JSON.parse(
  readFileSync(resolve(assetDir, "asset-manifest.json"), "utf8"),
) as {
  license: string;
  assets: Array<{ file: string; sha256: string; sourceEntry: string }>;
};
assert.equal(manifest.license, "CC-BY-4.0");
assert.equal(manifest.assets.length, 3);
for (const asset of manifest.assets) {
  const file = resolve(assetDir, asset.file);
  assert.equal(existsSync(file), true, `${asset.file} is missing`);
  const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
  assert.equal(digest, asset.sha256, `${asset.file} checksum changed`);
  assert.match(asset.sourceEntry, /^https:\/\/3d\.nih\.gov\/entries\//);
}

console.log("anatomy smoke checks passed");
