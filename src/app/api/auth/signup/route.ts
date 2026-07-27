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
      {
        error:
          "Username must be 3–24 characters: letters, numbers, or underscore",
      },
      { status: 400 },
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const email = usernameToEmail(username);
  const service = getServiceSupabase();

  try {
    const { data: existing } = await service
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 },
      );
    }

    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
      });

    if (createError || !created.user) {
      const msg = createError?.message ?? "Could not create account";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          { error: "That username is already taken" },
          { status: 409 },
        );
      }
      console.error("[auth/signup]", msg);
      return NextResponse.json(
        { error: toUserFacingError(msg) },
        { status: 500 },
      );
    }

    const { error: profileError } = await service.from("profiles").insert({
      id: created.user.id,
      username,
      display_name: username,
    });

    if (profileError) {
      console.error("[auth/signup-profile]", profileError.message);
      // User exists — still try to sign them in
    }

    const anon = getAnonSupabase();
    const { data: sessionData, error: signError } =
      await anon.auth.signInWithPassword({ email, password });

    if (signError || !sessionData.session) {
      return NextResponse.json(
        {
          error:
            "Account created, but sign-in failed. Please try logging in.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user: {
        id: created.user.id,
        username,
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("[auth/signup]", error);
    return NextResponse.json(
      { error: toUserFacingError(error) },
      { status: 500 },
    );
  }
}
