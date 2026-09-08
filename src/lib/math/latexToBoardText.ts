/**
 * Convert LaTeX / TeX-ish math into readable board text for Konva.
 * The draw engine cannot render KaTeX; this keeps equations legible.
 */

const KATEX_UNSUPPORTED_SPACES = /[\u00a0\u202f\u2009\u200a\u200b\ufeff]/g;

/** Remove Unicode spacing characters that KaTeX warns about or cannot measure. */
export function normalizeKatexSource(input: string): string {
  return input.replace(KATEX_UNSUPPORTED_SPACES, " ").replace(/\s+/g, " ").trim();
}

const SIMPLE_MACROS: Record<string, string> = {
  lim: "lim",
  int: "∫",
  times: "×",
  div: "÷",
  cdot: "·",
  pm: "±",
  mp: "∓",
  leq: "≤",
  geq: "≥",
  neq: "≠",
  approx: "≈",
  infty: "∞",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftrightarrow: "⇔",
  to: "→",
  quad: "  ",
  qquad: "   ",
  ",": " ",
  ";": " ",
  "!": "",
  " ": " ",
  ldots: "…",
  cdots: "···",
  dots: "…",
};

function unwrapBraced(input: string, start: number): { inner: string; end: number } | null {
  if (input[start] !== "{") return null;
  let depth = 0;
  for (let i = start; i < input.length; i += 1) {
    const ch = input[i]!;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return { inner: input.slice(start + 1, i), end: i + 1 };
      }
    }
  }
  return null;
}

function convertSegment(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;

    if (ch === "\\") {
      // \frac{a}{b}
      if (input.startsWith("\\frac", i)) {
        const a = unwrapBraced(input, i + 5);
        if (a) {
          const b = unwrapBraced(input, a.end);
          if (b) {
            const num = convertSegment(a.inner).trim();
            const den = convertSegment(b.inner).trim();
            const wrapNum = /[+\-*/×÷ ]/.test(num) ? `(${num})` : num;
            const wrapDen = /[+\-*/×÷ ]/.test(den) ? `(${den})` : den;
            // Prefer (1/2)x over 1/2x when a letter or '(' follows.
            const next = input[b.end];
            const needsParens =
              !!next && /[a-zA-Z(]/.test(next) && !wrapNum.startsWith("(");
            out += needsParens
              ? `(${wrapNum}/${wrapDen})`
              : `${wrapNum}/${wrapDen}`;
            i = b.end;
            continue;
          }
        }
      }

      // \text{...} / \mathrm{...} / \mathbf{...}
      const textMatch = input.slice(i).match(/^\\(text|mathrm|mathbf|textit|textrm)\{/);
      if (textMatch) {
        const braced = unwrapBraced(input, i + textMatch[0].length - 1);
        if (braced) {
          out += convertSegment(braced.inner);
          i = braced.end;
          continue;
        }
      }

      // \left( \right) \bigl( etc. — keep delimiter, drop command
      const delim = input.slice(i).match(/^\\(left|right|bigl|bigr|Bigl|Bigr|biggl|biggr)\s*/);
      if (delim) {
        i += delim[0].length;
        continue;
      }

      // Named macro: \times, \alpha, etc.
      const named = input.slice(i).match(/^\\([a-zA-Z]+)/);
      if (named) {
        const name = named[1]!;
        if (SIMPLE_MACROS[name] != null) {
          out += SIMPLE_MACROS[name];
        } else if (name === "overline" || name === "bar") {
          const braced = unwrapBraced(input, i + named[0].length);
          if (braced) {
            out += `${convertSegment(braced.inner)}̅`;
            i = braced.end;
            continue;
          }
        } else {
          // Unknown macro — drop the backslash, keep the name as a hint
          out += name;
        }
        i += named[0].length;
        continue;
      }

      // Escaped special: \{ \} \%
      const esc = input[i + 1];
      if (esc && "{}%&#_$".includes(esc)) {
        out += esc;
        i += 2;
        continue;
      }

      // Lone backslash — skip
      i += 1;
      continue;
    }

    // Superscript ^{...} or ^x
    if (ch === "^") {
      const braced = unwrapBraced(input, i + 1);
      if (braced) {
        out += `^${convertSegment(braced.inner)}`;
        i = braced.end;
        continue;
      }
      if (input[i + 1]) {
        out += `^${input[i + 1]}`;
        i += 2;
        continue;
      }
    }

    // Subscript _{...} or _x
    if (ch === "_") {
      const braced = unwrapBraced(input, i + 1);
      if (braced) {
        out += `_${convertSegment(braced.inner)}`;
        i = braced.end;
        continue;
      }
      if (input[i + 1]) {
        out += `_${input[i + 1]}`;
        i += 2;
        continue;
      }
    }

    out += ch;
    i += 1;
  }
  return out;
}

function convertMatrixEnvironments(input: string): string {
  const re =
    /\\begin\{((?:b|p|B|v|V)?matrix\*?|smallmatrix)\}([\s\S]*?)\\end\{\1\}/g;
  return input.replace(re, (_whole, _kind: string, body: string) => {
    const rows = String(body)
      .split(/\\\\/)
      .map((row) =>
        row
          .split("&")
          .map((cell) => convertSegment(cell.replace(/\\hline/gi, "").trim()))
          .filter((cell) => cell.length > 0),
      )
      .filter((row) => row.length > 0);
    if (!rows.length) return "";
    if (rows.length === 1) return `[ ${rows[0]!.join("  ")} ]`;
    return `[${rows.map((row) => row.join("  ")).join("; ")}]`;
  });
}

/**
 * True when the string still looks like TeX that Konva would show badly.
 */
export function looksLikeLatex(text: string): boolean {
  return /\\[a-zA-Z]+|\\frac|\$\$|\$[^$]+\$/.test(text);
}

/**
 * Convert LaTeX-ish math into readable ASCII/unicode for the pen board.
 */
export function latexToBoardText(input: string): string {
  let s = input.trim();
  if (!s) return s;

  // Strip display/inline math delimiters.
  s = s.replace(/^\$\$([\s\S]*)\$\$$/g, "$1");
  s = s.replace(/^\$([^$]*)\$$/g, "$1");
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  s = s.replace(/\$([^$]+?)\$/g, "$1");
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, "$1");

  // Turn bmatrix/pmatrix into [a  b;  c  d] before \\ collapse eats row breaks.
  s = convertMatrixEnvironments(s);

  // Normalize double-escaped backslashes from JSON ("\\\\frac" → "\\frac")
  while (s.includes("\\\\")) {
    s = s.replace(/\\\\/g, "\\");
  }

  s = convertSegment(s);

  // Cleanup spacing around operators
  s = s
    .replace(/\s*([=≈≠≤≥+×÷·])\s*/g, " $1 ")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();

  return s;
}
