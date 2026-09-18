"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/smoke-modes.ts
var import_strict = __toESM(require("node:assert/strict"));

// src/modules/automatic-drawing/mode.ts
var automaticDrawingMode = {
  id: "automatic-drawing",
  href: "/automatic-drawing",
  navLabel: "Auto Draw",
  title: "Automatic Drawing",
  description: "Prompt the whiteboard and watch a drawing plan execute.",
  kind: "tool",
  group: "lab",
  order: 100,
  enabled: false,
  badge: "lab",
  usesWhiteboard: true,
  metaTitle: "Automatic Drawing | SeeThrough",
  metaDescription: "Prompt SeeThrough\u2019s whiteboard and watch it draw automatically."
};

// src/modules/draw-engine/mode.ts
var drawEngineMode = {
  id: "draw-engine",
  href: "/draw-engine",
  navLabel: "Draw Engine",
  title: "Draw Engine",
  description: "Timed Konva command stream for board-engine experiments.",
  kind: "tool",
  group: "lab",
  order: 110,
  enabled: false,
  badge: "lab",
  usesWhiteboard: true,
  metaTitle: "Draw Engine | SeeThrough",
  metaDescription: "Client Konva draw engine fed by a timed SSE command stream."
};

// src/modules/figures-3d/mode.ts
var figures3dMode = {
  id: "figures-3d",
  href: "/3d-figures",
  navLabel: "Human anatomy",
  title: "Human anatomy",
  description: "Explore the heart, eye, brain, and kidney in 3D, then ask what a part does.",
  kind: "learning",
  group: "studio",
  order: 20,
  enabled: true,
  badge: "beta",
  usesWhiteboard: false,
  metaTitle: "Human anatomy | SeeThrough",
  metaDescription: "Explore animated heart, eye, brain, and kidney models with clear answers."
};

// src/modules/leetcode/mode.ts
var leetcodeMode = {
  id: "leetcode",
  href: "/leetcode",
  navLabel: "Coding",
  title: "Coding practice",
  description: "Paste a LeetCode-style problem and step through how it works.",
  kind: "learning",
  group: "more",
  order: 50,
  enabled: false,
  usesWhiteboard: false,
  metaTitle: "Coding practice | SeeThrough",
  metaDescription: "Step through arrays, pointers, and hash maps for coding interview practice."
};

// src/modules/lessons/mode.ts
var lessonsMode = {
  id: "lessons",
  href: "/lessons",
  navLabel: "Start a lesson",
  title: "Start a lesson",
  description: "Ask what you\u2019re stuck on. A tutor draws it on the board and talks you through it.",
  kind: "learning",
  group: "studio",
  order: 10,
  enabled: true,
  usesWhiteboard: true,
  metaTitle: "Start a lesson | SeeThrough",
  metaDescription: "Ask any topic. SeeThrough draws it on the board while it explains."
};

// src/modules/scene-explain/mode.ts
var sceneExplainMode = {
  id: "scene-explain",
  href: "/lessons?view=3d",
  navLabel: "3D scenes",
  title: "3D scene explanation",
  description: "Ask for osmosis, orbits, anything spatial. An agent builds a live 3D scene and explains it.",
  kind: "learning",
  group: "studio",
  order: 30,
  enabled: false,
  badge: "new",
  usesWhiteboard: false,
  metaTitle: "3D scene explanation | SeeThrough",
  metaDescription: "Watch any scientific process in 3D. An agent builds the scene, repairs crashes, and explains it as it plays."
};

// src/modules/screenshot-explain/mode.ts
var screenshotExplainMode = {
  id: "screenshot-explain",
  href: "/image-explain",
  navLabel: "Photo",
  title: "From a photo",
  description: "Upload homework or notes. We\u2019ll read it and teach it on the board.",
  kind: "learning",
  group: "more",
  order: 40,
  enabled: false,
  badge: "new",
  usesWhiteboard: true,
  metaTitle: "From a photo | SeeThrough",
  metaDescription: "Upload a homework screenshot and get a step-by-step whiteboard explanation."
};

// src/modules/system-design/mode.ts
var systemDesignMode = {
  id: "system-design",
  href: "/system-design",
  navLabel: "Systems",
  title: "System design",
  description: "Describe an architecture. Watch services, stores, and traffic assemble on the board.",
  kind: "learning",
  group: "studio",
  order: 20,
  enabled: false,
  usesWhiteboard: false,
  metaTitle: "System design | SeeThrough",
  metaDescription: "Describe a system \u2014 load balancers, caches, queues \u2014 and watch the architecture draw itself."
};

// src/modes/registry.ts
var ALL_MODES = [
  lessonsMode,
  systemDesignMode,
  sceneExplainMode,
  screenshotExplainMode,
  leetcodeMode,
  figures3dMode,
  automaticDrawingMode,
  drawEngineMode
];
function byOrder(a, b) {
  return a.order - b.order;
}
function listEnabledModes(kind) {
  return ALL_MODES.filter((m) => m.enabled && (kind ? m.kind === kind : true)).sort(
    byOrder
  );
}
function listModesByGroup(group) {
  return ALL_MODES.filter((m) => m.enabled && m.group === group).sort(byOrder);
}
function getMode(id) {
  return ALL_MODES.find((m) => m.id === id);
}
function listSiblingModes(currentId) {
  return listEnabledModes().filter((m) => m.id !== currentId);
}

// scripts/smoke-modes.ts
var learning = listEnabledModes("learning");
import_strict.default.ok(learning.length >= 2);
import_strict.default.equal(learning[0]?.id, "lessons");
import_strict.default.equal(getMode("lessons")?.href, "/lessons");
import_strict.default.equal(getMode("lessons")?.navLabel, "Start a lesson");
import_strict.default.equal(getMode("screenshot-explain")?.enabled, false);
import_strict.default.equal(getMode("screenshot-explain")?.usesWhiteboard, true);
var studios = listModesByGroup("studio");
import_strict.default.equal(studios[0]?.id, "lessons");
import_strict.default.ok(studios.some((m) => m.id === "figures-3d"));
import_strict.default.ok(!studios.some((m) => m.id === "system-design"));
import_strict.default.ok(!studios.some((m) => m.id === "scene-explain"));
import_strict.default.equal(getMode("figures-3d")?.enabled, true);
import_strict.default.equal(getMode("figures-3d")?.navLabel, "Human anatomy");
import_strict.default.equal(getMode("system-design")?.enabled, false);
import_strict.default.equal(getMode("leetcode")?.enabled, false);
import_strict.default.equal(getMode("automatic-drawing")?.enabled, false);
import_strict.default.equal(getMode("draw-engine")?.enabled, false);
import_strict.default.equal(getMode("scene-explain")?.enabled, false);
import_strict.default.equal(getMode("scene-explain")?.href, "/lessons?view=3d");
var siblings = listSiblingModes("lessons");
import_strict.default.ok(siblings.every((m) => m.id !== "lessons"));
import_strict.default.ok(siblings.some((m) => m.id === "figures-3d"));
import_strict.default.ok(!siblings.some((m) => m.id === "screenshot-explain"));
import_strict.default.ok(!siblings.some((m) => m.id === "scene-explain"));
import_strict.default.ok(!listEnabledModes().some((m) => m.id === "system-design"));
import_strict.default.ok(!listEnabledModes().some((m) => m.id === "leetcode"));
import_strict.default.ok(!listEnabledModes().some((m) => m.id === "scene-explain"));
import_strict.default.ok(!listEnabledModes().some((m) => m.id === "screenshot-explain"));
console.log("modes registry smoke checks passed");
