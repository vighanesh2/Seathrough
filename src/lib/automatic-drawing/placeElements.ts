import type { LibraryElement } from "@/lib/automatic-drawing/library";
import {
  loadAllDrawingLibraries,
  type DrawingLibraryItem,
} from "@/lib/automatic-drawing/library";
import type {
  ExcalidrawScenePlan,
  MaterializedScene,
  RevealBatch,
} from "@/lib/automatic-drawing/schema";

function newId(): string {
  return `e${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function boundsOf(elements: LibraryElement[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const w = typeof el.width === "number" ? el.width : 0;
    const h = typeof el.height === "number" ? el.height : 0;
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + w);
    maxY = Math.max(maxY, el.y + h);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Deep-clone a library item onto the canvas at (x, y) with fresh ids. */
export function stampLibraryItem(
  item: DrawingLibraryItem,
  x: number,
  y: number,
): LibraryElement[] {
  const source = item.elements;
  const b = boundsOf(source);
  const dx = x - b.minX;
  const dy = y - b.minY;

  const idMap = new Map<string, string>();
  const groupMap = new Map<string, string>();

  for (const el of source) {
    idMap.set(el.id, newId());
    for (const g of el.groupIds ?? []) {
      if (!groupMap.has(g)) groupMap.set(g, newId());
    }
  }

  return source.map((el) => {
    const clone = structuredClone(el) as LibraryElement;
    clone.id = idMap.get(el.id) ?? newId();
    clone.x = el.x + dx;
    clone.y = el.y + dy;
    clone.seed = Math.floor(Math.random() * 2 ** 31);
    clone.version = 1;
    clone.versionNonce = Math.floor(Math.random() * 2 ** 31);
    clone.updated = Date.now();
    clone.isDeleted = false;
    clone.groupIds = (el.groupIds ?? []).map((g) => groupMap.get(g) ?? g);

    if (clone.boundElements && Array.isArray(clone.boundElements)) {
      clone.boundElements = clone.boundElements.map((be) => ({
        ...be,
        id: idMap.get(be.id) ?? be.id,
      }));
    }

    if (clone.containerId && idMap.has(clone.containerId)) {
      clone.containerId = idMap.get(clone.containerId)!;
    }

    if (clone.startBinding?.elementId) {
      const mapped = idMap.get(clone.startBinding.elementId);
      clone.startBinding = mapped
        ? { ...clone.startBinding, elementId: mapped }
        : null;
    }
    if (clone.endBinding?.elementId) {
      const mapped = idMap.get(clone.endBinding.elementId);
      clone.endBinding = mapped
        ? { ...clone.endBinding, elementId: mapped }
        : null;
    }

    return clone;
  });
}

function makeLabel(
  text: string,
  x: number,
  y: number,
  width: number,
): LibraryElement {
  return {
    id: newId(),
    type: "text",
    x: x + width / 2 - Math.min(120, text.length * 5),
    y: y - 28,
    width: Math.min(240, Math.max(60, text.length * 10)),
    height: 24,
    angle: 0,
    strokeColor: "#1a2b3c",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    text,
    fontSize: 16,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "top",
    baseline: 18,
    containerId: null,
    originalText: text,
    lineHeight: 1.25,
    seed: Math.floor(Math.random() * 2 ** 31),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    isDeleted: false,
    groupIds: [],
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
  };
}

export function materializeScene(
  plan: ExcalidrawScenePlan,
): MaterializedScene {
  const library = loadAllDrawingLibraries();
  const batches: RevealBatch[] = [];

  for (const placement of plan.placements) {
    const item = library[placement.itemIndex];
    if (!item) continue;

    const stamped = stampLibraryItem(item, placement.x, placement.y);
    const batchElements = [...stamped];

    if (placement.label?.trim()) {
      batchElements.push(
        makeLabel(
          placement.label.trim(),
          placement.x,
          placement.y,
          item.width,
        ),
      );
    }

    batches.push({
      name: `${item.pack}/${item.name}`,
      elements: batchElements,
    });
  }

  if (!batches.length) {
    throw new Error("No valid library placements in plan");
  }

  return {
    plan,
    batches,
    elements: batches.flatMap((b) => b.elements),
  };
}
