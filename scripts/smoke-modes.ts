import assert from "node:assert/strict";
import {
  getMode,
  listEnabledModes,
  listSiblingModes,
} from "../src/modes/registry";

const learning = listEnabledModes("learning");
assert.ok(learning.length >= 4);
assert.equal(learning[0]?.id, "lessons");
assert.equal(getMode("lessons")?.href, "/lessons");
assert.equal(getMode("screenshot-explain")?.usesWhiteboard, true);

const siblings = listSiblingModes("lessons");
assert.ok(siblings.every((m) => m.id !== "lessons"));
assert.ok(siblings.some((m) => m.id === "screenshot-explain"));

console.log("modes registry smoke checks passed");
