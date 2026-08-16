import { loadConversationContext } from "@/lib/conversations/store";
import { getUserFromRequest } from "@/lib/auth/requestUser";
import { loadConversationBoard } from "@/lib/lessons/boardSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await context.params;
  const conversationId = id?.trim();
  if (!conversationId) {
    return Response.json({ error: "Missing conversation id" }, { status: 400 });
  }

  const ctx = await loadConversationContext(conversationId);
  if (!ctx) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (ctx.userId && ctx.userId !== user.id) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }
  // Deny access to legacy/anonymous rows once auth is required
  if (!ctx.userId) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  let visualPlan = null as Awaited<
    ReturnType<typeof loadConversationBoard>
  >["visualPlan"];
  let threeScene = null as Awaited<
    ReturnType<typeof loadConversationBoard>
  >["threeScene"];
  let board = null as Awaited<
    ReturnType<typeof loadConversationBoard>
  >["board"];

  try {
    const restored = await loadConversationBoard({
      conversationId,
      rootPrompt: ctx.rootPrompt,
    });
    board = restored.board;
    visualPlan = restored.visualPlan;
    threeScene = restored.threeScene;
  } catch (error) {
    console.error(
      "[conversations-get] board restore failed",
      error instanceof Error ? error.message : error,
    );
  }

  return Response.json({
    conversation: ctx,
    visualPlan,
    threeScene,
    board,
  });
}
