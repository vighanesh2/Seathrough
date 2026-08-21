export const PENDING_PROMPT_KEY = "seethrough.pendingPrompt";
export const AUTO_START_KEY = "seethrough.autoStart";

type Handoff = {
  prompt: string;
  autoStart: boolean;
};

/** Survives React Strict Mode remounts within the same page load. */
let memoryHandoff: Handoff | null = null;

export function stashPendingPrompt(text: string, autoStart = true) {
  try {
    const trimmed = text.trim();
    if (!trimmed) return;
    sessionStorage.setItem(PENDING_PROMPT_KEY, trimmed);
    if (autoStart) {
      sessionStorage.setItem(AUTO_START_KEY, "1");
    } else {
      sessionStorage.removeItem(AUTO_START_KEY);
    }
    memoryHandoff = { prompt: trimmed, autoStart };
  } catch {
    memoryHandoff = { prompt: text.trim(), autoStart };
  }
}

function readStorage(): Handoff | null {
  try {
    const prompt = sessionStorage.getItem(PENDING_PROMPT_KEY);
    const autoStart = sessionStorage.getItem(AUTO_START_KEY) === "1";
    if (!prompt?.trim()) return null;
    return { prompt: prompt.trim(), autoStart };
  } catch {
    return null;
  }
}

function clearStorage() {
  try {
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
    sessionStorage.removeItem(AUTO_START_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Read the marketing → workspace handoff.
 * Keeps a memory copy so Strict Mode remounts can re-trigger auto-start.
 */
export function takePendingPrompt(): Handoff | null {
  if (memoryHandoff) return memoryHandoff;
  const fromStorage = readStorage();
  if (!fromStorage) return null;
  memoryHandoff = fromStorage;
  clearStorage();
  return fromStorage;
}

export function clearPendingPrompt() {
  memoryHandoff = null;
  clearStorage();
}
