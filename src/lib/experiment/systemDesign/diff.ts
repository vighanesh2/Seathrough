import type { ExperimentBeat, ExperimentLesson } from "@/lib/experiment/scene";

export function sheetKey(beat: ExperimentBeat, index: number): string {
  return beat.sheet ?? `beat-${index}`;
}

function byKey(lesson: ExperimentLesson): Map<string, ExperimentBeat> {
  return new Map(lesson.beats.map((beat, index) => [sheetKey(beat, index), beat]));
}

/**
 * Sheets that differ between two compiled designs. `shapes` changed means the
 * board must redraw that sheet; `text` changed means only the script did.
 */
export function changedSheets(
  before: ExperimentLesson,
  after: ExperimentLesson,
): { shapes: string[]; text: string[] } {
  const old = byKey(before);
  const shapes: string[] = [];
  const text: string[] = [];
  after.beats.forEach((beat, index) => {
    const key = sheetKey(beat, index);
    const prev = old.get(key);
    if (!prev || JSON.stringify(prev.shapes) !== JSON.stringify(beat.shapes)) shapes.push(key);
    if (!prev || prev.say !== beat.say || (prev.example ?? "") !== (beat.example ?? "")) {
      text.push(key);
    }
  });
  return { shapes, text };
}

/** Boxes in a redrawn sheet that are new or relabeled, so the board can point them out. */
export function freshNodeIds(before: ExperimentBeat | undefined, after: ExperimentBeat): string[] {
  const old = new Map(
    (before?.shapes ?? []).flatMap((shape) =>
      shape.type === "geo" ? [[shape.id, shape.label ?? ""] as const] : [],
    ),
  );
  return after.shapes.flatMap((shape) =>
    shape.type === "geo" && old.get(shape.id) !== (shape.label ?? "") ? [shape.id] : [],
  );
}
