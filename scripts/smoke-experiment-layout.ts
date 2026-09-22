/**
 * Smoke checks for experiment board anti-overlap.
 * Run: npx tsx scripts/smoke-experiment-layout.ts
 */
import {
  overlappingPairs,
  layoutLesson,
  layoutShapes,
  shapeBounds,
  SHAPE_GAP,
} from "../src/lib/experiment/layout";
import { gradeAnswer } from "../src/lib/experiment/grade";
import { formatBoardText } from "../src/lib/experiment/boardText";
import { coerceLesson, type ExperimentShape } from "../src/lib/experiment/scene";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertSeparated(shapes: ExperimentShape[], label: string) {
  const pairs = overlappingPairs(shapes, SHAPE_GAP);
  assert(
    pairs.length === 0,
    `${label}: still overlapping ${pairs.map((pair) => pair.join("+")).join(", ")}`,
  );
}

{
  const shapes = layoutShapes([]);
  assert(shapes.length === 0, "empty input should stay empty");
}

{
  const shapes = layoutShapes([
    {
      id: "only",
      type: "geo",
      geo: "rectangle",
      x: 80,
      y: 80,
      w: 160,
      h: 80,
      label: "Car",
    },
  ]);
  assert(shapes.length === 1, "single shape is kept");
  assertSeparated(shapes, "single");
}

{
  const left: ExperimentShape = {
    id: "red",
    type: "geo",
    geo: "rectangle",
    x: 80,
    y: 140,
    w: 200,
    h: 100,
    label: "red",
  };
  const right: ExperimentShape = {
    id: "blue",
    type: "geo",
    geo: "rectangle",
    x: 360,
    y: 140,
    w: 200,
    h: 100,
    label: "blue",
  };
  const packed = layoutShapes([left, right]);
  const red = packed.find((shape) => shape.id === "red");
  const blue = packed.find((shape) => shape.id === "blue");
  assert(red?.type === "geo" && blue?.type === "geo", "cars stayed geos");
  if (red?.type === "geo" && blue?.type === "geo") {
    assert(Math.abs(red.y - blue.y) < 8, "side-by-side cars should stay on a row");
    assert(blue.x >= red.x + red.w + SHAPE_GAP - 1, "side-by-side gap kept");
  }
  assertSeparated(packed, "side-by-side");
}

{
  const packed = layoutShapes([
    {
      id: "a",
      type: "geo",
      geo: "rectangle",
      x: 100,
      y: 100,
      w: 180,
      h: 90,
      label: "A",
    },
    {
      id: "b",
      type: "geo",
      geo: "rectangle",
      x: 100,
      y: 100,
      w: 180,
      h: 90,
      label: "B",
    },
  ]);
  assert(packed.length === 2, "identical coords both kept");
  assertSeparated(packed, "identical coords");
}

{
  const packed = layoutShapes([
    {
      id: "car",
      type: "geo",
      geo: "rectangle",
      x: 80,
      y: 120,
      w: 280,
      h: 200,
      label: "Car",
    },
    {
      id: "color",
      type: "geo",
      geo: "rectangle",
      x: 110,
      y: 170,
      w: 140,
      h: 50,
      label: "color: red",
    },
    {
      id: "speed",
      type: "geo",
      geo: "rectangle",
      x: 110,
      y: 230,
      w: 140,
      h: 50,
      label: "speed: 0",
    },
    {
      id: "carLabel",
      type: "text",
      x: 120,
      y: 150,
      text: "Car",
    },
  ]);
  assert(
    !packed.some((shape) => shape.id === "carLabel"),
    "text sitting on the car box should be dropped",
  );
  assertSeparated(packed, "nested car");
}

{
  const packed = layoutShapes([
    { id: "title", type: "text", x: 80, y: 20, text: "Recursion" },
    {
      id: "formula",
      type: "geo",
      geo: "rectangle",
      x: 120,
      y: 80,
      w: 220,
      h: 80,
      label: "if n=0 return 1 else return n * factorial(n-1)",
    },
    { id: "stray", type: "text", x: 140, y: 90, text: "factorial" },
    {
      id: "f3",
      type: "geo",
      geo: "rectangle",
      x: 140,
      y: 180,
      w: 180,
      h: 50,
      label: "factorial(3)",
    },
    {
      id: "f2",
      type: "geo",
      geo: "rectangle",
      x: 140,
      y: 200,
      w: 180,
      h: 50,
      label: "factorial(2)",
    },
    {
      id: "note",
      type: "note",
      x: 280,
      y: 40,
      text: "A function calls itself until a base case is met",
      color: "yellow",
    },
    { id: "a1", type: "arrow", from: "f3", to: "f2", label: "calls" },
  ]);
  assert(
    !packed.some((shape) => shape.id === "stray"),
    "factorial label on the formula box should be dropped",
  );
  assert(
    packed.some((shape) => shape.id === "title"),
    "title above the diagram should stay",
  );
  const formula = packed.find((shape) => shape.id === "formula");
  assert(formula?.type === "geo", "formula box kept");
  if (formula && formula.type === "geo") {
    const bounds = shapeBounds(formula)!;
    assert(bounds.w >= 300, "long formula box should grow wide enough");
    assert((formula.label ?? "").includes("\n") || bounds.w >= 400, "formula wraps or is wide");
  }
  assert(
    packed.some((shape) => shape.type === "arrow" && shape.id === "a1"),
    "arrow between stacked calls should survive",
  );
  assertSeparated(packed, "recursion overlap");
}

{
  const lesson = coerceLesson({
    title: "Objects",
    beats: [
      {
        say: "An object bundles data.",
        shapes: [
          { id: "obj", type: "geo", geo: "rectangle", x: 80, y: 80, w: 160, h: 80, label: "Object" },
        ],
      },
      {
        say: "A car stores color.",
        shapes: [
          { id: "car", type: "geo", geo: "box", x: 90, y: 90, w: 200, h: 120, label: "Car" },
          { id: "color", type: "geo", geo: "rectangle", x: 100, y: 110, w: 120, h: 40, label: "color: red" },
        ],
      },
    ],
  });
  layoutLesson(lesson);
  const shapes = lesson.beats.flatMap((beat) => beat.shapes);
  assert(shapes.length >= 2, "coerceLesson keeps the example shapes");
  assertSeparated(shapes, "coerceLesson");
}

{
  const packed = layoutShapes([
    {
      id: "c1",
      type: "text",
      x: 60,
      y: 280,
      text: "factorial(2) = 2 * factorial(1) which keeps going",
    },
    {
      id: "c2",
      type: "text",
      x: 400,
      y: 280,
      text: "factorial(1) = 1 * factorial(0) until the base case",
    },
  ]);
  assertSeparated(packed, "long captions");
}

{
  const packed = layoutShapes([
    {
      id: "lv",
      type: "geo",
      geo: "ellipse",
      x: 200,
      y: 180,
      w: 160,
      h: 180,
      label: "Left ventricle",
      color: "red",
      cluster: "heart",
    },
    {
      id: "rv",
      type: "geo",
      geo: "ellipse",
      x: 300,
      y: 180,
      w: 160,
      h: 180,
      label: "Right ventricle",
      color: "blue",
      cluster: "heart",
    },
    {
      id: "la",
      type: "geo",
      geo: "ellipse",
      x: 210,
      y: 90,
      w: 110,
      h: 90,
      label: "LA",
      cluster: "heart",
    },
    {
      id: "title",
      type: "text",
      x: 240,
      y: 20,
      text: "The heart",
      role: "title",
    },
    {
      id: "lv_name",
      type: "callout",
      x: 20,
      y: 200,
      text: "Left ventricle",
      to: "lv",
      side: "left",
    },
  ]);
  const lv = packed.find((shape) => shape.id === "lv");
  const rv = packed.find((shape) => shape.id === "rv");
  const la = packed.find((shape) => shape.id === "la");
  assert(lv?.type === "geo" && rv?.type === "geo" && la?.type === "geo", "heart parts kept");
  if (lv?.type === "geo" && rv?.type === "geo") {
    const stillTogether =
      Math.abs(lv.x - rv.x) < 180 && Math.abs(lv.y - rv.y) < 80;
    assert(stillTogether, "heart chambers should stay as one figure");
  }
  const callouts = packed.filter((shape) => shape.type === "callout");
  assert(callouts.length >= 1, "heart parts get outside callouts");
  const labelPairs = overlappingPairs(packed, SHAPE_GAP, { skipSameCluster: true });
  assert(
    labelPairs.length === 0,
    `heart labels overlapped ${labelPairs.map((pair) => pair.join("+")).join(", ")}`,
  );
}

assert(gradeAnswer("left ventricle", "Left ventricle") === "continue", "exact-ish grade");
assert(gradeAnswer("pump", "left ventricle") !== "continue", "weak answer is not continue");
assert(gradeAnswer("", "heart") === "simplify", "empty answer simplifies");

{
  const lesson = coerceLesson({
    title: "Graphs",
    beats: [
      {
        say: "A line rises as x grows.",
        graph: {
          title: "y = x",
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        },
        check: { ask: "What happens as x grows?", expect: "y grows" },
      },
    ],
  });
  assert(lesson.beats[0]?.check?.expect === "y grows", "check is kept");
  assert(
    Boolean(lesson.beats[0]?.graph?.points?.length),
    "graph stays as a plot, not tldraw axes",
  );
  assert(
    !lesson.beats[0]!.shapes.some((shape) => shape.id.includes("xaxis")),
    "graph is not faked with geo rectangles",
  );
}

{
  const code = formatBoardText(
    "\\n def factorial(n):\\n if n==0:\\n return 1\\n else:\\n return n*factorial(n-1)",
  );
  assert(!code.includes("\\n"), "code must not keep literal slash-n");
  assert(code.includes("\ndef factorial") || code.startsWith("def factorial"), "code starts with def");
  assert(code.includes("\n  if n==0:"), "python if is indented");
  assert(code.includes("\n    return 1"), "return is indented under if");
}

{
  const lesson = coerceLesson({
    title: "Recursion",
    question: "what is recursion",
    beats: [
      { say: "Recursion is a function that calls itself to solve a problem." },
      {
        say: "Remember the exact phrase: Recursion",
        check: { ask: "Remember the exact phrase: Recursion", expect: "Recursion" },
      },
      { say: "Keep it short: Recursion" },
      { say: "The factorial function calls itself until n==0." },
    ],
  });
  assert(
    !lesson.beats.some((beat) => /exact phrase|keep it short/i.test(beat.say)),
    "filler phrase beats are dropped",
  );
  assert(
    lesson.beats.length >= 2 && lesson.beats.some((beat) => Boolean(beat.check)),
    "a real check is added",
  );
  assert(
    lesson.beats.every((beat) => beat.check?.expect.toLowerCase() !== "recursion"),
    "expect is never the topic title",
  );
  const ideaCheck = lesson.beats.find((beat) =>
    /calls itself/i.test(beat.check?.expect ?? ""),
  );
  assert(Boolean(ideaCheck), "a check still teaches the idea");
}

{
  const lesson = coerceLesson({
    title: "Pythagorean Theorem",
    question: "What is the Pythagorean theorem?",
    beats: [
      {
        say: "A right triangle has a special relationship between its sides. Let’s label the legs a and b, and the hypotenuse c.",
      },
      {
        say: "Here’s a right triangle: the legs are a and b, and the hypotenuse is c.",
        shapes: [
          {
            id: "tri",
            type: "geo",
            geo: "triangle",
            x: 200,
            y: 120,
            w: 220,
            h: 220,
          },
        ],
      },
      {
        say: "Here’s a right triangle: the legs are a and b, and the hypotenuse is c.",
      },
      {
        say: "Which side is the hypotenuse?",
        check: {
          ask: "In your own words, what did that last step mean?",
          expect: "c",
        },
      },
    ],
  });
  const says = lesson.beats.map((beat) => beat.say);
  assert(
    says.filter((say) => /here’s a right triangle/i.test(say)).length <= 1,
    "duplicate say is merged",
  );
  assert(
    !says.some((say) => /which side is the hypotenuse/i.test(say)),
    "quiz is not a script line",
  );
  const lastWithHyp = lesson.beats.find((beat) =>
    /hypotenuse/i.test(beat.check?.ask ?? ""),
  );
  assert(Boolean(lastWithHyp), "the real quiz is the check");
  assert(
    !/in your own words/i.test(lastWithHyp?.check?.ask ?? ""),
    "generic quiz does not stack on the hypotenuse question",
  );
  const tri = lesson.beats
    .flatMap((beat) => beat.shapes)
    .find((shape) => shape.type === "geo" && shape.id === "tri");
  assert(Boolean(tri && tri.type === "geo" && tri.geo === "right-triangle"), "uses a right triangle");
  if (tri?.type === "geo") {
    assert(tri.h < tri.w, "right triangle is not equilateral");
  }
}

{
  const lesson = coerceLesson({
    title: "Parabola",
    question: "graph y = x^2",
    beats: [
      { say: "This curve is a parabola. Every x maps to one height y." },
    ],
  });
  assert(
    lesson.beats.some((beat) => beat.graph?.expression === "x^2"),
    "graph questions get a real y=f(x) plot",
  );
}

{
  const lesson = coerceLesson({
    title: "What is a Derivative?",
    question: "What is a derivative?",
    beats: [
      { say: "A derivative starts with a function f(x) and a specific input a." },
      {
        say: "A function is a rule that takes an input and gives exactly one output.",
      },
      { say: "Look at the board." },
      {
        say: "We look at the slope of a secant line between (a, f(a)) and (a+h, f(a+h)).",
      },
      { say: "Draw a line through points (2,3) and (5,11)." },
    ],
  });
  const says = lesson.beats.map((beat) => beat.say);
  assert(!says.some((say) => /look at the board/i.test(say)), "no look-at-board lines");
  assert(!says.some((say) => /draw a line through/i.test(say)), "no draw-command lines");
  assert(!says.some((say) => /function is a rule/i.test(say)), "no leftover function primer");
  assert(says.some((say) => /secant/i.test(say)), "keeps the secant idea");
  assert(
    lesson.beats.some((beat) => beat.graph?.showTangent && beat.graph.expression === "x^2"),
    "derivative lessons plot a curve with a tangent",
  );
  assert(
    !lesson.beats.some((beat) => /in your own words/i.test(beat.check?.ask ?? "")),
    "no generic stacked quiz",
  );
}

console.log("smoke-experiment-layout: ok");
