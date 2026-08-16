/**
 * Map lesson beat order → how many board_script steps should be visible.
 * Prefers explicit step.beat tags; otherwise spreads steps across beats.
 */
export function revealThroughStepIndex(input: {
  steps: Array<{ beat?: number }>;
  beatOrder: number;
  /** Total beats if known; keeps the board finishing with the narration. */
  totalBeats?: number;
}): number {
  const { steps, beatOrder, totalBeats } = input;
  if (!steps.length || beatOrder < 1) return 0;

  // The board must be complete once the tutor stops talking, whatever the
  // planner tagged — otherwise the last beats narrate over a half-written board.
  if (totalBeats && beatOrder >= totalBeats) return steps.length;

  const anyTagged = steps.some((s) => typeof s.beat === "number" && s.beat > 0);
  if (anyTagged) {
    let maxTag = 1;
    for (const step of steps) {
      const b = step.beat;
      if (typeof b === "number" && b > maxTag) maxTag = b;
    }
    // Planners often tag more beats than the lesson actually has; squeeze the
    // tags back into range instead of stranding the tail steps.
    const scale = totalBeats && maxTag > totalBeats ? totalBeats / maxTag : 1;

    let max = 0;
    for (let i = 0; i < steps.length; i++) {
      const tag = steps[i]?.beat ?? 1;
      const effective = scale < 1 ? Math.ceil(tag * scale) : tag;
      if (effective <= beatOrder) max = i + 1;
    }
    return Math.max(max, 1);
  }

  const beats = Math.max(totalBeats ?? Math.max(steps.length, 4), 1);
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
