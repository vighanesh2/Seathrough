import type { SavedLessonVideo } from "@/lib/experiment/savedVideos";
import type { SavedVideoKind } from "@/lib/experiment/savedVideoKind";

const DB_NAME = "seethrough-saved-videos";
const STORE = "videos";

export type LocalSavedVideo = SavedLessonVideo & {
  local: true;
  videoBlob: Blob;
  posterBlob?: Blob;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function typedVideoBlob(blob: Blob, mimeType?: string): Blob {
  const type = blob.type || mimeType || "video/webm";
  if (blob.type === type) return blob;
  return new Blob([blob], { type });
}

function urlsFor(row: LocalSavedVideo): LocalSavedVideo {
  const videoBlob = row.videoBlob
    ? typedVideoBlob(row.videoBlob, row.mimeType)
    : row.videoBlob;
  return {
    ...row,
    kind: row.kind ?? "lesson",
    local: true,
    videoBlob,
    mimeType: videoBlob?.type || row.mimeType || "video/webm",
    videoUrl: videoBlob ? URL.createObjectURL(videoBlob) : row.videoUrl,
    posterUrl: row.posterBlob
      ? URL.createObjectURL(row.posterBlob)
      : row.posterUrl,
  };
}

export async function saveLocalVideo(input: {
  kind?: SavedVideoKind;
  title: string;
  titleSource: SavedLessonVideo["titleSource"];
  question?: string;
  durationMs?: number;
  mimeType: string;
  video: Blob;
  poster?: Blob;
}): Promise<LocalSavedVideo> {
  const id = crypto.randomUUID();
  const buffer = await input.video.arrayBuffer();
  const videoBlob = new Blob([buffer], {
    type: (input.mimeType || input.video.type || "video/webm").split(";")[0],
  });
  const posterBlob = input.poster
    ? new Blob([await input.poster.arrayBuffer()], {
        type: input.poster.type || "image/jpeg",
      })
    : undefined;
  const record: LocalSavedVideo = {
    id,
    kind: input.kind ?? "lesson",
    title: input.title,
    titleSource: input.titleSource,
    question: input.question,
    createdAt: new Date().toISOString(),
    durationMs: input.durationMs,
    mimeType: videoBlob.type,
    local: true,
    videoBlob,
    posterBlob,
    videoUrl: URL.createObjectURL(videoBlob),
    posterUrl: posterBlob ? URL.createObjectURL(posterBlob) : undefined,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      ...record,
      videoUrl: undefined,
      posterUrl: undefined,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return record;
}

export async function listLocalVideos(kind: SavedVideoKind = "lesson"): Promise<LocalSavedVideo[]> {
  const db = await openDb();
  const rows = await new Promise<LocalSavedVideo[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as LocalSavedVideo[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows
    .filter((row) => (row.kind ?? "lesson") === kind)
    .map((row) => urlsFor({ ...row, local: true }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function renameLocalVideo(
  id: string,
  title: string,
): Promise<LocalSavedVideo | null> {
  const db = await openDb();
  const current = await new Promise<LocalSavedVideo | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as LocalSavedVideo | undefined);
    request.onerror = () => reject(request.error);
  });
  if (!current) {
    db.close();
    return null;
  }
  const next: LocalSavedVideo = {
    ...current,
    title,
    titleSource: "user",
    local: true,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      ...next,
      videoUrl: undefined,
      posterUrl: undefined,
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return urlsFor(next);
}

export async function deleteLocalVideo(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
