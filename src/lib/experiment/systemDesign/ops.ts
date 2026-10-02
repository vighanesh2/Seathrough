import {
  SYSTEM_DESIGN_SECTION_IDS,
  type SystemDesignSectionId,
} from "@/lib/experiment/systemDesign/sections";
import {
  BOX_COLUMNS,
  POINT_SECTIONS,
  SPEC_LIMITS,
  STACK_KEYS,
  clip,
  clipBlock,
  isPlaceholderLabel,
  parseSystemDesignSpec,
  slug,
  type BoxColumn,
  type DesignGroup,
  type DesignPoint,
  type DesignStep,
  type PointSectionId,
  type StackKey,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";

export type DesignOp =
  | { op: "setTitle"; title: string }
  | { op: "setStack"; key: StackKey; value: string }
  | { op: "upsertBox"; id: string; label?: string; column?: BoxColumn }
  | { op: "removeBox"; id: string; replaceWith?: string }
  | { op: "addArrow"; from: string; to: string; label?: string }
  | { op: "removeArrow"; from: string; to: string }
  | { op: "upsertTable"; id: string; name?: string; fields?: string[]; store?: string }
  | { op: "removeTable"; id: string }
  | { op: "setFlow"; steps: DesignStep[] }
  | { op: "setPoints"; section: PointSectionId; points: DesignPoint[] }
  | { op: "setDeployment"; groups: DesignGroup[] }
  | { op: "setSection"; id: SystemDesignSectionId; say?: string; example?: string };

const MAX_OPS = 40;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseOne(rec: Record<string, unknown>): DesignOp | string {
  const kind = str(rec.op);
  switch (kind) {
    case "setTitle": {
      const title = clip(rec.title, SPEC_LIMITS.title);
      return title ? { op: kind, title } : "setTitle needs a title";
    }
    case "setStack": {
      const key = str(rec.key) as StackKey;
      if (!STACK_KEYS.includes(key)) return `unknown stack key "${str(rec.key)}"`;
      return { op: kind, key, value: clip(rec.value, SPEC_LIMITS.stackValue) };
    }
    case "upsertBox": {
      const id = slug(rec.id ?? rec.label);
      if (!id) return "upsertBox needs an id";
      const label = clip(rec.label, SPEC_LIMITS.boxLabel);
      if (label && isPlaceholderLabel(label)) return `"${label}" is not a component`;
      const column = str(rec.column) as BoxColumn;
      return {
        op: kind,
        id,
        ...(label ? { label } : {}),
        ...((BOX_COLUMNS as readonly string[]).includes(column) ? { column } : {}),
      };
    }
    case "removeBox": {
      const id = slug(rec.id);
      if (!id) return "removeBox needs an id";
      const replaceWith = slug(rec.replaceWith);
      return { op: kind, id, ...(replaceWith ? { replaceWith } : {}) };
    }
    case "addArrow":
    case "removeArrow": {
      const from = slug(rec.from);
      const to = slug(rec.to);
      if (!from || !to) return `${kind} needs from and to`;
      if (kind === "removeArrow") return { op: kind, from, to };
      const label = clip(rec.label, SPEC_LIMITS.arrowLabel);
      return { op: kind, from, to, ...(label ? { label } : {}) };
    }
    case "upsertTable": {
      const id = slug(rec.id ?? rec.name);
      if (!id) return "upsertTable needs an id";
      const name = clip(rec.name, SPEC_LIMITS.tableName);
      const fields = Array.isArray(rec.fields)
        ? rec.fields.map((field) => clip(field, SPEC_LIMITS.field)).filter(Boolean)
        : undefined;
      const store = slug(rec.store);
      return {
        op: kind,
        id,
        ...(name ? { name } : {}),
        ...(fields ? { fields: fields.slice(0, SPEC_LIMITS.fields) } : {}),
        ...(store ? { store } : {}),
      };
    }
    case "removeTable": {
      const id = slug(rec.id);
      return id ? { op: kind, id } : "removeTable needs an id";
    }
    case "setFlow":
      return Array.isArray(rec.steps)
        ? { op: kind, steps: rec.steps as DesignStep[] }
        : "setFlow needs steps";
    case "setPoints": {
      const section = str(rec.section) as PointSectionId;
      if (!POINT_SECTIONS.includes(section)) return `setPoints has no section "${str(rec.section)}"`;
      return Array.isArray(rec.points)
        ? { op: kind, section, points: rec.points as DesignPoint[] }
        : "setPoints needs points";
    }
    case "setDeployment":
      return Array.isArray(rec.groups)
        ? { op: kind, groups: rec.groups as DesignGroup[] }
        : "setDeployment needs groups";
    case "setSection": {
      const id = str(rec.id) as SystemDesignSectionId;
      if (!SYSTEM_DESIGN_SECTION_IDS.includes(id)) return `unknown section "${str(rec.id)}"`;
      const say = clip(rec.say, SPEC_LIMITS.say);
      const example = clipBlock(rec.example, SPEC_LIMITS.example);
      if (!say && !example) return "setSection needs say or example";
      return { op: kind, id, ...(say ? { say } : {}), ...(example ? { example } : {}) };
    }
    default:
      return `unknown op "${kind || "?"}"`;
  }
}

export function parseDesignOps(raw: unknown): { ops: DesignOp[]; rejected: string[] } {
  const ops: DesignOp[] = [];
  const rejected: string[] = [];
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list.slice(0, MAX_OPS)) {
    if (!item || typeof item !== "object") {
      rejected.push("an edit was not an object");
      continue;
    }
    const parsed = parseOne(item as Record<string, unknown>);
    if (typeof parsed === "string") rejected.push(parsed);
    else ops.push(parsed);
  }
  return { ops, rejected };
}

function rewire(spec: SystemDesignSpec, id: string, replacement?: string) {
  const swap = (value: string) => (value === id ? replacement : value);
  spec.arrows = spec.arrows.flatMap((link) => {
    const from = swap(link.from);
    const to = swap(link.to);
    return from && to && from !== to ? [{ ...link, from, to }] : [];
  });
  spec.flow = spec.flow.flatMap((step) => {
    const from = swap(step.from);
    const to = swap(step.to);
    return from && to && from !== to ? [{ ...step, from, to }] : [];
  });
  for (const section of POINT_SECTIONS) {
    spec.points[section] = spec.points[section].map((point) => {
      if (point.target !== id) return point;
      const rest: DesignPoint = { label: point.label, ...(point.then ? { then: point.then } : {}) };
      return replacement ? { ...rest, target: replacement } : rest;
    });
  }
  spec.deployment = spec.deployment.map((group) => ({
    ...group,
    members: [
      ...new Set(
        group.members.flatMap((member) => {
          const next = swap(member);
          return next ? [next] : [];
        }),
      ),
    ],
  }));
  spec.tables = spec.tables.map((table) => {
    if (table.store !== id) return table;
    const rest = { id: table.id, name: table.name, fields: table.fields };
    return replacement ? { ...rest, store: replacement } : rest;
  });
}

/**
 * Applies edits in order to a copy of the spec. Each edit is checked against
 * the spec as it stands after the edits before it; one that does not fit is
 * rejected with a reason and the rest still apply.
 */
export function applyDesignOps(
  spec: SystemDesignSpec,
  ops: DesignOp[],
): { spec: SystemDesignSpec; applied: number; rejected: string[] } {
  const next: SystemDesignSpec = structuredClone(spec);
  const rejected: string[] = [];
  let applied = 0;
  const has = (id: string) => next.boxes.some((box) => box.id === id);

  for (const op of ops) {
    switch (op.op) {
      case "setTitle":
        next.title = op.title;
        break;
      case "setStack":
        if (op.value) next.stack[op.key] = op.value;
        else delete next.stack[op.key];
        break;
      case "upsertBox": {
        const box = next.boxes.find((item) => item.id === op.id);
        if (box) {
          if (op.label) box.label = op.label;
          if (op.column) box.column = op.column;
        } else if (!op.label) {
          rejected.push(`no component "${op.id}" to change`);
          continue;
        } else if (next.boxes.length >= SPEC_LIMITS.boxes) {
          rejected.push(`the diagram already has ${SPEC_LIMITS.boxes} components`);
          continue;
        } else {
          next.boxes.push({ id: op.id, label: op.label, column: op.column ?? "service" });
        }
        break;
      }
      case "removeBox": {
        if (!has(op.id)) {
          rejected.push(`no component "${op.id}" to remove`);
          continue;
        }
        if (op.replaceWith && !has(op.replaceWith)) {
          rejected.push(`no component "${op.replaceWith}" to move "${op.id}" onto`);
          continue;
        }
        if (next.boxes.length <= 2 && !op.replaceWith) {
          rejected.push("a design needs at least two components");
          continue;
        }
        next.boxes = next.boxes.filter((box) => box.id !== op.id);
        rewire(next, op.id, op.replaceWith);
        break;
      }
      case "addArrow": {
        if (!has(op.from) || !has(op.to)) {
          rejected.push(`cannot connect "${op.from}" to "${op.to}"`);
          continue;
        }
        if (op.from === op.to) {
          rejected.push("a component cannot connect to itself");
          continue;
        }
        const dup = next.arrows.some(
          (link) => link.from === op.from && link.to === op.to && (link.label ?? "") === (op.label ?? ""),
        );
        if (dup) break;
        if (next.arrows.length >= SPEC_LIMITS.arrows) {
          rejected.push(`the diagram already has ${SPEC_LIMITS.arrows} connections`);
          continue;
        }
        next.arrows.push({ from: op.from, to: op.to, ...(op.label ? { label: op.label } : {}) });
        break;
      }
      case "removeArrow": {
        const before = next.arrows.length;
        next.arrows = next.arrows.filter((link) => !(link.from === op.from && link.to === op.to));
        if (next.arrows.length === before) {
          rejected.push(`no connection from "${op.from}" to "${op.to}"`);
          continue;
        }
        break;
      }
      case "upsertTable": {
        if (op.store && !has(op.store)) {
          rejected.push(`no store "${op.store}" for table "${op.id}"`);
          continue;
        }
        const table = next.tables.find((item) => item.id === op.id);
        if (table) {
          if (op.name) table.name = op.name;
          if (op.fields) table.fields = op.fields;
          if (op.store) table.store = op.store;
        } else if (!op.name) {
          rejected.push(`no table "${op.id}" to change`);
          continue;
        } else if (next.tables.length >= SPEC_LIMITS.tables) {
          rejected.push(`the data model already has ${SPEC_LIMITS.tables} tables`);
          continue;
        } else {
          next.tables.push({
            id: op.id,
            name: op.name,
            fields: op.fields ?? [],
            ...(op.store ? { store: op.store } : {}),
          });
        }
        break;
      }
      case "removeTable": {
        const before = next.tables.length;
        next.tables = next.tables.filter((table) => table.id !== op.id);
        if (next.tables.length === before) {
          rejected.push(`no table "${op.id}" to remove`);
          continue;
        }
        break;
      }
      case "setFlow": {
        const ids = new Set(next.boxes.map((box) => box.id));
        const unknown = op.steps.filter(
          (step) => !ids.has(slug(step.from)) || !ids.has(slug(step.to)) || slug(step.from) === slug(step.to),
        );
        if (unknown.length) {
          rejected.push(`setFlow steps use unknown boxes: ${unknown.map((step) => `${step.from}>${step.to}`).join(", ")}`);
          continue;
        }
        next.flow = op.steps;
        break;
      }
      case "setPoints":
        next.points[op.section] = op.points;
        break;
      case "setDeployment":
        next.deployment = op.groups;
        break;
      case "setSection": {
        const section = next.sections.find((item) => item.id === op.id);
        if (!section) continue;
        if (op.say) section.say = op.say;
        if (op.example) section.example = op.example;
        break;
      }
    }
    applied += 1;
  }

  return { spec: parseSystemDesignSpec(next), applied, rejected };
}

/** Concept words that stay true after a provider swap, so they never mark text as stale. */
const GENERIC_WORDS = new Set(
  (
    "the and with for via app apps api auth authentication realtime service services server servers serverless " +
    "client clients store stores database databases cache caches queue queues cluster clusters layer worker workers " +
    "storage compute cloud edge function functions gateway node sql nosql http https websocket websockets socket " +
    "sockets managed primary replica replicas instance instances region regions bucket buckets table tables platform " +
    "data file files object objects message messages event events push pub sub stream streams log logs metrics " +
    "traces load balancer web mobile user users"
  ).split(" "),
);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** What the design names right now: its stack choices and its components. */
function vocabulary(spec: SystemDesignSpec): Set<string> {
  const found = new Set<string>();
  for (const value of Object.values(spec.stack)) words(value ?? "").forEach((word) => found.add(word));
  for (const box of spec.boxes) words(box.label).forEach((word) => found.add(word));
  return found;
}

/**
 * Product names the design used before the edit and no longer uses,
 * e.g. "supabase" after the database moved to RDS.
 */
export function droppedNames(before: SystemDesignSpec, after: SystemDesignSpec): string[] {
  const old = vocabulary(before);
  const current = vocabulary(after);
  return [...old].filter(
    (word) => word.length >= 3 && !/^\d+$/.test(word) && !GENERIC_WORDS.has(word) && !current.has(word),
  );
}

const UNWANTED_PHRASE =
  /\b(?:instead of|rather than|replace|replacing|swap out|switch(?:ing)? (?:away )?from|move (?:off|away from|from)|moving (?:off|away from|from)|migrate (?:off|away from|from)|get rid of|drop|remove|without|no longer use|stop using|(?:do not|don't|dont) use|not)\s+(?:the\s+|using\s+)?([a-z0-9][a-z0-9 .+/-]{0,40}?)(?=\s+(?:with|for|to|and|but|in|on|so|use|using|because|since|instead|then|everywhere|entirely|completely)\b|[,.;:!?)]|$)/gi;

/**
 * Something the student explicitly wants gone. "Supabase" means every Supabase
 * part; "Supabase auth" only the parts that are also about auth.
 */
export type Unwanted = { phrase: string; product: string[]; qualifier: string[] };

/** Reads "AWS instead of Supabase", "drop Redis" and the like, keeping only products the design uses. */
export function unwantedNames(instruction: string, before: SystemDesignSpec): Unwanted[] {
  const used = vocabulary(before);
  const found = new Map<string, Unwanted>();
  for (const match of instruction.toLowerCase().matchAll(UNWANTED_PHRASE)) {
    const all = words(match[1] ?? "");
    const product = all.filter(
      (word) => word.length >= 3 && !/^\d+$/.test(word) && !GENERIC_WORDS.has(word) && used.has(word),
    );
    if (!product.length) continue;
    const qualifier = all.filter((word) => GENERIC_WORDS.has(word) && !["the", "and", "with", "for", "via"].includes(word));
    const phrase = [...product, ...qualifier].join(" ");
    found.set(phrase, { phrase, product, qualifier });
  }
  return [...found.values()];
}

function isUnwanted(text: string, unwanted: Unwanted[], key?: string): boolean {
  const present = new Set([...words(text), ...(key ? words(key) : [])]);
  return unwanted.some(
    (item) =>
      item.product.every((word) => present.has(word)) &&
      (!item.qualifier.length || item.qualifier.some((word) => present.has(word))),
  );
}

/** Words to look for in prose: the product alone, or the product next to its qualifier. */
function unwantedTerms(unwanted: Unwanted[]): string[] {
  return unwanted.flatMap((item) =>
    item.qualifier.length
      ? item.qualifier.map((word) => `${item.product.join(" ")} ${word}`)
      : item.product,
  );
}

function mentions(text: string, dropped: string[]): string[] {
  const lower = text.toLowerCase();
  return dropped.filter((word) => new RegExp(`\\b${word}\\b`).test(lower));
}

export type StaleParts = {
  sections: { id: SystemDesignSectionId; words: string[] }[];
  groups: { id: string; label: string; words: string[] }[];
  tables: { id: string; name: string; words: string[] }[];
  points: { section: PointSectionId; words: string[] }[];
  flow: { index: number; label: string; words: string[] }[];
  stack: { key: StackKey; value: string }[];
  boxes: { id: string; label: string }[];
};

/**
 * Text and labels that still name something the edit removed, plus stack
 * choices and boxes still using a product the student asked to drop.
 */
export function staleParts(
  before: SystemDesignSpec,
  after: SystemDesignSpec,
  unwanted: Unwanted[] = [],
): StaleParts {
  const stack = STACK_KEYS.flatMap((key) => {
    const value = after.stack[key];
    return value && isUnwanted(value, unwanted, key) ? [{ key, value }] : [];
  });
  const flaggedValues = new Set(stack.map((item) => item.value.toLowerCase()));
  const boxes = after.boxes
    .filter((box) => flaggedValues.has(box.label.toLowerCase()) || isUnwanted(box.label, unwanted))
    .map((box) => ({ id: box.id, label: box.label }));
  const dropped = [...new Set([...droppedNames(before, after), ...unwantedTerms(unwanted)])];
  const empty: StaleParts = { sections: [], groups: [], tables: [], points: [], flow: [], stack, boxes };
  if (!dropped.length) return empty;
  return {
    stack,
    boxes,
    sections: after.sections.flatMap((section) => {
      const found = mentions(`${section.say}\n${section.example}`, dropped);
      return found.length ? [{ id: section.id, words: found }] : [];
    }),
    groups: after.deployment.flatMap((group) => {
      const found = mentions(group.label, dropped);
      return found.length ? [{ id: group.id, label: group.label, words: found }] : [];
    }),
    tables: after.tables.flatMap((table) => {
      const found = mentions(table.name, dropped);
      return found.length ? [{ id: table.id, name: table.name, words: found }] : [];
    }),
    points: POINT_SECTIONS.flatMap((section) => {
      const text = after.points[section].map((point) => `${point.label}\n${point.then ?? ""}`).join("\n");
      const found = mentions(text, dropped);
      return found.length ? [{ section, words: found }] : [];
    }),
    flow: after.flow.flatMap((step, index) => {
      const found = mentions(step.label, dropped);
      return found.length ? [{ index, label: step.label, words: found }] : [];
    }),
  };
}

export function hasStaleParts(parts: StaleParts): boolean {
  return Boolean(
    parts.sections.length ||
      parts.groups.length ||
      parts.tables.length ||
      parts.points.length ||
      parts.flow.length ||
      parts.stack.length ||
      parts.boxes.length,
  );
}

/** Relabels flow steps in place by position; used when an edit left a step naming a dropped product. */
export function relabelFlow(
  spec: SystemDesignSpec,
  relabels: { index: number; label: string }[],
): SystemDesignSpec {
  const next = structuredClone(spec);
  for (const relabel of relabels) {
    const step = next.flow[relabel.index];
    const label = clip(relabel.label, SPEC_LIMITS.stepLabel);
    if (step && label && !isPlaceholderLabel(label)) step.label = label;
  }
  return parseSystemDesignSpec(next);
}

/** Renames deployment groups in place; used when an edit left a group named for a dropped product. */
export function renameGroups(
  spec: SystemDesignSpec,
  renames: { id: string; label: string }[],
): SystemDesignSpec {
  const next = structuredClone(spec);
  for (const rename of renames) {
    const group = next.deployment.find((item) => item.id === slug(rename.id));
    const label = clip(rename.label, SPEC_LIMITS.groupLabel);
    if (group && label && !isPlaceholderLabel(label)) group.label = label;
  }
  return parseSystemDesignSpec(next);
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A spoken one-liner built from the spec itself, for when the model gives no summary. */
export function describeChange(before: SystemDesignSpec, after: SystemDesignSpec): string {
  const parts: string[] = [];
  for (const key of STACK_KEYS) {
    const was = before.stack[key];
    const now = after.stack[key];
    if (was === now) continue;
    const name = key === "cdn" ? "the CDN" : `the ${key}`;
    if (now) parts.push(`${name} is now ${now}`);
    else parts.push(`dropped ${name}`);
  }
  const oldBoxes = new Map(before.boxes.map((box) => [box.id, box.label]));
  const added = after.boxes.filter((box) => !oldBoxes.has(box.id)).map((box) => box.label);
  const removed = before.boxes
    .filter((box) => !after.boxes.some((item) => item.id === box.id))
    .map((box) => box.label);
  if (added.length) parts.push(`added ${list(added)}`);
  if (removed.length) parts.push(`removed ${list(removed)}`);
  const tables = after.tables
    .filter((table) => !before.tables.some((item) => item.id === table.id))
    .map((table) => table.name);
  if (tables.length) parts.push(`added the ${list(tables)} table${tables.length > 1 ? "s" : ""}`);
  if (!parts.length) return "Updated the design.";
  const text = list(parts.slice(0, 3));
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
