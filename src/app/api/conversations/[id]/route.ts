import { loadConversationContext } from "@/lib/conversations/store";
import { getUserFromRequest } from "@/lib/auth/requestUser";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { VisualPlan } from "@/lib/visuals/types";

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

  let visualPlan: VisualPlan | null = null;
  let threeScene: unknown = null;
  try {
    const supabase = getServiceSupabase();
    const { data: lesson } = await supabase
      .from("lessons")
      .select("plan")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const plan = lesson?.plan as
      | {
          beats?: Array<{ visual?: VisualPlan }>;
          threeScene?: unknown;
          title?: string;
        }
      | null
      | undefined;
    if (plan?.threeScene != null) {
      threeScene = plan.threeScene;
    }
    const fromBeats = plan?.beats
      ?.map((b) => b.visual)
      .filter(Boolean)
      .at(-1);
    if (fromBeats) visualPlan = fromBeats;

    const { data: beatRow } = await supabase
      .from("lesson_beats")
      .select("payload")
      .eq("lesson_id", ctx.lessonId ?? "")
      .order("beat_order", { ascending: false })
      .limit(8);

    for (const row of beatRow ?? []) {
      const payload = row.payload as {
        visualTrigger?: { plan?: VisualPlan | null };
      };
      const p = payload?.visualTrigger?.plan;
      if (p) {
        visualPlan = p;
        break;
      }
    }
  } catch {
    // optional
  }

  return Response.json({
    conversation: ctx,
    visualPlan,
    threeScene,
  });
}
