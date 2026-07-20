import type { CoachEditorState } from "../../types/coachSession";
import { poseIndexForTime, type Pose } from "./joints";
import { renderCoachOverlay } from "./renderCoachOverlay";
import { buildFrameSchedule, safeCoachFps } from "./playbackSchedule";
import {
  paceDeadlineSlot,
  paceFullFrameSlot,
  seekVideoTo,
} from "./seekVideo";

export interface ExportCoachVideoOptions {
  video: HTMLVideoElement;
  editor: CoachEditorState;
  poses: Pose[];
  frameIntervalSec: number;
  /** Export framerate — should match the uploaded clip's source fps. */
  fps: number;
  showSkeleton?: boolean;
  onProgress?: (pct: number) => void;
}

export interface ExportCoachVideoResult {
  blob: Blob;
  filename: string;
}

function seekTo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return seekVideoTo(video, timeSec);
}

function pickMimeType(): { mimeType: string; ext: string } {
  if (MediaRecorder.isTypeSupported("video/mp4;codecs=h264")) {
    return { mimeType: "video/mp4;codecs=h264", ext: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/mp4")) {
    return { mimeType: "video/mp4", ext: "mp4" };
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return { mimeType: "video/webm;codecs=vp9", ext: "webm" };
  }
  return { mimeType: "video/webm;codecs=vp8", ext: "webm" };
}

/**
 * Render the Coach Export clip: video + overlays, with freeze holds, at source fps.
 * Runs entirely client-side and resolves to a downloadable blob.
 *
 * Frame pacing uses a deadline from recording start so seek latency is not added
 * on top of a full 1/fps sleep (which caused slow-motion exports).
 */
export async function exportCoachVideo({
  video,
  editor,
  poses,
  frameIntervalSec,
  fps,
  showSkeleton = false,
  onProgress,
}: ExportCoachVideoOptions): Promise<ExportCoachVideoResult> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error("Video not ready for export.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create export canvas.");

  const safeFps = safeCoachFps(fps);
  const duration = video.duration || 0;
  const schedule = buildFrameSchedule(editor, duration, safeFps);
  if (schedule.length === 0) {
    throw new Error("Nothing to export.");
  }

  // Fixed-rate stream: browser targets safeFps. requestFrame still used when available
  // so each drawn canvas becomes an explicit sample.
  const stream = canvas.captureStream(safeFps);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & {
    requestFrame?: () => void;
  };
  const { mimeType, ext } = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const wasPlaying = !video.paused;
  video.pause();
  const originalTime = video.currentTime;

  const finished = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();

  const frameIntervalMs = 1000 / safeFps;
  let segmentStart = performance.now();
  let segmentFrames = 0;
  let prevWasHold = false;

  for (let i = 0; i < schedule.length; i++) {
    const frame = schedule[i]!;
    const isHold = frame.activeFreezeId != null;
    // Reset deadline at hold↔motion boundaries so motion seek debt cannot
    // compress later freezes (and hold time does not inflate following motion).
    if (isHold !== prevWasHold) {
      segmentStart = performance.now();
      segmentFrames = 0;
      prevWasHold = isHold;
    }

    const frameStartedAt = performance.now();
    await seekTo(video, frame.sourceTimeSec);

    const poseIdx = poseIndexForTime(frame.sourceTimeSec, poses.length, frameIntervalSec);
    const pose = poses[poseIdx] ?? null;
    const prevPose = poseIdx > 0 ? poses[poseIdx - 1] ?? null : null;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);
    renderCoachOverlay({
      ctx,
      width,
      height,
      editor,
      pose,
      prevPose,
      activeFreezeId: frame.activeFreezeId,
      sourceTimeMs: Math.round(frame.sourceTimeSec * 1000),
      durationMs: Math.round(duration * 1000),
      showSkeleton,
      scale: 1,
      glassSource: video,
    });

    track.requestFrame?.();
    onProgress?.(Math.round(((i + 1) / schedule.length) * 100));

    segmentFrames += 1;
    if (isHold) {
      await paceFullFrameSlot(frameStartedAt, frameIntervalMs);
    } else {
      await paceDeadlineSlot(segmentStart, segmentFrames, frameIntervalMs);
    }
  }

  recorder.stop();
  const blob = await finished;

  video.currentTime = originalTime;
  if (wasPlaying) void video.play().catch(() => {});

  return { blob, filename: `coach-export-${Date.now()}.${ext}` };
}
