export const SYSTEM_DESIGN_SECTIONS = [
  { id: "requirements", label: "Requirements" },
  { id: "architecture", label: "High-level architecture" },
  { id: "data-model", label: "Data model" },
  { id: "flows", label: "Key request/response flows" },
  { id: "scaling", label: "Scaling" },
  { id: "reliability", label: "Reliability" },
  { id: "security", label: "Security" },
  { id: "observability", label: "Observability" },
  { id: "deployment", label: "Deployment" },
] as const;

export type SystemDesignSectionId =
  (typeof SYSTEM_DESIGN_SECTIONS)[number]["id"];

export const SYSTEM_DESIGN_SECTION_IDS: SystemDesignSectionId[] =
  SYSTEM_DESIGN_SECTIONS.map((section) => section.id);

export function sectionLabel(id: SystemDesignSectionId): string {
  return (
    SYSTEM_DESIGN_SECTIONS.find((section) => section.id === id)?.label ?? id
  );
}

export const INTAKE_QUESTIONS = [
  {
    id: "who",
    prompt: "Who uses it, and what is the one job?",
    placeholder: "Friends sending short messages",
  },
  {
    id: "scale",
    prompt: "What scale should we design for?",
    placeholder: "A few thousand people online at once",
  },
  {
    id: "dayOne",
    prompt: "What must work on day one?",
    placeholder: "Realtime chat, no payments",
  },
  {
    id: "constraint",
    prompt: "Any hard constraint? Latency, cost, consistency — or none.",
    placeholder: "Messages stay in order",
  },
] as const;

export type IntakeAnswerId = (typeof INTAKE_QUESTIONS)[number]["id"];

export type IntakeAnswers = Record<IntakeAnswerId, string>;

export type SystemDesignIntake = {
  title: string;
  questions: Array<{
    id: IntakeAnswerId;
    prompt: string;
    placeholder: string;
  }>;
};

export function systemDesignIntake(prompt: string): SystemDesignIntake {
  const title = prompt.replace(/\s+/g, " ").trim().slice(0, 80);
  return {
    title: title || "System design",
    questions: INTAKE_QUESTIONS.map((question) => ({ ...question })),
  };
}
