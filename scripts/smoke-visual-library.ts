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
  isIntegralAreaTopic,
  isLimitGraphTopic,
  isMatrixMultiplyTopic,
  makeTopicKey,
  narrationMatchingBoard,
  peekHeuristicBoardScript,
  rememberVisualLibrary,
  lookupVisualLibrary,
} from "../src/lib/visuals/library/index";
import { decideBoardVisualStrategy } from "../src/lib/draw-engine/decideBoardVisual";
import { commandsForBeat } from "../src/lib/draw-engine/fromVisualPlan";
import { createBoardLayout } from "../src/lib/draw-engine/boardLayout";

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

  // Two equations of the same concept must not share a board script.
  const eqA = makeTopicKey({
    prompt: "solve 4x + 8 = 24 step by step",
    conceptKey: "solve for x",
  });
  const eqB = makeTopicKey({
    prompt: "solve 2x + 5 = 17 step by step",
    conceptKey: "solve for x",
  });
  assert.notEqual(eqA, eqB, "concrete problems get their own key");
  assert.ok(eqA.includes("4x"), `key keeps the numbers: ${eqA}`);
  assert.equal(
    makeTopicKey({ prompt: "what is 12 x 7", conceptKey: "multiplication" }),
    makeTopicKey({ prompt: "what is 12 x 7" }),
    "arithmetic keys off the prompt, not the concept",
  );
  // Plain topics still share a concept key, digits in prose and all.
  assert.equal(
    makeTopicKey({
      prompt: "explain photosynthesis in 3 steps",
      conceptKey: "photosynthesis",
    }),
    "photosynthesis",
  );

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

  // --- integral / area under the curve ---------------------------------
  const integralPrompt = "what is an integral using area under the curve";
  assert.equal(isIntegralAreaTopic(integralPrompt), true);
  assert.equal(isIntegralAreaTopic(""), false);
  assert.equal(isIntegralAreaTopic("integrate 3x^2 dx"), false);
  assert.equal(
    decideBoardVisualStrategy({ prompt: integralPrompt, hasBoardScript: true }),
    "sketch",
  );

  const integralPlan = peekHeuristicBoardScript(integralPrompt, "integral");
  assert.ok(integralPlan?.boardScript?.steps?.length, "integral heuristic exists");
  assert.ok(
    integralPlan!.boardScript!.steps.some(
      (s) => s.type === "write" && /area under a curve/i.test(s.text),
    ),
    "board talks about area under the curve",
  );

  const spokenBeat1 = narrationMatchingBoard({
    steps: integralPlan!.boardScript!.steps,
    beatOrder: 1,
    totalBeats: 5,
    fallback: "unrelated algebra about 2x + 6 = 14",
  });
  assert.ok(
    spokenBeat1.includes("area under a curve"),
    `right-side text should match the board, got: ${spokenBeat1}`,
  );
  assert.ok(
    !spokenBeat1.includes("2x + 6"),
    "planner narration must not leak onto an integral beat",
  );

  const layout = createBoardLayout();
  const beat1 = commandsForBeat({
    plan: integralPlan,
    beatOrder: 1,
    totalBeats: 5,
    beatId: "int1",
    t0Base: 0,
    includeChrome: true,
    progressive: true,
    narration: spokenBeat1,
    prompt: integralPrompt,
    layout,
  });
  assert.ok(
    beat1.some((c) => c.type === "line"),
    "beat 1 draws axes",
  );
  const boardText = beat1
    .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
    .map((c) => c.text)
    .join(" ");
  assert.ok(
    /area under a curve/i.test(boardText),
    `beat 1 writes the same sentence the right rail says, got: ${boardText}`,
  );

  const beat2 = commandsForBeat({
    plan: integralPlan,
    beatOrder: 2,
    totalBeats: 5,
    beatId: "int2",
    t0Base: 1000,
    includeChrome: false,
    progressive: true,
    narration: narrationMatchingBoard({
      steps: integralPlan!.boardScript!.steps,
      beatOrder: 2,
      totalBeats: 5,
      fallback: "",
    }),
    prompt: integralPrompt,
    layout,
  });
  assert.ok(
    beat2.some((c) => c.type === "stroke"),
    "beat 2 draws the curve",
  );

  const beat3 = commandsForBeat({
    plan: integralPlan,
    beatOrder: 3,
    totalBeats: 5,
    beatId: "int3",
    t0Base: 2000,
    includeChrome: false,
    progressive: true,
    prompt: integralPrompt,
    layout,
  });
  assert.ok(
    beat3.some((c) => c.type === "rect" && "fill" in c && c.fill),
    "beat 3 shades area with rectangles",
  );

  // --- limits as x approaches a number ---------------------------------
  const limitPrompt = "explain limits as x approaches a number";
  assert.equal(isLimitGraphTopic(limitPrompt), true);
  assert.equal(isLimitGraphTopic(""), false);
  assert.equal(isLimitGraphTopic("what is a derivative"), false);
  assert.equal(isLimitGraphTopic("speed limit on the highway"), false);
  assert.equal(
    decideBoardVisualStrategy({ prompt: limitPrompt, hasBoardScript: true }),
    "sketch",
  );

  const limitPlan = peekHeuristicBoardScript(limitPrompt, "limit");
  assert.ok(limitPlan?.boardScript?.steps?.length, "limit heuristic exists");
  const limitTalk = narrationMatchingBoard({
    steps: limitPlan!.boardScript!.steps,
    beatOrder: 1,
    totalBeats: 5,
    fallback: "unrelated: solve 2x + 6 = 14",
  });
  assert.ok(
    /close to a|approaches/i.test(limitTalk),
    `right-side text should match the limit board, got: ${limitTalk}`,
  );
  assert.ok(!limitTalk.includes("2x + 6"), "algebra narration must not leak");

  const derivPlan = peekHeuristicBoardScript("what is a derivative", "derivative");
  assert.ok(
    derivPlan?.boardScript?.title?.toLowerCase().includes("derivative"),
    "derivative questions still use the derivative board",
  );

  const limLayout = createBoardLayout();
  const lim1 = commandsForBeat({
    plan: limitPlan,
    beatOrder: 1,
    totalBeats: 5,
    beatId: "lim1",
    t0Base: 0,
    includeChrome: true,
    progressive: true,
    narration: limitTalk,
    prompt: limitPrompt,
    layout: limLayout,
  });
  assert.ok(lim1.some((c) => c.type === "line"), "beat 1 draws axes");

  const lim2 = commandsForBeat({
    plan: limitPlan,
    beatOrder: 2,
    totalBeats: 5,
    beatId: "lim2",
    t0Base: 1000,
    includeChrome: false,
    progressive: true,
    prompt: limitPrompt,
    layout: limLayout,
  });
  assert.ok(lim2.some((c) => c.type === "stroke"), "beat 2 draws the curve");
  assert.ok(
    lim2.some((c) => c.type === "circle"),
    "beat 2 marks the hole at x = a",
  );

  const lim3 = commandsForBeat({
    plan: limitPlan,
    beatOrder: 3,
    totalBeats: 5,
    beatId: "lim3",
    t0Base: 2000,
    includeChrome: false,
    progressive: true,
    prompt: limitPrompt,
    layout: limLayout,
  });
  assert.ok(
    lim3.some((c) => c.type === "circle") && lim3.some((c) => c.type === "arrow"),
    "beat 3 approaches from the left",
  );

  // --- matrix multiplication: real grids, not a flattened line ----------
  const mxPrompt = "explain matrix multiplication";
  assert.equal(isMatrixMultiplyTopic(mxPrompt), true);
  assert.equal(isMatrixMultiplyTopic("multiply two matrices"), true);
  assert.equal(isMatrixMultiplyTopic(""), false);
  assert.equal(isMatrixMultiplyTopic("the matrix movie"), false);
  assert.equal(
    decideBoardVisualStrategy({ prompt: mxPrompt, hasBoardScript: true }),
    "sketch",
  );

  const mxPlan = peekHeuristicBoardScript(mxPrompt, "matrix");
  assert.ok(mxPlan?.boardScript?.steps?.length, "matrix heuristic exists");
  const mxTalk = narrationMatchingBoard({
    steps: mxPlan!.boardScript!.steps,
    beatOrder: 1,
    totalBeats: 5,
    fallback: "unrelated: solve 2x + 6 = 14",
  });
  assert.ok(
    /two matrices/i.test(mxTalk),
    `right-side text should match the matrix board, got: ${mxTalk}`,
  );
  assert.ok(!mxTalk.includes("2x + 6"), "algebra narration must not leak");

  const mxLayout = createBoardLayout();
  const mx1 = commandsForBeat({
    plan: mxPlan,
    beatOrder: 1,
    totalBeats: 5,
    beatId: "mx1",
    t0Base: 0,
    includeChrome: true,
    progressive: true,
    narration: mxTalk,
    prompt: mxPrompt,
    layout: mxLayout,
  });
  const mxText = mx1
    .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
    .map((c) => c.text)
    .join(" ");
  assert.ok(
    mx1.filter((c) => c.type === "line").length >= 12,
    "beat 1 draws brackets for A and B",
  );
  assert.ok(
    /\b1\b/.test(mxText) && /\b8\b/.test(mxText),
    `beat 1 writes the matrix entries, got: ${mxText}`,
  );
  assert.ok(!/begin\{bmatrix\}/i.test(mxText), "must not dump LaTeX bmatrix");

  const mx3 = commandsForBeat({
    plan: mxPlan,
    beatOrder: 3,
    totalBeats: 5,
    beatId: "mx3",
    t0Base: 2000,
    includeChrome: false,
    progressive: true,
    prompt: mxPrompt,
    layout: mxLayout,
  });
  const mx3Text = mx3
    .filter((c): c is Extract<typeof c, { type: "text" }> => c.type === "text")
    .map((c) => c.text)
    .join(" ");
  assert.ok(/19/.test(mx3Text), `beat 3 fills C's top-left, got: ${mx3Text}`);
  assert.ok(
    mx3.some((c) => c.type === "highlight"),
    "beat 3 highlights the row and column being multiplied",
  );

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
