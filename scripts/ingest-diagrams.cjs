/**
 * Pack SVGs under assets/external-diagrams/ into
 * src/lib/visuals/assets/externalDiagrams.ts for the offline visual catalog.
 *
 * Usage: npm run ingest:diagrams
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SRC_ROOT = path.join(ROOT, "assets/external-diagrams");
const OUT = path.join(ROOT, "src/lib/visuals/assets/externalDiagrams.ts");
const MAX_PATHS = 48;
const MAX_FILE_BYTES = 400_000;

function extractPaths(svgBody) {
  const paths = [];
  const re = /<path\b[^>]*\bd="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(svgBody))) {
    const d = m[1].trim();
    if (d.length > 2) paths.push(d);
    if (paths.length >= MAX_PATHS) break;
  }
  return paths;
}

/** Turn basic shape tags into path data when few/no <path> exist. */
function shapesAsPaths(svgBody) {
  const out = [];
  const circleRe =
    /<circle\b[^>]*\bcx="([^"]+)"[^>]*\bcy="([^"]+)"[^>]*\br="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = circleRe.exec(svgBody)) && out.length < MAX_PATHS) {
    const [cx, cy, r] = m.slice(1).map(Number);
    if (![cx, cy, r].every(Number.isFinite)) continue;
    // Approximate circle with two arcs
    out.push(
      `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`,
    );
  }
  const lineRe =
    /<line\b[^>]*\bx1="([^"]+)"[^>]*\by1="([^"]+)"[^>]*\bx2="([^"]+)"[^>]*\by2="([^"]+)"[^>]*>/gi;
  while ((m = lineRe.exec(svgBody)) && out.length < MAX_PATHS) {
    const [x1, y1, x2, y2] = m.slice(1).map(Number);
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
    out.push(`M ${x1} ${y1} L ${x2} ${y2}`);
  }
  const rectRe =
    /<rect\b[^>]*\bx="([^"]+)"[^>]*\by="([^"]+)"[^>]*\bwidth="([^"]+)"[^>]*\bheight="([^"]+)"[^>]*>/gi;
  while ((m = rectRe.exec(svgBody)) && out.length < MAX_PATHS) {
    const [x, y, w, h] = m.slice(1).map(Number);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue;
    out.push(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`);
  }
  return out;
}

function viewBoxOf(svgBody) {
  const m = svgBody.match(/viewBox=["']([^"']+)["']/i);
  if (m) return m[1].trim();
  const w = svgBody.match(/\bwidth=["']([0-9.]+)/i);
  const h = svgBody.match(/\bheight=["']([0-9.]+)/i);
  if (w && h) return `0 0 ${w[1]} ${h[1]}`;
  return "0 0 800 600";
}

function anchorsFromViewBox(vb) {
  const parts = vb.split(/[\s,]+/).map(Number);
  const [, , w = 800, h = 600] = parts;
  return {
    center: { x: w / 2, y: h / 2, preferredLabelSide: "bottom" },
    top: { x: w / 2, y: h * 0.1, preferredLabelSide: "top" },
    left: { x: w * 0.1, y: h / 2, preferredLabelSide: "left" },
    right: { x: w * 0.9, y: h / 2, preferredLabelSide: "right" },
    bottom: { x: w / 2, y: h * 0.9, preferredLabelSide: "bottom" },
  };
}

function titleFromId(id) {
  return id
    .replace(/^janosh-/, "")
    .replace(/^commons-/, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function tagsFromId(id, collection) {
  const base = id
    .replace(/^janosh-/, "")
    .replace(/^commons-/, "")
    .split("-")
    .filter((w) => w.length > 2);
  const phrase = base.join(" ");
  const tags = new Set();
  if (phrase.length >= 4) tags.add(phrase);
  for (const w of base) {
    if (w.length >= 4) tags.add(w);
  }
  const blob = id;
  if (/dna|helix|gene/.test(blob)) {
    ["dna", "helix", "genetics", "biology"].forEach((t) => tags.add(t));
  }
  if (/photo|chlorophyll|calvin/.test(blob)) {
    ["photosynthesis", "plant", "biology"].forEach((t) => tags.add(t));
  }
  if (/water-cycle|hydrolog/.test(blob)) {
    ["water cycle", "hydrology"].forEach((t) => tags.add(t));
  }
  if (/atom|electron|orbit/.test(blob)) {
    ["atom", "chemistry", "electron"].forEach((t) => tags.add(t));
  }
  if (/neural|neuron|synapse|brain/.test(blob)) {
    ["neuron", "brain", "nervous system", "biology"].forEach((t) => tags.add(t));
  }
  if (/circuit|ohm|resistor|voltage/.test(blob)) {
    ["circuit", "electricity", "ohm"].forEach((t) => tags.add(t));
  }
  if (/autoencoder|dropout|convolution|gan|lstm|transformer/.test(blob)) {
    ["machine learning", "neural network", "deep learning"].forEach((t) =>
      tags.add(t),
    );
  }
  if (/heart|digest|mito/.test(blob)) {
    ["anatomy", "biology"].forEach((t) => tags.add(t));
  }
  if (/lens|refraction|reflection|spectrum/.test(blob)) {
    ["optics", "light", "refraction", "reflection"].forEach((t) => tags.add(t));
  }
  if (/binary-tree|hash-table|bubble|quicksort/.test(blob)) {
    ["data structure", "algorithm", "computer science"].forEach((t) =>
      tags.add(t),
    );
  }
  if (/convex-functions|concave-functions/.test(blob)) {
    ["convex", "concave", "function"].forEach((t) => tags.add(t));
  }
  if (/fourier|bloch|quantum|spin|lattice/.test(blob)) {
    ["quantum", "physics"].forEach((t) => tags.add(t));
  }
  // Keep collection out of match tags (too broad).
  void collection;
  return [...tags].filter((t) => t.length >= 3).slice(0, 20);
}

function walkSvgs(dir, collection, acc) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      walkSvgs(full, collection, acc);
      continue;
    }
    if (!name.endsWith(".svg")) continue;
    if (st.size > MAX_FILE_BYTES) continue;
    const raw = fs.readFileSync(full, "utf8");
    let paths = extractPaths(raw);
    if (paths.length < 2) {
      paths = [...paths, ...shapesAsPaths(raw)].slice(0, MAX_PATHS);
    }
    if (paths.length < 1) continue;
    const stem = path.basename(name, ".svg");
    const id = `${collection}-${stem}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const viewBox = viewBoxOf(raw);
    acc.push({
      id,
      title: titleFromId(id),
      viewBox,
      tags: tagsFromId(id, collection),
      paths: paths.map((d, i) => ({
        id: `p${i + 1}`,
        d,
        drawOrder: i + 1,
        stroke: "#1e3a5f",
        strokeWidth: 1.4,
      })),
      anchors: anchorsFromViewBox(viewBox),
      sourceCollection: collection,
    });
  }
}

function main() {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error(
      `Missing ${path.relative(ROOT, SRC_ROOT)} — run npm run fetch:diagrams first`,
    );
    process.exit(1);
  }

  const assets = [];
  walkSvgs(path.join(SRC_ROOT, "janosh"), "janosh", assets);
  walkSvgs(path.join(SRC_ROOT, "commons"), "commons", assets);

  // Dedupe by id
  const byId = new Map();
  for (const a of assets) byId.set(a.id, a);
  const list = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  const body = `/* Auto-generated by scripts/ingest-diagrams.cjs — do not edit. */
import type { VisualAsset } from "@/lib/visuals/types";

/** Offline educational diagrams (janosh/diagrams, Wikimedia Commons, …). */
export const EXTERNAL_DIAGRAM_ASSETS: VisualAsset[] = ${JSON.stringify(list, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${body}\n`);
  console.log(
    `ingest:diagrams — wrote ${list.length} assets → ${path.relative(ROOT, OUT)}`,
  );
}

main();
