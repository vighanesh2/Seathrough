import assert from "node:assert/strict";
import { formatNarrationForDisplay } from "../src/lib/math/formatNarrationForDisplay";
import { normalizeKatexSource } from "../src/lib/math/latexToBoardText";
import {
  TOPIC_MODULES,
  activeTopicStepIndex,
  buildTopicLessonPlan,
  getTopicModule,
  revealedTopicSteps,
  listTopicIds,
  listTopicSummaries,
  matchTopic,
  parseInterval,
  solveParallelPoint,
  parseOdeFromPrompt,
  topicBoardParamsSchema,
  extractFunctionExpression,
  topicVisualPlanById,
  topicVisualPlanFor,
} from "../src/lib/topics/index";
import { TOPIC_BOARDS } from "../src/components/topics/boards/index";
import { commandsForBeat } from "../src/lib/draw-engine/fromVisualPlan";
import { classifyVisualPlan } from "../src/lib/visuals/library/classify";
import { isWeakVisualPlan } from "../src/lib/visuals/library/boardScriptPlan";
import { getVisualAsset } from "../src/lib/visuals/assets/catalog";
import { scoreAssetForPrompt } from "../src/lib/visuals/relevance";
import { visualStableKey } from "../src/lib/visuals/router";
import { visualPlanSchema } from "../src/lib/visuals/types";

// --- narration display ------------------------------------------------------

const rawMvtNarration =
  "The average (secant) slope on this interval is \\frac{f(7)-f(3)}{7-3}=\\frac{f(7)-f(3)}{4}.";
const cleaned = formatNarrationForDisplay(rawMvtNarration);
assert.ok(!cleaned.includes("\\frac"), "narration never shows raw LaTeX");
assert.ok(cleaned.includes("(f(7)-f(3))/(7-3)"), "fractions become readable ASCII");
assert.ok(
  formatNarrationForDisplay("on\u202f[3,7]").includes("[3,7]"),
  "odd unicode spaces are normalized",
);
assert.equal(
  normalizeKatexSource("x\u202f+\u00a0y = 2"),
  "x + y = 2",
  "KaTeX input strips unsupported Unicode spaces",
);

// --- registry integrity -----------------------------------------------------

assert.ok(TOPIC_MODULES.length >= 6, "library has hand topics + function graph + catalog");
assert.ok(TOPIC_BOARDS.construction, "generic construction board exists");
assert.ok(TOPIC_BOARDS["function-graph"], "generic function-graph board exists");
assert.equal(matchTopic("graph y = x^4")?.id, "function-graph");
assert.equal(matchTopic("plot y = x^3")?.id, "function-graph");
assert.equal(
  matchTopic("Graphing the Function y = x^4")?.id,
  "function-graph",
  "graphing the function y = … is the interactive grapher, not an icon",
);
assert.equal(
  matchTopic(
    "Graphing the Function y = x^4",
    "even functions and their graphs",
  )?.id,
  "function-graph",
  "a beat concept key must not poison a parseable y = f(x) prompt",
);
assert.equal(
  matchTopic("Graphing the Function $y = x^4$")?.id,
  "function-graph",
  "LaTeX delimiters around the formula still match",
);
{
  const titled = topicVisualPlanFor(
    "Graphing the Function y = x^4",
    "even functions and rapid growth",
    "Because the exponent is even, any positive or negative x gives the same y value.",
  );
  assert.equal(titled?.topicId, "function-graph");
  assert.equal(titled?.renderer, "jsxgraph");
  assert.equal(
    titled?.topicParams && titled.topicParams.boardKind === "function-graph"
      ? titled.topicParams.expression
      : null,
    "x^4",
  );
  const recapBeat = topicVisualPlanFor(
    "Graphing the Function y = x^4",
    "Graph of y = x^4",
    "To recap, y equals x to the fourth power produces a symmetric, steep U-shaped curve.",
  );
  assert.equal(recapBeat?.topicId, "function-graph");
  assert.equal(
    visualStableKey(titled!),
    visualStableKey(recapBeat!),
    "later beats keep the same curve instead of remounting an icon",
  );
}
assert.equal(extractFunctionExpression("y = x^{4}"), "x^4");
assert.equal(extractFunctionExpression("y = x⁴"), "x^4");
assert.equal(
  extractFunctionExpression("Graphing the Function y = x^4 even functions and rapid growth"),
  "x^4",
);
{
  const icon = getVisualAsset("tabler-math-function");
  assert.ok(icon, "function icon exists in the catalog");
  assert.equal(
    scoreAssetForPrompt("Graphing the Function y = x^4", icon!),
    0,
    "the stylized f icon must not win a real curve request",
  );
  const graphPlan = topicVisualPlanFor("Graphing the Function y = x^4");
  const dumped = commandsForBeat({
    plan: graphPlan,
    beatOrder: 3,
    totalBeats: 5,
    beatId: "recap",
    t0Base: 0,
    narration: "Here is the curve.",
    prompt: "Graphing the Function y = x^4",
  });
  assert.equal(
    dumped.length,
    0,
    "graph lessons do not copy spoken lines onto the board",
  );
}
{
  const p = matchTopic("graph y = x^4")!.deriveParams("graph y = x^4");
  assert.equal(p.boardKind, "function-graph");
  if (p.boardKind === "function-graph") {
    assert.equal(p.expression, "x^4");
  }
}
assert.equal(getTopicModule("graph-parabola"), null, "parabola is dynamic now");
assert.equal(matchTopic("graph sine")?.id, "function-graph");
assert.equal(matchTopic("graph parabola")?.id, "function-graph");
assert.equal(matchTopic("plot a sine wave")?.id, "function-graph");
{
  const sine = matchTopic("graph sine")!.deriveParams("graph sine");
  assert.equal(sine.boardKind, "function-graph");
  if (sine.boardKind === "function-graph") assert.equal(sine.expression, "sin(x)");
  const para = matchTopic("graph parabola")!.deriveParams("graph parabola");
  assert.equal(para.boardKind, "function-graph");
  if (para.boardKind === "function-graph") assert.equal(para.expression, "x^2");
}
assert.equal(matchTopic("slope of a line")?.id, "line-slope");
assert.equal(matchTopic("tangent to a circle")?.id, "circle-geometry");
assert.equal(
  matchTopic("explain the mean value theorem")?.id,
  "mean-value-theorem",
  "hand topics still win over catalog",
);
assert.deepEqual(
  listTopicIds(),
  [...new Set(listTopicIds())],
  "topic ids are unique",
);

for (const topic of TOPIC_MODULES) {
  assert.ok(
    TOPIC_BOARDS[topic.boardId],
    `${topic.id} points at a board that exists`,
  );
  assert.ok(topic.title.length > 0, `${topic.id} has a title`);
  assert.ok(topic.summary.length > 0, `${topic.id} has a summary`);
  assert.ok(topic.steps.length >= 2, `${topic.id} has explanation steps`);
  assert.ok(topic.aliases.length > 0, `${topic.id} has aliases`);
  topicBoardParamsSchema.parse(topic.defaultParams);
}

assert.equal(getTopicModule("mean-value-theorem")?.id, "mean-value-theorem");
assert.equal(getTopicModule("not-a-topic"), null, "unknown id is safe");
assert.equal(getTopicModule(""), null, "empty id is safe");
assert.equal(getTopicModule(null), null, "null id is safe");
assert.ok(
  listTopicSummaries().every((t) => t.aliases.length > 0),
  "catalogue carries aliases",
);

// --- matching a question ----------------------------------------------------

const MVT_HITS = [
  "explain the mean value theorem",
  "What is the Mean Value Theorem?",
  "mean-value theorem intuition",
  "can you show me MVT",
  "mean value theorem on [1, 5]",
  "teach me the mean value theorem for derivatives",
];
for (const prompt of MVT_HITS) {
  assert.equal(
    matchTopic(prompt)?.id,
    "mean-value-theorem",
    `matches: ${prompt}`,
  );
}

const MVT_MISSES = [
  "",
  "   ",
  "what is the mean of these numbers",
  "explain the central limit theorem",
  "how do i find the average value of a function",
  "pythagorean theorem",
  // A different statement that deserves a different picture.
  "mean value theorem for integrals",
];
for (const prompt of MVT_MISSES) {
  assert.notEqual(
    matchTopic(prompt)?.id,
    "mean-value-theorem",
    `does not match: ${prompt}`,
  );
}

assert.equal(matchTopic("explain rolle's theorem")?.id, "rolles-theorem");
assert.equal(matchTopic("rolles theorem proof")?.id, "rolles-theorem");
assert.equal(matchTopic("what does rolle say", "rolle theorem")?.id, "rolles-theorem");

// The concept key from a lesson beat is enough on its own.
assert.equal(
  matchTopic("show me the next step", "mean value theorem")?.id,
  "mean-value-theorem",
  "concept key can carry the match",
);

// --- interval parsing -------------------------------------------------------

assert.deepEqual(parseInterval("mvt on [1, 5]"), { a: 1, b: 5 });
assert.deepEqual(parseInterval("mvt on [5, 1]"), { a: 1, b: 5 }, "reversed bounds normalize");
assert.deepEqual(parseInterval("from x=0 to x=4"), { a: 0, b: 4 });
assert.deepEqual(parseInterval("when a is 2 and b is 8"), { a: 2, b: 8 });
assert.deepEqual(parseInterval("mvt from 0 to 4"), { a: 0, b: 4 });
assert.deepEqual(parseInterval("mvt between -2 and 3"), { a: -2, b: 3 });
assert.deepEqual(parseInterval("on the interval 2 to 6"), { a: 2, b: 6 });
assert.deepEqual(parseInterval("mvt on (0, 2.5)"), { a: 0, b: 2.5 });
assert.equal(parseInterval("mean value theorem"), null, "no interval stated");
assert.equal(parseInterval("mvt on [1, 1]"), null, "rejects a zero-width interval");
assert.equal(parseInterval("mvt on [0, 900]"), null, "rejects an absurd interval");
assert.equal(parseInterval("mvt on [a, b]"), null, "rejects symbolic bounds");

// --- board parameters -------------------------------------------------------

const mvt = getTopicModule("mean-value-theorem");
assert.ok(mvt, "mvt module resolves");

const plainParams = mvt.deriveParams("explain the mean value theorem");
assert.equal(plainParams.boardKind, "secant-tangent");
assert.deepEqual(
  plainParams,
  mvt.defaultParams,
  "no interval stated means the reference picture",
);

const rangedParams = mvt.deriveParams("mean value theorem on [2, 8]");
topicBoardParamsSchema.parse(rangedParams);
assert.equal(rangedParams.boardKind, "secant-tangent");
if (rangedParams.boardKind !== "secant-tangent") throw new Error("expected secant-tangent");
assert.equal(rangedParams.points[0][0], 2, "point a lands on the stated start");
assert.equal(rangedParams.points[1][0], 8, "point b lands on the stated end");
assert.equal(rangedParams.labels.a, "a=2");
assert.equal(rangedParams.labels.b, "b=8");
assert.equal(plainParams.boardKind, "secant-tangent");
if (plainParams.boardKind !== "secant-tangent") throw new Error("expected secant-tangent");
assert.notDeepEqual(
  rangedParams.boundingBox,
  plainParams.boundingBox,
  "the window follows the interval",
);

const [left, top, right, bottom] = rangedParams.boundingBox;
assert.ok(left < right && bottom < top, "bounding box is [left, top, right, bottom]");
for (const [x, y] of rangedParams.points) {
  assert.ok(x > left && x < right, `x=${x} is inside the window`);
  assert.ok(y > bottom && y < top, `y=${y} is inside the window`);
}

// Scaling must not flatten the curve, or there is no tangent point to find.
const interiorYs = rangedParams.points.slice(2).map(([, y]) => y);
assert.ok(
  new Set(rangedParams.points.map(([, y]) => y)).size > 1,
  "the curve still bends",
);
assert.ok(interiorYs.length > 0, "shape points survive the remap");

// Rolle keeps its defining property under the same remap.
const rolle = getTopicModule("rolles-theorem");
assert.ok(rolle, "rolle module resolves");
const rolleParams = rolle.deriveParams("rolle's theorem from 0 to 10");
assert.equal(rolleParams.boardKind, "secant-tangent");
if (rolleParams.boardKind !== "secant-tangent") throw new Error("expected secant-tangent");
assert.equal(rolleParams.flatSecant, true, "rolle asks for a level secant");
assert.equal(
  rolleParams.points[0][1],
  rolleParams.points[1][1],
  "f(a) = f(b) survives rescaling",
);

// Nonsense in the prompt must never produce an unrenderable board.
for (const prompt of ["", "mvt on [1e9, 2e9]", "mvt from -0.0001 to 0.0001"]) {
  topicBoardParamsSchema.parse(mvt.deriveParams(prompt));
}

const followUpPlan = topicVisualPlanFor(
  "what about on [3, 7]?",
  "mean value theorem",
);
assert.ok(followUpPlan, "follow-up with concept key still routes to the topic");
if (followUpPlan?.topicParams?.boardKind === "secant-tangent") {
  assert.equal(followUpPlan.topicParams.labels.a, "a=3");
  assert.equal(followUpPlan.topicParams.labels.b, "b=7");
}

const beatPlan = topicVisualPlanFor(
  "explain the mean value theorem",
  undefined,
  "Pick any smooth curve on the interval from 0 to 6.",
);
assert.ok(beatPlan, "beat narration can carry the interval");
if (beatPlan?.topicParams?.boardKind === "secant-tangent") {
  assert.equal(beatPlan.topicParams.points[0][0], 0);
  assert.equal(beatPlan.topicParams.points[1][0], 6);
}

// --- ordinary differential equations ----------------------------------------

assert.equal(
  matchTopic("plot solutions of differential equations")?.id,
  "differential-equations",
);
assert.equal(
  matchTopic("solve dy/dt = (2-t)*y + c with y(0)=1")?.id,
  "differential-equations",
);
assert.equal(matchTopic("partial differential equation heat")?.id, undefined);

const odeParams = parseOdeFromPrompt(
  "dy/dt = -y with y(0) = 2 and c = 3",
);
assert.equal(odeParams.boardKind, "ode-solution");
assert.equal(odeParams.odeExpression, "-y");
assert.equal(odeParams.initialT, 0);
assert.equal(odeParams.initialY, 2);
assert.equal(odeParams.parameterC, 3);

const odePlan = topicVisualPlanFor(
  "differential equation dy/dt = (2-t)*y + c, y(0)=1",
);
assert.ok(odePlan, "ode questions produce a visual plan");
assert.equal(odePlan?.topicId, "differential-equations");
assert.equal(odePlan?.topicParams?.boardKind, "ode-solution");
if (odePlan?.topicParams?.boardKind === "ode-solution") {
  assert.equal(odePlan.topicParams.odeExpression, "(2-t)*y + c");
  assert.equal(odePlan.topicParams.initialY, 1);
}

// --- topic lesson walkthrough ------------------------------------------------

const de = getTopicModule("differential-equations");
assert.ok(de, "de module resolves");
const curated = buildTopicLessonPlan(
  {
    title: "LLM title",
    language: "math",
    humanSummary: "summary",
    beats: [
      {
        id: "b1",
        order: 1,
        kind: "intro",
        narration: "llm intro",
        imageAction: "generate",
        actions: [],
      },
      {
        id: "b2",
        order: 2,
        kind: "token",
        narration: "llm body",
        imageAction: "keep",
        actions: [],
      },
    ],
  },
  de,
);
assert.equal(curated.beats.length, de.steps.length + 2, "intro + steps + recap");
assert.equal(curated.beats[0]?.kind, "intro");
assert.equal(curated.beats[1]?.narration.includes(de.steps[0]!.title), true);
assert.equal(revealedTopicSteps(1, de.steps.length), 0, "graph first on beat 1");
assert.equal(revealedTopicSteps(2, de.steps.length), 1);
assert.equal(revealedTopicSteps(5, de.steps.length), de.steps.length);
assert.equal(activeTopicStepIndex(1, de.steps.length), -1);
assert.equal(activeTopicStepIndex(3, de.steps.length), 1);

// --- finding c, the point the theorem promises ------------------------------

/** Where the tangent is parallel to the secant, for a known f. */
function cFor(
  f: (x: number) => number,
  df: (x: number) => number,
  a: number,
  b: number,
): number {
  return solveParallelPoint(df, a, b, (f(b) - f(a)) / (b - a));
}

const square = (x: number) => x * x;
const dSquare = (x: number) => 2 * x;
// f(x) = x^2 on [0, 2]: average slope 2, and f'(x) = 2 at exactly x = 1.
assert.ok(Math.abs(cFor(square, dSquare, 0, 2) - 1) < 1e-9, "x^2 on [0,2] gives c=1");
assert.ok(
  Math.abs(cFor(square, dSquare, -3, 5) - 1) < 1e-9,
  "x^2 on [-3,5] gives c=1 (the midpoint of the interval)",
);

const cube = (x: number) => x ** 3;
const dCube = (x: number) => 3 * x * x;
// f(x) = x^3 on [-1, 2]: average slope 3, so 3x^2 = 3 at x = -1 and x = 1.
// Only x = 1 is strictly inside, so the endpoint root must be skipped.
assert.ok(
  Math.abs(cFor(cube, dCube, -1, 2) - 1) < 1e-6,
  "an endpoint that solves the equation is not chosen",
);

// Rolle: a level secant must produce a stationary point.
const hill = (x: number) => -((x - 2.5) ** 2) + 5;
const dHill = (x: number) => -2 * (x - 2.5);
const rolleC = cFor(hill, dHill, -1, 6);
assert.ok(Math.abs(rolleC - 2.5) < 1e-9, "the peak is found");
assert.ok(Math.abs(dHill(rolleC)) < 1e-9, "f'(c) = 0 for a level secant");

// The result must always be usable as a coordinate, however odd the input.
for (const [a, b] of [
  [2, 2],
  [5, 1],
  [-1e6, 1e6],
]) {
  const c = solveParallelPoint(dSquare, a, b, (square(b) - square(a)) / (b - a || 1));
  assert.ok(Number.isFinite(c), `c is finite for [${a}, ${b}]`);
  assert.ok(
    c >= Math.min(a, b) && c <= Math.max(a, b),
    `c stays inside [${a}, ${b}]`,
  );
}
assert.ok(
  Number.isFinite(solveParallelPoint(dSquare, 0, 2, Number.NaN)),
  "a degenerate slope does not produce NaN",
);
// A straight line has no single c, but it must still return a drawable point.
assert.ok(
  Number.isFinite(solveParallelPoint(() => 4, 0, 2, 4)),
  "a constant slope still resolves",
);

// --- the visual plan bridge -------------------------------------------------

const plan = topicVisualPlanFor("explain the mean value theorem");
assert.ok(plan, "a matching question produces a plan");
assert.equal(plan.renderer, "jsxgraph");
assert.equal(plan.topicId, "mean-value-theorem");
assert.ok(plan.formula?.includes("f'(c)"), "the formula strip gets the statement");

const parsed = visualPlanSchema.safeParse(plan);
assert.ok(parsed.success, "the plan validates as a VisualPlan");

// It has to survive the visual library cache, which is JSON in Postgres.
const roundTripped = visualPlanSchema.safeParse(
  JSON.parse(JSON.stringify(plan)),
);
assert.ok(roundTripped.success, "the plan round-trips as JSON");
assert.deepEqual(roundTripped.success && roundTripped.data.topicParams, plan.topicParams);

assert.equal(classifyVisualPlan(plan), "curated", "never downgraded to generic");
assert.equal(isWeakVisualPlan(plan), false, "not treated as a weak plan");
assert.equal(
  isWeakVisualPlan({ renderer: "jsxgraph", actions: [] }),
  true,
  "a jsxgraph plan with no topic is weak",
);

// Slug format is validated on the wire; existence is checked at render time.
assert.equal(
  visualPlanSchema.safeParse({
    renderer: "jsxgraph",
    topicId: "Not A Slug!!",
    actions: [],
  }).success,
  false,
  "malformed topic ids fail validation",
);
assert.equal(
  getTopicModule("gone"),
  null,
  "unknown catalog ids are not renderable",
);

// Same topic and window = same board, so beats reuse it instead of remounting.
const planAgain = topicVisualPlanFor("mean value theorem, again");
assert.ok(planAgain);
assert.equal(
  visualStableKey(plan),
  visualStableKey(planAgain),
  "the board is kept across beats",
);
const planRanged = topicVisualPlanFor("mean value theorem on [2, 8]");
assert.ok(planRanged);
assert.notEqual(
  visualStableKey(plan),
  visualStableKey(planRanged),
  "a new interval redraws",
);
assert.notEqual(
  visualStableKey(plan),
  visualStableKey(topicVisualPlanFor("rolle's theorem")!),
  "different topics are different boards",
);

assert.equal(topicVisualPlanFor("what is photosynthesis"), null, "no false positives");
assert.equal(topicVisualPlanById("mean-value-theorem")?.topicId, "mean-value-theorem");
assert.equal(topicVisualPlanById("nope"), null, "unknown id yields no plan");

console.log("topic library smoke checks passed");
