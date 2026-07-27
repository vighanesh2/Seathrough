import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Client clears the local Supabase session; this exists for symmetry. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
