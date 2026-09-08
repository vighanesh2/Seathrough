/**
 * Pack scripts/jsxgraph-sources/<id>/meta.json + body.js into
 * src/lib/topics/catalog/generated/catalog.json.
 *
 * Usage: npm run ingest:jsxgraph
 *
 * Add a new example by dropping a folder with meta.json + body.js —
 * no TypeScript drawer required.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SOURCES = path.join(__dirname, "jsxgraph-sources");
const OUT_DIR = path.join(ROOT, "src/lib/topics/catalog/generated");
const OUT_FILE = path.join(OUT_DIR, "catalog.json");

const ID_RE = /^[a-z][a-z0-9-]*$/;

/** Ban patterns that would break out of the construction sandbox. */
const FORBIDDEN = [
  /\binitBoard\b/,
  /\bfreeBoard\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\.cookie\b/,
  /\bwindow\s*\./,
  /\bglobalThis\b/,
  // Node process — avoid matching words like "logistic process"
  /\bprocess\s*\./,
  /\b__dirname\b/,
  /\b__filename\b/,
];

function fail(message) {
  console.error(`ingest:jsxgraph — ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`invalid JSON in ${file}: ${error.message}`);
  }
}

function validateSource(id, source) {
  if (!source.trim()) fail(`${id}: body.js is empty`);
  if (source.length > 50_000) fail(`${id}: body.js too large`);
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) {
      fail(`${id}: body.js contains forbidden pattern ${pattern}`);
    }
  }
}

function loadEntry(dirName) {
  const dir = path.join(SOURCES, dirName);
  const metaPath = path.join(dir, "meta.json");
  const bodyPath = path.join(dir, "body.js");
  if (!fs.existsSync(metaPath) || !fs.existsSync(bodyPath)) {
    fail(`${dirName}: needs both meta.json and body.js`);
  }

  const meta = readJson(metaPath);
  const source = fs.readFileSync(bodyPath, "utf8");

  if (!meta.id || !ID_RE.test(meta.id)) {
    fail(`${dirName}: meta.id must be a lowercase slug`);
  }
  if (meta.id !== dirName) {
    fail(`${dirName}: folder name must match meta.id ("${meta.id}")`);
  }
  if (!Array.isArray(meta.aliases) || meta.aliases.length < 1) {
    fail(`${dirName}: needs at least one alias`);
  }
  if (!Array.isArray(meta.steps) || meta.steps.length < 2) {
    fail(`${dirName}: needs at least two steps`);
  }
  if (!Array.isArray(meta.boundingBox) || meta.boundingBox.length !== 4) {
    fail(`${dirName}: boundingBox must be [left, top, right, bottom]`);
  }

  validateSource(meta.id, source);

  return {
    id: meta.id,
    title: String(meta.title || "").trim(),
    summary: String(meta.summary || "").trim(),
    formula: String(meta.formula || ""),
    aliases: meta.aliases.map(String),
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    boundingBox: meta.boundingBox,
    keepAspectRatio: meta.keepAspectRatio !== false,
    steps: meta.steps,
    ...(meta.sourceUrl ? { sourceUrl: String(meta.sourceUrl) } : {}),
    source,
  };
}

function main() {
  if (!fs.existsSync(SOURCES)) {
    fail(`missing sources folder: ${SOURCES}`);
  }

  const dirs = fs
    .readdirSync(SOURCES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  if (!dirs.length) fail("no example folders in scripts/jsxgraph-sources");

  const entries = dirs.map(loadEntry);
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) fail(`duplicate id: ${entry.id}`);
    ids.add(entry.id);
    if (!entry.title) fail(`${entry.id}: missing title`);
    if (!entry.summary) fail(`${entry.id}: missing summary`);
  }

  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(
    `ingest:jsxgraph — wrote ${entries.length} entries → ${path.relative(ROOT, OUT_FILE)}`,
  );
}

main();
