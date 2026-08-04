import { getServiceSupabase } from "@/lib/supabase/server";
import {
  visualPlanSchema,
  type VisualPlan,
} from "@/lib/visuals/types";

export type LibraryQuality = "learned" | "promoted" | "rejected";

export type VisualLibraryEntry = {
  topicKey: string;
  displayLabel: string | null;
  plan: VisualPlan;
  quality: LibraryQuality;
  hitCount: number;
  source: "memory" | "database";
};

/** Process-local fallback when the DB table is missing or unreachable */
const memoryLibrary = new Map<
  string,
  {
    displayLabel: string | null;
    plan: VisualPlan;
    quality: LibraryQuality;
    hitCount: number;
  }
>();

/**
 * Look up a previously learned VisualPlan by topic key.
 * Validates with Zod — corrupt rows are ignored (and may be overwritten later).
 */
export async function lookupVisualLibrary(
  topicKey: string,
): Promise<VisualLibraryEntry | null> {
  const key = topicKey.trim().toLowerCase();
  if (!key) return null;

  const fromDb = await lookupDatabase(key);
  if (fromDb) return fromDb;

  const mem = memoryLibrary.get(key);
  if (!mem || mem.quality === "rejected") return null;

  mem.hitCount += 1;
  return {
    topicKey: key,
    displayLabel: mem.displayLabel,
    plan: mem.plan,
    quality: mem.quality,
    hitCount: mem.hitCount,
    source: "memory",
  };
}

/**
 * Persist a validated plan so the next ask for this topic reuses it.
 * Never stores executable code — VisualPlan JSON only.
 */
export async function rememberVisualLibrary(input: {
  topicKey: string;
  displayLabel?: string;
  sourcePrompt: string;
  conceptKey?: string;
  plan: VisualPlan;
}): Promise<{ stored: boolean; source: "memory" | "database"; error?: string }> {
  const key = input.topicKey.trim().toLowerCase();
  if (!key) {
    return { stored: false, source: "memory", error: "empty topic key" };
  }

  const parsed = visualPlanSchema.safeParse(input.plan);
  if (!parsed.success) {
    return {
      stored: false,
      source: "memory",
      error: parsed.error.issues[0]?.message ?? "invalid visual plan",
    };
  }

  const plan = parsed.data;

  // Always keep memory warm (helps when migration not applied yet)
  const existingMem = memoryLibrary.get(key);
  memoryLibrary.set(key, {
    displayLabel: input.displayLabel ?? existingMem?.displayLabel ?? null,
    plan,
    quality: existingMem?.quality === "promoted" ? "promoted" : "learned",
    hitCount: (existingMem?.hitCount ?? 0) + 1,
  });

  try {
    const supabase = getServiceSupabase();
    const { data: existing, error: readError } = await supabase
      .from("visual_library")
      .select("id, hit_count, quality")
      .eq("topic_key", key)
      .maybeSingle();

    if (readError) {
      // Table missing or RLS — memory still works
      return {
        stored: true,
        source: "memory",
        error: readError.message,
      };
    }

    if (existing?.quality === "rejected") {
      return { stored: false, source: "database", error: "topic rejected" };
    }

    if (existing?.quality === "promoted") {
      // Do not overwrite human-promoted art with a weaker auto plan
      await supabase
        .from("visual_library")
        .update({
          hit_count: (existing.hit_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("topic_key", key);
      return { stored: true, source: "database" };
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("visual_library")
        .update({
          plan,
          display_label: input.displayLabel ?? null,
          source_prompt: input.sourcePrompt.slice(0, 500),
          concept_key: input.conceptKey ?? null,
          hit_count: (existing.hit_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
          quality: "learned",
        })
        .eq("topic_key", key);

      if (updateError) {
        return {
          stored: true,
          source: "memory",
          error: updateError.message,
        };
      }
      return { stored: true, source: "database" };
    }

    const { error: insertError } = await supabase.from("visual_library").insert({
      topic_key: key,
      display_label: input.displayLabel ?? null,
      source_prompt: input.sourcePrompt.slice(0, 500),
      concept_key: input.conceptKey ?? null,
      plan,
      quality: "learned",
      hit_count: 1,
      last_used_at: new Date().toISOString(),
    });

    if (insertError) {
      return {
        stored: true,
        source: "memory",
        error: insertError.message,
      };
    }

    return { stored: true, source: "database" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "library write failed";
    return { stored: true, source: "memory", error: message };
  }
}

async function lookupDatabase(
  topicKey: string,
): Promise<VisualLibraryEntry | null> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("visual_library")
      .select("topic_key, display_label, plan, quality, hit_count")
      .eq("topic_key", topicKey)
      .maybeSingle();

    if (error || !data) return null;
    if (data.quality === "rejected") return null;

    const parsed = visualPlanSchema.safeParse(data.plan);
    if (!parsed.success) return null;

    const hitCount = (data.hit_count ?? 0) + 1;
    // Fire-and-forget hit bump — do not block the lesson stream
    void supabase
      .from("visual_library")
      .update({
        hit_count: hitCount,
        last_used_at: new Date().toISOString(),
      })
      .eq("topic_key", topicKey);

    // Mirror into memory for faster repeats in this process
    memoryLibrary.set(topicKey, {
      displayLabel: data.display_label,
      plan: parsed.data,
      quality: data.quality as LibraryQuality,
      hitCount,
    });

    return {
      topicKey,
      displayLabel: data.display_label,
      plan: parsed.data,
      quality: data.quality as LibraryQuality,
      hitCount,
      source: "database",
    };
  } catch {
    return null;
  }
}

/** Test helper — clear process memory between cases */
export function clearVisualLibraryMemory(): void {
  memoryLibrary.clear();
}
