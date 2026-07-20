import { COACH_STUDIO_MAX_DURATION_MS } from "../../types/coachSession";
import { sampleVideoElementFps } from "../videoFps";

export interface CoachVideoProbe {
  durationMs: number;
  width: number;
  height: number;
  /** Best-effort fps; null if we could not sample reliably */
  fps: number | null;
}

export class CoachVideoTooLongError extends Error {
  readonly durationMs: number;

  constructor(durationMs: number) {
    super(
      `Video is ${(durationMs / 1000).toFixed(1)}s. Coach Studio accepts clips up to 30 seconds.`
    );
    this.name = "CoachVideoTooLongError";
    this.durationMs = durationMs;
  }
}

function loadVideoMetadata(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    video.onloadedmetadata = () => {
      // Keep object URL until caller finishes fps sampling; revoke in probeCoachVideoFile
      resolve(video);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read this video. Try MP4 or WebM."));
    };
    video.src = url;
  });
}

/**
 * Probe an uploaded file for Coach Studio. Rejects if duration &gt; 30s.
 */
export async function probeCoachVideoFile(file: File): Promise<CoachVideoProbe> {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
    throw new Error("Please upload a video file (MP4, WebM, or MOV).");
  }

  const video = await loadVideoMetadata(file);
  const objectUrl = video.src;

  try {
    const durationMs = Math.round((video.duration || 0) * 1000);
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      throw new Error("Could not determine video duration.");
    }
    if (durationMs > COACH_STUDIO_MAX_DURATION_MS) {
      throw new CoachVideoTooLongError(durationMs);
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      throw new Error("Could not determine video dimensions.");
    }

    const fps = await sampleVideoElementFps(video);

    return { durationMs, width, height, fps };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
