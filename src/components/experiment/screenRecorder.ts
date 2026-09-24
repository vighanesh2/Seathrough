export type ScreenRecording = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  poster?: Blob;
};

type DisplayStreamOptions = MediaStreamConstraints & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: "include" | "exclude";
  systemAudio?: "include" | "exclude";
  suppressLocalAudioPlayback?: boolean;
};

export type LessonAudioTap = {
  context: AudioContext;
  dest: MediaStreamAudioDestinationNode;
};

export type ScreenRecordSession = {
  recorder: MediaRecorder;
  stream: MediaStream;
  startedAt: number;
  chunks: Blob[];
  mimeType: string;
};

export function createLessonAudioTap(): LessonAudioTap {
  const context = new AudioContext();
  const dest = context.createMediaStreamDestination();
  return { context, dest };
}

function pickRecorderMime(hasAudio: boolean): string {
  const types = hasAudio
    ? [
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ]
    : ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm", "video/mp4"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function playableBlob(chunks: Blob[], mimeType: string): Blob {
  return new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" });
}

async function posterFromStream(stream: MediaStream): Promise<Blob | undefined> {
  const track = stream.getVideoTracks()[0];
  if (!track || track.readyState !== "live") return undefined;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  try {
    await video.play();
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(320, video.videoWidth || 1280);
    canvas.height = Math.max(180, video.videoHeight || 720);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? undefined), "image/jpeg", 0.78);
    });
  } catch {
    return undefined;
  } finally {
    video.pause();
    video.srcObject = null;
  }
}

/**
 * Record this tab's video only. Tutor speech is mixed from the AudioContext
 * tap — never from system audio or the mic, which would echo the same voice.
 */
export async function startScreenRecording(audioTap: LessonAudioTap): Promise<ScreenRecordSession> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot record. Try Chrome or Edge.");
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen recording is not available in this browser.");
  }

  const display = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: 30,
      displaySurface: "browser",
    },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    systemAudio: "exclude",
    suppressLocalAudioPlayback: true,
  } as DisplayStreamOptions);

  display.getAudioTracks().forEach((track) => track.stop());

  const mixed = new MediaStream([...display.getVideoTracks()]);
  const voice = audioTap.dest.stream.getAudioTracks()[0];
  if (voice) mixed.addTrack(voice);

  const hasAudio = mixed.getAudioTracks().length > 0;
  const mimeType = pickRecorderMime(hasAudio);
  const chunks: Blob[] = [];
  try {
    const recorder = mimeType
      ? new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 2_800_000 })
      : new MediaRecorder(mixed);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.start(250);
    return {
      recorder,
      stream: display,
      startedAt: performance.now(),
      chunks,
      mimeType: recorder.mimeType || mimeType || "video/webm",
    };
  } catch (error) {
    display.getTracks().forEach((track) => track.stop());
    throw error;
  }
}

export function stopScreenRecording(
  session: ScreenRecordSession,
): Promise<ScreenRecording> {
  const posterPromise = posterFromStream(session.stream);

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = async () => {
      if (settled) return;
      settled = true;
      const mimeType = session.mimeType || "video/webm";
      const blob = playableBlob(session.chunks, mimeType);
      session.stream.getTracks().forEach((track) => track.stop());
      if (!blob.size) {
        reject(new Error("The recording was empty. Try Record again."));
        return;
      }
      const poster = await posterPromise.catch(() => undefined);
      resolve({
        blob,
        mimeType: blob.type || "video/webm",
        durationMs: Math.max(400, Math.round(performance.now() - session.startedAt)),
        poster,
      });
    };

    session.recorder.onstop = () => {
      void finish();
    };
    session.recorder.onerror = () =>
      reject(new Error("Could not finish the recording."));

    if (session.recorder.state === "recording") {
      try {
        session.recorder.requestData();
      } catch {
        /* some browsers omit requestData */
      }
      session.recorder.stop();
    } else {
      void finish();
    }
  });
}
