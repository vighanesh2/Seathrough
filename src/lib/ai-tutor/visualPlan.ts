export const TUTOR_VISUAL_GENRES = [
  "stack",
  "flow",
  "map",
  "conservation",
  "comparison-over-time",
  "sourced-diagram",
] as const;

export type TutorVisualGenre = (typeof TUTOR_VISUAL_GENRES)[number];

export type StackFrameStatus = "waiting" | "active" | "done";

export type StackFrame = {
  id?: string;
  label: string;
  status: StackFrameStatus;
  detail: string;
  result?: string;
  n?: number;
};

export type TutorVisualBeat = {
  caption: string;
  highlight?: "call" | "base" | "return";
  frames?: StackFrame[];
  active?: number;
  tokenAt?: number;
  progress?: number;
  stages?: string[];
  stores?: { name: string; amount: number }[];
  traces?: { name: string; values: number[]; full?: number[] }[];
  tick?: number;
  regions?: { name: string; on: boolean }[];
};

export type TutorVisualPlan = {
  genre: TutorVisualGenre | string;
  title: string;
  example?: { fn?: string; n?: number; label?: string };
  code?: string;
  beats: TutorVisualBeat[];
  stages?: string[];
  imageUrl?: string;
  imageCredit?: string;
};

export function isTutorVisualPlan(value: unknown): value is TutorVisualPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as TutorVisualPlan;
  return Boolean(plan.genre && Array.isArray(plan.beats) && plan.beats.length > 0);
}
