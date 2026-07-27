"use client";

import dynamic from "next/dynamic";
import type { VisualPlan } from "@/lib/visuals/types";

const TutorBoard = dynamic(
  () => import("@/components/board/TutorBoard").then((m) => m.TutorBoard),
  {
    ssr: false,
    loading: () => (
      <section className="flex h-full min-h-[280px] items-center justify-center rounded-[var(--radius-shell)] border border-board-edge bg-board">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8fa398]">
          loading board…
        </p>
      </section>
    ),
  },
);

type VisualStageProps = {
  plan: VisualPlan | null;
  playKey: number;
  title?: string;
  onDrawComplete?: () => void;
};

export function VisualStage({
  plan,
  playKey,
  title,
  onDrawComplete,
}: VisualStageProps) {
  return (
    <TutorBoard
      plan={plan}
      playKey={playKey}
      title={title}
      onDrawComplete={onDrawComplete}
    />
  );
}
