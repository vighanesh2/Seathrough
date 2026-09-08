import {
  retrieveKnowledge,
  type AnatomyKnowledgeEntry,
} from "@/lib/anatomy/knowledge/shared";
import type { AnatomyStructureId } from "@/lib/anatomy/types";

export const KIDNEY_KNOWLEDGE: AnatomyKnowledgeEntry[] = [
  {
    id: "kidney-overview",
    title: "Kidney organization and function",
    keywords: ["kidney", "renal", "function", "work", "cortex", "medulla", "blood", "urine"],
    structureIds: ["kidney", "renal-cortex", "renal-medulla", "renal-pelvis", "ureter"],
    sourceKey: "kidneyAnatomy",
    excerpt:
      "Each kidney has an outer cortex and inner medulla. It filters plasma, regulates water and solute balance, and conveys the resulting urine through collecting structures to the renal pelvis and ureter.",
  },
  {
    id: "filtration",
    title: "Glomerular filtration",
    keywords: ["filter", "filtration", "glomerulus", "glomerular", "blood", "plasma", "artery"],
    structureIds: ["renal-artery", "renal-cortex", "glomerulus", "nephron", "renal-vein"],
    sourceKey: "renalPhysiology",
    excerpt:
      "Blood reaches glomerular capillaries through the renal circulation. Water and small solutes cross the filtration barrier into the nephron, while cells and most large proteins remain in the blood.",
  },
  {
    id: "reabsorption",
    title: "Tubular reabsorption and secretion",
    keywords: ["reabsorption", "reabsorb", "secretion", "tubule", "nephron", "water", "salt", "glucose"],
    structureIds: ["nephron", "renal-cortex", "renal-medulla", "collecting-duct"],
    sourceKey: "renalPhysiology",
    excerpt:
      "Nephron tubules selectively return needed water and solutes to the blood and secrete additional substances into tubular fluid. These processes transform the initial filtrate before final urine leaves the kidney.",
  },
  {
    id: "urine-flow",
    title: "Urine flows to the ureter",
    keywords: ["urine", "flow", "collecting", "duct", "pelvis", "ureter", "bladder"],
    structureIds: ["collecting-duct", "renal-medulla", "renal-pelvis", "ureter"],
    sourceKey: "kidneyAnatomy",
    excerpt:
      "Collecting ducts carry final tubular fluid through the medulla. Urine drains through papillary and calyceal spaces into the renal pelvis, then enters the ureter for transport toward the bladder.",
  },
];

export function retrieveKidneyKnowledge(
  question: string,
  selectedStructure?: AnatomyStructureId | null,
  limit = 4,
): AnatomyKnowledgeEntry[] {
  return retrieveKnowledge(KIDNEY_KNOWLEDGE, question, selectedStructure, limit);
}
