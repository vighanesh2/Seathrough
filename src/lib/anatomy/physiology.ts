import type {
  AnatomyStructureId,
  CardiacPhase,
  VisionPhase,
} from "@/lib/anatomy/types";

export const CARDIOPULMONARY_FLOW_ORDER: AnatomyStructureId[] = [
  "superior-vena-cava",
  "right-atrium",
  "tricuspid-valve",
  "right-ventricle",
  "pulmonary-valve",
  "pulmonary-trunk",
  "right-pulmonary-artery",
  "right-lung",
  "alveoli",
  "right-pulmonary-veins",
  "left-atrium",
  "mitral-valve",
  "left-ventricle",
  "aortic-valve",
  "aorta",
];

/** Anatomical order of the educational light → brain pathway. */
export const VISION_FLOW_ORDER: AnatomyStructureId[] = [
  "cornea",
  "aqueous-humor",
  "pupil",
  "lens",
  "vitreous",
  "retina",
  "fovea",
  "photoreceptors",
  "optic-nerve",
  "visual-cortex",
];

export type CardiacValveState = {
  tricuspidOpen: boolean;
  mitralOpen: boolean;
  pulmonaryOpen: boolean;
  aorticOpen: boolean;
};

export function cardiacPhaseAt(cycleFraction: number): CardiacPhase {
  const cycle = ((cycleFraction % 1) + 1) % 1;
  if (cycle < 0.48) return "filling";
  if (cycle < 0.6) return "atrial-systole";
  if (cycle < 0.72) return "ventricular-systole";
  return "ejection";
}

export function valveStateForPhase(
  phase: CardiacPhase,
): CardiacValveState {
  const atrioventricularOpen =
    phase === "filling" || phase === "atrial-systole";
  const semilunarOpen = phase === "ejection";
  return {
    tricuspidOpen: atrioventricularOpen,
    mitralOpen: atrioventricularOpen,
    pulmonaryOpen: semilunarOpen,
    aorticOpen: semilunarOpen,
  };
}

export function visionPhaseAt(cycleFraction: number): VisionPhase {
  const cycle = ((cycleFraction % 1) + 1) % 1;
  if (cycle < 0.22) return "incoming";
  if (cycle < 0.42) return "focusing";
  if (cycle < 0.62) return "inverted";
  if (cycle < 0.8) return "transducing";
  return "cortical";
}

/** Pupil radius scale: 1 = mid, larger = dilated, smaller = constricted. */
export function pupilScaleAt(
  cycleFraction: number,
  mode: string,
): number {
  if (mode === "pupil-reflex") {
    const cycle = ((cycleFraction % 1) + 1) % 1;
    // Bright light → constrict, then recover.
    if (cycle < 0.18) return 1.35;
    if (cycle < 0.45) return 0.55 + (0.45 - cycle) * 0.4;
    if (cycle < 0.7) return 0.55;
    return 0.55 + (cycle - 0.7) * 2.5;
  }
  return 1;
}

/** Lens axial thickness scale for accommodation demo. */
export function lensThicknessAt(
  cycleFraction: number,
  mode: string,
): number {
  if (mode === "accommodation") {
    const cycle = ((cycleFraction % 1) + 1) % 1;
    // Distant (thin) → near (thick) → distant.
    return cycle < 0.5
      ? 0.85 + cycle * 0.7
      : 1.2 - (cycle - 0.5) * 0.7;
  }
  return 1;
}
