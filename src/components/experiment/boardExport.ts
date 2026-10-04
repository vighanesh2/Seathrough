"use client";

import type { Editor, TLShapeId } from "tldraw";
import type { ExperimentDrawSession } from "@/components/experiment/applyScene";
import type { ExperimentLesson } from "@/lib/experiment/scene";
import { jpegPagesToPdf } from "@/lib/experiment/pdf";
import { MAX_PREVIEW_CHARS } from "@/lib/experiment/systemDesign/session";

/** Browsers refuse canvases much past this on a side. */
const MAX_EXPORT_SIDE = 4800;

function liveIds(editor: Editor, ids: Iterable<TLShapeId>): TLShapeId[] {
  return [...new Set(ids)].filter((id) => editor.getShape(id));
}

function boundsOf(editor: Editor, ids: TLShapeId[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const box = editor.getShapePageBounds(id);
    if (!box) continue;
    minX = Math.min(minX, box.minX);
    minY = Math.min(minY, box.minY);
    maxX = Math.max(maxX, box.maxX);
    maxY = Math.max(maxY, box.maxY);
  }
  return Number.isFinite(minX) ? { w: maxX - minX, h: maxY - minY } : null;
}

async function exportJpeg(
  editor: Editor,
  ids: TLShapeId[],
  options: { maxSide: number; quality: number },
): Promise<Blob | null> {
  const bounds = boundsOf(editor, ids);
  if (!bounds) return null;
  const longest = Math.max(bounds.w, bounds.h, 1) + 64;
  const pixelRatio = Math.max(0.25, Math.min(2, options.maxSide / longest));
  const { blob } = await editor.toImage(ids, {
    format: "jpeg",
    background: true,
    darkMode: false,
    padding: 32,
    pixelRatio,
    quality: options.quality,
  });
  return blob;
}

/**
 * The board's shapes grouped for export: one group per system-design section in
 * lesson order, then anything else on the board (the tutor's drawings, or
 * shapes from a section not reached yet) as a final group.
 */
function exportGroups(
  editor: Editor,
  session: ExperimentDrawSession | null,
  lesson: ExperimentLesson | null,
): TLShapeId[][] {
  const all = [...editor.getCurrentPageShapeIds()];
  const groups: TLShapeId[][] = [];
  const used = new Set<TLShapeId>();
  if (session?.sheets.size) {
    const order = [
      ...(lesson?.beats.flatMap((beat) => (beat.sheet ? [beat.sheet] : [])) ?? []),
      ...session.sheets.keys(),
    ];
    for (const sheet of new Set(order)) {
      const ids = liveIds(editor, session.sheets.get(sheet) ?? []);
      if (!ids.length) continue;
      ids.forEach((id) => used.add(id));
      groups.push(ids);
    }
  }
  const rest = all.filter((id) => !used.has(id));
  if (rest.length) groups.push(rest);
  return groups;
}

export async function exportBoardPdf(
  editor: Editor,
  session: ExperimentDrawSession | null,
  lesson: ExperimentLesson | null,
  title: string,
): Promise<Blob> {
  const groups = exportGroups(editor, session, lesson);
  const pages: Uint8Array[] = [];
  for (const ids of groups) {
    const blob = await exportJpeg(editor, ids, { maxSide: MAX_EXPORT_SIDE, quality: 0.92 });
    if (blob) pages.push(new Uint8Array(await blob.arrayBuffer()));
  }
  return jpegPagesToPdf(pages, title);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** A small picture of the architecture sheet (or the whole board) for the dashboard card. */
export async function boardPreview(
  editor: Editor,
  session: ExperimentDrawSession | null,
): Promise<string | undefined> {
  try {
    const sheet = liveIds(editor, session?.sheets.get("architecture") ?? []);
    const ids = sheet.length ? sheet : [...editor.getCurrentPageShapeIds()];
    if (!ids.length) return undefined;
    for (const quality of [0.72, 0.5]) {
      const blob = await exportJpeg(editor, ids, { maxSide: 960, quality });
      if (!blob) return undefined;
      const url = await blobToDataUrl(blob);
      if (url.startsWith("data:image/jpeg;base64,") && url.length <= MAX_PREVIEW_CHARS) return url;
    }
  } catch {
    /* the card shows a plain tile */
  }
  return undefined;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
