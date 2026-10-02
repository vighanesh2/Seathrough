import type { ExperimentLesson } from "@/lib/experiment/scene";
import type {
  SavedDesignSession,
  SavedDesignSummary,
} from "@/lib/experiment/systemDesign/session";

const DB_NAME = "seethrough-design-sessions";
const STORE = "sessions";

type LocalRecord = SavedDesignSummary & { session: SavedDesignSession };

/** Where a saved design lives, so saving again overwrites it instead of making a copy. */
export type SavedDesignRef = { id: string; local: boolean };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      let result: T | undefined;
      if (request) request.onsuccess = () => (result = request.result);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function summaryOf(record: LocalRecord): SavedDesignSummary {
  return {
    id: record.id,
    title: record.title,
    question: record.question,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...(record.preview ? { preview: record.preview } : {}),
    local: true,
  };
}

async function getLocal(id: string): Promise<LocalRecord | undefined> {
  return withStore<LocalRecord>("readonly", (store) => store.get(id) as IDBRequest<LocalRecord>);
}

async function putLocal(input: {
  id?: string;
  title: string;
  session: SavedDesignSession;
  preview?: string;
}): Promise<SavedDesignSummary> {
  const now = new Date().toISOString();
  const existing = input.id ? await getLocal(input.id) : undefined;
  const record: LocalRecord = {
    id: existing?.id ?? crypto.randomUUID(),
    title: existing?.title ?? input.title,
    question: input.session.prompt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    session: input.session,
    ...(input.preview ? { preview: input.preview } : existing?.preview ? { preview: existing.preview } : {}),
  };
  await withStore("readwrite", (store) => {
    store.put(record);
  });
  return summaryOf(record);
}

async function deleteLocal(id: string): Promise<void> {
  await withStore("readwrite", (store) => {
    store.delete(id);
  });
}

async function listLocal(): Promise<SavedDesignSummary[]> {
  const rows = (await withStore<LocalRecord[]>("readonly", (store) => store.getAll() as IDBRequest<LocalRecord[]>)) ?? [];
  return rows.map(summaryOf);
}

function auth(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

async function readJson<T>(res: Response): Promise<T & { error?: string; code?: string }> {
  return (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
}

/** The server refused the design itself, so keeping a copy on the device would not help. */
export class SaveRejected extends Error {}

export type SaveOutcome = {
  saved: SavedDesignSummary;
  ref: SavedDesignRef;
  /** Set when the student is signed in but the copy could only be kept on this device. */
  cloudError?: string;
};

/**
 * Saves the design to the account when signed in, otherwise on this device.
 * Saving again updates the same entry; a design kept on the device moves to
 * the account once the student signs in.
 */
export async function saveDesignSession(input: {
  ref: SavedDesignRef | null;
  title: string;
  session: SavedDesignSession;
  preview?: string;
  accessToken: string | null;
}): Promise<SaveOutcome> {
  const payload = { session: input.session, title: input.title, ...(input.preview ? { preview: input.preview } : {}) };
  let cloudError: string | undefined;

  if (input.accessToken) {
    try {
      const cloudId = input.ref && !input.ref.local ? input.ref.id : null;
      let res = cloudId
        ? await fetch(`/api/system-design/sessions/${cloudId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...auth(input.accessToken) },
            body: JSON.stringify(payload),
          })
        : null;
      if (!res || res.status === 404) {
        res = await fetch("/api/system-design/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth(input.accessToken) },
          body: JSON.stringify(payload),
        });
      }
      const body = await readJson<{ session?: SavedDesignSummary }>(res);
      if (res.status === 400 || res.status === 413) {
        throw new SaveRejected(body.error || "This design cannot be saved.");
      }
      if (res.ok && body.session) {
        if (input.ref?.local) await deleteLocal(input.ref.id).catch(() => undefined);
        return { saved: body.session, ref: { id: body.session.id, local: false } };
      }
      cloudError = body.error || "Could not reach your account.";
    } catch (caught) {
      if (caught instanceof SaveRejected) throw caught;
      cloudError = "Could not reach your account.";
    }
  }

  const saved = await putLocal({
    id: input.ref?.local ? input.ref.id : undefined,
    title: input.title,
    session: input.session,
    preview: input.preview,
  });
  return { saved, ref: { id: saved.id, local: true }, ...(cloudError ? { cloudError } : {}) };
}

export async function listDesignSessions(accessToken: string | null): Promise<{
  sessions: SavedDesignSummary[];
  cloudError?: string;
}> {
  const local = await listLocal().catch(() => [] as SavedDesignSummary[]);
  let remote: SavedDesignSummary[] = [];
  let cloudError: string | undefined;
  if (accessToken) {
    try {
      const res = await fetch("/api/system-design/sessions", { headers: auth(accessToken) });
      const body = await readJson<{ sessions?: SavedDesignSummary[] }>(res);
      if (res.ok) remote = body.sessions ?? [];
      else if (res.status !== 401) cloudError = body.error || "Could not load designs from your account.";
    } catch {
      cloudError = "Could not load designs from your account.";
    }
  }
  const sessions = [...remote, ...local].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { sessions, ...(cloudError ? { cloudError } : {}) };
}

export async function openDesignSession(
  id: string,
  accessToken: string | null,
  signal?: AbortSignal,
): Promise<{ summary: SavedDesignSummary; session: SavedDesignSession; lesson: ExperimentLesson; ref: SavedDesignRef }> {
  let found: { summary: SavedDesignSummary; session: unknown; ref: SavedDesignRef } | null = null;
  const local = await getLocal(id).catch(() => undefined);
  if (local) {
    found = { summary: summaryOf(local), session: local.session, ref: { id, local: true } };
  } else if (accessToken) {
    const res = await fetch(`/api/system-design/sessions/${encodeURIComponent(id)}`, {
      headers: auth(accessToken),
      signal,
    });
    const body = await readJson<{ summary?: SavedDesignSummary; session?: unknown }>(res);
    if (res.ok && body.summary && body.session) {
      found = { summary: body.summary, session: body.session, ref: { id, local: false } };
    } else if (res.status !== 404) {
      throw new Error(body.error || "Could not open that design.");
    }
  }
  if (!found) {
    throw new Error(
      accessToken
        ? "That saved design was not found."
        : "That saved design was not found on this device. Sign in to open designs saved to your account.",
    );
  }

  const res = await fetch("/api/system-design/sessions/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: found.session }),
    signal,
  });
  const body = await readJson<{ session?: SavedDesignSession; lesson?: ExperimentLesson }>(res);
  if (!res.ok || !body.session || !body.lesson?.beats?.length) {
    throw new Error(body.error || "Could not open that design.");
  }
  return { summary: found.summary, session: body.session, lesson: body.lesson, ref: found.ref };
}

export async function renameDesignSession(
  summary: SavedDesignSummary,
  title: string,
  accessToken: string | null,
): Promise<void> {
  if (summary.local) {
    const record = await getLocal(summary.id);
    if (!record) return;
    await withStore("readwrite", (store) => {
      store.put({ ...record, title });
    });
    return;
  }
  if (!accessToken) throw new Error("Sign in to rename this design.");
  const res = await fetch(`/api/system-design/sessions/${summary.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...auth(accessToken) },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error((await readJson(res)).error || "Could not rename that design.");
}

export async function deleteDesignSession(
  summary: SavedDesignSummary,
  accessToken: string | null,
): Promise<void> {
  if (summary.local) {
    await deleteLocal(summary.id);
    return;
  }
  if (!accessToken) throw new Error("Sign in to delete this design.");
  const res = await fetch(`/api/system-design/sessions/${summary.id}`, {
    method: "DELETE",
    headers: auth(accessToken),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error((await readJson(res)).error || "Could not delete that design.");
  }
}
