/**
 * Lightweight catalog smoke — no esbuild required.
 * Run: node scripts/smoke-jsxgraph-catalog.cjs
 */
const assert = require("node:assert/strict");
const catalog = require("../src/lib/topics/catalog/generated/catalog.json");

assert.equal(catalog.version, 1);
assert.ok(catalog.entries.length >= 200, "bulk share catalog imported");
assert.ok(
  !catalog.entries.some(
    (e) =>
      /assessment/i.test(e.id) ||
      /assessment/i.test(e.title) ||
      (e.tags || []).some((t) => /assessment/i.test(t)),
  ),
  "assessment examples removed",
);

const ids = new Set();
for (const entry of catalog.entries) {
  assert.ok(!ids.has(entry.id), `unique ${entry.id}`);
  ids.add(entry.id);
  assert.ok(entry.title, entry.id);
  assert.ok(entry.summary, entry.id);
  assert.ok(entry.aliases.length >= 1, entry.id);
  assert.ok(entry.steps.length >= 2, entry.id);
  assert.equal(entry.boundingBox.length, 4, entry.id);
  assert.ok(entry.source.includes("board.create"), `${entry.id} draws`);
  assert.ok(
    !/\binitBoard\b|\beval\s*\(|\brequire\s*\(|\bfetch\s*\(/.test(entry.source),
    `${entry.id} source is sandboxed`,
  );
}

function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matches(entry, prompt) {
  const blob = normalize(prompt);
  return entry.aliases.some((a) => blob.includes(normalize(a)));
}

assert.ok(
  catalog.entries.find((e) => e.id === "line-slope"),
);
assert.ok(
  catalog.entries.find((e) => e.id === "circle-geometry"),
);

console.log(
  `jsxgraph catalog smoke passed (${catalog.entries.length} entries)`,
);
