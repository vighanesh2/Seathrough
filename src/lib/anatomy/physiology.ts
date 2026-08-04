import type {
  AnatomyStructureId,
  CardiacPhase,
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
