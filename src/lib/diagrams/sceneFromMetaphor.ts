import { resolveScene } from "@/lib/diagrams/resolveScene";
import type { DiagramScene } from "@/types/lesson";

/** @deprecated Use resolveScene — kept for compatibility */
export function sceneFromMetaphor(
  metaphorKey: string | undefined,
  label?: string,
): DiagramScene | null {
  return resolveScene({ metaphorKey, label, conceptKey: metaphorKey });
}
