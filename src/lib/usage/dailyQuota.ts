/**
 * Anonymous daily question budget (client-side).
 * Resets at local midnight. Logged-in users ignore this.
 */
export const DAILY_QUESTION_LIMIT = 5;

const STORAGE_KEY = "seethrough.dailyQuota.v2";

export type QuotaState = {
  day: string;
  count: number;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function empty(): QuotaState {
  return { day: todayKey(), count: 0 };
}

export function readQuota(): QuotaState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<QuotaState>;
    if (typeof parsed.day !== "string" || typeof parsed.count !== "number") {
      return empty();
    }
    if (parsed.day !== todayKey()) return empty();
    return {
      day: parsed.day,
      count: Math.max(0, Math.min(DAILY_QUESTION_LIMIT, Math.floor(parsed.count))),
    };
  } catch {
    return empty();
  }
}

function writeQuota(state: QuotaState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota persist failures */
  }
}

export function remainingQuestions(): number {
  const q = readQuota();
  return Math.max(0, DAILY_QUESTION_LIMIT - q.count);
}

export function canAskAnonymous(): boolean {
  return remainingQuestions() > 0;
}

/** Spend one free question. Returns false if the daily budget is used up. */
export function consumeQuestion(): boolean {
  const q = readQuota();
  if (q.count >= DAILY_QUESTION_LIMIT) return false;
  writeQuota({ day: todayKey(), count: q.count + 1 });
  return true;
}

/** Undo a consume when the request never really started (abort / immediate fail). */
export function refundQuestion(): void {
  const q = readQuota();
  if (q.count <= 0) return;
  writeQuota({ day: todayKey(), count: q.count - 1 });
}
