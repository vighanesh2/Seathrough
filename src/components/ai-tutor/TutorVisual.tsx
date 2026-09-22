"use client";

import { GenrePlay } from "@/components/ai-tutor/GenrePlay";
import { RecursionPlay } from "@/components/ai-tutor/RecursionPlay";
import type { TutorVisualPlan } from "@/lib/ai-tutor/visualPlan";

export function TutorVisual({ plan }: { plan: TutorVisualPlan }) {
  if (plan.genre === "stack") {
    return <RecursionPlay plan={plan} code={plan.code} />;
  }
  return <GenrePlay plan={plan} />;
}
