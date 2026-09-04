/**
 * Smoke: external diagram catalog matching (no esbuild).
 * Run: node scripts/smoke-diagrams.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(
  __dirname,
  "../src/lib/visuals/assets/externalDiagrams.ts",
);
const text = fs.readFileSync(file, "utf8");
const start = text.indexOf("= [");
assert.ok(start > 0, "array start");
const assets = JSON.parse(text.slice(start + 2, text.lastIndexOf("]") + 1));
assert.ok(assets.length >= 100, `pack size ${assets.length}`);

function score(prompt, asset) {
  const t = prompt.toLowerCase();
  let s = 0;
  for (const tag of asset.tags) {
    const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (tag.includes(" ")) {
      if (t.includes(tag)) s += Math.max(tag.length, 4);
    } else if (
      new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(t)
    ) {
      s += Math.max(tag.length, 4);
    }
  }
  const idPhrase = asset.id.replace(/-/g, " ");
  if (t.includes(idPhrase)) s += 14;
  return s;
}

function match(prompt, min = 6) {
  let best = null;
  let bestS = 0;
  for (const a of assets) {
    const s = score(prompt, a);
    if (s > bestS) {
      bestS = s;
      best = a;
    }
  }
  return bestS >= min ? best : null;
}

const dna = match("explain the dna double helix");
assert.ok(dna, "dna");
assert.match(dna.id, /dna|helix/i);

const ae = match("what is an autoencoder in deep learning");
assert.ok(ae, "autoencoder");
assert.match(ae.id, /autoencoder/i);

console.log(
  `diagram smoke passed (${assets.length} assets; dna=${dna.id}; ae=${ae.id})`,
);
