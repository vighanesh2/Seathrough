import type {
  ExperimentBeat,
  ExperimentColor,
  ExperimentLesson,
  ExperimentShape,
} from "@/lib/experiment/scene";
import {
  layoutGraph,
  routeAround,
  type LayoutLink,
  type Point,
  type Rect,
} from "@/lib/experiment/systemDesign/graphLayout";
import {
  sectionLabel,
  type SystemDesignSectionId,
} from "@/lib/experiment/systemDesign/sections";
import {
  BOX_COLUMNS,
  STACK_KEYS,
  STACK_LABELS,
  designGaps,
  type BoxColumn,
  type DesignBox,
  type DesignStep,
  type PointSectionId,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";

type GeoShape = Extract<ExperimentShape, { type: "geo" }>;

const BOX_W = 200;
const BOX_H = 72;
/** tldraw's medium draw font in a geo label: about this wide per character and tall per line. */
const LABEL_CHAR_W = 12.5;
const LABEL_LINE_H = 30;
const LABEL_PAD_H = 32;

const DIAGRAM: Partial<Record<SystemDesignSectionId, ExperimentBeat["diagram"]>> = {
  architecture: "architecture",
  "data-model": "data",
  flows: "flow",
  scaling: "scale",
  reliability: "reliability",
  security: "security",
  observability: "observe",
  deployment: "deploy",
};

const COLUMN_COLOR: Record<BoxColumn, ExperimentColor> = {
  client: "blue",
  edge: "orange",
  service: "green",
  data: "violet",
};

/** Lines a label takes once tldraw wraps it, with slack because it wraps at words. */
function wrappedLines(label: string, width: number): number {
  const perLine = Math.max(6, Math.floor(((width - 28) / LABEL_CHAR_W) * 0.9));
  return label
    .split("\n")
    .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / perLine)), 0);
}

/** A box tall enough for its label, so tldraw never grows it past its laid-out size. */
function node(
  id: string,
  label: string,
  color: ExperimentColor,
  size: { w?: number; minH?: number } = {},
): GeoShape {
  const multiline = label.includes("\n");
  const w = size.w ?? (multiline ? 188 : BOX_W);
  const h = Math.max(size.minH ?? BOX_H, LABEL_PAD_H + wrappedLines(label, w) * LABEL_LINE_H);
  return {
    id,
    type: "geo",
    geo: "rectangle",
    x: 0,
    y: 0,
    w,
    h,
    label,
    color,
    fill: "semi",
    role: "part",
  };
}

type GraphSheet = {
  nodes: GeoShape[];
  links: LayoutLink[];
  direction: "RIGHT" | "DOWN";
  /** Column order to keep, e.g. clients left of services. */
  partition?: Map<string, number>;
};

/** Places a sheet's boxes and arrows together; arrows come back as exact paths. */
async function realize(sheet: GraphSheet): Promise<ExperimentShape[]> {
  if (!sheet.nodes.length) return [];
  const layout = await layoutGraph(
    sheet.nodes.map((shape) => ({
      id: shape.id,
      w: shape.w,
      h: shape.h,
      ...(sheet.partition?.has(shape.id) ? { partition: sheet.partition.get(shape.id) } : {}),
    })),
    sheet.links,
    sheet.direction,
  );
  const nodes = sheet.nodes.map((shape) => {
    const rect = layout.boxes.get(shape.id);
    return rect ? { ...shape, x: rect.x, y: rect.y } : shape;
  });
  const routes: ExperimentShape[] = sheet.links.flatMap((link) => {
    const route = layout.routes.get(link.id);
    if (!route || route.points.length < 2) return [];
    return [
      {
        id: link.id,
        type: "route" as const,
        from: link.from,
        to: link.to,
        points: route.points,
        ...(route.label ? { label: route.label } : {}),
        color: "grey" as const,
      },
    ];
  });
  return [...nodes, ...routes];
}

function boxById(spec: SystemDesignSpec): Map<string, DesignBox> {
  return new Map(spec.boxes.map((box) => [box.id, box]));
}

const PRIMARY_STORE =
  /postgres|mysql|mongo|dynamo|supabase|firestore|aurora|rds|planetscale|spanner|cockroach|cassandra|\b(sql|database|db)\b/i;

function primaryStore(spec: SystemDesignSpec): DesignBox | undefined {
  const stores = spec.boxes.filter((box) => box.column === "data");
  return (
    stores.find((box) => PRIMARY_STORE.test(box.label) && !/\b(cache|redis|queue)\b/i.test(box.label)) ??
    stores[0]
  );
}

function requirementsSheet(spec: SystemDesignSpec): ExperimentShape[] {
  const shapes: ExperimentShape[] = [
    { id: "sd-title", type: "text", x: 40, y: 24, text: spec.title, role: "title", color: "black" },
  ];
  const chips = STACK_KEYS.filter((key) => spec.stack[key]).map((key) =>
    node(`req-${key}`, `${STACK_LABELS[key]}\n${spec.stack[key]}`, "grey", { w: 200 }),
  );
  let top = 100;
  for (let row = 0; row * 4 < chips.length; row += 1) {
    const rowChips = chips.slice(row * 4, row * 4 + 4);
    rowChips.forEach((chip, index) => shapes.push({ ...chip, x: 24 + index * 220, y: top }));
    top += Math.max(...rowChips.map((chip) => chip.h)) + 28;
  }
  return shapes;
}

function architectureSheet(spec: SystemDesignSpec): GraphSheet {
  return {
    direction: "RIGHT",
    nodes: spec.boxes.map((box) => node(box.id, box.label, COLUMN_COLOR[box.column])),
    partition: new Map(spec.boxes.map((box) => [box.id, BOX_COLUMNS.indexOf(box.column)])),
    links: spec.arrows.map((link, index) => ({
      id: `arch-a-${index}`,
      from: link.from,
      to: link.to,
      ...(link.label ? { label: link.label } : {}),
    })),
  };
}

function dataSheet(spec: SystemDesignSpec): GraphSheet {
  const boxes = boxById(spec);
  const primary = primaryStore(spec);
  if (!spec.tables.length) {
    return {
      direction: "DOWN",
      nodes: spec.boxes
        .filter((box) => box.column === "data")
        .map((box) => node(`dm-${box.id}`, box.label, "violet")),
      links: [],
    };
  }
  const nodes: GeoShape[] = [];
  const links: LayoutLink[] = [];
  const stores = new Set<string>();
  for (const table of spec.tables) {
    const storeId = table.store ?? primary?.id ?? "";
    const storeNodeId = `dm-${storeId || "store"}`;
    if (!stores.has(storeNodeId)) {
      stores.add(storeNodeId);
      nodes.push(node(storeNodeId, boxes.get(storeId)?.label ?? spec.stack.database ?? "Database", "violet"));
    }
    const id = `tbl-${table.id}`;
    nodes.push(node(id, [table.name, ...table.fields].join("\n"), "violet", { w: 188 }));
    links.push({ id: `dm-a-${table.id}`, from: storeNodeId, to: id, label: "has" });
  }
  return { direction: "DOWN", nodes, links };
}

/** The request path when the model gave no explicit flow: follow arrows from a client. */
function deriveFlow(spec: SystemDesignSpec): DesignStep[] {
  const start =
    spec.boxes.find((box) => box.column === "client") ?? spec.boxes[0];
  if (!start) return [];
  const steps: DesignStep[] = [];
  const visited = new Set([start.id]);
  let current = start.id;
  while (steps.length < 6) {
    const next = spec.arrows.find(
      (link) => link.from === current && !visited.has(link.to),
    );
    if (!next) break;
    steps.push({ from: next.from, to: next.to, label: next.label || "call" });
    visited.add(next.to);
    current = next.to;
  }
  return steps;
}

/**
 * A sequence view: one lane per component, one row per step. Positions carry
 * meaning here, so they are fixed and each arrow is routed around the boxes.
 */
function flowSheet(spec: SystemDesignSpec): ExperimentShape[] {
  const steps = spec.flow.length ? spec.flow : deriveFlow(spec);
  if (!steps.length) return [];
  const boxes = boxById(spec);
  const participants: string[] = [];
  for (const step of steps) {
    for (const id of [step.from, step.to]) {
      if (!participants.includes(id)) participants.push(id);
    }
  }
  const laneW = 220;
  const boxW = 180;
  const heads = participants.map((id) => {
    const box = boxes.get(id);
    return node(`flow-head-${id}`, box?.label ?? id, COLUMN_COLOR[box?.column ?? "service"], {
      w: boxW,
      minH: 56,
    });
  });
  const headH = Math.max(...heads.map((head) => head.h));
  const nodes: GeoShape[] = heads.map((head, index) => ({ ...head, x: 16 + index * laneW, y: 24 }));
  let top = 24 + headH + 56;
  const links: { id: string; from: string; to: string }[] = [];
  const lastIn = new Map<string, string>();
  steps.forEach((step, index) => {
    const id = `flow-step-${index}`;
    const lane = participants.indexOf(step.to);
    const box = node(id, `${index + 1}. ${step.label}`, "orange", { w: boxW, minH: 56 });
    nodes.push({ ...box, x: 16 + lane * laneW, y: top });
    top += box.h + 40;
    links.push({ id: `flow-a-${index}`, from: lastIn.get(step.from) ?? `flow-head-${step.from}`, to: id });
    lastIn.set(step.to, id);
  });
  const rects = new Map<string, Rect>(nodes.map((shape) => [shape.id, { x: shape.x, y: shape.y, w: shape.w, h: shape.h }]));
  const taken: Point[][] = [];
  const routes: ExperimentShape[] = links.flatMap((link) => {
    const from = rects.get(link.from);
    const to = rects.get(link.to);
    if (!from || !to) return [];
    const obstacles = [...rects.entries()]
      .filter(([id]) => id !== link.from && id !== link.to)
      .map(([, rect]) => rect);
    const points = routeAround(from, to, obstacles, taken);
    taken.push(points);
    return [
      {
        id: link.id,
        type: "route" as const,
        from: link.from,
        to: link.to,
        points,
        color: "grey" as const,
      },
    ];
  });
  return [...nodes, ...routes];
}

const POINT_STYLE: Record<
  PointSectionId,
  { prefix: string; verb: string; thenVerb: string; color: ExperimentColor }
> = {
  scaling: { prefix: "sc", verb: "scale by", thenVerb: "", color: "green" },
  reliability: { prefix: "rel", verb: "if", thenVerb: "then", color: "orange" },
  security: { prefix: "sec", verb: "guarded by", thenVerb: "", color: "red" },
  observability: { prefix: "obs", verb: "emits", thenVerb: "", color: "light-blue" },
};

function pointSheet(section: PointSectionId, spec: SystemDesignSpec): GraphSheet {
  const style = POINT_STYLE[section];
  const boxes = boxById(spec);
  const nodes: GeoShape[] = [];
  const links: LayoutLink[] = [];
  const partition = new Map<string, number>();
  const ends: string[] = [];
  const add = (shape: GeoShape, column: number) => {
    if (partition.has(shape.id)) return;
    nodes.push(shape);
    partition.set(shape.id, column);
  };
  spec.points[section].forEach((point, index) => {
    const pointId = `${style.prefix}-p-${index}`;
    const target = point.target ? boxes.get(point.target) : undefined;
    if (target) {
      const targetId = `${style.prefix}-t-${target.id}`;
      add(node(targetId, target.label, COLUMN_COLOR[target.column]), 0);
      links.push({ id: `${style.prefix}-a-${index}`, from: targetId, to: pointId, label: style.verb });
    }
    add(node(pointId, point.label, style.color, { w: 220 }), 1);
    let end = pointId;
    if (point.then) {
      const thenId = `${style.prefix}-n-${index}`;
      add(node(thenId, point.then, "green", { w: 220 }), 2);
      links.push({
        id: `${style.prefix}-b-${index}`,
        from: pointId,
        to: thenId,
        ...(style.thenVerb ? { label: style.thenVerb } : {}),
      });
      end = thenId;
    }
    ends.push(end);
  });
  const sink = section === "observability" && nodes.length ? spec.stack.observability : undefined;
  if (sink) {
    add(node("obs-sink", sink, "orange"), 3);
    ends.forEach((end, index) => {
      links.push({ id: `obs-c-${index}`, from: end, to: "obs-sink", label: "collect" });
    });
  }
  return { direction: "RIGHT", nodes, links, partition };
}

function deploySheet(spec: SystemDesignSpec): GraphSheet {
  const boxes = boxById(spec);
  const root = spec.stack.cloud;
  const nodes: GeoShape[] = [];
  const links: LayoutLink[] = [];
  const partition = new Map<string, number>();
  const add = (shape: GeoShape, column: number) => {
    nodes.push(shape);
    partition.set(shape.id, column);
  };
  if (root) add(node("dep-root", root, "orange"), 0);
  if (!spec.deployment.length) {
    if (!root) return { direction: "RIGHT", nodes, links };
    spec.boxes
      .filter((box) => box.column !== "client")
      .slice(0, 6)
      .forEach((box) => {
        const id = `dep-run-${box.id}`;
        add(node(id, box.label, COLUMN_COLOR[box.column]), 1);
        links.push({ id: `dep-a-${box.id}`, from: "dep-root", to: id, label: "runs" });
      });
    return { direction: "RIGHT", nodes, links, partition };
  }
  for (const group of spec.deployment) {
    const groupId = `dep-${group.id}`;
    add(node(groupId, group.label, "orange"), 1);
    if (root) links.push({ id: `dep-g-${group.id}`, from: "dep-root", to: groupId, label: "contains" });
    for (const member of group.members) {
      const box = boxes.get(member);
      if (!box) continue;
      const id = `dep-${group.id}-${member}`;
      add(node(id, box.label, COLUMN_COLOR[box.column]), 2);
      links.push({ id: `dep-m-${group.id}-${member}`, from: groupId, to: id, label: "runs" });
    }
  }
  return { direction: "RIGHT", nodes, links, partition };
}

async function sheetFor(id: SystemDesignSectionId, spec: SystemDesignSpec): Promise<ExperimentShape[]> {
  switch (id) {
    case "requirements":
      return requirementsSheet(spec);
    case "architecture":
      return realize(architectureSheet(spec));
    case "data-model":
      return realize(dataSheet(spec));
    case "flows":
      return flowSheet(spec);
    case "scaling":
    case "reliability":
    case "security":
    case "observability":
      return realize(pointSheet(id, spec));
    case "deployment":
      return realize(deploySheet(spec));
  }
}

function topOf(shape: ExperimentShape): number | null {
  if (shape.type === "geo" || shape.type === "text") return shape.y;
  if (shape.type === "route") {
    return Math.min(...shape.points.map((point) => point.y), shape.label?.y ?? Infinity);
  }
  return null;
}

function bottomOf(shape: ExperimentShape): number {
  if (shape.type === "geo") return shape.y + shape.h;
  if (shape.type === "text" || shape.type === "note") return shape.y + 48;
  if (shape.type === "route") {
    return Math.max(...shape.points.map((point) => point.y), shape.label ? shape.label.y + shape.label.h : 0);
  }
  return 0;
}

function shiftShape(shape: ExperimentShape, dy: number): ExperimentShape {
  if (shape.type === "arrow" || shape.type === "callout") return shape;
  if (shape.type === "route") {
    return {
      ...shape,
      points: shape.points.map((point) => ({ x: point.x, y: point.y + dy })),
      ...(shape.label ? { label: { ...shape.label, y: shape.label.y + dy } } : {}),
    };
  }
  return { ...shape, y: shape.y + dy };
}

/** Stacks each sheet under the last, with its heading above it. */
function placeSheet(
  heading: string,
  key: string,
  shapes: ExperimentShape[],
  cursor: number,
): { shapes: ExperimentShape[]; next: number } {
  const tops = shapes.map(topOf).filter((top): top is number => top !== null);
  const minY = tops.length ? Math.min(...tops) : 0;
  const shift = cursor + 72 - minY;
  const labeled: ExperimentShape[] = [
    { id: `heading-${key}`, type: "text", x: 24, y: cursor, text: heading, role: "title", color: "black" },
    ...shapes.map((shape) => shiftShape(shape, shift)),
  ];
  return { shapes: labeled, next: Math.max(...labeled.map(bottomOf)) + 140 };
}

/**
 * One sheet per section, all drawn from the spec. Each beat carries its
 * section id in `sheet` so the board can redraw just the sheets an edit changed.
 * Do not pass the result through coerceLesson.
 */
export async function compileSystemDesign(
  spec: SystemDesignSpec,
  question: string,
): Promise<ExperimentLesson> {
  const gaps = designGaps(spec);
  if (gaps.length) {
    throw new Error(
      `System design is missing ${gaps.map(sectionLabel).join(", ")}.`,
    );
  }
  const sheets = await Promise.all(spec.sections.map((section) => sheetFor(section.id, spec)));
  let cursor = 0;
  const beats: ExperimentBeat[] = spec.sections.map((section, index) => {
    const label = sectionLabel(section.id);
    const diagram = DIAGRAM[section.id];
    let shapes = sheets[index]!;
    if (shapes.length) {
      const placed = placeSheet(label, section.id, shapes, cursor);
      shapes = placed.shapes;
      cursor = placed.next;
    }
    return {
      section: label,
      sheet: section.id,
      ...(diagram ? { diagram } : {}),
      say: section.say,
      ...(section.example ? { example: section.example } : {}),
      shapes,
    };
  });
  return {
    title: spec.title,
    question: question.slice(0, 160),
    beats,
  };
}
