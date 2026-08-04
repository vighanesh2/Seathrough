import { listConversations } from "@/lib/conversations/store";
import { getUserFromRequest } from "@/lib/auth/requestUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error: "Sign in required", conversations: [] }, {
        status: 401,
      });
    }
    const conversations = await listConversations(50, user.id);
    return Response.json({ conversations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list conversations";
    return Response.json({ error: message, conversations: [] }, { status: 500 });
  }
}
