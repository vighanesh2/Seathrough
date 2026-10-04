import {
  SYSTEM_DESIGN_SECTION_IDS,
  type SystemDesignSectionId,
} from "@/lib/experiment/systemDesign/sections";

/**
 * The system design as data. Every diagram on the board is compiled from this,
 * so an edit to the spec is an edit to every diagram that shows it.
 */

export const STACK_KEYS = [
  "cloud",
  "compute",
  "database",
  "cache",
  "queue",
  "realtime",
  "auth",
  "storage",
  "cdn",
  "observability",
] as const;

export type StackKey = (typeof STACK_KEYS)[number];
export type DesignStack = Partial<Record<StackKey, string>>;

export const STACK_LABELS: Record<StackKey, string> = {
  cloud: "Cloud",
  compute: "Compute",
  database: "Database",
  cache: "Cache",
  queue: "Queue",
  realtime: "Realtime",
  auth: "Auth",
  storage: "Storage",
  cdn: "CDN",
  observability: "Observability",
};

export const BOX_COLUMNS = ["client", "edge", "service", "data"] as const;
export type BoxColumn = (typeof BOX_COLUMNS)[number];

export type DesignBox = {
  id: string;
  label: string;
  column: BoxColumn;
};

export type DesignArrow = {
  from: string;
  to: string;
  label?: string;
};

export type DesignTable = {
  id: string;
  name: string;
  fields: string[];
  /** Box id of the store that holds this table. Defaults to the primary database. */
  store?: string;
};

export type DesignStep = {
  from: string;
  to: string;
  label: string;
};

export type DesignPoint = {
  /** Box id this point is about. */
  target?: string;
  label: string;
  then?: string;
};

export type DesignGroup = {
  id: string;
  label: string;
  members: string[];
};

export const POINT_SECTIONS = [
  "scaling",
  "reliability",
  "security",
  "observability",
] as const;
export type PointSectionId = (typeof POINT_SECTIONS)[number];

export type DesignSection = {
  id: SystemDesignSectionId;
  say: string;
  example: string;
};

export type SystemDesignSpec = {
  title: string;
  stack: DesignStack;
  sections: DesignSection[];
  boxes: DesignBox[];
  arrows: DesignArrow[];
  tables: DesignTable[];
  flow: DesignStep[];
  points: Record<PointSectionId, DesignPoint[]>;
  deployment: DesignGroup[];
};

export const SPEC_LIMITS = {
  boxes: 12,
  arrows: 18,
  tables: 6,
  fields: 8,
  flow: 8,
  points: 4,
  groups: 4,
  members: 6,
  boxLabel: 24,
  arrowLabel: 18,
  stackValue: 32,
  tableName: 24,
  field: 28,
  stepLabel: 24,
  pointLabel: 40,
  groupLabel: 28,
  say: 600,
  example: 900,
  title: 80,
} as const;

/** Past edit requests sent with each revision, oldest dropped first. */
export const MAX_EDIT_HISTORY = 12;

export const ARTIFACT_SECTIONS: SystemDesignSectionId[] = [
  "architecture",
  "data-model",
  "flows",
];

export function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function clipBlock(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r/g, "").trim().slice(0, max);
}

export function slug(value: unknown, fallback = ""): string {
  const cleaned = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
    .replace(/-$/, "");
  return cleaned || fallback;
}

export function uniqueId(base: string, seen: Set<string>): string {
  let id = base;
  for (let n = 2; seen.has(id); n += 1) {
    id = `${base.slice(0, 20).replace(/-$/, "")}-${n}`;
  }
  seen.add(id);
  return id;
}

/** A label that names nothing: N/A, none, not applicable, and the same words with punctuation. */
export function isPlaceholderLabel(label: string): boolean {
  const words = label
    .replace(/[\uFF0F\u2044\u2215]/g, "/")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!words || words === "/" || words === "...") return true;
  return /^(n\/?a|na|none|null|nil|tbd|todo|unknown|placeholder|not applicable|not needed|nothing|unused|skip|empty|no storage|no object storage)$/.test(
    words,
  );
}

export function columnFor(label: string, hinted?: unknown): BoxColumn {
  if (typeof hinted === "string" && (BOX_COLUMNS as readonly string[]).includes(hinted)) {
    return hinted as BoxColumn;
  }
  if (/\b(client|browser|app|mobile|user)\b/i.test(label)) return "client";
  if (/\b(cdn|waf|load balancer|gateway|internet|lb)\b/i.test(label)) return "edge";
  if (
    /\b(postgres|mysql|sql|database|db|mongo|redis|cache|s3|blob|object|store|queue|kafka|dynamo|supabase|firestore)\b/i.test(
      label,
    )
  ) {
    return "data";
  }
  return "service";
}

function records(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
  );
}

function readStack(raw: unknown): DesignStack {
  const stack: DesignStack = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return stack;
  const rec = raw as Record<string, unknown>;
  for (const key of STACK_KEYS) {
    const value = clip(rec[key], SPEC_LIMITS.stackValue);
    if (value && !isPlaceholderLabel(value)) stack[key] = value;
  }
  return stack;
}

function readBoxes(raw: unknown): DesignBox[] {
  const boxes: DesignBox[] = [];
  const seen = new Set<string>();
  for (const rec of records(raw)) {
    const label = clip(rec.label ?? rec.name, SPEC_LIMITS.boxLabel);
    if (!label || isPlaceholderLabel(label)) continue;
    const id = uniqueId(slug(rec.id ?? label, `box-${boxes.length + 1}`), seen);
    boxes.push({ id, label, column: columnFor(label, rec.column) });
    if (boxes.length >= SPEC_LIMITS.boxes) break;
  }
  return boxes;
}

function readArrows(raw: unknown, ids: Set<string>): DesignArrow[] {
  const arrows: DesignArrow[] = [];
  for (const rec of records(raw)) {
    const from = slug(rec.from);
    const to = slug(rec.to);
    if (!from || !to || from === to || !ids.has(from) || !ids.has(to)) continue;
    const label = clip(rec.label, SPEC_LIMITS.arrowLabel);
    if (arrows.some((arrow) => arrow.from === from && arrow.to === to && (arrow.label ?? "") === label)) {
      continue;
    }
    arrows.push({ from, to, ...(label ? { label } : {}) });
    if (arrows.length >= SPEC_LIMITS.arrows) break;
  }
  return arrows;
}

function readTables(raw: unknown, ids: Set<string>): DesignTable[] {
  const tables: DesignTable[] = [];
  const seen = new Set<string>();
  for (const rec of records(raw)) {
    const name = clip(rec.name ?? rec.title ?? rec.label, SPEC_LIMITS.tableName);
    if (!name || isPlaceholderLabel(name)) continue;
    const id = uniqueId(slug(rec.id ?? name, `table-${tables.length + 1}`), seen);
    const fields = (Array.isArray(rec.fields) ? rec.fields : [])
      .map((field) => clip(field, SPEC_LIMITS.field))
      .filter(Boolean)
      .slice(0, SPEC_LIMITS.fields);
    const store = slug(rec.store);
    tables.push({ id, name, fields, ...(store && ids.has(store) ? { store } : {}) });
    if (tables.length >= SPEC_LIMITS.tables) break;
  }
  return tables;
}

function readFlow(raw: unknown, ids: Set<string>): DesignStep[] {
  const steps: DesignStep[] = [];
  for (const rec of records(raw)) {
    const from = slug(rec.from);
    const to = slug(rec.to);
    if (!from || !to || from === to || !ids.has(from) || !ids.has(to)) continue;
    const label = clip(rec.label, SPEC_LIMITS.stepLabel) || "call";
    steps.push({ from, to, label });
    if (steps.length >= SPEC_LIMITS.flow) break;
  }
  return steps;
}

function readPoints(raw: unknown, ids: Set<string>): DesignPoint[] {
  const points: DesignPoint[] = [];
  for (const rec of records(raw)) {
    const label = clip(rec.label, SPEC_LIMITS.pointLabel);
    if (!label || isPlaceholderLabel(label)) continue;
    const target = slug(rec.target);
    const then = clip(rec.then, SPEC_LIMITS.pointLabel);
    points.push({
      label,
      ...(target && ids.has(target) ? { target } : {}),
      ...(then && !isPlaceholderLabel(then) ? { then } : {}),
    });
    if (points.length >= SPEC_LIMITS.points) break;
  }
  return points;
}

function readPointMap(raw: unknown, ids: Set<string>): Record<PointSectionId, DesignPoint[]> {
  const rec =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    POINT_SECTIONS.map((id) => [id, readPoints(rec[id], ids)]),
  ) as Record<PointSectionId, DesignPoint[]>;
}

function readGroups(raw: unknown, ids: Set<string>): DesignGroup[] {
  const groups: DesignGroup[] = [];
  const seen = new Set<string>();
  for (const rec of records(raw)) {
    const label = clip(rec.label ?? rec.name, SPEC_LIMITS.groupLabel);
    if (!label || isPlaceholderLabel(label)) continue;
    const id = uniqueId(slug(rec.id ?? label, `group-${groups.length + 1}`), seen);
    const members = [
      ...new Set(
        (Array.isArray(rec.members) ? rec.members : [])
          .map((member) => slug(member))
          .filter((member) => ids.has(member)),
      ),
    ].slice(0, SPEC_LIMITS.members);
    groups.push({ id, label, members });
    if (groups.length >= SPEC_LIMITS.groups) break;
  }
  return groups;
}

function readSections(raw: unknown): DesignSection[] {
  const byId = new Map<SystemDesignSectionId, DesignSection>();
  for (const rec of records(raw)) {
    const id = String(rec.id ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") as SystemDesignSectionId;
    if (!SYSTEM_DESIGN_SECTION_IDS.includes(id) || byId.has(id)) continue;
    const example = clipBlock(rec.example ?? rec.artifact, SPEC_LIMITS.example);
    byId.set(id, {
      id,
      say: clip(rec.say ?? rec.summary, SPEC_LIMITS.say),
      example: isPlaceholderLabel(example) ? "" : example,
    });
  }
  return SYSTEM_DESIGN_SECTION_IDS.map(
    (id) => byId.get(id) ?? { id, say: "", example: "" },
  );
}

/**
 * Reads model output or a spec sent back by the client. Idempotent: a parsed
 * spec parses to itself, so it doubles as the validator after an edit.
 */
export function parseSystemDesignSpec(raw: unknown): SystemDesignSpec {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const boxes = readBoxes(obj.boxes ?? obj.nodes);
  const ids = new Set(boxes.map((box) => box.id));
  return {
    title: clip(obj.title, SPEC_LIMITS.title) || "System design",
    stack: readStack(obj.stack),
    sections: readSections(obj.sections),
    boxes,
    arrows: readArrows(obj.arrows ?? obj.edges, ids),
    tables: readTables(obj.tables, ids),
    flow: readFlow(obj.flow, ids),
    points: readPointMap(obj.points, ids),
    deployment: readGroups(obj.deployment, ids),
  };
}

/** Sections whose text is missing. A design with these gaps is not shown. */
export function designGaps(spec: SystemDesignSpec): SystemDesignSectionId[] {
  return spec.sections
    .filter((section) => {
      if (!section.say) return true;
      if (ARTIFACT_SECTIONS.includes(section.id) && !section.example) return true;
      return false;
    })
    .map((section) => section.id);
}

/** Sections whose diagram has nothing to draw. Worth one repair, not fatal. */
export function structureGaps(spec: SystemDesignSpec): SystemDesignSectionId[] {
  const gaps: SystemDesignSectionId[] = [];
  if (spec.boxes.length < 2) gaps.push("architecture");
  if (!spec.tables.length) gaps.push("data-model");
  if (!spec.flow.length) gaps.push("flows");
  for (const id of POINT_SECTIONS) {
    if (!spec.points[id].length) gaps.push(id);
  }
  if (!spec.deployment.length) gaps.push("deployment");
  return gaps;
}

/** Fills only what is missing. Never overwrites a section or structure that exists. */
export function applyDesignRepair(
  spec: SystemDesignSpec,
  repair: unknown,
): SystemDesignSpec {
  const raw =
    repair && typeof repair === "object" ? (repair as Record<string, unknown>) : {};
  const next: SystemDesignSpec = structuredClone(spec);
  const patchSections = readSections(raw.sections);
  for (const section of patchSections) {
    const current = next.sections.find((item) => item.id === section.id);
    if (!current) continue;
    if (!current.say && section.say) current.say = section.say;
    if (!current.example && section.example) current.example = section.example;
  }
  if (next.boxes.length < 2) {
    const boxes = readBoxes(raw.boxes);
    if (boxes.length >= 2) {
      next.boxes = boxes;
      next.arrows = readArrows(raw.arrows, new Set(boxes.map((box) => box.id)));
    }
  }
  const ids = new Set(next.boxes.map((box) => box.id));
  if (!next.tables.length) next.tables = readTables(raw.tables, ids);
  if (!next.flow.length) next.flow = readFlow(raw.flow, ids);
  const points = readPointMap(raw.points, ids);
  for (const id of POINT_SECTIONS) {
    if (!next.points[id].length) next.points[id] = points[id];
  }
  if (!next.deployment.length) next.deployment = readGroups(raw.deployment, ids);
  return parseSystemDesignSpec(next);
}

/** CDN and WAF belong in front only for a large or public audience. */
export function needsCdnWaf(scale: string): boolean {
  const text = scale.toLowerCase();
  if (/\b(few thousand|hundreds|small|team|prototype|startup|personal|internal)\b/.test(text)) {
    return false;
  }
  return /\b(million|billion|global|worldwide|internet|public|ddos|viral|100k|thousands)\b/.test(
    text,
  );
}

/** Compact text form of the spec for a prompt. */
export function specForPrompt(spec: SystemDesignSpec): string {
  return JSON.stringify(spec);
}
