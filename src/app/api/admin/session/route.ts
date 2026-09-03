import { isAdminAuthenticated } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return Response.json({ authenticated: isAdminAuthenticated(request) });
}
