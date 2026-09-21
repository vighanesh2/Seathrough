import assert from "node:assert/strict";
import {
  getMode,
  listEnabledModes,
  listModesByGroup,
  listSiblingModes,
} from "../src/modes/registry";

const learning = listEnabledModes("learning");
assert.equal(learning.length, 1);
assert.equal(learning[0]?.id, "smart-tutor");
assert.equal(getMode("smart-tutor")?.href, "/smart-tutor");
assert.equal(getMode("smart-tutor")?.enabled, true);
assert.equal(getMode("smart-tutor")?.navLabel, "Smart tutor");

assert.equal(getMode("lessons")?.href, "/lessons");
assert.equal(getMode("lessons")?.enabled, false);
assert.equal(getMode("ai-tutor")?.href, "/ai-tutor");
assert.equal(getMode("ai-tutor")?.enabled, false);
assert.equal(getMode("figures-3d")?.enabled, false);
assert.equal(getMode("screenshot-explain")?.enabled, false);
assert.equal(getMode("system-design")?.enabled, false);
assert.equal(getMode("leetcode")?.enabled, false);
assert.equal(getMode("automatic-drawing")?.enabled, false);
assert.equal(getMode("draw-engine")?.enabled, false);
assert.equal(getMode("scene-explain")?.enabled, false);
assert.equal(getMode("scene-explain")?.href, "/lessons?view=3d");

const studios = listModesByGroup("studio");
assert.equal(studios.length, 1);
assert.equal(studios[0]?.id, "smart-tutor");
assert.ok(!studios.some((m) => m.id === "lessons"));
assert.ok(!studios.some((m) => m.id === "figures-3d"));
assert.ok(!studios.some((m) => m.id === "ai-tutor"));

const siblings = listSiblingModes("smart-tutor");
assert.ok(siblings.every((m) => m.id !== "smart-tutor"));
assert.equal(siblings.length, 0);
assert.ok(!listEnabledModes().some((m) => m.id === "lessons"));
assert.ok(!listEnabledModes().some((m) => m.id === "ai-tutor"));
assert.ok(!listEnabledModes().some((m) => m.id === "figures-3d"));

console.log("modes registry smoke checks passed");
