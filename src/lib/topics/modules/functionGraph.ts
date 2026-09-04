import {
  defaultFunctionGraphParams,
  parseFunctionGraphFromPrompt,
  wantsFunctionGraph,
} from "@/lib/topics/functionParse";
import type { TopicPresentation } from "@/lib/topics/presentation";
import type { TopicModule } from "@/lib/topics/types";

function expressionFrom(params: { boardKind: string; expression?: string }): string {
  return params.boardKind === "function-graph" && params.expression
    ? params.expression
    : "f(x)";
}

function presentFunctionGraph(input: {
  prompt?: string;
  params: TopicModule["defaultParams"];
}): TopicPresentation {
  const expr = expressionFrom(input.params);
  const nice = expr.replace(/\*/g, "");
  return {
    title: `Graph of y = ${nice}`,
    summary: `Interactive graph of y = ${nice}. Drag P to read the height and the tangent slope at that point.`,
    formula: `y = ${nice}`,
    steps: [
      {
        title: "Read the formula",
        detail: `The blue curve is y = ${nice}. Every x on the axis maps to one height on the curve.`,
      },
      {
        title: "Move along the curve",
        detail: `Drag P. Its x-coordinate is the input; its height is the value of ${nice}.`,
      },
      {
        title: "Watch the tangent",
        detail: `The red line is the tangent at P — the instantaneous slope of y = ${nice} there.`,
      },
    ],
  };
}

export const functionGraphTopic: TopicModule = {
  id: "function-graph",
  boardId: "function-graph",
  title: "Function graph",
  summary:
    "Plot any safe formula y = f(x). Drag the point to read height and slope.",
  formula: "y = f(x)",
  aliases: [
    "function graph",
    "graph y equals",
    "plot a function",
    "graph a curve",
  ],
  steps: [
    {
      title: "Read the formula",
      detail:
        "The blue curve is the graph of the formula you asked for — every x maps to one height y.",
    },
    {
      title: "Move along the curve",
      detail:
        "Drag P. Its x-coordinate is the input; its height is f(x).",
    },
    {
      title: "Watch the tangent",
      detail:
        "The red line is the tangent at P. Its slope is the instantaneous rate of change f'(x).",
    },
  ],
  defaultParams: defaultFunctionGraphParams(),
  deriveParams: (prompt: string) =>
    parseFunctionGraphFromPrompt(prompt) ?? defaultFunctionGraphParams(),
  matches: (prompt, conceptKey) => wantsFunctionGraph(prompt, conceptKey),
  present: presentFunctionGraph,
};
