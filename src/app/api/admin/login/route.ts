import {
  adminAuthCookieHeader,
  verifyAdminPassword,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!password) {
    return Response.json({ error: "Password required" }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": adminAuthCookieHeader(),
      },
    },
  );
}
