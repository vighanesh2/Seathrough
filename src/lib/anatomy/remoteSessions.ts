"use client";

import { z } from "zod";
import { anatomySessionSchema } from "@/lib/anatomy/sessionSchema";
import type { AnatomySession } from "@/lib/anatomy/sessionHistory";

const listResponseSchema = z.object({
  sessions: z.array(anatomySessionSchema),
});

const saveResponseSchema = z.object({
  session: anatomySessionSchema,
});

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return new Error(body.error);
  } catch {
    // Use the status fallback below.
  }
  return new Error(`Anatomy history request failed (${response.status})`);
}

export async function fetchRemoteAnatomySessions(
  accessToken: string,
  signal?: AbortSignal,
): Promise<AnatomySession[]> {
  const response = await fetch("/api/anatomy/conversations", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await responseError(response);
  return listResponseSchema.parse(await response.json()).sessions;
}

export async function saveRemoteAnatomySession(
  accessToken: string,
  session: AnatomySession,
  signal?: AbortSignal,
): Promise<AnatomySession> {
  const response = await fetch("/api/anatomy/conversations", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ session }),
    signal,
  });
  if (!response.ok) throw await responseError(response);
  return saveResponseSchema.parse(await response.json()).session;
}
