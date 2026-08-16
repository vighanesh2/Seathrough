import {
  citationsForKnowledge,
  retrieveKnowledge,
  type AnatomyKnowledgeEntry,
} from "@/lib/anatomy/knowledge/shared";
import type { AnatomyStructureId } from "@/lib/anatomy/types";

export type { AnatomyKnowledgeEntry };
export { citationsForKnowledge };

export const EYE_KNOWLEDGE: AnatomyKnowledgeEntry[] = [
  {
    id: "light-path",
    title: "Light path through the eye",
    keywords: [
      "light",
      "path",
      "see",
      "seeing",
      "vision",
      "how",
      "eye",
      "works",
      "focus",
      "image",
    ],
    structureIds: [
      "cornea",
      "aqueous-humor",
      "pupil",
      "lens",
      "vitreous",
      "retina",
    ],
    sourceKey: "eyeAnatomy",
    excerpt:
      "Light entering the eye is refracted mainly by the cornea, passes through the aqueous humor and pupil, is further focused by the lens, travels through the vitreous body, and forms an image on the retina.",
  },
  {
    id: "inverted-image",
    title: "The retinal image is inverted",
    keywords: [
      "upside",
      "down",
      "inverted",
      "flip",
      "flipped",
      "retina",
      "image",
      "orientation",
      "brain",
    ],
    structureIds: ["lens", "retina", "visual-cortex"],
    sourceKey: "eyeAnatomy",
    excerpt:
      "Because the eye's optics behave like a convex focusing system, the optical image projected onto the retina is inverted relative to the external scene. Perception of an upright world depends on later neural processing, not on the retina physically re-flipping the light pattern.",
  },
  {
    id: "cornea-refraction",
    title: "Cornea provides most refractive power",
    keywords: ["cornea", "refract", "refraction", "bend", "window", "clear"],
    structureIds: ["cornea", "aqueous-humor", "lens"],
    sourceKey: "eyeAnatomy",
    excerpt:
      "The cornea is the transparent anterior surface of the eye and contributes the majority of the eye's refractive power. The lens provides adjustable fine focusing after light has already been bent by the cornea.",
  },
  {
    id: "accommodation",
    title: "Lens accommodation for near and far",
    keywords: [
      "accommodation",
      "lens",
      "near",
      "far",
      "distance",
      "focus",
      "thick",
      "thin",
      "reading",
    ],
    structureIds: ["lens", "iris", "pupil"],
    sourceKey: "accommodation",
    excerpt:
      "Accommodation is the active change in lens shape that alters refractive power. For near viewing the lens becomes more convex (thicker); for distant viewing it flattens, allowing clearer focus of the retinal image.",
  },
  {
    id: "pupil-reflex",
    title: "Pupil size regulates retinal illumination",
    keywords: [
      "pupil",
      "iris",
      "dilate",
      "dilated",
      "constrict",
      "bright",
      "dark",
      "light",
      "reflex",
    ],
    structureIds: ["iris", "pupil", "retina"],
    sourceKey: "pupil",
    excerpt:
      "The iris adjusts pupil diameter. In brighter conditions the pupil constricts, limiting light entry; in dimmer conditions it dilates, admitting more light to the retina. This pupillary light response helps regulate retinal illumination.",
  },
  {
    id: "photoreceptors",
    title: "Rods and cones begin vision",
    keywords: [
      "rod",
      "rods",
      "cone",
      "cones",
      "photoreceptor",
      "photoreceptors",
      "color",
      "night",
      "dim",
      "daylight",
    ],
    structureIds: ["photoreceptors", "retina", "fovea"],
    sourceKey: "retina",
    excerpt:
      "Photoreceptors in the retina convert light into neural signals. Rods are specialized for dim-light vision, while cones support higher-acuity daylight vision and color discrimination, especially concentrated toward central retina.",
  },
  {
    id: "fovea",
    title: "Fovea and sharp central vision",
    keywords: ["fovea", "central", "sharp", "acuity", "detail", "macula", "gaze"],
    structureIds: ["fovea", "retina", "photoreceptors"],
    sourceKey: "retina",
    excerpt:
      "The fovea is a specialized central retinal region that supports the highest visual acuity. When you look directly at something, its image is directed onto the fovea so fine detail can be resolved.",
  },
  {
    id: "optic-nerve",
    title: "Optic nerve carries retinal signals",
    keywords: ["optic", "nerve", "signal", "signals", "axon", "leave", "blind"],
    structureIds: ["optic-nerve", "retina", "photoreceptors"],
    sourceKey: "visualPathway",
    excerpt:
      "Axons of retinal ganglion cells gather to form the optic nerve, which exits the eye and carries visual information into the central visual pathway. The nerve head itself has no photoreceptors, corresponding to the physiologic blind spot.",
  },
  {
    id: "visual-pathway",
    title: "From retina to visual cortex",
    keywords: [
      "brain",
      "cortex",
      "pathway",
      "neural",
      "signal",
      "see",
      "perception",
      "upright",
    ],
    structureIds: ["optic-nerve", "visual-cortex", "retina"],
    sourceKey: "visualPathway",
    excerpt:
      "Visual signals travel from the retina through the optic nerve and central visual pathway to the occipital visual cortex. Cortical processing supports conscious visual perception, including constructing an upright experience of the world from inverted retinal input.",
  },
  {
    id: "chambers",
    title: "Aqueous and vitreous chambers",
    keywords: ["aqueous", "vitreous", "humor", "chamber", "gel", "fluid", "pressure"],
    structureIds: ["aqueous-humor", "vitreous", "cornea", "lens", "retina"],
    sourceKey: "eyeAnatomy",
    excerpt:
      "Aqueous humor fills the anterior chamber and helps nourish avascular structures such as the cornea and lens. The vitreous body is a gel occupying most of the globe's volume, helping maintain shape and retinal position.",
  },
];

export function retrieveEyeKnowledge(
  question: string,
  selectedStructure?: AnatomyStructureId | null,
  limit = 4,
): AnatomyKnowledgeEntry[] {
  return retrieveKnowledge(EYE_KNOWLEDGE, question, selectedStructure, limit);
}
