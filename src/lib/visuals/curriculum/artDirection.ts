/**
 * Locked visual art direction for the tutor board.
 * Keep assets + Rough/GSAP styling consistent with this until product says otherwise.
 */
export const ART_DIRECTION = {
  id: "blackboard-stroke",
  label: "Stroke blackboard (current)",
  /** Soft green strokes on dark board — matches existing catalog / RoughSketch */
  stroke: "#7dcea0",
  muted: "#8fa398",
  ink: "#dfe8e3",
  warm: "#e5c07b",
  boardBg: "#1c2621",
  viewBox: "0 0 480 280",
  notes:
    "Prefer stroke-only SVG paths for GSAP reveal. No photo-real or filled illustration packs until we revisit.",
} as const;

export type ArtDirection = typeof ART_DIRECTION;
