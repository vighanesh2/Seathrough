import {
  retrieveKnowledge,
  type AnatomyKnowledgeEntry,
} from "@/lib/anatomy/knowledge/shared";
import type { AnatomyStructureId } from "@/lib/anatomy/types";

export const BRAIN_KNOWLEDGE: AnatomyKnowledgeEntry[] = [
  {
    id: "cerebral-lobes",
    title: "Functional organization of the cerebral lobes",
    keywords: ["brain", "cerebrum", "lobe", "lobes", "frontal", "parietal", "temporal", "occipital", "function"],
    structureIds: ["cerebrum", "frontal-lobe", "parietal-lobe", "temporal-lobe", "occipital-lobe"],
    sourceKey: "cerebralLobes",
    excerpt:
      "The cerebral cortex is regionally specialized. Frontal regions contribute to executive and motor functions; parietal regions integrate somatic sensation and spatial information; temporal regions support auditory processing, language, and memory; and occipital regions process vision.",
  },
  {
    id: "sensory-processing",
    title: "Sensory information reaches specialized cortex",
    keywords: ["sensory", "sensation", "touch", "vision", "hearing", "signal", "process", "input"],
    structureIds: ["parietal-lobe", "temporal-lobe", "occipital-lobe", "brainstem"],
    sourceKey: "brainAnatomy",
    excerpt:
      "Ascending sensory pathways relay information through the brainstem and other central relays to specialized cortical regions, where signals are integrated into perception.",
  },
  {
    id: "motor-control",
    title: "Motor commands and coordination",
    keywords: ["motor", "movement", "move", "coordination", "balance", "cerebellum", "frontal"],
    structureIds: ["frontal-lobe", "cerebellum", "brainstem", "spinal-cord"],
    sourceKey: "brainAnatomy",
    excerpt:
      "Voluntary motor commands arise from frontal motor regions and descend toward the brainstem and spinal cord. The cerebellum helps refine timing, precision, balance, and motor learning.",
  },
  {
    id: "brainstem-pathway",
    title: "Brainstem and spinal cord connection",
    keywords: ["brainstem", "spinal", "cord", "automatic", "breathing", "pathway", "body"],
    structureIds: ["brainstem", "spinal-cord", "brain"],
    sourceKey: "brainAnatomy",
    excerpt:
      "The brainstem connects higher brain regions with the spinal cord, contains major ascending and descending pathways, and participates in vital automatic functions including breathing and arousal.",
  },
];

export function retrieveBrainKnowledge(
  question: string,
  selectedStructure?: AnatomyStructureId | null,
  limit = 4,
): AnatomyKnowledgeEntry[] {
  return retrieveKnowledge(BRAIN_KNOWLEDGE, question, selectedStructure, limit);
}
