/**
 * Seek a paused preview/export video and wait until the frame is ready.
 * Shared by Coach Studio preview playback and export.
 */
export function seekVideoTo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const dur = video.duration;
    const maxTime = Number.isFinite(dur) && dur > 0 ? dur - 0.001 : timeSec;
    const target = Math.max(0, Math.min(timeSec, maxTime));

    if (Math.abs(video.currentTime - target) < 0.0005) {
      resolve();
      return;
    }

    const done = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", onErr);
      clearTimeout(timer);
      resolve();
    };

    const onErr = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", onErr);
      clearTimeout(timer);
      reject(new Error("Video seek failed"));
    };

    const timer = setTimeout(done, 2000);
    video.addEventListener("seeked", done);
    video.addEventListener("error", onErr);
    video.currentTime = target;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { sleep as coachPlaybackSleep };

/**
 * Pace one output frame without catch-up: always honor the remaining slot.
 * Used for freeze holds so seek debt from earlier motion cannot compress them.
 */
export async function paceFullFrameSlot(
  frameStartedAt: number,
  frameMs: number
): Promise<void> {
  const wait = frameMs - (performance.now() - frameStartedAt);
  if (wait > 1) await sleep(wait);
}

/**
 * Deadline pacing within a motion segment. When behind, skips sleep so
 * motion can catch up — never use across hold frames.
 */
export async function paceDeadlineSlot(
  segmentStart: number,
  framesDone: number,
  frameMs: number
): Promise<void> {
  const wait = segmentStart + framesDone * frameMs - performance.now();
  if (wait > 1) await sleep(wait);
}
