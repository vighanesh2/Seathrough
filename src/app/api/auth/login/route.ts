import { NextResponse } from "next/server";
import {
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
  validatePassword,
} from "@/lib/auth/username";
import { getAnonSupabase } from "@/lib/supabase/anon";
import { getServiceSupabase } from "@/lib/supabase/server";
import { toUserFacingError } from "@/lib/errors/userFacing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Enter a valid username" },
      { status: 400 },
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  try {
    const service = getServiceSupabase();
    const { data: profile } = await service
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();

    const email = usernameToEmail(username);
    const anon = getAnonSupabase();
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      // Log the real Supabase reason server-side only (never return it to the client).
      console.error("[auth/login] signIn failed", {
        username,
        email,
        profileFound: Boolean(profile),
        supabaseMessage: error?.message ?? "no session returned",
        supabaseStatus: error?.status ?? null,
        supabaseCode: (error as { code?: string } | null)?.code ?? null,
      });
      return NextResponse.json(
        { error: "Incorrect username or password" },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user: {
        id: data.user.id,
        username: profile?.username ?? username,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: toUserFacingError(error) },
      { status: 500 },
    );
  }
}
