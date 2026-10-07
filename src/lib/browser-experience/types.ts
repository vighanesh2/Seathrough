import type { LessonSource } from "@/types/lesson";

export type BrowserProvider = "browserbase" | "local";

export type AnnotationKind =
  | "highlight"
  | "circle"
  | "clear"
  | "click"
  | "youtube_play"
  | "youtube_pause"
  | "youtube_seek";

export type BrowserAnnotation = {
  kind: AnnotationKind;
  /** Plain text to find on the page (preferred). */
  text?: string;
  /** CSS selector fallback when text match fails. */
  selector?: string;
  /** Optional note shown near the annotation. */
  label?: string;
  /** For youtube_seek — timestamp in seconds. */
  seconds?: number;
};

export type BrowserTeachBeat = {
  id: string;
  /** Spoken + shown narration (short). */
  speech: string;
  annotation: BrowserAnnotation;
  /** Pause after speech before next beat (ms). */
  holdMs?: number;
};

export type BrowserChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BrowserSessionPublic = {
  id: string;
  provider: BrowserProvider;
  liveViewUrl: string | null;
  /** True when the UI should poll JPEG frames (local Playwright). */
  frameStream: boolean;
  currentUrl: string;
  addressBar: string;
  status: BrowserSessionStatus;
  question: string;
  selectedSource: LessonSource | null;
  sources: LessonSource[];
  title: string | null;
  beats: BrowserTeachBeat[];
  history: BrowserChatMessage[];
  /** True when the active lesson is a YouTube walkthrough. */
  isYouTube?: boolean;
};

export type BrowserSessionStatus =
  | "idle"
  | "starting"
  | "searching"
  | "opening_search"
  | "opening_source"
  | "reading"
  | "teaching"
  | "ready"
  | "error"
  | "closed";

export type BrowserAskResult = {
  session: BrowserSessionPublic;
  beats: BrowserTeachBeat[];
  summary: string;
};

export type BrowserFollowUpResult = {
  session: BrowserSessionPublic;
  beats: BrowserTeachBeat[];
  summary: string;
};

export type BrowserStreamEvent =
  | { type: "status"; status: BrowserSessionStatus; message?: string }
  | { type: "session"; session: BrowserSessionPublic }
  | { type: "source"; source: LessonSource }
  | { type: "beats"; beats: BrowserTeachBeat[]; summary: string }
  | { type: "error"; error: string }
  | { type: "done" };
