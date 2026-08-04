import type {
  AnatomyAnimationMode,
  AnatomySource,
  AnatomyStructure,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

export const ANATOMY_SOURCES: Record<string, AnatomySource> = {
  pulmonaryCirculation: {
    id: "pulmonary-circulation",
    title: "Physiology, Pulmonary Circulation",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK518997/",
  },
  pulmonarySystem: {
    id: "pulmonary-circulatory-system",
    title: "Physiology, Pulmonary Circulatory System",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK525948/",
  },
  heartAnatomy: {
    id: "heart-anatomy",
    title: "Anatomy, Thorax, Heart",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK470256/",
  },
  lungAnatomy: {
    id: "lung-anatomy",
    title: "Anatomy, Thorax, Lungs",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK470197/",
  },
  lungCirculation: {
    id: "lung-circulation-review",
    title: "Lung Circulation",
    publisher: "Physiological Reviews / PubMed Central",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7432532/",
  },
};

const s = (
  id: AnatomyStructureId,
  label: string,
  shortLabel: string,
  system: AnatomyStructure["system"],
  description: string,
  fn: string,
  reveal: number,
  sourceIds: string[],
): AnatomyStructure => ({
  id,
  label,
  shortLabel,
  system,
  description,
  function: fn,
  reveal,
  sourceIds,
});

export const CARDIOPULMONARY_STRUCTURES: AnatomyStructure[] = [
  s("heart", "Heart", "Heart", "cardiac", "A four-chambered muscular pump in the mediastinum.", "Runs the pulmonary and systemic circuits as two pumps in series.", 1, ["heart-anatomy"]),
  s("right-atrium", "Right atrium", "RA", "cardiac", "The upper right receiving chamber.", "Receives systemic venous blood from the venae cavae.", 2, ["heart-anatomy"]),
  s("tricuspid-valve", "Tricuspid valve", "Tricuspid", "cardiac", "The right atrioventricular valve.", "Permits right-atrium-to-right-ventricle flow and limits backward flow during ventricular contraction.", 3, ["heart-anatomy"]),
  s("right-ventricle", "Right ventricle", "RV", "cardiac", "The lower right pumping chamber.", "Pumps deoxygenated blood through the pulmonary valve into the pulmonary trunk.", 2, ["heart-anatomy", "pulmonary-circulation"]),
  s("pulmonary-valve", "Pulmonary valve", "Pulmonary valve", "cardiac", "The semilunar valve at the right ventricular outflow.", "Opens during right-ventricular ejection and limits return from the pulmonary trunk.", 3, ["heart-anatomy"]),
  s("pulmonary-trunk", "Pulmonary trunk", "Pulmonary trunk", "vascular", "The vessel leaving the right ventricle before dividing.", "Carries deoxygenated blood toward both pulmonary arteries.", 3, ["pulmonary-circulation"]),
  s("right-pulmonary-artery", "Right pulmonary artery", "Right PA", "vascular", "The pulmonary artery serving the right lung.", "Carries deoxygenated blood to right-lung capillaries.", 3, ["pulmonary-circulation"]),
  s("left-pulmonary-artery", "Left pulmonary artery", "Left PA", "vascular", "The pulmonary artery serving the left lung.", "Carries deoxygenated blood to left-lung capillaries.", 3, ["pulmonary-circulation"]),
  s("right-lung", "Right lung", "Right lung", "pulmonary", "The three-lobed lung on the body's right.", "Ventilates alveoli and exchanges oxygen and carbon dioxide with pulmonary capillary blood.", 1, ["lung-anatomy"]),
  s("left-lung", "Left lung", "Left lung", "pulmonary", "The two-lobed lung shaped around the cardiac notch.", "Ventilates alveoli and exchanges oxygen and carbon dioxide with pulmonary capillary blood.", 1, ["lung-anatomy"]),
  s("alveoli", "Alveoli and pulmonary capillaries", "Alveoli", "pulmonary", "Microscopic air sacs closely apposed to capillary networks.", "Provide the thin interface where oxygen enters blood and carbon dioxide leaves it.", 5, ["lung-anatomy", "pulmonary-system"]),
  s("right-pulmonary-veins", "Right pulmonary veins", "Right PV", "vascular", "Pulmonary veins returning from the right lung.", "Return oxygenated blood to the left atrium.", 4, ["pulmonary-circulation", "heart-anatomy"]),
  s("left-pulmonary-veins", "Left pulmonary veins", "Left PV", "vascular", "Pulmonary veins returning from the left lung.", "Return oxygenated blood to the left atrium.", 4, ["pulmonary-circulation", "heart-anatomy"]),
  s("left-atrium", "Left atrium", "LA", "cardiac", "The upper left receiving chamber.", "Receives oxygenated pulmonary venous blood.", 2, ["heart-anatomy"]),
  s("mitral-valve", "Mitral valve", "Mitral", "cardiac", "The left atrioventricular valve.", "Permits left-atrium-to-left-ventricle flow and limits backward flow during ventricular contraction.", 3, ["heart-anatomy"]),
  s("left-ventricle", "Left ventricle", "LV", "cardiac", "The thick-walled lower left pumping chamber.", "Generates pressure to eject oxygenated blood into the aorta.", 2, ["heart-anatomy"]),
  s("aortic-valve", "Aortic valve", "Aortic valve", "cardiac", "The semilunar valve at the left ventricular outflow.", "Opens during left-ventricular ejection and limits return from the aorta.", 3, ["heart-anatomy"]),
  s("aorta", "Aorta", "Aorta", "vascular", "The main systemic artery.", "Distributes oxygenated blood from the left ventricle to the body.", 3, ["heart-anatomy"]),
  s("superior-vena-cava", "Superior vena cava", "SVC", "vascular", "The large vein entering the right atrium from above.", "Returns deoxygenated blood from the upper body.", 3, ["pulmonary-circulation"]),
  s("inferior-vena-cava", "Inferior vena cava", "IVC", "vascular", "The large vein entering the right atrium from below.", "Returns deoxygenated blood from the lower body.", 3, ["pulmonary-circulation"]),
  s("trachea", "Trachea", "Trachea", "respiratory", "The conducting airway descending from the larynx.", "Carries inhaled and exhaled gas between the upper airway and main bronchi.", 2, ["lung-anatomy"]),
  s("main-bronchi", "Main bronchi", "Bronchi", "respiratory", "The right and left primary airway branches.", "Distribute airflow from the trachea into each lung.", 2, ["lung-anatomy"]),
  s("diaphragm", "Diaphragm", "Diaphragm", "respiratory", "The dome-shaped primary muscle of inspiration.", "Contracts downward to expand thoracic volume and draw air into the lungs.", 4, ["lung-anatomy"]),
];

export const STRUCTURE_BY_ID = Object.fromEntries(
  CARDIOPULMONARY_STRUCTURES.map((structure) => [structure.id, structure]),
) as Record<AnatomyStructureId, AnatomyStructure>;

export const ANATOMY_MODE_LABELS: Record<AnatomyAnimationMode, string> = {
  overview: "Whole system",
  "cardiac-cycle": "Cardiac cycle",
  "pulmonary-circulation": "Pulmonary blood flow",
  "systemic-outflow": "Systemic outflow",
  ventilation: "Breathing",
  "gas-exchange": "Gas exchange",
};

export function structuresForReveal(reveal: number): AnatomyStructure[] {
  return CARDIOPULMONARY_STRUCTURES.filter(
    (structure) => structure.reveal <= reveal,
  );
}
