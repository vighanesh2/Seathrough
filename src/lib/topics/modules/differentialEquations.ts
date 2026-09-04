import { defaultOdeParams, parseOdeFromPrompt } from "@/lib/topics/odeParse";
import type { TopicPresentation } from "@/lib/topics/presentation";
import type { TopicModule } from "@/lib/topics/types";

function matchesDifferentialEquations(
  prompt: string,
  conceptKey?: string,
): boolean {
  const blob = `${prompt} ${conceptKey ?? ""}`.toLowerCase();
  if (!blob.trim()) return false;

  if (/\bpartial differential\b|\bpde\b/.test(blob)) return false;
  if (/\bdifference equation\b/.test(blob)) return false;

  if (/\bdifferential equation/.test(blob)) return true;
  if (/\bordinary differential\b/.test(blob)) return true;
  if (/\bode\b/.test(blob)) return true;
  if (/\binitial value problem\b/.test(blob) && /\b(y'|dy\/d)/.test(blob)) {
    return true;
  }

  if (/\bdy\s*\/\s*d[txy]\b/.test(blob)) return true;
  if (/\by\s*[''`]\s*=/.test(blob)) return true;
  if (/\brunge[\s-]?kutta\b/.test(blob)) return true;
  if (/\bf\s*\(\s*t\s*,\s*y\s*\)/.test(blob)) return true;

  return /\bsolve\b/.test(blob) && /\b(differential|ode)\b/.test(blob);
}

function presentOde(input: {
  prompt?: string;
  params: TopicModule["defaultParams"];
}): TopicPresentation {
  if (input.params.boardKind !== "ode-solution") {
    return {
      title: "Differential equations",
      summary:
        "Plot solutions of an ordinary differential equation with an initial value.",
      formula: "y'(t) = f(t, y)",
      steps: [],
    };
  }

  const {
    odeExpression,
    initialT,
    initialY,
    parameterC,
    timeSpan,
  } = input.params;
  const nice = odeExpression.replace(/\*/g, "·");

  return {
    title: `ODE: y' = ${nice}`,
    summary: `Solution of y' = ${nice} starting at (${initialT}, ${initialY}). Drag the start point or the c and N sliders to explore.`,
    formula: `y' = ${nice},\\quad y(${initialT}) = ${initialY}`,
    steps: [
      {
        title: "Name the rule",
        detail: `This ODE says the slope at each point is ${nice}. The red curve is one solution that follows that rule.`,
      },
      {
        title: "Pin down the start",
        detail: `The initial value y(${initialT}) = ${initialY} picks which solution you get — every other start point traces a different curve.`,
      },
      {
        title: "Step forward in time",
        detail: `Heun / Runge–Kutta integrates from t = ${initialT} out to t = ${initialT} + N (currently N = ${timeSpan}).`,
      },
      {
        title: "Explore parameters",
        detail: `c starts at ${parameterC}. Move (t₀, y₀), drag c, or change N — each choice is another solution of the same family.`,
      },
    ],
  };
}

export const differentialEquationsTopic: TopicModule = {
  id: "differential-equations",
  boardId: "ode-solution",
  title: "Differential equations",
  summary:
    "Plot solutions of an ordinary differential equation with an initial value — drag the start point and tune the parameter c to see how the trajectory changes.",
  formula: "y'(t) = f(t, y), \\quad y(t_0) = y_0",
  aliases: [
    "differential equations",
    "ordinary differential equation",
    "ode",
    "initial value problem",
    "dy/dt",
    "slope field solution",
  ],
  steps: [
    {
      title: "Name the rule",
      detail:
        "An ODE tells you how fast y changes: y'(t) = f(t, y). The red curve is one solution that satisfies that rule.",
    },
    {
      title: "Pin down the start",
      detail:
        "An initial value picks a single solution: the point (t₀, y₀) is where the trajectory must begin.",
    },
    {
      title: "Step forward in time",
      detail:
        "The solver (Heun / Runge–Kutta) marches from t₀ to t₀ + N along the slope field to draw the solution curve.",
    },
    {
      title: "Explore parameters",
      detail:
        "Move (t₀, y₀), drag the c slider, or change N. Each choice traces a different solution of the same ODE family.",
    },
  ],
  defaultParams: defaultOdeParams(),
  deriveParams: (prompt: string) => parseOdeFromPrompt(prompt),
  matches: matchesDifferentialEquations,
  present: presentOde,
};
