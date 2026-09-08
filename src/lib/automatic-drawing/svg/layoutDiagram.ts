import ELK from "elkjs/lib/elk.bundled.js";
import type { SemanticDiagram } from "@/lib/automatic-drawing/svg/schema";

const WIDTH = 900;
const HEIGHT = 600;
const CONTENT = { x: 42, y: 88, width: 816, height: 416 };
const NODE_HEIGHT = 76;

type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };

type LayoutNode = Box & {
  id: string;
};

type LayoutSection = {
  startPoint: Point;
  bendPoints?: Point[];
  endPoint: Point;
};

type LayoutEdge = {
  id: string;
  sections?: LayoutSection[];
};

type LayoutGraph = Box & {
  children?: LayoutNode[];
  edges?: LayoutEdge[];
};

export type DiagramLayoutInspection = {
  pass: boolean;
  issues: string[];
};

const PALETTE = {
  primary: { fill: "#dceefa", stroke: "#287fb5", accent: "#287fb5" },
  supporting: { fill: "#e7f6f1", stroke: "#54bfa3", accent: "#2a8d76" },
  outcome: { fill: "#fff1df", stroke: "#e6a23c", accent: "#b87314" },
} as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function nodeWidth(label: string, detail: string): number {
  return Math.max(
    172,
    Math.min(290, Math.max(label.length * 8.2, detail.length * 5.8) + 58),
  );
}

function directionFor(kind: SemanticDiagram["kind"]): "RIGHT" | "DOWN" {
  return kind === "hierarchy" || kind === "comparison" ? "DOWN" : "RIGHT";
}

function intersects(a: Box, b: Box, padding = 0): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function pathFor(section: LayoutSection): string {
  const points = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ];
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
    .join(" ");
}

function midpoint(section: LayoutSection): Point {
  const points = [
    section.startPoint,
    ...(section.bendPoints ?? []),
    section.endPoint,
  ];
  const index = Math.floor((points.length - 1) / 2);
  const a = points[index]!;
  const b = points[index + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function inspectBoxes(boxes: Box[]): DiagramLayoutInspection {
  const issues: string[] = [];
  for (const box of boxes) {
    if (
      box.x < CONTENT.x ||
      box.y < CONTENT.y ||
      box.x + box.width > CONTENT.x + CONTENT.width ||
      box.y + box.height > CONTENT.y + CONTENT.height
    ) {
      issues.push("A node is outside the diagram content area.");
      break;
    }
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (intersects(boxes[i]!, boxes[j]!, 8)) {
        issues.push("Two diagram nodes overlap.");
        return { pass: false, issues };
      }
    }
  }
  return { pass: issues.length === 0, issues };
}

export async function renderSemanticDiagram(input: SemanticDiagram): Promise<{
  svg: string;
  inspection: DiagramLayoutInspection;
}> {
  const elk = new ELK();
  const graph = (await elk.layout({
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": directionFor(input.kind),
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "20",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
      "elk.padding": "[top=12,left=12,bottom=12,right=12]",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    children: input.nodes.map((node) => ({
      id: node.id,
      width: nodeWidth(node.label, node.detail),
      height: NODE_HEIGHT,
    })),
    edges: input.edges.map((edge, index) => ({
      id: `edge-${index}`,
      sources: [edge.from],
      targets: [edge.to],
    })),
  })) as unknown as LayoutGraph;

  const graphWidth = Math.max(1, graph.width ?? CONTENT.width);
  const graphHeight = Math.max(1, graph.height ?? CONTENT.height);
  const scale = Math.min(
    1,
    CONTENT.width / graphWidth,
    CONTENT.height / graphHeight,
  );
  const offsetX = CONTENT.x + (CONTENT.width - graphWidth * scale) / 2;
  const offsetY = CONTENT.y + (CONTENT.height - graphHeight * scale) / 2;
  const transformPoint = (point: Point): Point => ({
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale,
  });

  const nodes = (graph.children ?? []).map((node) => ({
    ...node,
    x: offsetX + node.x * scale,
    y: offsetY + node.y * scale,
    width: node.width * scale,
    height: node.height * scale,
  }));
  const inspection = inspectBoxes(nodes);
  if (!inspection.pass) {
    throw new Error(`Diagram layout failed: ${inspection.issues.join(" ")}`);
  }

  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const layoutNodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeLabels: Box[] = [];
  const edgeMarkup = (graph.edges ?? [])
    .map((edge) => {
      const edgeIndex = Number(edge.id.replace(/^edge-/, ""));
      const semantic = input.edges[edgeIndex];
      const section = edge.sections?.[0];
      if (!semantic || !section) return "";
      const transformed: LayoutSection = {
        startPoint: transformPoint(section.startPoint),
        bendPoints: section.bendPoints?.map(transformPoint),
        endPoint: transformPoint(section.endPoint),
      };
      let label = "";
      if (semantic.label) {
        const center = midpoint(transformed);
        const width = Math.min(150, semantic.label.length * 7 + 18);
        const box = {
          x: center.x - width / 2,
          y: center.y - 12,
          width,
          height: 24,
        };
        const hitsNode = nodes.some((node) => intersects(box, node, 5));
        const hitsLabel = edgeLabels.some((prior) => intersects(box, prior, 4));
        if (!hitsNode && !hitsLabel) {
          edgeLabels.push(box);
          label = `<g>
            <rect x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" width="${box.width.toFixed(1)}" height="24" rx="12" fill="#ffffff" stroke="#d7e3eb"/>
            <text x="${center.x.toFixed(1)}" y="${(center.y + 4).toFixed(1)}" text-anchor="middle" font-family="Lexend, Arial, sans-serif" font-size="11" font-weight="600" fill="#60758a">${escapeXml(semantic.label)}</text>
          </g>`;
        }
      }
      return `<path d="${pathFor(transformed)}" fill="none" stroke="#7694aa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>${label}`;
    })
    .join("");

  const nodeMarkup = nodes
    .map((layoutNode) => {
      const node = nodeById.get(layoutNode.id);
      if (!node) return "";
      const colors = PALETTE[node.role];
      const fontScale = Math.max(0.78, scale);
      const labelSize = 16 * fontScale;
      const detailSize = 12 * fontScale;
      const iconRadius = 13 * fontScale;
      const centerY = layoutNode.y + layoutNode.height / 2;
      return `<g>
        <rect x="${layoutNode.x.toFixed(1)}" y="${layoutNode.y.toFixed(1)}" width="${layoutNode.width.toFixed(1)}" height="${layoutNode.height.toFixed(1)}" rx="${(18 * fontScale).toFixed(1)}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2.5"/>
        <circle cx="${(layoutNode.x + 24 * fontScale).toFixed(1)}" cy="${centerY.toFixed(1)}" r="${iconRadius.toFixed(1)}" fill="${colors.accent}"/>
        <text x="${(layoutNode.x + 47 * fontScale).toFixed(1)}" y="${(centerY - 8 * fontScale).toFixed(1)}" font-family="Lexend, Arial, sans-serif" font-size="${labelSize.toFixed(1)}" font-weight="700" fill="#17324a">${escapeXml(node.label)}</text>
        <text x="${(layoutNode.x + 47 * fontScale).toFixed(1)}" y="${(centerY + 14 * fontScale).toFixed(1)}" font-family="Lexend, Arial, sans-serif" font-size="${detailSize.toFixed(1)}" fill="#4f667a">${escapeXml(node.detail)}</text>
      </g>`;
    })
    .join("");

  // Validate all model references were laid out before rendering.
  if (
    input.nodes.some((node) => !layoutNodeById.has(node.id)) ||
    nodes.length !== input.nodes.length
  ) {
    throw new Error("Diagram layout omitted one or more nodes.");
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(input.title)}">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,7 L9,3.5 z" fill="#7694aa"/>
      </marker>
    </defs>
    <rect x="16" y="16" width="868" height="568" rx="28" fill="#f8fafc" stroke="#d7e3eb" stroke-width="2"/>
    <rect x="42" y="28" width="816" height="50" rx="16" fill="#ffffff" stroke="#c9d9e5" stroke-width="2"/>
    <text x="450" y="60" text-anchor="middle" font-family="Lexend, Arial, sans-serif" font-size="24" font-weight="700" fill="#17324a">${escapeXml(input.title)}</text>
    ${edgeMarkup}
    ${nodeMarkup}
    <rect x="92" y="520" width="716" height="44" rx="15" fill="#eef5fa" stroke="#c9d9e5"/>
    <circle cx="119" cy="542" r="8" fill="#287fb5"/>
    <text x="139" y="547" font-family="Lexend, Arial, sans-serif" font-size="14" font-weight="600" fill="#29465f">${escapeXml(input.takeaway)}</text>
  </svg>`;

  return { svg, inspection };
}
