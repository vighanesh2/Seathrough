import assert from "node:assert/strict";
import { isFollowUpPrompt } from "../src/lib/browser-experience/followUp";
import { teachPlanSchema } from "../src/lib/browser-experience/schemas";
import { fallbackTeachPlan } from "../src/lib/browser-experience/teach";
import {
  verifyPageForQuestion,
  wantsDiagram,
} from "../src/lib/browser-experience/verify";
import {
  embedUrlForId,
  extractYouTubeId,
  isYouTubeEmbedUrl,
  isYouTubeWatchUrl,
  wantsYouTube,
  watchUrlWithTime,
} from "../src/lib/browser-experience/youtube";
import { getMode, listEnabledModes, listModesByGroup } from "../src/modes/registry";

assert.equal(getMode("browser-experience")?.href, "/browser");
assert.equal(getMode("browser-experience")?.enabled, true);
assert.equal(getMode("browser-experience")?.navLabel, "Browser");

const learning = listEnabledModes("learning");
assert.ok(learning.some((m) => m.id === "browser-experience"));
assert.equal(learning[0]?.id, "smart-tutor");
assert.equal(learning[1]?.id, "browser-experience");

const studios = listModesByGroup("studio");
assert.ok(studios.some((m) => m.id === "browser-experience"));

const plan = teachPlanSchema.parse({
  title: "Photosynthesis",
  summary: "Plants turn light into chemical energy.",
  beats: [
    {
      id: "b1",
      speech: "This sentence defines photosynthesis.",
      annotation: { kind: "highlight", text: "photosynthesis" },
      holdMs: 800,
    },
    {
      id: "b2",
      speech: "Circle the word chlorophyll.",
      annotation: { kind: "circle", text: "chlorophyll", label: "Pigment" },
    },
  ],
});
assert.equal(plan.beats.length, 2);
assert.equal(plan.beats[0]?.annotation.kind, "highlight");

const fallback = fallbackTeachPlan({
  question: "What is photosynthesis?",
  source: {
    id: "S1",
    title: "Photosynthesis overview",
    url: "https://www.nasa.gov/photosynthesis",
    publisher: "nasa.gov",
    excerpt: "Plants convert light energy into chemical energy.",
  },
  pageTitle: "Photosynthesis",
  pageText:
    "Photosynthesis is the process by which green plants convert light energy into chemical energy. Chlorophyll absorbs sunlight in the leaf. Carbon dioxide and water become sugar and oxygen.",
  anchors: ["Chlorophyll", "Light energy", "Carbon dioxide"],
});
assert.ok(fallback.beats.length >= 1);
assert.ok(fallback.summary.length > 0);
assert.equal(fallback.beats[0]?.annotation.text, "Chlorophyll");

assert.equal(
  isFollowUpPrompt("explain to me the part of an airplane", {
    hasReadySession: true,
    priorQuestion: "what are the part of the heart",
  }),
  false,
);
assert.equal(
  isFollowUpPrompt("why is that important?", {
    hasReadySession: true,
    priorQuestion: "what are the part of the heart",
  }),
  true,
);
assert.equal(
  isFollowUpPrompt("what about the left atrium?", {
    hasReadySession: true,
    priorQuestion: "what are the part of the heart",
  }),
  true,
);

assert.equal(wantsDiagram("explain the diagram of the brain and its parts"), true);

const goodBrain = verifyPageForQuestion(
  "explain the diagram of the brain and its parts",
  {
    title: "Brain Basics: Know Your Brain",
    url: "https://www.ninds.nih.gov/brain",
    text: "The brain is divided into the forebrain, midbrain, and hindbrain. The cerebellum coordinates movement. ".repeat(
      8,
    ),
    anchors: ["Forebrain", "Midbrain", "Hindbrain", "Cerebellum", "Brain stem"],
    hasLargeFigure: true,
  },
);
assert.equal(goodBrain.ok, true);

const thinOffTopic = verifyPageForQuestion(
  "explain the diagram of the brain and its parts",
  {
    title: "Airplane wings",
    url: "https://example.com/plane",
    text: "Wings generate lift for flight.",
    anchors: ["Wing", "Fuselage"],
    hasLargeFigure: false,
  },
);
assert.equal(thinOffTopic.ok, false);

assert.equal(wantsYouTube("explain this on youtube: photosynthesis"), true);
assert.equal(wantsYouTube("watch a video about the brain"), true);
assert.equal(wantsYouTube("explain the diagram of the brain"), false);
assert.equal(
  isYouTubeWatchUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
  true,
);
assert.equal(isYouTubeWatchUrl("https://youtu.be/dQw4w9WgXcQ"), true);
assert.equal(isYouTubeWatchUrl("https://www.youtube.com/results?search_query=x"), false);
assert.equal(
  watchUrlWithTime("https://www.youtube.com/watch?v=dQw4w9WgXcQ", 42),
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
);
assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.ok(isYouTubeEmbedUrl(embedUrlForId("dQw4w9WgXcQ", 12)));
assert.ok(embedUrlForId("dQw4w9WgXcQ", 12).includes("start=12"));

const clickPlan = teachPlanSchema.parse({
  title: "Expand section",
  summary: "Open the accordion then explain.",
  beats: [
    {
      id: "b1",
      speech: "I'll open this section.",
      annotation: { kind: "click", text: "Show more" },
      holdMs: 1000,
    },
    {
      id: "b2",
      speech: "Here is the detail that was hidden.",
      annotation: { kind: "highlight", text: "mitochondria" },
    },
  ],
});
assert.equal(clickPlan.beats[0]?.annotation.kind, "click");

const ytPlan = teachPlanSchema.parse({
  title: "YouTube photosynthesis",
  summary: "Play, seek, pause, explain.",
  beats: [
    {
      id: "b1",
      speech: "Starting the video.",
      annotation: { kind: "youtube_play" },
      holdMs: 1200,
    },
    {
      id: "b2",
      speech: "Pause here — this is the light reaction.",
      annotation: { kind: "youtube_seek", seconds: 45, label: "45s" },
      holdMs: 1400,
    },
    {
      id: "b3",
      speech: "One more key moment.",
      annotation: { kind: "youtube_pause" },
    },
  ],
});
assert.equal(ytPlan.beats[1]?.annotation.seconds, 45);
assert.equal(ytPlan.beats[0]?.annotation.kind, "youtube_play");

console.log("browser-experience smoke checks passed");
