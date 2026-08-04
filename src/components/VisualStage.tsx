"use client";

import dynamic from "next/dynamic";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import type { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import type { AnatomyStructureId } from "@/lib/anatomy/types";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
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
  drawQueue?: DrawCommandQueue;
  drawSessionKey?: number;
  drawPlaying?: boolean;
  preferDrawEngine?: boolean;
  drawSpeech?: string | null;
  canvasHeight?: number;
  scrollToY?: number | null;
  threeScene?: ThreeScenePlan | null;
  threePlaying?: boolean;
  threeSpeed?: number;
  threeSelectedStructure?: AnatomyStructureId | null;
  onThreeSelect?: (structure: AnatomyStructureId | null) => void;
  onDrawClock?: (ms: number) => void;
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
  drawQueue,
  drawSessionKey,
  drawPlaying,
  preferDrawEngine,
  drawSpeech,
  canvasHeight,
  scrollToY,
  threeScene,
  threePlaying,
  threeSpeed,
  threeSelectedStructure,
  onThreeSelect,
  onDrawClock,
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
      drawQueue={drawQueue}
      drawSessionKey={drawSessionKey}
      drawPlaying={drawPlaying}
      preferDrawEngine={preferDrawEngine}
      drawSpeech={drawSpeech}
      canvasHeight={canvasHeight}
      scrollToY={scrollToY}
      threeScene={threeScene}
      threePlaying={threePlaying}
      threeSpeed={threeSpeed}
      threeSelectedStructure={threeSelectedStructure}
      onThreeSelect={onThreeSelect}
      onDrawClock={onDrawClock}
    />
  );
}
