"use client";

import dynamic from "next/dynamic";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import type { VisualPlan } from "@/lib/visuals/types";

const TutorBoard = dynamic(
  () => import("@/components/board/TutorBoard").then((m) => m.TutorBoard),
  {
    ssr: false,
    loading: () => (
      <section className="flex h-full min-h-0 items-center justify-center bg-board">
        <p className="font-sans text-sm text-muted">Preparing the board…</p>
      </section>
    ),
  },
);

type VisualStageProps = {
  plan: VisualPlan | null;
  playKey: number;
  title?: string;
  beatOrder?: number;
  totalBeats?: number;
  narrationLines?: BoardNarrationLine[];
  codeBuffer?: string;
  streaming?: boolean;
  onDrawComplete?: () => void;
};

export function VisualStage({
  plan,
  playKey,
  title,
  beatOrder,
  totalBeats,
  narrationLines,
  codeBuffer,
  streaming,
  onDrawComplete,
}: VisualStageProps) {
  return (
    <TutorBoard
      plan={plan}
      playKey={playKey}
      title={title}
      beatOrder={beatOrder}
      totalBeats={totalBeats}
      narrationLines={narrationLines}
      codeBuffer={codeBuffer}
      streaming={streaming}
      onDrawComplete={onDrawComplete}
    />
  );
}
