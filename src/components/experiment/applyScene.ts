"use client";

import {
  createShapeId,
  toRichText,
  type Editor,
  type TLShapeId,
} from "tldraw";
import type { TLLineShapePoint } from "@tldraw/tlschema";
import {
  SHAPE_GAP,
  isOrganicGeo,
  layoutLesson,
  shapeBounds,
} from "@/lib/experiment/layout";
import { looksLikeCode } from "@/lib/experiment/boardText";
import type {
  ExperimentBeat,
  ExperimentColor,
  ExperimentLesson,
  ExperimentScene,
  ExperimentShape,
} from "@/lib/experiment/scene";

export type ExperimentDrawSession = {
  dx: number;
  dy: number;
  idMap: Map<string, TLShapeId>;
  created: TLShapeId[];
  clusterOf: Map<TLShapeId, string>;
  diagram?: ExperimentBeat["diagram"];
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function nodeBounds(shape: ExperimentShape): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const box = shapeBounds(shape);
  if (!box) return null;
  return { x: box.x, y: box.y, w: box.w, h: box.h };
}

function pageBoxesOverlap(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
  gap: number,
) {
  return (
    a.minX < b.maxX + gap &&
    a.maxX + gap > b.minX &&
    a.minY < b.maxY + gap &&
    a.maxY + gap > b.minY
  );
}

function nudgeClearOfPlaced(
  editor: Editor,
  id: TLShapeId,
  placed: TLShapeId[],
  options?: { skip?: Set<TLShapeId>; gap?: number },
) {
  if (!placed.length) return;
  const skip = options?.skip ?? new Set<TLShapeId>();
  const gap = options?.gap ?? SHAPE_GAP;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const bounds = editor.getShapePageBounds(id);
    const shape = editor.getShape(id);
    if (!bounds || !shape) return;

    let hit: { minX: number; minY: number; maxX: number; maxY: number } | null =
      null;
    for (const otherId of placed) {
      if (otherId === id || skip.has(otherId)) continue;
      const other = editor.getShapePageBounds(otherId);
      if (other && pageBoxesOverlap(bounds, other, gap)) {
        hit = other;
        break;
      }
    }
    if (!hit) return;

    const overlapX = Math.min(bounds.maxX, hit.maxX) - Math.max(bounds.minX, hit.minX);
    const sameRow = Math.abs(bounds.minY - hit.minY) < 48;
    let nextX = shape.x;
    let nextY = shape.y;
    if (sameRow && overlapX < 140) {
      nextX += hit.maxX + gap - bounds.minX;
    } else {
      nextY += hit.maxY + gap - bounds.minY;
    }
    if (nextX === shape.x && nextY === shape.y) {
      nextY += gap;
    }
    editor.updateShape({ id, type: shape.type, x: nextX, y: nextY });
  }
}

function sceneOffset(editor: Editor, scene: ExperimentScene) {
  const boxes = scene.shapes
    .map(nodeBounds)
    .filter((b): b is NonNullable<typeof b> => Boolean(b));
  if (!boxes.length) return { dx: 0, dy: 0 };

  const minX = Math.min(...boxes.map((b) => b.x));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const viewport = editor.getViewportPageBounds();
  return {
    dx: viewport.center.x - (minX + maxX) / 2,
    dy: viewport.center.y - 40 - (minY + maxY) / 2,
  };
}

function colorOf(shape: { color?: ExperimentColor }, fallback: ExperimentColor) {
  return shape.color ?? fallback;
}

function createNode(
  editor: Editor,
  shape: ExperimentShape,
  dx: number,
  dy: number,
  extras: TLShapeId[],
): TLShapeId | null {
  try {
    return createNodeUnsafe(editor, shape, dx, dy, extras);
  } catch (error) {
    console.warn("[experiment-draw] skipped shape", shape.id, error);
    return null;
  }
}

function linePoints(
  coords: Array<{ x: number; y: number }>,
): Record<string, TLLineShapePoint> {
  const points: Record<string, TLLineShapePoint> = {};
  coords.forEach((point, i) => {
    const id = `a${i + 1}`;
    points[id] = {
      id,
      index: id as TLLineShapePoint["index"],
      x: point.x,
      y: point.y,
    };
  });
  return points;
}

function createRightTriangle(
  editor: Editor,
  shape: Extract<ExperimentShape, { type: "geo" }>,
  dx: number,
  dy: number,
  extras: TLShapeId[],
): TLShapeId {
  const x = shape.x + dx;
  const y = shape.y + dy;
  const w = Math.max(180, shape.w);
  const h = Math.max(140, shape.h);
  const color = colorOf(shape, "blue");
  const id = createShapeId();
  editor.createShape({
    id,
    type: "line",
    x,
    y,
    props: {
      color,
      dash: "draw",
      size: "l",
      spline: "line",
      scale: 1,
      points: linePoints([
        { x: 0, y: h },
        { x: w, y: h },
        { x: 0, y: 0 },
        { x: 0, y: h },
      ]),
    },
  });
  const mark = Math.max(20, Math.min(40, Math.round(Math.min(w, h) * 0.14)));
  const squareId = createShapeId();
  editor.createShape({
    id: squareId,
    type: "geo",
    x,
    y: y + h - mark,
    props: {
      geo: "rectangle",
      w: mark,
      h: mark,
      color,
      fill: "none",
      dash: "draw",
      size: "s",
      font: "draw",
      align: "middle",
      verticalAlign: "middle",
      richText: toRichText(""),
    },
  });
  extras.push(squareId);
  const label = (shape.label ?? "").trim();
  if (label && !looksLikeCode(label)) {
    const textId = createShapeId();
    editor.createShape({
      id: textId,
      type: "text",
      x: x + 28,
      y: y + h * 0.42,
      props: {
        color: "black",
        size: "m",
        font: "draw",
        textAlign: "start",
        autoSize: true,
        w: Math.min(160, w * 0.5),
        richText: toRichText(label),
      },
    });
    extras.push(textId);
  }
  return id;
}

function createNodeUnsafe(
  editor: Editor,
  shape: ExperimentShape,
  dx: number,
  dy: number,
  extras: TLShapeId[],
): TLShapeId | null {
  if (shape.type === "geo" && shape.geo === "right-triangle") {
    return createRightTriangle(editor, shape, dx, dy, extras);
  }
  const id = createShapeId();
  if (shape.type === "geo") {
    const label = shape.label ?? "";
    const code = looksLikeCode(label);
    // right-triangle is handled above; remaining geos match tldraw's geo styles.
    const geo =
      shape.geo === "right-triangle" ? "triangle" : shape.geo;
    editor.createShape({
      id,
      type: "geo",
      x: shape.x + dx,
      y: shape.y + dy,
      props: {
        geo: shape.geo === "right-triangle" ? "triangle" : shape.geo,
        w: shape.w,
        h: shape.h,
        color: colorOf(shape, "blue"),
        fill: shape.fill ?? "semi",
        dash: "draw",
        size: code ? "s" : "m",
        font: code ? "mono" : "draw",
        align: code ? "start" : "middle",
        verticalAlign: code ? "start" : "middle",
        richText: toRichText(label),
      },
    });
    return id;
  }
  if (shape.type === "text") {
    const box = shapeBounds(shape);
    const code = looksLikeCode(shape.text);
    editor.createShape({
      id,
      type: "text",
      x: shape.x + dx,
      y: shape.y + dy,
      props: {
        color: colorOf(shape, "black"),
        size: code ? "s" : "l",
        font: code ? "mono" : "draw",
        textAlign: code ? "start" : "middle",
        autoSize: true,
        w: box?.w ?? 320,
        richText: toRichText(shape.text),
      },
    });
    return id;
  }
  if (shape.type === "note") {
    editor.createShape({
      id,
      type: "note",
      x: shape.x + dx,
      y: shape.y + dy,
      props: {
        color: colorOf(shape, "yellow"),
        font: "draw",
        size: "s",
        align: "middle",
        verticalAlign: "middle",
        richText: toRichText(shape.text),
      },
    });
    return id;
  }
  if (shape.type === "callout") {
    const box = shapeBounds(shape);
    editor.createShape({
      id,
      type: "text",
      x: shape.x + dx,
      y: shape.y + dy,
      props: {
        color: colorOf(shape, "black"),
        size: "m",
        font: "draw",
        textAlign: "start",
        autoSize: true,
        w: box?.w ?? 220,
        richText: toRichText(shape.text),
      },
    });
    return id;
  }
  return null;
}

function connectArrow(
  editor: Editor,
  fromId: TLShapeId,
  toId: TLShapeId,
  label: string | undefined,
  color: ExperimentColor,
  lane?: "above" | "below",
) {
  const startBounds = editor.getShapePageBounds(fromId);
  const endBounds = editor.getShapePageBounds(toId);
  if (!startBounds || !endBounds) return;

  const dx = endBounds.center.x - startBounds.center.x;
  const dy = endBounds.center.y - startBounds.center.y;
  const vertical = Math.abs(dy) >= Math.abs(dx);
  const startAnchor = vertical
    ? { x: 0.5, y: dy >= 0 ? 1 : 0 }
    : { x: dx >= 0 ? 1 : 0, y: 0.5 };
  const endAnchor = vertical
    ? { x: 0.5, y: dy >= 0 ? 0 : 1 }
    : { x: dx >= 0 ? 0 : 1, y: 0.5 };
  const shift = lane === "above" ? -22 : lane === "below" ? 22 : 0;
  const start = {
    x: startBounds.minX + startBounds.width * startAnchor.x,
    y: startBounds.minY + startBounds.height * startAnchor.y + shift,
  };
  const end = {
    x: endBounds.minX + endBounds.width * endAnchor.x,
    y: endBounds.minY + endBounds.height * endAnchor.y + shift,
  };
  const origin = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  };
  const arrowId = createShapeId();

  try {
    editor.createShape({
      id: arrowId,
      type: "arrow",
      x: origin.x,
      y: origin.y,
      props: {
        color,
        dash: "draw",
        size: "m",
        kind: "elbow",
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
        start: { x: start.x - origin.x, y: start.y - origin.y },
        end: { x: end.x - origin.x, y: end.y - origin.y },
        ...(label ? { richText: toRichText(label) } : {}),
      },
    });
  } catch (error) {
    console.warn("[experiment-draw] arrow create failed", error);
    return;
  }
  try {
    editor.createBindings([
      {
        fromId: arrowId,
        toId: fromId,
        type: "arrow",
        props: {
          terminal: "start",
          normalizedAnchor: startAnchor,
          isExact: false,
          isPrecise: true,
          snap: "edge",
        },
      },
      {
        fromId: arrowId,
        toId: toId,
        type: "arrow",
        props: {
          terminal: "end",
          normalizedAnchor: endAnchor,
          isExact: false,
          isPrecise: true,
          snap: "edge",
        },
      },
    ]);
  } catch (error) {
    console.warn("[experiment-draw] arrow binding failed", error);
  }
}

export async function applyExperimentShapes(
  editor: Editor,
  shapes: ExperimentShape[],
  session: ExperimentDrawSession,
) {
  const nodes = shapes.filter(
    (s) => s.type !== "arrow" && s.type !== "callout",
  );
  const callouts = shapes.filter((s) => s.type === "callout");
  const arrows = shapes.filter((s) => s.type === "arrow");

  for (const shape of nodes) {
    const extras: TLShapeId[] = [];
    const id = createNode(editor, shape, session.dx, session.dy, extras);
    if (!id) continue;
    const cluster =
      shape.type === "geo" || shape.type === "text" || shape.type === "note"
        ? shape.cluster
        : undefined;
    if (cluster) {
      session.clusterOf.set(id, cluster);
      for (const extra of extras) session.clusterOf.set(extra, cluster);
    }
    const isOrganicPart =
      shape.type === "geo" && Boolean(cluster) && isOrganicGeo(shape);
    if (!isOrganicPart) {
      const skip = new Set<TLShapeId>();
      for (const [placedId, placedCluster] of session.clusterOf) {
        if (!cluster || placedCluster !== cluster) continue;
        const placed = editor.getShape(placedId);
        if (placed?.type === "geo") {
          const geo = (placed.props as { geo?: string }).geo;
          if (
            geo === "ellipse" ||
            geo === "oval" ||
            geo === "heart" ||
            geo === "cloud"
          ) {
            skip.add(placedId);
          }
        }
      }
      nudgeClearOfPlaced(editor, id, session.created, { skip });
    }
    session.idMap.set(shape.id, id);
    session.created.push(id, ...extras);
    await sleep(70);
  }

  for (const shape of callouts) {
    const id = createNode(editor, shape, session.dx, session.dy, []);
    if (!id) continue;
    nudgeClearOfPlaced(editor, id, session.created);
    session.idMap.set(shape.id, id);
    session.created.push(id);
    const toId = session.idMap.get(shape.to);
    if (toId) {
      connectArrow(editor, id, toId, undefined, colorOf(shape, "grey"));
    }
    await sleep(70);
  }

  for (const shape of arrows) {
    if (shape.type !== "arrow") continue;
    const fromId = session.idMap.get(shape.from);
    const toId = session.idMap.get(shape.to);
    if (!fromId || !toId) continue;
    connectArrow(
      editor,
      fromId,
      toId,
      shape.label,
      colorOf(shape, "grey"),
      shape.lane,
    );
    await sleep(70);
  }
}

export async function highlightExperimentIds(
  editor: Editor,
  session: ExperimentDrawSession,
  ids: string[],
) {
  for (const key of ids) {
    const targetId = session.idMap.get(key);
    if (!targetId) continue;
    const bounds = editor.getShapePageBounds(targetId);
    if (!bounds) continue;
    const id = createShapeId();
    try {
      editor.createShape({
        id,
        type: "geo",
        x: bounds.minX - 12,
        y: bounds.minY - 12,
        props: {
          geo: "rectangle",
          w: Math.max(36, bounds.width + 24),
          h: Math.max(36, bounds.height + 24),
          color: "yellow",
          fill: "none",
          dash: "dashed",
          size: "m",
          font: "draw",
          align: "middle",
          verticalAlign: "middle",
          richText: toRichText(""),
        },
      });
      session.created.push(id);
    } catch (error) {
      console.warn("[experiment-draw] highlight failed", key, error);
    }
    await sleep(40);
  }
}

export function prepareExperimentSession(
  editor: Editor,
  lesson: ExperimentLesson,
): ExperimentDrawSession {
  const systemDesign = lesson.beats.some((beat) => beat.section);
  if (!systemDesign) layoutLesson(lesson);
  const allShapes = lesson.beats.flatMap((beat) => beat.shapes);
  const { dx, dy } = sceneOffset(editor, {
    title: lesson.title,
    shapes: allShapes,
  });
  try {
    const existing = [...editor.getCurrentPageShapeIds()];
    if (existing.length) editor.deleteShapes(existing);
  } catch {
    /* keep going */
  }
  return {
    dx,
    dy,
    idMap: new Map<string, TLShapeId>(),
    created: [] as TLShapeId[],
    clusterOf: new Map<TLShapeId, string>(),
  };
}

export async function playExperimentBeat(
  editor: Editor,
  beat: ExperimentBeat,
  session: ExperimentDrawSession,
) {
  if (beat.diagram) session.diagram = beat.diagram;
  const before = session.created.length;
  if (beat.shapes.length) {
    await applyExperimentShapes(editor, beat.shapes, session);
  } else if (!beat.graph) {
    await sleep(180);
  }
  if (beat.highlight?.length) {
    await highlightExperimentIds(editor, session, beat.highlight);
  }
  const added = session.created.slice(before);
  if (added.length) zoomCreated(editor, added);
}

export async function applyExperimentScene(
  editor: Editor,
  scene: ExperimentScene,
) {
  const { dx, dy } = sceneOffset(editor, scene);
  const session = {
    dx,
    dy,
    idMap: new Map<string, TLShapeId>(),
    created: [] as TLShapeId[],
    clusterOf: new Map<TLShapeId, string>(),
  };
  await applyExperimentShapes(editor, scene.shapes, session);
  if (!session.created.length) {
    throw new Error("Could not explain that. Try another question.");
  }
  zoomCreated(editor, session.created);
}

export async function playExperimentLesson(
  editor: Editor,
  lesson: ExperimentLesson,
  options?: {
    signal?: AbortSignal;
    onBeat?: (index: number) => void;
  },
) {
  const session = prepareExperimentSession(editor, lesson);

  for (let index = 0; index < lesson.beats.length; index += 1) {
    if (options?.signal?.aborted) return;
    options?.onBeat?.(index);
    await playExperimentBeat(editor, lesson.beats[index]!, session);
  }
}

function zoomCreated(editor: Editor, created: TLShapeId[]) {
  try {
    editor.select(...created);
    editor.zoomToSelection({ animation: { duration: 280 } });
    editor.selectNone();
  } catch {
    /* shapes are already on the board */
  }
}
