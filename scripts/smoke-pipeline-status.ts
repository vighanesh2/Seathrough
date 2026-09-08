import assert from "node:assert/strict";
import {
  latestPipelineEvent,
  pipelineStatusLabel,
  type PipelineRecords,
} from "../src/components/PipelineActivity";

const records: PipelineRecords = {
  research: {
    type: "pipeline_status",
    stage: "research",
    state: "completed",
    completed: 5,
    total: 5,
  },
  lesson_plan: {
    type: "pipeline_status",
    stage: "lesson_plan",
    state: "completed",
  },
  visuals: {
    type: "pipeline_status",
    stage: "visuals",
    state: "started",
  },
};

assert.equal(latestPipelineEvent(records)?.stage, "visuals");
assert.equal(
  pipelineStatusLabel(latestPipelineEvent(records)),
  "Generating the visual",
);

records.visuals = {
  type: "pipeline_status",
  stage: "visuals",
  state: "completed",
  reason: "fallback_used",
};
records.audio = {
  type: "pipeline_status",
  stage: "audio",
  state: "started",
  scope: { beatId: "b2", beatOrder: 2, totalBeats: 6 },
};

assert.equal(latestPipelineEvent(records)?.stage, "audio");
assert.equal(
  pipelineStatusLabel(latestPipelineEvent(records)),
  "Generating audio · 2 of 6",
);

records.audio = {
  ...records.audio,
  state: "failed",
  reason: "upstream_error",
  recoverable: true,
};
assert.equal(
  pipelineStatusLabel(latestPipelineEvent(records)),
  "Generating audio used a fallback",
);

console.log("pipeline activity smoke checks passed");
