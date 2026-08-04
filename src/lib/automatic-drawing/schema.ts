import { z } from "zod";
import type { LibraryElement } from "@/lib/automatic-drawing/library";

export const placementSchema = z.object({
  itemIndex: z.coerce.number().int().min(0).max(2000),
  x: z.coerce.number().min(0).max(2000),
  y: z.coerce.number().min(0).max(1400),
  label: z.string().trim().max(40).optional(),
});

export const excalidrawScenePlanSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Architecture diagram"),
  placements: z.array(placementSchema).min(1).max(20),
});

export type Placement = z.infer<typeof placementSchema>;
export type ExcalidrawScenePlan = z.infer<typeof excalidrawScenePlanSchema>;

export type RevealBatch = {
  /** Library item name for UI */
  name: string;
  elements: LibraryElement[];
};

export type MaterializedScene = {
  plan: ExcalidrawScenePlan;
  /** Batches in draw order — one library stamp (plus optional label) per batch */
  batches: RevealBatch[];
  /** Flat element list for convenience */
  elements: LibraryElement[];
};
