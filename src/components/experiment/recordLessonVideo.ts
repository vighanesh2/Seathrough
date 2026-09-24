export type SpokenClip = {
  mimeType: string;
  base64: string;
};

export type LessonVideoFrame = {
  canvas: HTMLCanvasElement;
  audio: SpokenClip | null;
};

export type EncodedLessonVideo = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  poster: Blob;
};

function pickRecorderMime(): string {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function decodeBase64(base64: string): ArrayBuffer {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function decodeClip(
  ctx: AudioContext,
  clip: SpokenClip,
): Promise<AudioBuffer | null> {
  try {
    return await ctx.decodeAudioData(decodeBase64(clip.base64));
  } catch {
    return null;
  }
}

/**
 * Encode beat stills + spoken audio into a WebM/MP4 using MediaRecorder.
 * Runs in real time (one pass through the spoken lesson).
 */
export async function encodeLessonVideo(
  frames: LessonVideoFrame[],
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal,
): Promise<EncodedLessonVideo> {
  if (!frames.length) throw new Error("Nothing to save yet. Play a lesson first.");
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot record a video. Try Chrome or Edge.");
  }

  const first = frames[0]!.canvas;
  const width = 1280;
  const height = Math.max(720, Math.round((first.height / first.width) * width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = "fixed";
  canvas.style.left = "-4000px";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not start the video recorder.");

  const mimeType = pickRecorderMime();
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const visual = canvas.captureStream(30);
  const mixed = new MediaStream([
    ...visual.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);
  const recorder = mimeType
    ? new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 2_500_000 })
    : new MediaRecorder(mixed);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const paint = (source: HTMLCanvasElement) => {
    ctx.fillStyle = "#fbfcfe";
    ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / source.width, height / source.height);
    const w = source.width * scale;
    const h = source.height * scale;
    ctx.drawImage(source, (width - w) / 2, (height - h) / 2, w, h);
  };

  paint(first);
  recorder.start(250);
  await wait(80, signal);

  let durationMs = 0;
  try {
    for (let index = 0; index < frames.length; index += 1) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      onProgress?.(index + 1, frames.length);
      const frame = frames[index]!;
      paint(frame.canvas);
      const buffer = frame.audio
        ? await decodeClip(audioCtx, frame.audio)
        : null;
      const holdMs = buffer ? Math.ceil(buffer.duration * 1000) : 2200;
      if (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(dest);
        source.start();
      }
      const end = performance.now() + holdMs;
      while (performance.now() < end) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        paint(frame.canvas);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
      durationMs += holdMs;
    }
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const finish = (file: Blob) => {
      if (settled) return;
      settled = true;
      resolve(file);
    };
    recorder.onstop = () =>
      finish(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    recorder.onerror = () => reject(new Error("Could not finish the video."));
    window.setTimeout(() => {
      if (!settled && chunks.length) {
        finish(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      }
    }, 1500);
  });

  await audioCtx.close().catch(() => undefined);
  canvas.remove();

  const poster = await new Promise<Blob>((resolve, reject) => {
    frames[frames.length - 1]!.canvas.toBlob(
      (file) => {
        if (file) resolve(file);
        else reject(new Error("Could not capture a poster frame."));
      },
      "image/jpeg",
      0.82,
    );
  });

  if (!blob.size) throw new Error("The video file was empty.");
  return {
    blob,
    mimeType: blob.type || recorder.mimeType || "video/webm",
    durationMs,
    poster,
  };
}
