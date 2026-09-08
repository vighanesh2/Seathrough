import type {
  AnatomyAnimationMode,
  AnatomySceneId,
  AnatomySource,
  AnatomyStructure,
  AnatomyStructureId,
  BrainAnimationMode,
  CardiopulmonaryAnimationMode,
  EyeAnimationMode,
  KidneyAnimationMode,
} from "@/lib/anatomy/types";
import {
  BRAIN_ANIMATION_MODES,
  CARDIOPULMONARY_ANIMATION_MODES,
  EYE_ANIMATION_MODES,
  KIDNEY_ANIMATION_MODES,
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
  eyeAnatomy: {
    id: "eye-anatomy",
    title: "Anatomy, Head and Neck, Eye",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK482428/",
  },
  retina: {
    id: "retina",
    title: "Anatomy, Head and Neck: Eye Retina",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK542332/",
  },
  accommodation: {
    id: "accommodation",
    title: "Physiology, Accommodation",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK542189/",
  },
  visualPathway: {
    id: "visual-pathway",
    title: "Neuroanatomy, Visual Pathway",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK553189/",
  },
  pupil: {
    id: "pupillary-light-reflex",
    title: "Neuroanatomy, Pupillary Light Reflexes and Pathway",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK553169/",
  },
  brainAnatomy: {
    id: "brain-anatomy",
    title: "Neuroanatomy, Brain",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK551718/",
  },
  cerebralLobes: {
    id: "cerebral-lobes",
    title: "Neuroanatomy, Cerebral Cortex",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK537247/",
  },
  kidneyAnatomy: {
    id: "kidney-anatomy",
    title: "Anatomy, Abdomen and Pelvis, Kidneys",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK482385/",
  },
  renalPhysiology: {
    id: "renal-physiology",
    title: "Physiology, Renal",
    publisher: "NCBI Bookshelf / StatPearls",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK538339/",
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

export const EYE_STRUCTURES: AnatomyStructure[] = [
  s("eye", "Eye", "Eye", "ocular", "The organ of vision that focuses light and starts neural signaling.", "Forms an optical image on the retina and converts it into signals for the brain.", 1, ["eye-anatomy"]),
  s("sclera", "Sclera", "Sclera", "ocular", "The tough white outer coat of the eyeball.", "Protects the globe and gives it mechanical shape.", 1, ["eye-anatomy"]),
  s("cornea", "Cornea", "Cornea", "optical", "The clear front window of the eye.", "Provides most of the eye's refractive power so light can be focused.", 1, ["eye-anatomy"]),
  s("iris", "Iris", "Iris", "ocular", "The colored ring that surrounds the pupil.", "Adjusts pupil size to control how much light reaches the retina.", 2, ["eye-anatomy", "pupillary-light-reflex"]),
  s("pupil", "Pupil", "Pupil", "optical", "The aperture in the center of the iris.", "Acts as the opening that admits light into the eye.", 2, ["pupillary-light-reflex"]),
  s("lens", "Lens", "Lens", "optical", "The transparent biconvex body behind the iris.", "Changes shape to fine-tune focus for near and distant objects.", 2, ["accommodation"]),
  s("aqueous-humor", "Aqueous humor", "Aqueous", "ocular", "The clear fluid in the anterior chamber.", "Nourishes the cornea and lens and helps maintain intraocular pressure.", 3, ["eye-anatomy"]),
  s("vitreous", "Vitreous body", "Vitreous", "ocular", "The gel filling the large posterior chamber.", "Maintains the eye's shape and keeps the retina apposed.", 3, ["eye-anatomy"]),
  s("retina", "Retina", "Retina", "neural", "The light-sensitive lining at the back of the eye.", "Receives the focused optical image and begins phototransduction.", 3, ["retina"]),
  s("fovea", "Fovea", "Fovea", "neural", "The central pit specialized for sharp central vision.", "Provides the highest visual acuity when gaze is directed at a target.", 4, ["retina"]),
  s("photoreceptors", "Rods and cones", "Photoreceptors", "neural", "The photoreceptor cells of the retina.", "Rods support dim-light vision; cones support daylight and color vision.", 4, ["retina"]),
  s("optic-nerve", "Optic nerve", "Optic nerve", "neural", "The cranial nerve leaving the back of the eye.", "Carries retinal signals toward the brain's visual pathway.", 4, ["visual-pathway"]),
  s("visual-cortex", "Visual cortex", "Cortex", "neural", "The occipital cortex that interprets visual signals.", "Constructs the upright perceptual world from inverted retinal input.", 5, ["visual-pathway"]),
];

export const BRAIN_STRUCTURES: AnatomyStructure[] = [
  s("brain", "Brain", "Brain", "neural", "The central organ of the nervous system within the skull.", "Integrates sensory information, coordinates movement, and supports cognition and homeostasis.", 1, ["brain-anatomy"]),
  s("cerebrum", "Cerebrum", "Cerebrum", "cerebral", "The largest part of the brain, formed by two cerebral hemispheres.", "Supports perception, voluntary action, language, memory, and higher cognition.", 1, ["brain-anatomy", "cerebral-lobes"]),
  s("frontal-lobe", "Frontal lobe", "Frontal", "cerebral", "The anterior region of each cerebral hemisphere.", "Contributes to executive functions, planning, behavior, speech production, and voluntary motor control.", 2, ["cerebral-lobes"]),
  s("parietal-lobe", "Parietal lobe", "Parietal", "cerebral", "The upper posterior region of the cerebral cortex.", "Integrates touch and body-position information and supports spatial processing.", 2, ["cerebral-lobes"]),
  s("temporal-lobe", "Temporal lobe", "Temporal", "cerebral", "The lateral lower region of the cerebral cortex.", "Supports hearing, language comprehension, memory, and object recognition.", 2, ["cerebral-lobes"]),
  s("occipital-lobe", "Occipital lobe", "Occipital", "cerebral", "The posterior region of the cerebral cortex.", "Contains primary and associated visual-processing regions.", 2, ["cerebral-lobes"]),
  s("cerebellum", "Cerebellum", "Cerebellum", "neural", "The folded structure behind the brainstem.", "Coordinates timing, precision, balance, and motor learning.", 3, ["brain-anatomy"]),
  s("brainstem", "Brainstem", "Brainstem", "neural", "The stalk connecting the cerebrum with the spinal cord.", "Relays signals and regulates vital automatic functions including breathing and arousal.", 3, ["brain-anatomy"]),
  s("spinal-cord", "Spinal cord", "Spinal cord", "neural", "The main neural pathway extending below the brainstem.", "Carries sensory and motor signals between the brain and body.", 4, ["brain-anatomy"]),
];

export const KIDNEY_STRUCTURES: AnatomyStructure[] = [
  s("kidney", "Kidney", "Kidney", "renal", "A paired bean-shaped organ in the posterior abdomen.", "Filters plasma, regulates fluid and electrolytes, and produces urine.", 1, ["kidney-anatomy", "renal-physiology"]),
  s("renal-cortex", "Renal cortex", "Cortex", "renal", "The outer region beneath the kidney capsule.", "Contains renal corpuscles and portions of the nephron where filtration begins.", 2, ["kidney-anatomy"]),
  s("renal-medulla", "Renal medulla", "Medulla", "renal", "The inner region organized into renal pyramids.", "Establishes concentration gradients and channels tubular fluid toward the papillae.", 2, ["kidney-anatomy", "renal-physiology"]),
  s("renal-pelvis", "Renal pelvis", "Pelvis", "urinary", "The central funnel-shaped collecting space.", "Receives urine from the calyces and directs it into the ureter.", 3, ["kidney-anatomy"]),
  s("renal-artery", "Renal artery", "Artery", "vascular", "The arterial supply entering the kidney at the hilum.", "Delivers blood that will be distributed to glomerular capillaries.", 3, ["kidney-anatomy", "renal-physiology"]),
  s("renal-vein", "Renal vein", "Vein", "vascular", "The vein leaving the kidney at the hilum.", "Returns filtered blood to the inferior vena cava.", 3, ["kidney-anatomy"]),
  s("ureter", "Ureter", "Ureter", "urinary", "The muscular tube descending from the renal pelvis.", "Propels urine from the kidney toward the bladder.", 3, ["kidney-anatomy"]),
  s("nephron", "Nephron", "Nephron", "renal", "The microscopic functional unit of the kidney.", "Filters blood and modifies tubular fluid through reabsorption and secretion.", 4, ["renal-physiology"]),
  s("glomerulus", "Glomerulus", "Glomerulus", "renal", "A tuft of capillaries within a renal corpuscle.", "Produces an ultrafiltrate of plasma across the filtration barrier.", 5, ["renal-physiology"]),
  s("collecting-duct", "Collecting duct", "Collecting duct", "urinary", "The terminal tubular system receiving fluid from nephrons.", "Adjusts final water handling and carries urine through the medulla.", 5, ["renal-physiology"]),
];

export const STRUCTURE_BY_ID = Object.fromEntries(
  [
    ...CARDIOPULMONARY_STRUCTURES,
    ...EYE_STRUCTURES,
    ...BRAIN_STRUCTURES,
    ...KIDNEY_STRUCTURES,
  ].map((structure) => [structure.id, structure]),
) as Record<AnatomyStructureId, AnatomyStructure>;

export const ANATOMY_MODE_LABELS: Record<AnatomyAnimationMode, string> = {
  overview: "Whole system",
  "cardiac-cycle": "Cardiac cycle",
  "pulmonary-circulation": "Pulmonary blood flow",
  "systemic-outflow": "Systemic outflow",
  ventilation: "Breathing",
  "gas-exchange": "Gas exchange",
  "light-path": "Light path",
  accommodation: "Focus / accommodation",
  "pupil-reflex": "Pupil reflex",
  photoreceptors: "Rods & cones",
  "neural-signal": "Signal to brain",
  "sensory-processing": "Sensory processing",
  "motor-control": "Motor control",
  filtration: "Blood filtration",
  reabsorption: "Tubular reabsorption",
  "urine-flow": "Urine flow",
};

export const SCENE_MODE_SETS: Record<
  AnatomySceneId,
  readonly AnatomyAnimationMode[]
> = {
  cardiopulmonary: CARDIOPULMONARY_ANIMATION_MODES,
  eye: EYE_ANIMATION_MODES,
  brain: BRAIN_ANIMATION_MODES,
  kidney: KIDNEY_ANIMATION_MODES,
};

export const SCENE_STRUCTURES: Record<AnatomySceneId, AnatomyStructure[]> = {
  cardiopulmonary: CARDIOPULMONARY_STRUCTURES,
  eye: EYE_STRUCTURES,
  brain: BRAIN_STRUCTURES,
  kidney: KIDNEY_STRUCTURES,
};

export const SCENE_TITLES: Record<AnatomySceneId, string> = {
  cardiopulmonary: "Heart and lungs",
  eye: "Eye and vision",
  brain: "Brain and nervous system",
  kidney: "Kidney and filtration",
};

export function isCardiopulmonaryMode(
  mode: AnatomyAnimationMode,
): mode is CardiopulmonaryAnimationMode {
  return (CARDIOPULMONARY_ANIMATION_MODES as readonly string[]).includes(mode);
}

export function isEyeMode(
  mode: AnatomyAnimationMode,
): mode is EyeAnimationMode {
  return (EYE_ANIMATION_MODES as readonly string[]).includes(mode);
}

export function isBrainMode(
  mode: AnatomyAnimationMode,
): mode is BrainAnimationMode {
  return (BRAIN_ANIMATION_MODES as readonly string[]).includes(mode);
}

export function isKidneyMode(
  mode: AnatomyAnimationMode,
): mode is KidneyAnimationMode {
  return (KIDNEY_ANIMATION_MODES as readonly string[]).includes(mode);
}

export function structuresForReveal(
  reveal: number,
  scene: AnatomySceneId = "cardiopulmonary",
): AnatomyStructure[] {
  return SCENE_STRUCTURES[scene].filter(
    (structure) => structure.reveal <= reveal,
  );
}

export function modesForScene(scene: AnatomySceneId): AnatomyAnimationMode[] {
  return [...SCENE_MODE_SETS[scene]];
}
