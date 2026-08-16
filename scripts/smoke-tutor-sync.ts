import assert from "node:assert/strict";
import type { DrawCommand } from "../src/lib/draw-engine/commands";
import { PenCueTracker } from "../src/lib/board/penCues";
import { penPositionAt, resolveDrawablesAt } from "../src/lib/draw-engine/resolve";
import {
  buildSpeechUnits,
  estimateSpeechMs,
  paceCommandsToNarration,
  splitNarration,
} from "../src/lib/orchestrator/speechUnits";
import { revealThroughStepIndex } from "../src/lib/visuals/library/scriptReveal";

function text(id: string, t0: number, body: string): DrawCommand {
  return {
    id,
    type: "text",
    t0,
    durationMs: 500,
    text: body,
    x: 100,
    y: 200,
    fontSize: 20,
  };
}

// --- narration splitting -----------------------------------------------
{
  const units = splitNarration(
    "First we move the constant across. Then we divide both sides by two. That leaves x on its own.",
  );
  assert.equal(units.length, 3);
  assert.ok(units[0]!.startsWith("First"));

  assert.deepEqual(splitNarration("   "), []);
  assert.equal(splitNarration("Ok. Sure.").length, 1, "short fragments merge");

  const many = splitNarration(
    Array.from(
      { length: 9 },
      (_, i) => `This is a full length sentence number ${i} for the tutor.`,
    ).join(" "),
  );
  assert.ok(many.length <= 4, "unit count is capped");
  assert.ok(many.join(" ").includes("number 8"), "no speech is dropped");
}

// --- pacing writing to speech ------------------------------------------
{
  const cmds = [text("a", 0, "step one"), text("b", 600, "step two")];
  const narration =
    "We start by clearing the fraction on the left hand side of the equation. " +
    "Then we collect the like terms so the unknown sits alone on one side.";

  const paced = paceCommandsToNarration(cmds, narration);
  const span = paced[1]!.t0 + paced[1]!.durationMs - paced[0]!.t0;
  assert.ok(
    Math.abs(span - estimateSpeechMs(narration)) < 50,
    `writing should span the narration, got ${span}`,
  );
  assert.equal(paced[0]!.t0, 0, "the first step still starts immediately");

  // Already long enough, or nothing to spread — leave the plan alone.
  assert.equal(paceCommandsToNarration(cmds, "Hi."), cmds);
  const single = [text("a", 0, "only")];
  assert.equal(paceCommandsToNarration(single, narration), single);
  assert.equal(paceCommandsToNarration([], narration).length, 0);
}

// --- speech cues track the writing steps -------------------------------
{
  const cmds = [
    text("a", 0, "one"),
    text("b", 4000, "two"),
    text("c", 8000, "three"),
  ];
  const units = buildSpeechUnits(
    "We list the values first. Next we compare each pair. Finally we keep the largest one.",
    cmds,
    0,
  );
  assert.equal(units.length, 3);
  assert.equal(units[0]!.cueT0, 0);
  assert.equal(units[2]!.cueT0, 8000, "last sentence waits for the last step");
  assert.ok(units[1]!.cueT0 > units[0]!.cueT0);

  const noCmds = buildSpeechUnits("Just talking here for a moment.", [], 1234);
  assert.equal(noCmds[0]!.cueT0, 1234, "falls back to the beat clock");
  assert.deepEqual(buildSpeechUnits("", cmds, 0), []);
}

// --- server cue -> client clock ----------------------------------------
{
  const tracker = new PenCueTracker({ clock: () => 0 });
  const planned = [text("a", 1000, "one"), text("b", 3000, "two")];
  // Client rebased the beat to start at 5000 instead of 1000.
  const rebased = planned.map((c) => ({ ...c, t0: c.t0 + 4000 }));
  tracker.registerBeat("s400-beat-2", planned, rebased);

  assert.equal(tracker.cueFor("beat-2"), 5000, "suffix match finds the beat");
  assert.equal(tracker.cueFor("beat-2", 3000), 7000, "server cue is shifted");
  assert.equal(
    tracker.cueFor("beat-2", 0),
    5000,
    "never speak before writing starts",
  );
  assert.equal(tracker.cueFor("missing"), undefined);

  tracker.reset();
  assert.equal(tracker.cueFor("beat-2"), undefined);
}

// --- handwriting reveal + pen position ---------------------------------
{
  const cmds = [text("a", 0, "abcdefghij")];
  const mid = resolveDrawablesAt(cmds, 250);
  const midText = mid.find((d) => d.kind === "text");
  assert.ok(midText && midText.kind === "text");
  assert.ok(
    midText.text.length < 10 && midText.text.length > 0,
    "text is revealed a character at a time",
  );
  const end = resolveDrawablesAt(cmds, 600);
  const endText = end.find((d) => d.kind === "text");
  assert.ok(endText && endText.kind === "text" && endText.text === "abcdefghij");

  const penMid = penPositionAt(cmds, 250);
  assert.ok(penMid, "pen is on the board while writing");
  assert.ok(penMid.x > 100, "pen advances along the line");
  assert.equal(penPositionAt(cmds, 5000), null, "pen lifts after the last step");
  assert.equal(penPositionAt(cmds, -10), null, "pen waits for the first stroke");

  // Paced beats leave gaps between steps — the hand should rest, not vanish.
  const gapped = [text("a", 0, "first"), text("b", 6000, "second")];
  const resting = penPositionAt(gapped, 3000);
  const finished = penPositionAt(gapped, 499);
  assert.ok(resting && finished, "pen rests on the board between steps");
  assert.equal(resting.writing, false, "resting is not writing");
  assert.equal(finished.writing, true, "mid-stroke counts as writing");
  assert.deepEqual(
    { x: resting.x, y: resting.y },
    { x: finished.x, y: finished.y },
    "it rests where it stopped writing",
  );
  assert.ok(penPositionAt(gapped, 6200), "pen picks back up on the next step");
  assert.equal(penPositionAt(gapped, 9000), null, "pen lifts once the beat ends");
}

// --- the board finishes when the narration does -------------------------
{
  const steps = (tags: Array<number | undefined>) =>
    tags.map((beat) => ({ beat }));

  // Planner tagged 8 beats for a 5-beat lesson: the tail must not be stranded.
  const overTagged = steps([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(
    revealThroughStepIndex({ steps: overTagged, beatOrder: 5, totalBeats: 5 }),
    8,
    "last beat reveals every step",
  );
  assert.ok(
    revealThroughStepIndex({ steps: overTagged, beatOrder: 3, totalBeats: 5 }) >
      revealThroughStepIndex({ steps: overTagged, beatOrder: 2, totalBeats: 5 }),
    "middle beats still reveal progressively",
  );

  // Tags that fit are left alone.
  const tagged = steps([1, 1, 2, 3]);
  assert.equal(
    revealThroughStepIndex({ steps: tagged, beatOrder: 1, totalBeats: 4 }),
    2,
  );
  assert.equal(
    revealThroughStepIndex({ steps: tagged, beatOrder: 4, totalBeats: 4 }),
    4,
  );

  // Untagged scripts spread evenly and still finish.
  const untagged = steps([undefined, undefined, undefined, undefined, undefined]);
  assert.equal(
    revealThroughStepIndex({ steps: untagged, beatOrder: 6, totalBeats: 6 }),
    5,
  );
  assert.equal(revealThroughStepIndex({ steps: untagged, beatOrder: 0 }), 0);
  assert.equal(revealThroughStepIndex({ steps: [], beatOrder: 3 }), 0);
}

console.log("tutor sync smoke checks passed");
