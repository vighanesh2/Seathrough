import {
  isAdminAuthenticated,
  unauthorizedAdminResponse,
} from "@/lib/admin/auth";
import { listAdminUsers } from "@/lib/admin/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedAdminResponse();
  }

  try {
    const users = await listAdminUsers();
    return Response.json({ users });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list users";
    console.error("[admin/users]", message);
    return Response.json({ error: message, users: [] }, { status: 500 });
  }
}
