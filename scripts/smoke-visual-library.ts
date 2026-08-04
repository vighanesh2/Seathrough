/**
 * Smoke checks for visual library growth (no network required for pure helpers).
 * Run: npx esbuild scripts/smoke-visual-library.ts --bundle --platform=node --outfile=/tmp/smoke-vl.js && node /tmp/smoke-vl.js
 */
import assert from "node:assert/strict";
import {
  buildLearnedVisualPlan,
  classifyVisualPlan,
  clearVisualLibraryMemory,
  displayLabelFromKey,
  makeTopicKey,
  rememberVisualLibrary,
  lookupVisualLibrary,
} from "../src/lib/visuals/library/index";

async function main() {
  clearVisualLibraryMemory();

  assert.equal(
    makeTopicKey({ prompt: "What is photosynthesis?" }),
    makeTopicKey({ prompt: "explain photosynthesis" }),
  );
  assert.equal(
    makeTopicKey({ prompt: "anything", conceptKey: "photosynthesis" }),
    "photosynthesis",
  );
  assert.ok(displayLabelFromKey("dividing-by-fractions").includes("Dividing"));

  assert.equal(
    classifyVisualPlan({
      renderer: "template",
      assetId: "right-triangle",
      actions: [],
    }),
    "curated",
  );
  assert.equal(
    classifyVisualPlan({
      renderer: "rough",
      sceneRecipe: { kind: "concept", label: "idea" },
      actions: [],
    }),
    "generic",
  );
  assert.equal(
    classifyVisualPlan({
      renderer: "rough",
      sceneRecipe: { kind: "cycle", label: "process" },
      actions: [],
    }),
    "procedural",
  );

  const learned = buildLearnedVisualPlan({
    prompt: "How does photosynthesis work?",
    conceptKey: "photosynthesis",
    cognitiveType: "process",
  });
  assert.equal(learned.renderer, "rough");
  assert.ok(learned.sceneRecipe);

  const topicKey = makeTopicKey({
    prompt: "How does photosynthesis work?",
    conceptKey: "photosynthesis",
  });

  const stored = await rememberVisualLibrary({
    topicKey,
    displayLabel: "Photosynthesis",
    sourcePrompt: "How does photosynthesis work?",
    conceptKey: "photosynthesis",
    plan: learned,
  });
  assert.equal(stored.stored, true);

  const hit = await lookupVisualLibrary(topicKey);
  assert.ok(hit);
  assert.equal(hit.plan.renderer, "rough");
  assert.ok(hit.hitCount >= 1);

  const bad = await rememberVisualLibrary({
    topicKey: "bad-plan-test",
    sourcePrompt: "x",
    plan: { renderer: "nope" } as never,
  });
  assert.equal(bad.stored, false);

  console.log("visual-library smoke ok", {
    topicKey,
    learnedKind: learned.sceneRecipe?.kind,
    storeSource: stored.source,
    hitSource: hit.source,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
