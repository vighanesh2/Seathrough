export type AgentId = "ada" | "byte";
export type AgentPhase =
  | "desk"
  | "to-pm"
  | "asking"
  | "to-desk"
  | "working"
  | "to-room"
  | "sleeping"
  | "to-desk-from-room";

export type SpotId =
  | "deskAda"
  | "deskByte"
  | "pm"
  | "roomAda"
  | "roomByte"
  | "hallAda"
  | "hallByte"
  | "hallPm";

export type Point = { x: number; y: number };

export type OfficeTask = {
  id: string;
  title: string;
  detail: string;
  cost: number;
};

export const CREDIT_MAX = 48;
export const CREDIT_RESET_MS = 50_000;
export const CREDIT_STORAGE_KEY = "seethrough-office-credits";

export const SPOTS: Record<SpotId, Point> = {
  deskAda: { x: 22, y: 74 },
  deskByte: { x: 46, y: 74 },
  pm: { x: 82, y: 70 },
  roomAda: { x: 16, y: 18 },
  roomByte: { x: 40, y: 18 },
  hallAda: { x: 22, y: 48 },
  hallByte: { x: 46, y: 48 },
  hallPm: { x: 82, y: 48 },
};

export const AGENTS: Record<
  AgentId,
  {
    id: AgentId;
    name: string;
    role: string;
    desk: SpotId;
    room: SpotId;
    hall: SpotId;
    hue: string;
    accent: string;
  }
> = {
  ada: {
    id: "ada",
    name: "Ada",
    role: "Agent",
    desk: "deskAda",
    room: "roomAda",
    hall: "hallAda",
    hue: "#2b5f8a",
    accent: "#7eb4e0",
  },
  byte: {
    id: "byte",
    name: "Byte",
    role: "Agent",
    desk: "deskByte",
    room: "roomByte",
    hall: "hallByte",
    hue: "#b5523a",
    accent: "#f0a07a",
  },
};

export const PM = {
  name: "Brief",
  role: "Project manager",
  hue: "#3a3f4a",
};

const TASK_POOL: Omit<OfficeTask, "id">[] = [
  { title: "Fix board overlap", detail: "Keep labels off the graph.", cost: 7 },
  { title: "Wire lesson titles", detail: "Name videos from the prompt.", cost: 6 },
  { title: "Harden screen record", detail: "Keep every WebM chunk.", cost: 8 },
  { title: "Quiz after teaching", detail: "Always ask one check.", cost: 5 },
  { title: "Secant vs tangent", detail: "Draw y = x² with both lines.", cost: 9 },
  { title: "Dashboard player", detail: "Play saved lessons inline.", cost: 6 },
  { title: "Credit sleep loop", detail: "Agents rest when the pool is empty.", cost: 7 },
  { title: "Hide tldraw chrome", detail: "Board only, no editor clutter.", cost: 5 },
  { title: "Voice-to-text answers", detail: "Mic into the check question.", cost: 8 },
  { title: "Boxes loader", detail: "Wait state while the board thinks.", cost: 4 },
];

export function nextOfficeTask(index: number): OfficeTask {
  const item = TASK_POOL[index % TASK_POOL.length]!;
  return { ...item, id: `${index}-${item.title}` };
}

export function walkPath(
  from: SpotId,
  to: SpotId,
  agent: AgentId,
): SpotId[] {
  if (from === to) return [to];
  const hall = AGENTS[agent].hall;
  const desk = AGENTS[agent].desk;
  const room = AGENTS[agent].room;

  if (from === desk && to === "pm") return [hall, "hallPm", "pm"];
  if (from === "pm" && to === desk) return ["hallPm", hall, desk];
  if (from === desk && to === room) return [hall, room];
  if (from === room && to === desk) return [hall, desk];
  if (from === "pm" && to === room) return ["hallPm", hall, room];
  if (from === room && to === "pm") return [hall, "hallPm", "pm"];
  if (from === hall && to === "pm") return ["hallPm", "pm"];
  return [to];
}

export function travelMs(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.max(420, Math.round(Math.hypot(dx, dy) * 28));
}

export function loadCredits(): number {
  if (typeof window === "undefined") return CREDIT_MAX;
  const raw = window.localStorage.getItem(CREDIT_STORAGE_KEY);
  const value = raw ? Number(raw) : CREDIT_MAX;
  if (!Number.isFinite(value)) return CREDIT_MAX;
  return Math.min(CREDIT_MAX, Math.max(0, Math.round(value)));
}

export function saveCredits(value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CREDIT_STORAGE_KEY, String(value));
}

export function formatReset(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
