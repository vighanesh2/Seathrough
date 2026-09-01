import type { OdeSolutionBoardParams } from "@/lib/topics/schema";

const DEFAULT_EXPRESSION = "(2-t)*y + c";
const DEFAULT_BOX: OdeSolutionBoardParams["boundingBox"] = [-11, 11, 11, -11];

/** Characters allowed in a curated ODE right-hand side (JessieCode snippet). */
const SAFE_ODE = /^[\d+\-*/(). tyc]+$/i;

function cleanExpression(raw: string): string | null {
  let expr = raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\by\b/gi, "y")
    .replace(/\bt\b/gi, "t");

  // dy/dx questions use x as the independent variable on the plot.
  expr = expr.replace(/\bx\b/gi, "t");

  if (!expr || expr.length > 120) return null;
  if (!SAFE_ODE.test(expr)) return null;
  return expr;
}

function extractOdeExpression(blob: string): string | null {
  const patterns = [
    /\bdy\s*\/\s*d[txy]\s*=\s*([^.;?\n]+)/i,
    /\by\s*[''`]\s*=\s*([^.;?\n]+)/i,
    /\bf\s*\(\s*t\s*,\s*y\s*\)\s*:\s*([^.;?\n]+)/i,
    /\bf\s*\(\s*t\s*,\s*y\s*\)\s*=\s*([^.;?\n]+)/i,
    /\bode\s*:\s*([^.;?\n]+)/i,
    /\bequation\s*:\s*([^.;?\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(blob);
    if (!match?.[1]) continue;
    const trimmed = match[1].split(/\b(with|and|where|for|when|initial)\b/i)[0] ?? match[1];
    const cleaned = cleanExpression(trimmed);
    if (cleaned) return cleaned;
  }
  return null;
}

function extractInitialCondition(
  blob: string,
): { t: number; y: number } | null {
  const patterns = [
    /\by\s*\(\s*([-\d.]+)\s*\)\s*=\s*([-\d.]+)/i,
    /\binitial\s+(?:value|condition)\s*(?:is\s*)?y\s*\(\s*([-\d.]+)\s*\)\s*=\s*([-\d.]+)/i,
    /\bat\s+t\s*=\s*([-\d.]+)\s*,?\s*y\s*=\s*([-\d.]+)/i,
    /\bstarting\s+(?:at|from)\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(blob);
    if (!match?.[1] || !match[2]) continue;
    const t = Number(match[1]);
    const y = Number(match[2]);
    if (Number.isFinite(t) && Number.isFinite(y)) return { t, y };
  }
  return null;
}

function extractParameterC(blob: string): number | null {
  const match = /\bc\s*=\s*([-\d.]+)/i.exec(blob);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractTimeSpan(blob: string): number | null {
  const match =
    /\b(?:for|over|span|integrate(?:\s+for)?)\s+([-\d.]+)\s*(?:units|seconds|steps)?/i.exec(
      blob,
    ) ?? /\bN\s*=\s*([-\d.]+)/i.exec(blob);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 50) return null;
  return value;
}

export function defaultOdeParams(): OdeSolutionBoardParams {
  return {
    boardKind: "ode-solution",
    boundingBox: DEFAULT_BOX,
    odeExpression: DEFAULT_EXPRESSION,
    initialT: 0,
    initialY: 1,
    parameterC: 0,
    timeSpan: 10,
    parameterMin: -15,
    parameterMax: 15,
    timeSpanMin: -15,
    timeSpanMax: 15,
  };
}

/** Tailor the ODE board to what the learner asked. */
export function parseOdeFromPrompt(prompt: string): OdeSolutionBoardParams {
  const params = defaultOdeParams();

  const expression = extractOdeExpression(prompt);
  if (expression) params.odeExpression = expression;

  const blob = prompt.toLowerCase();
  const ic = extractInitialCondition(blob);
  if (ic) {
    params.initialT = ic.t;
    params.initialY = ic.y;
  }

  const c = extractParameterC(blob);
  if (c != null) params.parameterC = c;

  const span = extractTimeSpan(blob);
  if (span != null) params.timeSpan = span;

  return params;
}

export function isSafeOdeExpression(expression: string): boolean {
  return cleanExpression(expression) != null;
}
