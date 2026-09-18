export type TutorPhase = "ask" | "transfer" | "on_track" | "stopped";

export type TutorTurn = {
  turn?: number;
  score?: number;
  kind?: string;
  method?: string;
};

export type TutorView = {
  ok?: boolean;
  sessionId?: string;
  phase?: TutorPhase;
  question?: string;
  score?: number;
  kind?: string;
  confused?: string;
  topic?: string;
  wrongModel?: string;
  rightModel?: string;
  methodLabel?: string;
  think?: string;
  message?: string;
  evidence?: string;
  onTrack?: boolean;
  visualHtml?: string;
  hasVisual?: boolean;
  transferForm?: string;
  turns?: TutorTurn[];
  error?: string;
  reset?: boolean;
};
