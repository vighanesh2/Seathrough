import { ANATOMY_SOURCES } from "@/lib/anatomy/registry";
import type {
  AnatomyCitation,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

export type AnatomyKnowledgeEntry = {
  id: string;
  title: string;
  keywords: string[];
  structureIds: AnatomyStructureId[];
  sourceKey: keyof typeof ANATOMY_SOURCES;
  excerpt: string;
};

export const CARDIOPULMONARY_KNOWLEDGE: AnatomyKnowledgeEntry[] = [
  {
    id: "complete-blood-route",
    title: "Normal route of blood through the heart and lungs",
    keywords: ["blood", "flow", "route", "pump", "body", "circulation", "oxygenated", "deoxygenated"],
    structureIds: [
      "superior-vena-cava",
      "inferior-vena-cava",
      "right-atrium",
      "tricuspid-valve",
      "right-ventricle",
      "pulmonary-valve",
      "pulmonary-trunk",
      "right-pulmonary-artery",
      "left-pulmonary-artery",
      "alveoli",
      "right-pulmonary-veins",
      "left-pulmonary-veins",
      "left-atrium",
      "mitral-valve",
      "left-ventricle",
      "aortic-valve",
      "aorta",
    ],
    sourceKey: "pulmonaryCirculation",
    excerpt:
      "Systemic venous blood enters the right atrium through the venae cavae, crosses the tricuspid valve into the right ventricle, and is ejected through the pulmonary valve and pulmonary arteries. After pulmonary capillary gas exchange, pulmonary veins return oxygenated blood to the left atrium; it crosses the mitral valve, enters the left ventricle, and is ejected through the aortic valve into the aorta.",
  },
  {
    id: "right-heart",
    title: "Right heart and pulmonary outflow",
    keywords: ["right", "atrium", "ventricle", "tricuspid", "pulmonary", "deoxygenated", "vena cava"],
    structureIds: [
      "right-atrium",
      "tricuspid-valve",
      "right-ventricle",
      "pulmonary-valve",
      "pulmonary-trunk",
    ],
    sourceKey: "heartAnatomy",
    excerpt:
      "The right atrium receives systemic venous blood. Blood passes through the tricuspid valve into the right ventricle, which pumps it across the pulmonary valve into the pulmonary artery for delivery to the lungs.",
  },
  {
    id: "left-heart",
    title: "Left heart and systemic outflow",
    keywords: ["left", "atrium", "ventricle", "mitral", "aortic", "aorta", "systemic", "oxygenated"],
    structureIds: [
      "right-pulmonary-veins",
      "left-pulmonary-veins",
      "left-atrium",
      "mitral-valve",
      "left-ventricle",
      "aortic-valve",
      "aorta",
    ],
    sourceKey: "heartAnatomy",
    excerpt:
      "Four pulmonary veins return oxygenated blood to the left atrium. Blood passes through the mitral valve into the left ventricle, whose contraction ejects it through the aortic valve and aorta into systemic circulation.",
  },
  {
    id: "valves",
    title: "One-way cardiac valves",
    keywords: ["valve", "valves", "open", "close", "backflow", "tricuspid", "mitral", "pulmonary", "aortic"],
    structureIds: [
      "tricuspid-valve",
      "pulmonary-valve",
      "mitral-valve",
      "aortic-valve",
    ],
    sourceKey: "heartAnatomy",
    excerpt:
      "The atrioventricular valves lie between atria and ventricles, and the semilunar valves lie at the ventricular outflows. Pressure differences open and close them so forward flow is favored and regurgitation is limited.",
  },
  {
    id: "cardiac-cycle",
    title: "Filling and ejection during the cardiac cycle",
    keywords: ["heartbeat", "cardiac", "cycle", "systole", "diastole", "contract", "relax", "filling", "ejection"],
    structureIds: [
      "right-atrium",
      "left-atrium",
      "right-ventricle",
      "left-ventricle",
      "tricuspid-valve",
      "mitral-valve",
      "pulmonary-valve",
      "aortic-valve",
    ],
    sourceKey: "heartAnatomy",
    excerpt:
      "During ventricular filling, blood moves from atria through the atrioventricular valves. Ventricular contraction raises pressure, closes those valves, and then opens the pulmonary and aortic valves for ejection.",
  },
  {
    id: "pulmonary-circuit",
    title: "Pulmonary circulation is a low-pressure gas-exchange circuit",
    keywords: ["pulmonary", "circulation", "pressure", "resistance", "capillary", "lung"],
    structureIds: [
      "right-ventricle",
      "pulmonary-trunk",
      "right-pulmonary-artery",
      "left-pulmonary-artery",
      "alveoli",
      "right-pulmonary-veins",
      "left-pulmonary-veins",
      "left-atrium",
    ],
    sourceKey: "pulmonarySystem",
    excerpt:
      "Pulmonary circulation receives the entire cardiac output from the right heart and is normally a low-pressure, low-resistance circuit specialized for ventilation and gas exchange.",
  },
  {
    id: "gas-exchange",
    title: "Alveolar gas exchange",
    keywords: ["alveoli", "alveolar", "oxygen", "carbon", "dioxide", "co2", "o2", "gas", "exchange", "capillary", "diffusion"],
    structureIds: ["alveoli", "right-lung", "left-lung"],
    sourceKey: "lungAnatomy",
    excerpt:
      "At the alveolar-capillary interface, oxygen from inhaled gas enters pulmonary capillary blood while carbon dioxide produced by tissue metabolism moves from blood into alveoli to be exhaled.",
  },
  {
    id: "ventilation",
    title: "Air movement and the diaphragm",
    keywords: ["breathe", "breathing", "inhale", "exhale", "air", "ventilation", "diaphragm", "trachea", "bronchi"],
    structureIds: [
      "trachea",
      "main-bronchi",
      "right-lung",
      "left-lung",
      "diaphragm",
      "alveoli",
    ],
    sourceKey: "lungAnatomy",
    excerpt:
      "Air passes through conducting airways into the branching bronchial tree and ultimately reaches alveoli. Diaphragm contraction increases thoracic volume during inspiration; relaxation contributes to expiration.",
  },
  {
    id: "artery-vein-naming",
    title: "Why pulmonary arteries carry deoxygenated blood",
    keywords: ["why", "artery", "vein", "pulmonary", "deoxygenated", "oxygenated", "name"],
    structureIds: [
      "right-pulmonary-artery",
      "left-pulmonary-artery",
      "right-pulmonary-veins",
      "left-pulmonary-veins",
    ],
    sourceKey: "pulmonaryCirculation",
    excerpt:
      "Arteries are named for carrying blood away from the heart and veins for carrying blood toward it. Pulmonary arteries therefore carry deoxygenated blood away from the right ventricle, while pulmonary veins carry oxygenated blood toward the left atrium.",
  },
  {
    id: "dual-lung-circulation",
    title: "Pulmonary and bronchial circulations",
    keywords: ["bronchial", "dual", "two", "circulations", "lung", "supply"],
    structureIds: ["right-lung", "left-lung", "alveoli"],
    sourceKey: "lungCirculation",
    excerpt:
      "The lungs have two blood supplies: pulmonary circulation carries the cardiac output for gas exchange, while bronchial circulation is a small systemic supply serving airway and supporting tissues.",
  },
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function retrieveCardiopulmonaryKnowledge(
  question: string,
  selectedStructure?: AnatomyStructureId | null,
  limit = 4,
): AnatomyKnowledgeEntry[] {
  const tokens = new Set(tokenize(question));
  if (!tokens.size && !selectedStructure) return [];

  return CARDIOPULMONARY_KNOWLEDGE.map((entry) => {
    let score = 0;
    for (const keyword of entry.keywords) {
      const keywordTokens = tokenize(keyword);
      if (keywordTokens.every((token) => tokens.has(token))) {
        score += keywordTokens.length === 1 ? 2 : 4;
      }
    }
    if (
      selectedStructure &&
      entry.structureIds.includes(selectedStructure)
    ) {
      score += 3;
    }
    return { entry, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
}

export function citationsForKnowledge(
  entries: AnatomyKnowledgeEntry[],
): AnatomyCitation[] {
  const seen = new Set<string>();
  const citations: AnatomyCitation[] = [];
  for (const entry of entries) {
    const source = ANATOMY_SOURCES[entry.sourceKey];
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    citations.push({ ...source, excerpt: entry.excerpt });
  }
  return citations;
}
