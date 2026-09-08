import sanitizeHtml from "sanitize-html";
import { MAX_GENERATED_SVG_CHARS } from "@/lib/automatic-drawing/svg/schema";

const ALLOWED_TAGS = [
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "linearGradient",
  "radialGradient",
  "stop",
  "marker",
  "clipPath",
  "title",
  "desc",
] as const;

const SAFE_ID = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;
const FORBIDDEN_SOURCE =
  /<!doctype|<!entity|<\?xml|<\s*(?:script|style|foreignObject|iframe|object|embed|image|use|a|animate|set|filter|fe[A-Za-z]*)\b|\bon[a-z]+\s*=|\b(?:href|xlink:href|src|style)\s*=/i;
const EXTERNAL_URL = /url\(\s*(?!#[A-Za-z][A-Za-z0-9_.:-]*\s*\))/i;
const GRAPHIC_TAG = /<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/gi;

const globalAttributes = [
  "id",
  "transform",
  "opacity",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "vector-effect",
  "clip-path",
  "font-family",
  "font-size",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
];

const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
  "*": globalAttributes,
  svg: ["viewBox", "width", "height", "xmlns", "role", "aria-label"],
  path: ["d", "pathLength"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
  text: ["x", "y", "dx", "dy"],
  tspan: ["x", "y", "dx", "dy"],
  linearGradient: ["x1", "y1", "x2", "y2", "gradientUnits"],
  radialGradient: ["cx", "cy", "r", "fx", "fy", "gradientUnits"],
  stop: ["offset", "stop-color", "stop-opacity"],
  marker: [
    "markerWidth",
    "markerHeight",
    "refX",
    "refY",
    "orient",
    "markerUnits",
    "viewBox",
  ],
  clipPath: ["clipPathUnits"],
};

function validateStructure(svg: string) {
  const tags = [...svg.matchAll(/<\/?([A-Za-z][\w:-]*)\b[^>]*>/g)];
  if (tags.length > 240) throw new Error("Generated SVG has too many elements");

  let depth = 0;
  let maxDepth = 0;
  for (const match of tags) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth = Math.max(0, depth - 1);
    } else if (!token.endsWith("/>")) {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  if (maxDepth > 14) throw new Error("Generated SVG is nested too deeply");

  const graphics = svg.match(GRAPHIC_TAG)?.length ?? 0;
  if (graphics < 10) throw new Error("Generated SVG is too sparse");
  const labels = svg.match(/<text\b/g)?.length ?? 0;
  if (labels < 5) throw new Error("Generated SVG needs more labels");

  const pathChars = [...svg.matchAll(/\sd="([^"]*)"/g)].reduce(
    (total, match) => total + (match[1]?.length ?? 0),
    0,
  );
  if (pathChars > 24_000) throw new Error("Generated SVG paths are too large");

  const visibleText = svg
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (visibleText.length > 2_000) {
    throw new Error("Generated SVG contains too much text");
  }
}

function validateReferences(svg: string) {
  const ids = new Set<string>();
  for (const match of svg.matchAll(/\sid="([^"]+)"/g)) {
    const id = match[1] ?? "";
    if (!SAFE_ID.test(id)) throw new Error("Generated SVG has an unsafe id");
    if (ids.has(id)) throw new Error("Generated SVG has duplicate ids");
    ids.add(id);
  }

  for (const match of svg.matchAll(/url\(\s*#([^)\s]+)\s*\)/g)) {
    if (!ids.has(match[1] ?? "")) {
      throw new Error("Generated SVG has an invalid local reference");
    }
  }
}

function validatedViewBox(svg: string): string {
  const root = svg.match(/^<svg\b([^>]*)>/)?.[1] ?? "";
  const raw = root.match(/\bviewBox="([^"]+)"/)?.[1] ?? "0 0 900 600";
  const values = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isFinite(value)) ||
    values[2]! < 100 ||
    values[2]! > 4_000 ||
    values[3]! < 100 ||
    values[3]! > 4_000
  ) {
    throw new Error("Generated SVG has an invalid viewBox");
  }
  return values.join(" ");
}

export function sanitizeGeneratedSvg(rawSvg: string): {
  svg: string;
  dataUrl: string;
} {
  const raw = rawSvg.trim();
  if (!raw.startsWith("<svg") || !raw.endsWith("</svg>")) {
    throw new Error("Generated visual is not a complete SVG");
  }
  if (raw.length > MAX_GENERATED_SVG_CHARS) {
    throw new Error("Generated SVG is too large");
  }
  if (FORBIDDEN_SOURCE.test(raw) || EXTERNAL_URL.test(raw)) {
    throw new Error("Generated SVG contains unsafe content");
  }
  const viewBox = validatedViewBox(raw);

  const cleaned = sanitizeHtml(raw, {
    allowedTags: [...ALLOWED_TAGS],
    allowedAttributes,
    allowedSchemes: [],
    allowProtocolRelative: false,
    parser: {
      lowerCaseTags: false,
      lowerCaseAttributeNames: false,
    },
  }).trim();

  if (FORBIDDEN_SOURCE.test(cleaned) || EXTERNAL_URL.test(cleaned)) {
    throw new Error("Generated SVG remained unsafe after sanitization");
  }

  // htmlparser2 may discard the SVG wrapper for some otherwise valid model
  // attributes. The inner markup is still sanitized; rebuild a canonical root.
  const inner = cleaned.startsWith("<svg")
    ? cleaned
        .replace(/^<svg\b[^>]*>/, "")
        .replace(/<\/svg>$/, "")
        .trim()
    : cleaned;
  const canonical = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="900" height="600" role="img" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;

  validateStructure(canonical);
  validateReferences(canonical);

  return {
    svg: canonical,
    dataUrl: `data:image/svg+xml;base64,${Buffer.from(canonical, "utf8").toString("base64")}`,
  };
}
