import type { BoundingBox, FunctionGraphBoardParams } from "@/lib/topics/schema";

const DEFAULT_EXPRESSION = "x^2";
const DEFAULT_BOX: BoundingBox = [-5, 12, 5, -2];

const FN_NAMES = "sin|cos|tan|abs|sqrt|ln|log|exp";

/**
 * JessieCode-safe expression in x only.
 * Allows trig/exp helpers as whole words; no letters otherwise.
 */
const SAFE_FN = new RegExp(
  `^(?:(?:${FN_NAMES}|pi|e)|[\\d+\\-*/().^ x])+$`,
  "i",
);

/**
 * Common curve names → formulas. "graph sine" / "plot a parabola" become
 * real y = f(x) graphs. Power patterns like bare "x^2" are NOT listed here —
 * those come from an explicit y = … formula (avoids "sin x^2" → parabola).
 */
const NAMED_CURVES: ReadonlyArray<{
  expr: string;
  match: RegExp;
}> = [
  { expr: "x^2", match: /\b(parabola|quadratic|x\s*squared)\b/ },
  { expr: "x^3", match: /\b(cubic|x\s*cubed)\b/ },
  { expr: "x^4", match: /\b(quartic|x\s*to the fourth)\b/ },
  { expr: "sin(x)", match: /\b(sine|sinusoid|sin\s*wave)\b/ },
  { expr: "cos(x)", match: /\b(cosine|cos\s*wave)\b/ },
  { expr: "tan(x)", match: /\b(tangent\s+(curve|graph|function)|tan\s*wave)\b/ },
  { expr: "abs(x)", match: /\b(absolute\s*value|v\s*shape)\b/ },
  { expr: "sqrt(x)", match: /\b(square\s*root)\b/ },
  { expr: "exp(x)", match: /\b(exponential)\b/ },
  { expr: "ln(x)", match: /\b(natural\s*log|logarithm)\b/ },
  { expr: "1/x", match: /\b(reciprocal|hyperbola|inverse\s*proportion)\b/ },
  { expr: "2*x+1", match: /\b(straight\s*line|linear\s*(function|graph)|line\s*graph)\b/ },
];

/**
 * Turn "sin x^2" / "sin x" into "sin(x^2)" / "sin(x)" before we strip spaces.
 * Never invent letter-letter multiplies like s*i*n — that breaks function names.
 */
function wrapFunctionArgs(raw: string): string {
  let expr = raw;
  // Already has parentheses — normalize "sin (" → "sin("
  expr = expr.replace(
    new RegExp(`\\b(${FN_NAMES})\\s*\\(\\s*`, "gi"),
    "$1(",
  );
  // "sin x^2" / "cos 2x" / "abs x" → sin(x^2), cos(2x), abs(x)
  expr = expr.replace(
    new RegExp(
      `\\b(${FN_NAMES})(?!\\()\\s*([a-z0-9.]+(?:\\s*\\^\\s*[a-z0-9.]+)?)`,
      "gi",
    ),
    "$1($2)",
  );
  return expr;
}

function withImplicitMultiplication(expr: string): string {
  return (
    expr
      .replace(/(\d)\s*([a-z(])/gi, "$1*$2")
      .replace(/([a-z)])\s*(\d)/gi, "$1*$2")
      .replace(/\)\s*\(/g, ")*(")
      // )x or )sin — not letter-letter inside identifiers
      .replace(/\)\s*([a-z])/gi, ")*$1")
  );
}

/** Normalize a learner-typed formula into a JessieCode snippet in x. */
export function cleanFunctionExpression(raw: string): string | null {
  let expr = raw
    .trim()
    .replace(/⋅|·|×/g, "*")
    .replace(/−/g, "-")
    .replace(/\*\*/g, "^");

  expr = expr.replace(/^(?:y|f\s*\(\s*x\s*\))\s*=/i, "");
  if (!expr || expr.length > 80) return null;

  expr = wrapFunctionArgs(expr);
  // Remove spaces only after function args are wrapped.
  expr = expr.replace(/\s+/g, "");
  expr = withImplicitMultiplication(expr);

  if (!SAFE_FN.test(expr)) return null;
  if (!/x/i.test(expr)) return null;

  return expr;
}

export function isSafeFunctionExpression(expr: string): boolean {
  return cleanFunctionExpression(expr) !== null;
}

function hasExplicitFormula(blob: string): boolean {
  return (
    /\by\s*=/.test(blob) ||
    /\bf\s*\(\s*x\s*\)\s*=/.test(blob) ||
    /\b(?:graph|plot|draw|sketch)\s+[-\d.]*\s*x\s*[\^+\-*/]/.test(blob)
  );
}

function extractNamedCurve(blob: string): string | null {
  // Never override an explicit y = … formula with a name guess.
  if (hasExplicitFormula(blob)) return null;

  const lower = blob.toLowerCase();
  const graphIntent =
    /\b(graph|plot|draw|sketch|show|visualize)\b/.test(lower) ||
    /\b(curve|function|wave)\b/.test(lower);
  const bareName = /\b(parabola|sine|cosine|cubic|quartic|exponential|reciprocal)\b/.test(
    lower,
  );

  if (!graphIntent && !bareName) return null;

  for (const named of NAMED_CURVES) {
    if (!named.match.test(lower)) continue;
    if (named.expr === "tan(x)" && /\bcircle\b/.test(lower)) continue;
    if (named.expr === "2*x+1" && /\bslope of a line\b/.test(lower)) continue;
    return named.expr;
  }
  return null;
}

const SUPER_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Drop $…$, \(…\), and unicode powers so typed / titled formulas still parse. */
function stripMathWrappers(raw: string): string {
  return raw
    .replace(/\$\$([\s\S]+?)\$\$/g, " $1 ")
    .replace(/\$([^$]+)\$/g, " $1 ")
    .replace(/\\\((.+?)\\\)/g, " $1 ")
    .replace(/\\\[(.+?)\\\]/g, " $1 ")
    .replace(/\\mathrm\{([^{}]+)\}/g, "$1")
    .replace(/\^\{([^{}]+)\}/g, "^$1")
    .replace(/_\{([^{}]+)\}/g, "_$1")
    .replace(/[{}]/g, "")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => `^${SUPER_DIGITS[ch] ?? ch}`);
}

const TRAILING_ENGLISH =
  /\b(with|and|where|for|when|on|from|show|because|which|that|gives|producing|produces|touches|giving|here|at|the|this|a|an|is|as|to|of|in)\b/i;

function takeMathSlice(captured: string): string {
  return (captured.split(TRAILING_ENGLISH)[0] ?? captured).trim();
}

/**
 * Keep the longest prefix that is a safe y = f(x) snippet. Stops when lesson
 * concept keys / recap sentences are appended after the formula.
 */
function longestSafeExpression(raw: string): string | null {
  const slice = takeMathSlice(raw);
  const direct = cleanFunctionExpression(slice);
  if (direct) return direct;

  const tokens = raw.trim().split(/\s+/);
  let best: string | null = null;
  let acc = "";
  for (const token of tokens) {
    const next = acc ? `${acc} ${token}` : token;
    const cleaned = cleanFunctionExpression(takeMathSlice(next));
    if (cleaned) {
      best = cleaned;
      acc = next;
      continue;
    }
    if (best) break;
    acc = next;
  }
  return best;
}

/**
 * Pull y = f(x) (or a named curve like "graph sine") out of a question.
 */
export function extractFunctionExpression(prompt: string): string | null {
  const blob = stripMathWrappers(prompt).trim();
  if (!blob) return null;

  const patterns = [
    /\b(?:graphing|graph|plot|draw|sketch)\s+(?:the\s+)?(?:curve\s+)?(?:of\s+)?(?:the\s+)?(?:function\s+)?y\s*=\s*([^.;?\n]+)/i,
    /\b(?:graphing|graph|plot|draw|sketch)\s+(?:the\s+)?(?:function\s+)?f\s*\(\s*x\s*\)\s*=\s*([^.;?\n]+)/i,
    /\by\s*=\s*([^.;?\n]+)/i,
    /\bf\s*\(\s*x\s*\)\s*=\s*([^.;?\n]+)/i,
    /\b(?:graphing|graph|plot|draw|sketch)\s+((?:[-\d.]+)?\s*x(?:\s*\^\s*[-\d.]+)?(?:\s*[+\-*/^()\dx\s]+)*)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(blob);
    if (!match?.[1]) continue;
    const trimmed = takeMathSlice(match[1]);
    if (
      /^(sine|cosine|parabola|cubic|quartic|exponential|sinusoid)$/i.test(
        trimmed,
      )
    ) {
      continue;
    }
    const cleaned = longestSafeExpression(trimmed);
    if (cleaned) return cleaned;
  }

  return extractNamedCurve(blob);
}

function sampleJsExpression(expr: string, x: number): number | null {
  try {
    const js = expr.replace(/\^/g, "**").replace(/\bpi\b/gi, "Math.PI");
    // eslint-disable-next-line no-new-func -- vetted whitelist expression
    const fn = new Function(
      "x",
      "sin",
      "cos",
      "tan",
      "abs",
      "sqrt",
      "ln",
      "log",
      "exp",
      `return (${js});`,
    ) as (
      x: number,
      sin: (n: number) => number,
      cos: (n: number) => number,
      tan: (n: number) => number,
      abs: (n: number) => number,
      sqrt: (n: number) => number,
      ln: (n: number) => number,
      log: (n: number) => number,
      exp: (n: number) => number,
    ) => number;
    const y = fn(
      x,
      Math.sin,
      Math.cos,
      Math.tan,
      Math.abs,
      Math.sqrt,
      Math.log,
      Math.log10,
      Math.exp,
    );
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

/** Pick a window that fits the curve without blowing up. */
export function boundingBoxForFunction(expr: string): BoundingBox {
  const power = /\bx\s*\^\s*(\d+)/i.exec(expr);
  const degree = power ? Number(power[1]) : null;
  let xSpan = 4.5;
  if (degree != null && degree >= 4) xSpan = 2.2;
  if (degree != null && degree >= 6) xSpan = 1.6;
  if (/\b(sin|cos|tan)\b/i.test(expr)) xSpan = 6.5;
  if (/^(1\/x)$/i.test(expr.replace(/\s+/g, ""))) xSpan = 5;
  if (/\b(ln|log|sqrt)\b/i.test(expr)) {
    return [-0.5, 4, 8, -3];
  }
  if (/\bexp\b/i.test(expr)) xSpan = 3;

  const xs: number[] = [];
  for (let i = 0; i <= 40; i += 1) {
    xs.push(-xSpan + (2 * xSpan * i) / 40);
  }

  const ys: number[] = [];
  for (const x of xs) {
    const y = sampleJsExpression(expr, x);
    if (y != null && Math.abs(y) < 1e6) ys.push(y);
  }

  if (!ys.length) return DEFAULT_BOX;

  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMax - yMin < 2) {
    const mid = (yMax + yMin) / 2;
    yMin = mid - 1;
    yMax = mid + 1;
  }

  const padX = xSpan * 0.12;
  const padY = (yMax - yMin) * 0.18;
  return [-xSpan - padX, yMax + padY, xSpan + padX, yMin - padY];
}

export function defaultFunctionGraphParams(): FunctionGraphBoardParams {
  return {
    boardKind: "function-graph",
    boundingBox: DEFAULT_BOX,
    expression: DEFAULT_EXPRESSION,
    showTangent: true,
    xMin: -4.5,
    xMax: 4.5,
  };
}

export function parseFunctionGraphFromPrompt(
  prompt: string,
): FunctionGraphBoardParams | null {
  const expression = extractFunctionExpression(prompt);
  if (!expression) return null;

  const box = boundingBoxForFunction(expression);
  let xMin = box[0] + (box[2] - box[0]) * 0.04;
  let xMax = box[2] - (box[2] - box[0]) * 0.04;

  if (/\b(ln|log|sqrt)\b/i.test(expression)) {
    xMin = Math.max(0.05, xMin);
  }

  return {
    boardKind: "function-graph",
    boundingBox: box,
    expression,
    showTangent: true,
    xMin,
    xMax,
  };
}

export function wantsFunctionGraph(prompt: string, conceptKey?: string): boolean {
  // Parse each field on its own. Concatenating a beat concept key or recap
  // onto "y = x^4" used to swallow the formula ("x^4 even functions and…").
  if (extractFunctionExpression(prompt)) return true;
  if (conceptKey && extractFunctionExpression(conceptKey)) return true;
  return false;
}

export function listNamedCurveExpressions(): string[] {
  return NAMED_CURVES.map((c) => c.expr);
}
