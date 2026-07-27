import type { CognitiveType, LessonBeatParsed } from "@/lib/schemas/lesson";
import type { DiagramAction } from "@/types/lesson";

export type TriggerDecision = {
  imageAction: DiagramAction;
  metaphorKey?: string;
  cognitiveType: CognitiveType;
  confidence: number;
  reason: string;
};

export type TriggerInput = {
  beat: LessonBeatParsed;
  activeMetaphorKey?: string;
  /** Full user question — used so diagrams stay relevant to the ask */
  prompt?: string;
};

export interface TriggerEngine {
  decide(input: TriggerInput): Promise<TriggerDecision>;
}
