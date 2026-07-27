import { icons as tablerIcons } from "@iconify-json/tabler";
import { getIconData, iconToSVG } from "@iconify/utils";

/**
 * Curated Tabler outline icons for teaching sketches.
 * AI must pick from this set (aliases resolve here).
 */
export const ICON_ALLOWLIST = [
  "school",
  "building-community",
  "building",
  "door",
  "car",
  "plane",
  "plane-tilt",
  "rocket",
  "heart",
  "hexagon",
  "pentagon",
  "octagon",
  "triangle",
  "circle",
  "circle-dot",
  "square",
  "rectangle",
  "line",
  "arrow-right",
  "arrow-up",
  "arrow-down",
  "arrows-exchange",
  "stack-2",
  "stack",
  "binary-tree",
  "hierarchy",
  "repeat",
  "refresh",
  "reload",
  "route",
  "map",
  "book",
  "notebook",
  "code",
  "brackets",
  "variable",
  "box",
  "package",
  "database",
  "server",
  "cpu",
  "bulb",
  "message",
  "user",
  "users",
  "settings",
  "tool",
  "math",
  "math-function",
  "calculator",
  "shape",
  "geometry",
  "polygon",
  "star",
  "home",
  "world",
  "leaf",
  "tree",
  "atom",
  "flask",
  "chart-bar",
  "chart-line",
  "list",
  "list-check",
  "checkbox",
  "x",
  "check",
  "question-mark",
  "info-circle",
  "alert-circle",
  "player-play",
  "clock",
  "hourglass",
  "layers-linked",
  "link",
  "git-branch",
  "folder",
  "file-code",
  "terminal-2",
  "brand-javascript",
  "brand-python",
  "assembly",
] as const;

const ALIASES: Record<string, string> = {
  classroom: "school",
  class: "school",
  school: "school",
  airplane: "plane",
  aeroplane: "plane",
  jet: "plane",
  plane: "plane",
  car: "car",
  vehicle: "car",
  heart: "heart",
  love: "heart",
  hexagon: "hexagon",
  pentagon: "pentagon",
  octagon: "octagon",
  triangle: "triangle",
  circle: "circle",
  square: "square",
  rectangle: "rectangle",
  loop: "repeat",
  iterate: "repeat",
  cycle: "refresh",
  stack: "stack-2",
  tree: "binary-tree",
  bst: "binary-tree",
  hierarchy: "hierarchy",
  idea: "bulb",
  bulb: "bulb",
  lightbulb: "bulb",
  code: "code",
  function: "math-function",
  database: "database",
  server: "server",
  book: "book",
  rocket: "rocket",
  arrow: "arrow-right",
  user: "user",
  people: "users",
  box: "box",
  package: "package",
  link: "link",
  folder: "folder",
  clock: "clock",
  time: "clock",
  star: "star",
  home: "home",
  world: "world",
  leaf: "leaf",
  atom: "atom",
  flask: "flask",
  chart: "chart-bar",
  list: "list",
  check: "check",
  info: "info-circle",
  warning: "alert-circle",
  terminal: "terminal-2",
  javascript: "brand-javascript",
  python: "brand-python",
  geometry: "geometry",
  polygon: "polygon",
  door: "door",
  building: "building-community",
};

export type ResolvedIcon = {
  name: string;
  viewBox: string;
  body: string;
};

/** Normalize model output like "tabler:car", "Car", "icon-car" → allowlisted name */
export function resolveIconName(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let name = raw.trim().toLowerCase();
  name = name.replace(/^tabler:/, "").replace(/^icon-/, "").replace(/\s+/g, "-");

  if (ALIASES[name]) name = ALIASES[name];

  if (isAllowed(name)) return name;

  for (const [alias, target] of Object.entries(ALIASES)) {
    if (name.includes(alias) && isAllowed(target)) return target;
  }

  return undefined;
}

export function isAllowed(name: string): boolean {
  return (
    (ICON_ALLOWLIST as readonly string[]).includes(name) &&
    Boolean(tablerIcons.icons[name])
  );
}

export function getTablerSvg(iconName: string): ResolvedIcon | null {
  const name = resolveIconName(iconName);
  if (!name) return null;

  const data = getIconData(tablerIcons, name);
  if (!data) return null;

  const svg = iconToSVG(data, { height: "100%" });
  return {
    name,
    viewBox: svg.attributes.viewBox ?? "0 0 24 24",
    body: svg.body,
  };
}

/** Compact list for the LLM system prompt */
export function iconAllowlistForPrompt(): string {
  return [
    "school",
    "car",
    "plane",
    "heart",
    "hexagon",
    "pentagon",
    "octagon",
    "triangle",
    "circle",
    "square",
    "stack-2",
    "binary-tree",
    "repeat",
    "refresh",
    "bulb",
    "code",
    "box",
    "database",
    "book",
    "rocket",
    "arrow-right",
    "user",
    "users",
    "door",
    "shape",
    "geometry",
    "star",
    "clock",
    "link",
    "terminal-2",
    "chart-bar",
    "list",
    "check",
    "info-circle",
    "building-community",
  ].join(", ");
}
