import type { LucideIcon } from "lucide-react";
import {
  Box,
  Camera,
  Code2,
  HeartPulse,
  MessageCircleQuestion,
  PenLine,
  WandSparkles,
} from "lucide-react";
import type { ModeId } from "@/modes/types";

export type ModeUi = {
  icon: LucideIcon;
  /** One line a tired student can parse in a second. */
  hint: string;
};

export const MODE_UI: Record<ModeId, ModeUi> = {
  lessons: {
    icon: MessageCircleQuestion,
    hint: "Type what you’re stuck on. We’ll draw it step by step.",
  },
  "screenshot-explain": {
    icon: Camera,
    hint: "Snap homework or notes. We’ll read it and teach it.",
  },
  leetcode: {
    icon: Code2,
    hint: "Paste a coding problem and walk through the algorithm.",
  },
  "figures-3d": {
    icon: HeartPulse,
    hint: "Spin a 3D heart, lung, or eye, then ask what a part does.",
  },
  "automatic-drawing": {
    icon: PenLine,
    hint: "Lab: prompt a drawing and watch the board execute it.",
  },
  "draw-engine": {
    icon: WandSparkles,
    hint: "Lab: timed board commands for engine experiments.",
  },
};

export const MORE_ICON = Box;
