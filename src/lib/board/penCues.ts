import type { DrawCommand } from "@/lib/draw-engine/commands";

type BeatCue = {
  /** Client board time when this beat's writing starts. */
  start: number;
  /** Shift between the server's board timeline and the client's. */
  offset: number;
};

export type PenCueOptions = {
  /** Current client board clock in ms. */
  clock: () => number;
  /** Paused time belongs to the student and must not consume the budget. */
  isPaused?: () => boolean;
};

/** How long the voice will hold for the pen before giving up and speaking. */
const DEFAULT_BUDGET_MS = 6000;

/**
 * Keeps the tutor's voice on the same timeline as the pen.
 *
 * The server plans draw commands on its own board clock, but the client rebases
 * them onto whatever is already queued. This tracks that shift per beat so a
 * speech cue planned on the server can be waited for on the client.
 */
export class PenCueTracker {
  private cues = new Map<string, BeatCue>();
  private raf = 0;
  private release: (() => void) | null = null;

  constructor(private options: PenCueOptions) {}

  /** Record where a beat's writing landed after client-side rebasing. */
  registerBeat(
    beatId: string,
    planned: DrawCommand[],
    rebased: DrawCommand[],
  ): void {
    if (!beatId || !planned.length || !rebased.length) return;
    this.cues.set(beatId, {
      start: Math.min(...rebased.map((c) => c.t0)),
      offset: rebased[0]!.t0 - planned[0]!.t0,
    });
  }

  /**
   * Client board time to start speaking. Follow-up sections prefix the draw id
   * (`s<offset>-<beatId>`), so fall back to a suffix match.
   */
  cueFor(beatId: string, serverCueT0?: number): number | undefined {
    let entry = this.cues.get(beatId);
    if (!entry) {
      for (const [key, value] of this.cues) {
        if (key.endsWith(`-${beatId}`)) {
          entry = value;
          break;
        }
      }
    }
    if (!entry) return undefined;
    if (serverCueT0 == null) return entry.start;
    return Math.max(entry.start, serverCueT0 + entry.offset);
  }

  /** Resolve once the pen reaches `targetMs`, or once the budget runs out. */
  waitForPen(targetMs: number, budgetMs = DEFAULT_BUDGET_MS): Promise<void> {
    this.stopWaiting();
    if (this.options.clock() >= targetMs) return Promise.resolve();
    if (typeof requestAnimationFrame !== "function") return Promise.resolve();

    return new Promise<void>((resolve) => {
      const finish = () => {
        this.release = null;
        cancelAnimationFrame(this.raf);
        resolve();
      };
      this.release = finish;

      let budget = budgetMs;
      let last = performance.now();
      const tick = (now: number) => {
        const delta = now - last;
        last = now;
        if (!this.options.isPaused?.()) budget -= delta;
        if (this.options.clock() >= targetMs || budget <= 0) {
          finish();
          return;
        }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  /** Stop holding the voice back (skip pressed, stream aborted, unmount). */
  stopWaiting(): void {
    const release = this.release;
    this.release = null;
    if (typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this.raf);
    }
    release?.();
  }

  /** Forget every cue — used when the board is cleared for a new session. */
  reset(): void {
    this.stopWaiting();
    this.cues.clear();
  }
}
