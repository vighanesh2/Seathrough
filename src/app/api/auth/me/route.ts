import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error } = await client.auth.getUser();
    if (error || !userData.user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { data: profile } = await client
      .from("profiles")
      .select("username, display_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    const username =
      profile?.username ||
      (userData.user.user_metadata?.username as string | undefined) ||
      userData.user.email?.split("@")[0] ||
      "learner";

    return NextResponse.json({
      user: {
        id: userData.user.id,
        username,
        displayName: profile?.display_name ?? username,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
