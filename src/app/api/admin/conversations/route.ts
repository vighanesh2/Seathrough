import {
  isAdminAuthenticated,
  unauthorizedAdminResponse,
} from "@/lib/admin/auth";
import { listAdminConversations } from "@/lib/admin/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedAdminResponse();
  }

  const url = new URL(request.url);
  const userKey = url.searchParams.get("user")?.trim();
  if (!userKey) {
    return Response.json(
      { error: "Missing user query (user id or anonymous)", conversations: [] },
      { status: 400 },
    );
  }

  try {
    const conversations = await listAdminConversations({ userKey });
    return Response.json({ conversations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list conversations";
    console.error("[admin/conversations]", message);
    return Response.json(
      { error: message, conversations: [] },
      { status: 500 },
    );
  }
}
