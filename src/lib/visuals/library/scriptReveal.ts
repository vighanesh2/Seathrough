/**
 * Map lesson beat order → how many board_script steps should be visible.
 * Prefers explicit step.beat tags; otherwise spreads steps across beats.
 */
export function revealThroughStepIndex(input: {
  steps: Array<{ beat?: number }>;
  beatOrder: number;
  /** Total beats if known; used only for untagged distribution */
  totalBeats?: number;
}): number {
  const { steps, beatOrder } = input;
  if (!steps.length || beatOrder < 1) return 0;

  const anyTagged = steps.some((s) => typeof s.beat === "number" && s.beat > 0);
  if (anyTagged) {
    let max = 0;
    for (let i = 0; i < steps.length; i++) {
      const b = steps[i]?.beat ?? 1;
      if (b <= beatOrder) max = i + 1;
    }
    return Math.max(max, 1);
  }

  const beats = Math.max(input.totalBeats ?? Math.max(steps.length, 4), 1);
  const per = Math.max(1, Math.ceil(steps.length / beats));
  return Math.min(steps.length, per * beatOrder);
}

/** Pick steps that should appear for this beat (for logging / focus). */
export function stepsForBeat<T extends { beat?: number }>(
  steps: T[],
  beatOrder: number,
): T[] {
  const through = revealThroughStepIndex({ steps, beatOrder });
  const prev = revealThroughStepIndex({ steps, beatOrder: beatOrder - 1 });
  return steps.slice(prev, through);
}
