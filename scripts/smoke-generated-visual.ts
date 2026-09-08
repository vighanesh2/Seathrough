import assert from "node:assert/strict";
import { buildFallbackDiagram } from "../src/lib/automatic-drawing/svg/generateSvg";
import { renderSemanticDiagram } from "../src/lib/automatic-drawing/svg/layoutDiagram";
import { sanitizeGeneratedSvg } from "../src/lib/automatic-drawing/svg/sanitize";
import { semanticDiagramSchema } from "../src/lib/automatic-drawing/svg/schema";
import { generatedSvgToDrawCommand } from "../src/lib/draw-engine/fromGeneratedSvg";
import { drawCommandSchema } from "../src/lib/draw-engine/commands";

const safeSvg = `<svg viewBox="0 0 900 600">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="#287fb5"/>
    </marker>
  </defs>
  <rect x="40" y="60" width="260" height="180" rx="20" fill="#eef6fb" stroke="#287fb5"/>
  <circle cx="500" cy="150" r="80" fill="#dff5ef" stroke="#54bfa3"/>
  <line x1="300" y1="150" x2="410" y2="150" stroke="#287fb5" stroke-width="4"/>
  <path d="M420 380 C520 310 650 330 760 240" fill="none" stroke="#e6a23c" stroke-width="5"/>
  <circle cx="180" cy="360" r="45"/><circle cx="320" cy="360" r="45"/>
  <circle cx="460" cy="360" r="45"/><circle cx="600" cy="360" r="45"/>
  <line x1="180" y1="315" x2="450" y2="230"/><line x1="320" y1="315" x2="470" y2="230"/>
  <text x="70" y="115" font-family="Lexend, Arial, sans-serif" font-size="24">Hogwarts</text>
  <text x="145" y="365">Harry</text><text x="280" y="365">Ron</text>
  <text x="415" y="365">Hermione</text><text x="565" y="365">Dumbledore</text>
</svg>`;

const safe = sanitizeGeneratedSvg(safeSvg);
assert.match(safe.svg, /viewBox="0 0 900 600"/);
assert.ok(safe.dataUrl.startsWith("data:image/svg+xml;base64,"));
assert.match(
  sanitizeGeneratedSvg(
    safeSvg.replace('viewBox="0 0 900 600"', 'viewBox="0 0 1200 800"'),
  ).svg,
  /viewBox="0 0 1200 800"/,
  "the model coordinate system must be preserved to avoid clipping",
);

const command = generatedSvgToDrawCommand({
  dataUrl: safe.dataUrl,
  alt: "A labeled educational map with connected story elements.",
  placement: { x: 360, y: 72, width: 500, height: 330 },
});
assert.equal(drawCommandSchema.safeParse(command).success, true);
assert.equal(command.type, "image");

const unsafeFixtures = [
  `<svg><script>alert(1)</script><rect/><circle/><path d="M0 0"/></svg>`,
  `<svg onload="alert(1)"><rect/><circle/><path d="M0 0"/></svg>`,
  `<svg><foreignObject><iframe src="https://evil.test"/></foreignObject><rect/><circle/><path d="M0 0"/></svg>`,
  `<svg><image href="https://evil.test/x.png"/><rect/><circle/><path d="M0 0"/></svg>`,
  `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><rect/><circle/><path d="M0 0"/></svg>`,
  `<svg><defs><marker id="a"/></defs><path fill="url(#missing)" d="M0 0"/><rect/><circle/></svg>`,
  `<svg><g id="same"/><g id="same"/><rect/><circle/><path d="M0 0"/></svg>`,
];

for (const fixture of unsafeFixtures) {
  assert.throws(() => sanitizeGeneratedSvg(fixture));
}

assert.equal(
  drawCommandSchema.safeParse({
    ...command,
    src: "javascript:alert(1)",
  }).success,
  false,
);

async function checkSystematicLayout() {
  const diagram = semanticDiagramSchema.parse({
    title: "What Is Climate Science?",
    kind: "relationship",
    takeaway: "Climate science connects observations, models, and impacts.",
    nodes: [
      {
        id: "climate-science",
        label: "Climate Science",
        detail: "Studies a changing climate",
        role: "primary",
      },
      {
        id: "atmosphere",
        label: "Atmosphere",
        detail: "Tracks gases and temperature",
        role: "supporting",
      },
      {
        id: "oceans",
        label: "Oceans",
        detail: "Store and move heat",
        role: "supporting",
      },
      {
        id: "ice",
        label: "Ice",
        detail: "Records long-term change",
        role: "supporting",
      },
      {
        id: "models",
        label: "Models",
        detail: "Test future scenarios",
        role: "supporting",
      },
      {
        id: "impacts",
        label: "Impacts",
        detail: "Connect science to decisions",
        role: "outcome",
      },
    ],
    edges: [
      { from: "climate-science", to: "atmosphere" },
      { from: "climate-science", to: "oceans" },
      { from: "climate-science", to: "ice" },
      { from: "climate-science", to: "models" },
      { from: "models", to: "impacts", label: "projects" },
    ],
  });
  const rendered = await renderSemanticDiagram(diagram);
  assert.equal(rendered.inspection.pass, true);
  assert.deepEqual(rendered.inspection.issues, []);
  assert.match(rendered.svg, /What Is Climate Science\?/);
  assert.match(rendered.svg, /marker-end="url\(#arrow\)"/);
  assert.doesNotThrow(() => sanitizeGeneratedSvg(rendered.svg));

  assert.equal(
    semanticDiagramSchema.safeParse({
      ...diagram,
      edges: [{ from: "missing", to: "ice" }],
    }).success,
    false,
    "dangling edges must be rejected before layout",
  );

  const fallback = buildFallbackDiagram({
    prompt: "How does photosynthesis work?",
    lessonTitle: "Photosynthesis",
    lessonSummary: "Plants turn light energy into stored chemical energy.",
    lessonPoints: [],
  });
  assert.equal(semanticDiagramSchema.safeParse(fallback).success, true);
  const fallbackRendered = await renderSemanticDiagram(fallback);
  assert.equal(fallbackRendered.inspection.pass, true);
  assert.doesNotThrow(() => sanitizeGeneratedSvg(fallbackRendered.svg));
}

void checkSystematicLayout().then(() => {
  console.log("generated SVG visual smoke checks passed");
});
