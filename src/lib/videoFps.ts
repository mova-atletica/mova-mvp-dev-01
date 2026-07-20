/**
 * Sample + clamp source video fps for Open Move / mini-app export.
 * Sampling uses requestVideoFrameCallback when available.
 */

export function safeExportFps(fps: number | null | undefined): number {
  return Math.min(60, Math.max(10, Math.round(fps || 30)));
}

/**
 * Best-effort fps via requestVideoFrameCallback.
 * Restores mute / play / currentTime so preview is not disrupted.
 * Returns null if unsupported or samples are too noisy.
 */
export async function sampleVideoElementFps(
  video: HTMLVideoElement
): Promise<number | null> {
  const rvfc = (
    video as HTMLVideoElement & {
      requestVideoFrameCallback?: (
        cb: (now: number, meta: { mediaTime: number }) => void
      ) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    }
  ).requestVideoFrameCallback;

  if (typeof rvfc !== "function" || !Number.isFinite(video.duration) || video.duration <= 0) {
    return null;
  }

  const wasPlaying = !video.paused;
  const wasMuted = video.muted;
  const originalTime = video.currentTime;

  video.muted = true;

  try {
    await video.play();
  } catch {
    video.muted = wasMuted;
    return null;
  }

  const samples: number[] = [];
  const maxSamples = 24;
  const timeoutMs = 1200;

  return new Promise((resolve) => {
    let handle: number | undefined;
    const timer = window.setTimeout(() => {
      if (handle !== undefined && video.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(handle);
      }
      finish();
    }, timeoutMs);

    const finish = () => {
      window.clearTimeout(timer);
      video.pause();
      try {
        video.currentTime = originalTime;
      } catch {
        /* ignore */
      }
      video.muted = wasMuted;
      if (wasPlaying) void video.play().catch(() => {});

      if (samples.length < 4) {
        resolve(null);
        return;
      }
      const deltas: number[] = [];
      for (let i = 1; i < samples.length; i++) {
        const d = samples[i]! - samples[i - 1]!;
        if (d > 0.001 && d < 0.2) deltas.push(d);
      }
      if (deltas.length < 3) {
        resolve(null);
        return;
      }
      deltas.sort((a, b) => a - b);
      const median = deltas[Math.floor(deltas.length / 2)]!;
      const fps = Math.round(10 / median) / 10;
      if (fps < 8 || fps > 120) {
        resolve(null);
        return;
      }
      resolve(fps);
    };

    const onFrame = (_now: number, meta: { mediaTime: number }) => {
      samples.push(meta.mediaTime);
      if (samples.length >= maxSamples) {
        if (handle !== undefined && video.cancelVideoFrameCallback) {
          video.cancelVideoFrameCallback(handle);
        }
        finish();
        return;
      }
      handle = rvfc.call(video, onFrame);
    };

    handle = rvfc.call(video, onFrame);
  });
}
