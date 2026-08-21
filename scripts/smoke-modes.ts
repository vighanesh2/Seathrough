import assert from "node:assert/strict";
import {
  getMode,
  listEnabledModes,
  listModesByGroup,
  listSiblingModes,
} from "../src/modes/registry";

const learning = listEnabledModes("learning");
assert.ok(learning.length >= 2);
assert.equal(learning[0]?.id, "lessons");
assert.equal(getMode("lessons")?.href, "/lessons");
assert.equal(getMode("screenshot-explain")?.usesWhiteboard, true);

const studios = listModesByGroup("studio");
assert.equal(studios[0]?.id, "lessons");
assert.ok(!studios.some((m) => m.id === "system-design"));
assert.ok(studios.some((m) => m.id === "scene-explain"));
assert.equal(getMode("system-design")?.enabled, false);
assert.equal(getMode("leetcode")?.enabled, false);
assert.equal(getMode("automatic-drawing")?.enabled, false);
assert.equal(getMode("draw-engine")?.enabled, false);

const siblings = listSiblingModes("lessons");
assert.ok(siblings.every((m) => m.id !== "lessons"));
assert.ok(siblings.some((m) => m.id === "screenshot-explain"));
assert.equal(getMode("scene-explain")?.href, "/scene-explain");
assert.ok(listEnabledModes("learning").some((m) => m.id === "scene-explain"));
assert.ok(!listEnabledModes().some((m) => m.id === "system-design"));
assert.ok(!listEnabledModes().some((m) => m.id === "leetcode"));

console.log("modes registry smoke checks passed");
