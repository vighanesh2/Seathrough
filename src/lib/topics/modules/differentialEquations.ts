import { defaultOdeParams, parseOdeFromPrompt } from "@/lib/topics/odeParse";
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

  return (
    /\bsolve\b/.test(blob) &&
    /\b(differential|ode)\b/.test(blob)
  );
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
};
