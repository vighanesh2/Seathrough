/**
 * Runs model-written scenes on the vendored hand-drawn core inside a sandboxed iframe
 * (opaque origin, no network via CSP) and hands frames back over a MessageChannel.
 */

export type EngineScene = { title: string; say: string; seconds: number };

export type EngineConfig = {
  palette: string;
  fps: 12 | 24;
  width: number;
  scenes: EngineScene[];
};

export type ProbeResult = {
  index: number;
  error: string | null;
  ms: number;
  blank: boolean;
};

export type FrameReply = {
  i: number;
  scene: number;
  errors: Record<string, string>;
};

type Ready = {
  fatal: string | null;
  errors: Record<string, string>;
  frames: number;
  size: { w: number; h: number } | null;
};

type Runtime = { core: string; kit: string };

let runtimePromise: Promise<Runtime> | null = null;

function loadRuntime(): Promise<Runtime> {
  if (!runtimePromise) {
    runtimePromise = Promise.all([
      fetch("/film-engine/core.js").then((response) => {
        if (!response.ok) throw new Error("core");
        return response.text();
      }),
      fetch("/film-engine/kit.js").then((response) => {
        if (!response.ok) throw new Error("kit");
        return response.text();
      }),
    ])
      .then(([core, kit]) => ({ core, kit }))
      .catch((error: unknown) => {
        runtimePromise = null;
        throw error;
      });
  }
  return runtimePromise;
}

function inlineSafe(source: string): string {
  return source.replace(/<\/(script)/gi, "<\\/$1");
}

function countLines(text: string): number {
  let lines = 0;
  for (let k = 0; k < text.length; k += 1) if (text.charCodeAt(k) === 10) lines += 1;
  return lines;
}

function buildDocument(runtime: Runtime, codes: (string | null)[], config: EngineConfig): string {
  const parts: string[] = [];
  let lines = 0;
  const push = (text: string) => {
    parts.push(text);
    lines += countLines(text);
  };
  push(
    `<!doctype html>\n<html><head><meta charset="utf-8">\n` +
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:">\n` +
      `<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block}.bar{display:none!important}</style>\n` +
      `</head><body><canvas id="c"></canvas>\n`,
  );
  push(`<script>\n${inlineSafe(runtime.core)}\n</script>\n`);
  push(`<script>\n${inlineSafe(runtime.kit)}\n</script>\n`);
  const lineStarts: number[] = [];
  codes.forEach((code, index) => {
    push(`<script>__LOADING=${index}</script>\n<script>__SCENES[${index}]=(function(){\n`);
    lineStarts.push(lines + 1);
    const name = `scene${index + 1}`;
    push(
      code
        ? `${inlineSafe(code)}\n;return typeof ${name}==='function'?${name}:null;})();</script>\n`
        : `return null;})();</script>\n`,
    );
  });
  const payload = JSON.stringify({ ...config, lineStarts }).replace(/</g, "\\u003c");
  push(`<script>__LOADING=-1;__startFilm(${payload});</script>\n</body></html>`);
  return parts.join("");
}

type Pending = {
  resolve: (message: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timer: number;
};

export class FilmEngine {
  readonly frames: number;
  readonly size: { w: number; h: number };
  readonly loadErrors: Record<string, string>;
  private readonly iframe: HTMLIFrameElement;
  private readonly port: MessagePort;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private disposed = false;

  private constructor(iframe: HTMLIFrameElement, port: MessagePort, ready: Ready) {
    this.iframe = iframe;
    this.port = port;
    this.frames = ready.frames;
    this.size = ready.size ?? { w: 1920, h: 1080 };
    this.loadErrors = ready.errors;
    port.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
      const id = Number(event.data?.id);
      const waiting = this.pending.get(id);
      if (!waiting) return;
      this.pending.delete(id);
      window.clearTimeout(waiting.timer);
      if (event.data.type === "error") waiting.reject(new Error(String(event.data.error)));
      else waiting.resolve(event.data);
    };
  }

  static async create(codes: (string | null)[], config: EngineConfig, timeoutMs = 20_000): Promise<FilmEngine> {
    const runtime = await loadRuntime();
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.title = "Film renderer";
    iframe.style.cssText =
      "position:fixed;left:-4000px;top:0;width:320px;height:180px;border:0;opacity:0;pointer-events:none;";
    iframe.srcdoc = buildDocument(runtime, codes, config);

    return new Promise<FilmEngine>((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => {
        channel.port1.close();
        iframe.remove();
        reject(new Error("The film renderer did not start."));
      }, timeoutMs);
      channel.port1.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
        if (event.data?.type !== "ready") return;
        window.clearTimeout(timer);
        const ready = event.data as unknown as Ready;
        if (ready.fatal || !ready.frames) {
          channel.port1.close();
          iframe.remove();
          reject(new Error(ready.fatal || "The film renderer did not start."));
          return;
        }
        resolve(new FilmEngine(iframe, channel.port1, ready));
      };
      iframe.addEventListener(
        "load",
        () => iframe.contentWindow?.postMessage({ type: "connect" }, "*", [channel.port2]),
        { once: true },
      );
      document.body.appendChild(iframe);
    });
  }

  private request(message: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    if (this.disposed) return Promise.reject(new Error("The film renderer was closed."));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("The film renderer stopped responding."));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.port.postMessage({ ...message, id });
    });
  }

  async probe(index: number, timeoutMs = 15_000): Promise<ProbeResult> {
    const reply = await this.request({ type: "probe", index }, timeoutMs);
    return reply.result as ProbeResult;
  }

  /** Draw frame `i`. Returns the bitmap (caller closes it) or null when the frame equals the previous one. */
  async frame(i: number, timeoutMs = 15_000): Promise<FrameReply & { bitmap: ImageBitmap | null }> {
    const reply = await this.request({ type: "frame", i }, timeoutMs);
    return {
      i,
      scene: Number(reply.scene ?? 0),
      errors: (reply.errors as Record<string, string>) ?? {},
      bitmap: (reply.bitmap as ImageBitmap | undefined) ?? null,
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const waiting of this.pending.values()) {
      window.clearTimeout(waiting.timer);
      waiting.reject(new Error("The film renderer was closed."));
    }
    this.pending.clear();
    this.port.close();
    this.iframe.remove();
  }
}
