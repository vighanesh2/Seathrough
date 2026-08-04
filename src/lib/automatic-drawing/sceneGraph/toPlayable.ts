import type { PlayableStroke } from "@/lib/automatic-drawing/strokePlan";
import type {
  SceneGraph,
  SceneNode,
  SceneStrokeNode,
  SceneFillNode,
} from "@/lib/automatic-drawing/sceneGraph/schema";

const STYLE_BASE_WIDTH: Record<string, number> = {
  outline: 3,
  "outline-bold": 5,
  "outline-fine": 1.5,
  detail: 2,
  hatching: 1.5,
  crosshatch: 1.2,
  sketch: 2.5,
  gesture: 3.2,
  underdrawing: 1.5,
  soft: 4,
  wash: 6,
  scumble: 5,
  texture: 3,
  accent: 3.5,
  highlight: 3,
  construction: 2.5,
};

type Leaf = {
  node: SceneStrokeNode | SceneFillNode;
  depth: number;
};

function collect(node: SceneNode, depth: number, out: Leaf[]) {
  if (node.type === "stroke" || node.type === "fill") {
    out.push({ node, depth });
    return;
  }
  for (const child of node.children) {
    collect(child, depth + 1, out);
  }
}

function strokeWidth(style: string | undefined, weight: number | undefined) {
  const base = STYLE_BASE_WIDTH[style ?? "outline"] ?? 2.5;
  return Math.max(1, Math.min(14, base * (weight ?? 1)));
}

function withAlpha(color: string, opacity: number): string {
  const o = Math.max(0.05, Math.min(1, opacity));
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    let r: number;
    let g: number;
    let b: number;
    if (color.length === 4) {
      r = parseInt(color[1]! + color[1]!, 16);
      g = parseInt(color[2]! + color[2]!, 16);
      b = parseInt(color[3]! + color[3]!, 16);
    } else {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${o})`;
  }
  return color;
}

/** Deterministic hash for slight hand wobble (aiSketch-style tremor). */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wobblePoints(
  points: Array<{ x: number; y: number }>,
  seed: number,
  amount: number,
): Array<{ x: number; y: number }> {
  if (amount <= 0 || points.length < 2) return points;
  return points.map((p, i) => {
    const n1 = Math.sin(seed * 0.001 + i * 1.7) * amount;
    const n2 = Math.cos(seed * 0.0013 + i * 2.3) * amount;
    return { x: p.x + n1, y: p.y + n2 };
  });
}

export function sceneGraphToPlayable(
  scene: SceneGraph,
  options?: { wobble?: number },
): {
  title: string;
  width: number;
  height: number;
  strokes: PlayableStroke[];
} {
  const width = scene.canvas.width;
  const height = scene.canvas.height;
  const wobble = options?.wobble ?? 0.65;
  const leaves: Leaf[] = [];
  collect(scene.root, 0, leaves);

  leaves.sort((a, b) => {
    const la = a.node.layer ?? 0;
    const lb = b.node.layer ?? 0;
    if (la !== lb) return la - lb;
    return a.depth - b.depth;
  });

  const strokes: PlayableStroke[] = [];

  if (scene.background && scene.background.toLowerCase() !== "#ffffff") {
    strokes.push({
      color: scene.background,
      width: 1,
      fill: true,
      points: [
        { x: 0, y: 0 },
        { x: width, y: 0 },
        { x: width, y: height },
        { x: 0, y: height },
      ],
    });
  }

  for (const leaf of leaves) {
    const raw = leaf.node.points.map(([x, y]) => ({ x, y }));
    if (raw.length < 2) continue;

    if (leaf.node.type === "fill") {
      if (raw.length < 3) continue;
      strokes.push({
        color: withAlpha(leaf.node.color, leaf.node.opacity),
        width: 1,
        fill: true,
        points: raw,
      });
      continue;
    }

    const seed = hashSeed(leaf.node.name);
    const amount =
      leaf.node.style === "underdrawing" || leaf.node.style === "construction"
        ? wobble * 0.25
        : wobble;
    strokes.push({
      color: leaf.node.color,
      width: strokeWidth(leaf.node.style, leaf.node.weight),
      points: wobblePoints(raw, seed, amount),
    });
  }

  if (!strokes.length) {
    throw new Error("Scene graph produced no drawable strokes");
  }

  return {
    title: scene.name.slice(0, 120),
    width,
    height,
    strokes,
  };
}
