/**
 * Server-side env access. Never log values — only presence / names.
 */

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export type LlmProviderName = "groq" | "openai";

/** Groq retired these ids; keep old .env values working. */
const GROQ_MODEL_REPLACEMENTS: Record<string, string> = {
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "llama-3.1-8b-instant": "openai/gpt-oss-20b",
  "llama-3.1-70b-versatile": "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct": "qwen/qwen3.6-27b",
};

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

function resolveGroqModel(requested?: string): string {
  const id = requested?.trim() || DEFAULT_GROQ_MODEL;
  return GROQ_MODEL_REPLACEMENTS[id] ?? id;
}

/** Exported for smokes — maps retired Groq ids onto a live model. */
export function groqModelOrReplacement(requested?: string): string {
  return resolveGroqModel(requested);
}

export function getLlmConfig() {
  const provider = (optional("LLM_PROVIDER") ?? "groq").toLowerCase() as LlmProviderName;

  if (provider === "openai") {
    return {
      provider: "openai" as const,
      apiKey: required("OPENAI_API_KEY"),
      model: optional("OPENAI_MODEL") ?? "gpt-4.1",
      baseURL: undefined as string | undefined,
    };
  }

  return {
    provider: "groq" as const,
    apiKey: required("GROQ_API_KEY"),
    model: resolveGroqModel(optional("GROQ_MODEL")),
    baseURL: "https://api.groq.com/openai/v1",
  };
}

/**
 * Multimodal / vision model for screenshot extraction.
 * Prefers OpenAI when configured; otherwise Groq vision (Qwen 3.6).
 * Note: meta-llama/llama-4-scout-17b-16e-instruct was shut down on Groq 2026-07-17.
 */
export function getVisionLlmConfig() {
  const openaiKey = optional("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      provider: "openai" as const,
      apiKey: openaiKey,
      model: optional("OPENAI_VISION_MODEL") ?? optional("OPENAI_MODEL") ?? "gpt-4.1",
      baseURL: undefined as string | undefined,
    };
  }

  return {
    provider: "groq" as const,
    apiKey: required("GROQ_API_KEY"),
    model: optional("GROQ_VISION_MODEL") ?? "qwen/qwen3.6-27b",
    baseURL: "https://api.groq.com/openai/v1",
  };
}

export function getDeepgramConfig() {
  return {
    apiKey: required("DEEPGRAM_API_KEY"),
    model: optional("DEEPGRAM_TTS_MODEL") ?? "aura-2-thalia-en",
  };
}

export function getSupabaseConfig() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function envPresence() {
  return {
    LLM_PROVIDER: optional("LLM_PROVIDER") ?? "groq",
    GROQ_API_KEY: Boolean(optional("GROQ_API_KEY")),
    OPENAI_API_KEY: Boolean(optional("OPENAI_API_KEY")),
    DEEPGRAM_API_KEY: Boolean(optional("DEEPGRAM_API_KEY")),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(optional("NEXT_PUBLIC_SUPABASE_URL")),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(optional("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(optional("SUPABASE_SERVICE_ROLE_KEY")),
    SEETHROUGH_ADMIN_PASSWORD: Boolean(optional("SEETHROUGH_ADMIN_PASSWORD")),
  };
}
