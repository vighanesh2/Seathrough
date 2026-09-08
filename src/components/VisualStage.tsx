"use client";

import dynamic from "next/dynamic";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import type { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import type { AnatomyStructureId } from "@/lib/anatomy/types";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import type { VisualPlan } from "@/lib/visuals/types";
import type { LessonSource } from "@/types/lesson";

const TutorBoard = dynamic(
  () => import("@/components/board/TutorBoard").then((m) => m.TutorBoard),
  {
    ssr: false,
    loading: () => (
      <section className="relative flex h-full min-h-0 items-center justify-center bg-board">
        <ThinkingLoader
          variant="panel"
          label="Preparing the board"
          className="border-0 bg-transparent shadow-none"
        />
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
  sources?: LessonSource[];
  codeBuffer?: string;
  streaming?: boolean;
  onDrawComplete?: () => void;
  drawQueue?: DrawCommandQueue;
  drawSessionKey?: number;
  drawPlaying?: boolean;
  drawSpeed?: number;
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
  followUpValue?: string;
  onFollowUpChange?: (value: string) => void;
  onFollowUpSubmit?: () => void;
  followUpDisabled?: boolean;
  showFollowUp?: boolean;
};

export function VisualStage({
  plan,
  playKey,
  title,
  beatOrder,
  totalBeats,
  narrationLines,
  sources,
  codeBuffer,
  streaming,
  onDrawComplete,
  drawQueue,
  drawSessionKey,
  drawPlaying,
  drawSpeed,
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
  followUpValue,
  onFollowUpChange,
  onFollowUpSubmit,
  followUpDisabled,
  showFollowUp,
}: VisualStageProps) {
  return (
    <TutorBoard
      plan={plan}
      playKey={playKey}
      title={title}
      beatOrder={beatOrder}
      totalBeats={totalBeats}
      narrationLines={narrationLines}
      sources={sources}
      codeBuffer={codeBuffer}
      streaming={streaming}
      onDrawComplete={onDrawComplete}
      drawQueue={drawQueue}
      drawSessionKey={drawSessionKey}
      drawPlaying={drawPlaying}
      drawSpeed={drawSpeed}
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
      followUpValue={followUpValue}
      onFollowUpChange={onFollowUpChange}
      onFollowUpSubmit={onFollowUpSubmit}
      followUpDisabled={followUpDisabled}
      showFollowUp={showFollowUp}
    />
  );
}
