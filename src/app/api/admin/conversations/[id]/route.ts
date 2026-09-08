import {
  isAdminAuthenticated,
  unauthorizedAdminResponse,
} from "@/lib/admin/auth";
import { loadConversationContext } from "@/lib/conversations/store";
import { loadConversationBoard } from "@/lib/lessons/boardSnapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (!isAdminAuthenticated(request)) {
    return unauthorizedAdminResponse();
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
      "[admin/conversations-get] board restore failed",
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
