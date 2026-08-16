import type { CognitiveType, SceneShape } from "@/lib/schemas/lesson";
import type { BoardAction } from "@/lib/schemas/boardActions";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { VisualPlan } from "@/lib/visuals/types";
import type { DrawCommand } from "@/lib/draw-engine/commands";

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
  | {
      type: "plan_meta";
      title: string;
      language: string;
      lessonId?: string;
      conversationId?: string;
      beatCount?: number;
      mode?: "new" | "follow_up";
    }
  | {
      type: "student_message";
      text: string;
      conversationId?: string;
    }
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
  /** Full UML JSON plan generated before drawing (reveal piece-by-piece). */
  | {
      type: "diagram_plan";
      kind: "uml";
      plan: import("@/lib/draw-engine/umlSchema").UmlDiagramPlan;
    }
  /** Interactive Three.js scene chosen by the app for this lesson. */
  | {
      type: "three_scene";
      plan: import("@/lib/three-scenes/decide").ThreeScenePlan;
    }
  /** Timed Konva draw-engine session (AI planner → client renderer). */
  | {
      type: "draw_session";
      title: string;
      canvas: { width: number; height: number };
      reset?: boolean;
      /** Scroll the board so this Y is in view (follow-up sections). */
      scrollToY?: number;
    }
  | { type: "draw_cmd"; command: DrawCommand }
  | { type: "draw_cmds"; commands: DrawCommand[]; beatId?: string }
  | {
      type: "draw_speak";
      text: string;
      t0: number;
      beatId?: string;
    }
  | { type: "narration"; text: string; beatId: string }
  | {
      type: "audio";
      beatId: string;
      mimeType: string;
      base64: string;
      /** Caption for this chunk of speech (set when a beat speaks in units). */
      text?: string;
      /** Board-clock time on the server timeline to start speaking. */
      cueT0?: number;
    }
  | { type: "human_summary"; text: string }
  | { type: "error"; message: string }
  | { type: "done"; conversationId?: string; lessonId?: string };

export type PaceSpeed = 0.75 | 1 | 1.25;
