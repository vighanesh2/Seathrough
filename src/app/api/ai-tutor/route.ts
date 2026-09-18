import { spawn } from "node:child_process";
import path from "node:path";
import type { TutorView } from "@/lib/ai-tutor/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PYTHON_TIMEOUT_MS = 180_000;

function pythonBin() {
  return process.env.PYTHON_PATH?.trim() || process.env.PYTHON?.trim() || "python";
}

function runSession(payload: Record<string, unknown>): Promise<TutorView> {
  const script = path.join(process.cwd(), "backend", "web_session.py");
  const child = spawn(pythonBin(), ["-u", script], {
    cwd: process.cwd(),
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });

  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];

  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("The tutor took too long. Try a shorter answer."));
    }, PYTHON_TIMEOUT_MS);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new Error(
          error.message.includes("ENOENT")
            ? "Python is not available on this machine."
            : "Could not start the tutor.",
        ),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const text = Buffer.concat(stdout).toString("utf8").trim();
      if (!text) {
        const errText = Buffer.concat(stderr).toString("utf8").replace(/\s+/g, " ").slice(0, 220);
        reject(
          new Error(
            errText && !/key|token|secret|bearer/i.test(errText)
              ? `The tutor returned no response. ${errText}`
              : "The tutor returned no response.",
          ),
        );
        return;
      }
      try {
        const parsed = JSON.parse(text) as TutorView;
        if (code !== 0 && parsed.ok === false) {
          reject(new Error(parsed.error || "The tutor could not continue."));
          return;
        }
        resolve(parsed);
      } catch {
        reject(new Error("The tutor returned something we could not read."));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Send a JSON body." }, { status: 400 });
  }

  const action = String(body.action || "").trim();
  if (!action) {
    return Response.json({ ok: false, error: "Missing action." }, { status: 400 });
  }

  try {
    const view = await runSession({
      action,
      topic: body.topic,
      sessionId: body.sessionId,
      text: body.text,
    });
    if (view.error && !view.sessionId) {
      return Response.json(view, { status: 400 });
    }
    return Response.json(view);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The tutor could not continue.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
