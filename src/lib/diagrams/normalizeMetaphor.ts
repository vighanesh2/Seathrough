/** Collapse synonym metaphor keys so Trigger can KEEP instead of redrawing. */
export function normalizeMetaphorKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  const k = key.trim().toLowerCase().replace(/\s+/g, "-");
  if (!k) return undefined;

  if (["classroom", "blueprint", "class", "template"].includes(k)) {
    return "classroom";
  }
  if (["cycle", "loop", "maze", "conveyor", "for-loop", "while-loop"].includes(k)) {
    return "cycle";
  }
  if (["stack", "plates", "pile", "call-stack"].includes(k)) {
    return "stack";
  }
  if (["circle", "round", "circular"].includes(k)) return "circle";
  if (["square", "rectangle", "rect"].includes(k)) return "square";
  if (["triangle", "triangular"].includes(k)) return "triangle";
  if (["line", "line-segment", "segment"].includes(k)) return "line";
  if (["tree", "binary-tree", "bst"].includes(k)) return "tree";
  if (["pentagon", "hexagon", "heptagon", "octagon", "nonagon", "decagon"].includes(k)) {
    return k;
  }
  return k;
}
