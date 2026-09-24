import assert from "node:assert/strict";
import {
  AGENTS,
  CREDIT_MAX,
  nextOfficeTask,
  travelMs,
  walkPath,
} from "../src/lib/developer/office";

assert.equal(walkPath("deskAda", "pm", "ada").join(">"), "hallAda>hallPm>pm");
assert.equal(walkPath("pm", "deskAda", "ada").join(">"), "hallPm>hallAda>deskAda");
assert.equal(
  walkPath("deskByte", "roomByte", "byte").join(">"),
  "hallByte>roomByte",
);
assert.equal(
  walkPath("roomAda", "deskAda", "ada").join(">"),
  "hallAda>deskAda",
);
assert.ok(travelMs({ x: 0, y: 0 }, { x: 10, y: 0 }) >= 420);
assert.equal(nextOfficeTask(0).title, nextOfficeTask(10).title);
assert.equal(AGENTS.ada.name, "Ada");
assert.ok(CREDIT_MAX > 0);

console.log("developer office smoke checks passed");
