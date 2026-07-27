import type { CognitiveType, SceneShape } from "@/lib/schemas/lesson";
import type { BoardAction } from "@/lib/schemas/boardActions";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { VisualPlan } from "@/lib/visuals/types";

export type BeatKind =
  | "intro"
  | "token"
  | "visual_shift"
  | "recap"
  | "human_summary";

export type DiagramAction = "none" | "generate" | "keep" | "retire";

/** @deprecated prefer DiagramAction */
export type ImageAction = DiagramAction;

export type LessonBeat = {
  id: string;
  order: number;
  kind: BeatKind;
  codeDelta?: string;
  highlight?: string;
  narration: string;
  /** @deprecated legacy icon/stroke actions */
  actions?: BoardAction[];
  /** Anchored visual plan (template / katex / mermaid / mafs / rough) */
  visual?: VisualPlan;
  metaphorKey?: string;
  cognitiveType?: CognitiveType;
  conceptKey?: string;
  sceneShape?: SceneShape;
  sceneRecipe?: SceneRecipe;
  imageAction: DiagramAction;
  imagePrompt?: string;
  paceHintMs?: number;
  pedagogyNote?: string;
};

export type LessonPlan = {
  title: string;
  language: string;
  beats: LessonBeat[];
  humanSummary: string;
};

/** @deprecated */
export type DiagramScene = {
  metaphorKey: string;
  label: string;
  shape: SceneShape;
  recipe: SceneRecipe;
};

export type StreamEvent =
  | { type: "plan_meta"; title: string; language: string; lessonId?: string }
  | { type: "beat_start"; beat: LessonBeat }
  | { type: "code_delta"; text: string }
  | {
      type: "visual";
      beatId: string;
      plan: VisualPlan;
    }
  | {
      type: "board";
      beatId: string;
      actions: BoardAction[];
    }
  | { type: "diagram"; scene: DiagramScene }
  | { type: "narration"; text: string; beatId: string }
  | {
      type: "audio";
      beatId: string;
      mimeType: string;
      base64: string;
    }
  | { type: "human_summary"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

export type PaceSpeed = 0.75 | 1 | 1.25;
