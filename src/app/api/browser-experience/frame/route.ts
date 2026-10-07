import { screenshotJpeg } from "@/lib/browser-experience/driver";
import {
  getSession,
  sessionPage,
} from "@/lib/browser-experience/sessionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("sessionId") || "";
  if (!sessionId) {
    return Response.json({ error: "Session not found" }, { status: 400 });
  }
  const session = getSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    const buffer = await screenshotJpeg(sessionPage(session), 58);
    return Response.json({
      image: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      url: session.currentUrl,
    });
  } catch {
    // Navigations briefly destroy the render surface — client will retry.
    return Response.json({ image: null, url: session.currentUrl });
  }
}
