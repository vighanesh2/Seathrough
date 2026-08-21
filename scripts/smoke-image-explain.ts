import assert from "node:assert/strict";
import {
  imageExplanationModelSchema,
  imageExtractionModelSchema,
} from "../src/lib/image-explain/schemas";
import {
  assertValidImageUpload,
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  buildLessonPromptFromScreenshot,
} from "../src/lib/image-explain";
import { resolveExtractAdapter } from "../src/lib/image-explain/extract";
import {
  latexToBoardText,
  looksLikeLatex,
} from "../src/lib/math/latexToBoardText";
import { DrawCommandQueue } from "../src/lib/draw-engine/resolve";

assert.ok(ALLOWED_IMAGE_MIME.includes("image/png"));
assert.ok(MAX_IMAGE_BYTES === 4 * 1024 * 1024);

assert.throws(
  () => assertValidImageUpload({ bytes: Buffer.alloc(0), mimeType: "image/png" }),
  /empty/i,
);
assert.throws(
  () =>
    assertValidImageUpload({
      bytes: Buffer.alloc(10),
      mimeType: "application/pdf",
    }),
  /Unsupported/i,
);
assert.doesNotThrow(() =>
  assertValidImageUpload({
    bytes: Buffer.from("fake"),
    mimeType: "image/jpeg",
  }),
);

const extraction = imageExtractionModelSchema.parse({
  kind: "problem",
  title: "Two Sum",
  text: "Given nums = [2,7,11,15], target = 9",
  blocks: [{ text: "nums = [2,7,11,15]", label: "input" }],
  confidence: 0.9,
});
assert.equal(extraction.kind, "problem");

const fullExtraction = {
  ...extraction,
  engine: "vision" as const,
};

const explanation = imageExplanationModelSchema.parse({
  title: "Two Sum walkthrough",
  summary: "Find two numbers that add to the target.",
  steps: ["Scan the array", "Store complements in a hash map"],
  concepts: ["hash map"],
  followUps: ["What is the time complexity?"],
});
assert.equal(explanation.steps.length, 2);

assert.equal(resolveExtractAdapter("ocr").id, "ocr");
assert.equal(resolveExtractAdapter("vision").id, "vision");

const lessonPrompt = buildLessonPromptFromScreenshot({
  extraction: fullExtraction,
  question: "Solve for x",
});
assert.match(lessonPrompt, /whiteboard/i);
assert.match(lessonPrompt, /Solve for x/);
assert.match(lessonPrompt, /Two Sum|nums = \[2,7/);
assert.match(lessonPrompt, /NEVER write LaTeX/i);

assert.equal(
  latexToBoardText("\\frac{1}{2}x + \\frac{3}{2}(x+1) - \\frac{1}{4} = 5"),
  "(1/2)x + (3/2)(x + 1) - 1/4 = 5",
);
assert.equal(latexToBoardText("$\\frac{15}{8}$"), "15/8");
assert.equal(
  latexToBoardText("\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}"),
  "[1 2; 3 4]",
);
assert.equal(
  latexToBoardText(
    "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\times \\begin{pmatrix} e & f \\\\ g & h \\end{pmatrix}",
  ),
  "[a  b;  c  d] × [e  f;  g  h]".replace(/\s{2,}/g, " "),
);
assert.ok(looksLikeLatex("\\frac{1}{2}"));
assert.ok(!looksLikeLatex("(1/2)x = 5"));

const q = new DrawCommandQueue();
q.enqueue({
  id: "t1",
  type: "text",
  t0: 0,
  durationMs: 100,
  text: "\\frac{15}{8}",
  x: 10,
  y: 10,
  fontSize: 18,
});
const queued = q.getAll()[0]!;
assert.equal(queued.type, "text");
if (queued.type === "text") assert.equal(queued.text, "15/8");

console.log("image-explain smoke checks passed");
