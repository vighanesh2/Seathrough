import type { FilmEngine } from "@/components/explain-video/engine";

export type ShotProgress = { frame: number; frames: number; scene: number; seconds: number };

type ShootOptions = {
  engine: FilmEngine;
  canvas: HTMLCanvasElement;
  fps: number;
  /** Narration mixed to the film's length; null films silently. */
  audio: AudioBuffer | null;
  onFrame: (progress: ShotProgress) => void;
  isCancelled: () => boolean;
};

export type Shot = { blob: Blob; voiced: boolean };

const AUDIO_CHUNK_SECONDS = 1;

function sliceAudio(audio: AudioBuffer, fromSeconds: number, seconds: number): AudioBuffer | null {
  const start = Math.floor(fromSeconds * audio.sampleRate);
  const end = Math.min(audio.length, start + Math.floor(seconds * audio.sampleRate));
  if (end <= start) return null;
  const chunk = new AudioBuffer({
    length: end - start,
    numberOfChannels: audio.numberOfChannels,
    sampleRate: audio.sampleRate,
  });
  for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
    chunk.copyToChannel(audio.getChannelData(channel).subarray(start, end), channel);
  }
  return chunk;
}

function drawReply(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, bitmap: ImageBitmap | null) {
  if (!bitmap) return;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
}

function prepareCanvas(engine: FilmEngine, canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = engine.size.w;
  canvas.height = engine.size.h;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("The film could not be drawn. Try again in a moment.");
  return ctx;
}

/** Frame-exact encode: every drawn frame gets its own timestamp, however long it took to draw. */
async function encodeExact(options: ShootOptions): Promise<Shot | null | "unsupported"> {
  if (typeof window === "undefined" || typeof window.VideoEncoder === "undefined") return "unsupported";
  const { engine, canvas, fps, audio, onFrame, isCancelled } = options;
  const mb = await import("mediabunny");
  const width = engine.size.w;
  const height = engine.size.h;
  const codec = await mb.getFirstEncodableVideoCodec(["avc", "vp9", "vp8"], {
    width,
    height,
    quality: mb.QUALITY_HIGH,
  });
  if (!codec) return "unsupported";

  const ctx = prepareCanvas(engine, canvas);
  const target = new mb.BufferTarget();
  const format = codec === "avc" ? new mb.Mp4OutputFormat({ fastStart: "in-memory" }) : new mb.WebMOutputFormat();
  const output = new mb.Output({ format, target });
  const source = new mb.CanvasSource(canvas, { codec, quality: mb.QUALITY_HIGH, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: fps });

  const audioCodec =
    audio && typeof window.AudioEncoder !== "undefined"
      ? await mb.getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
          numberOfChannels: audio.numberOfChannels,
          sampleRate: audio.sampleRate,
          quality: mb.QUALITY_HIGH,
        })
      : null;
  const voice = audio && audioCodec ? new mb.AudioBufferSource({ codec: audioCodec, quality: mb.QUALITY_HIGH }) : null;
  if (voice) output.addAudioTrack(voice);
  await output.start();

  let audioCursor = 0;
  const feedAudio = async (untilSeconds: number) => {
    if (!voice || !audio) return;
    while (audioCursor < Math.min(untilSeconds, audio.duration)) {
      const chunk = sliceAudio(audio, audioCursor, AUDIO_CHUNK_SECONDS);
      audioCursor += AUDIO_CHUNK_SECONDS;
      if (chunk) await voice.add(chunk);
    }
  };

  try {
    for (let i = 0; i < engine.frames; i += 1) {
      if (isCancelled()) {
        await output.cancel();
        return null;
      }
      await feedAudio((i + 1) / fps + AUDIO_CHUNK_SECONDS);
      const reply = await engine.frame(i);
      drawReply(ctx, canvas, reply.bitmap);
      await source.add(i / fps, 1 / fps);
      onFrame({ frame: i, frames: engine.frames, scene: reply.scene, seconds: i / fps });
    }
    await feedAudio(Number.POSITIVE_INFINITY);
    await output.finalize();
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel().catch(() => undefined);
    throw error;
  }
  const buffer = target.buffer;
  if (!buffer) return null;
  return { blob: new Blob([buffer], { type: format.mimeType }), voiced: Boolean(voice) };
}

function recorderMime(withAudio: boolean): string {
  if (typeof MediaRecorder === "undefined") return "";
  const options = [
    ...(withAudio ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4;codecs=avc1,mp4a.40.2"] : []),
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return options.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

/** Plays the narration live into a MediaStream track for the real-time recorder. */
async function liveNarration(audio: AudioBuffer | null) {
  if (!audio || typeof AudioContext === "undefined") return null;
  try {
    const ctx = new AudioContext({ sampleRate: audio.sampleRate });
    if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
    if (ctx.state !== "running") {
      await ctx.close().catch(() => undefined);
      return null;
    }
    const destination = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = audio;
    source.connect(destination);
    const track = destination.stream.getAudioTracks()[0];
    if (!track) {
      await ctx.close().catch(() => undefined);
      return null;
    }
    let playing = false;
    return {
      track,
      start: () => {
        source.start();
        playing = true;
      },
      stop: () => {
        if (playing) source.stop();
        playing = false;
        track.stop();
        void ctx.close().catch(() => undefined);
      },
    };
  } catch {
    return null;
  }
}

/** Fallback: play the film in real time and record the canvas. Frames that draw slowly are held. */
async function recordRealtime(options: ShootOptions): Promise<Shot | null> {
  const { engine, canvas, fps, audio, onFrame, isCancelled } = options;
  const ctx = prepareCanvas(engine, canvas);
  if (typeof canvas.captureStream !== "function" || !recorderMime(false)) {
    throw new Error("This browser cannot record the film. Try a recent Chrome, Edge or Safari.");
  }
  const first = await engine.frame(0);
  drawReply(ctx, canvas, first.bitmap);

  const manual = canvas.captureStream(0);
  const track = manual.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  const pictures = track?.requestFrame ? manual : canvas.captureStream(fps);
  const live = pictures.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  const narration = recorderMime(true) !== recorderMime(false) ? await liveNarration(audio) : null;
  const mime = recorderMime(Boolean(narration));
  const stream = new MediaStream([...pictures.getVideoTracks(), ...(narration ? [narration.track] : [])]);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  recorder.start(500);
  narration?.start();
  live?.requestFrame?.();

  const started = performance.now();
  const duration = engine.frames / fps;
  let last = 0;
  try {
    for (;;) {
      if (isCancelled()) break;
      const seconds = (performance.now() - started) / 1000;
      if (seconds >= duration) break;
      const i = Math.min(engine.frames - 1, Math.floor(seconds * fps));
      if (i === last) {
        await new Promise((resolve) => window.setTimeout(resolve, 4));
        continue;
      }
      const reply = await engine.frame(i);
      drawReply(ctx, canvas, reply.bitmap);
      live?.requestFrame?.();
      last = i;
      onFrame({ frame: i, frames: engine.frames, scene: reply.scene, seconds: i / fps });
    }
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    narration?.stop();
    pictures.getTracks().forEach((t) => t.stop());
  }
  if (isCancelled() || !chunks.length) return null;
  return { blob: new Blob(chunks, { type: mime.split(";")[0] }), voiced: Boolean(narration) };
}

export async function shootFilm(options: ShootOptions): Promise<Shot | null> {
  const exact = await encodeExact(options);
  if (exact !== "unsupported") return exact;
  return recordRealtime(options);
}
