/**
 * Product mode contract — each feature plugs in by exporting a ModeDefinition.
 * Disable a mode (`enabled: false`) to hide it from home + nav without deleting code.
 */

export type ModeId =
  | "lessons"
  | "screenshot-explain"
  | "leetcode"
  | "figures-3d"
  | "automatic-drawing"
  | "draw-engine";

export type ModeKind = "learning" | "tool";

export type ModeDefinition = {
  /** Stable id — used in registry lookups and analytics. */
  id: ModeId;
  /** URL path for this mode’s workspace. */
  href: string;
  /** Short label for nav chips. */
  navLabel: string;
  /** Full title on home + page metadata. */
  title: string;
  /** One-line home description. */
  description: string;
  /** learning = primary product; tool = lower-priority / demo. */
  kind: ModeKind;
  /** Sort order on home (lower first). */
  order: number;
  /** Plug-out switch: false hides from home and ModeNav. */
  enabled: boolean;
  /** Soft badge on home. */
  badge?: "new" | "beta" | "lab";
  /** Whether this mode drives the shared whiteboard + narration stack. */
  usesWhiteboard: boolean;
  /** Page <title> suffix is handled by callers. */
  metaTitle: string;
  metaDescription: string;
};
