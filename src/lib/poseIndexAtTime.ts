/**
 * Map video playhead time → pose index.
 *
 * ARKit Live writes `timestamps` on the mp4 timeline (not uniform across duration).
 * Before the first timestamp there is no pose yet — return null and skip overlays
 * (do not clamp to pose 0; that paints the first tracked body on the walk-in).
 * Web MoveNet / Vision sample along the file, so N/duration (or t / dt) stays correct.
 */

export type PoseTimeline = {
  timestamps?: number[] | null;
  frameIntervalSec?: number | null;
};

/** Keep timestamps only when they line up 1:1 with poses (iOS OpenMovePoseCodec). */
export function normalizePoseTimestamps(
  raw: unknown,
  poseCount: number
): number[] | null {
  if (!Array.isArray(raw) || poseCount < 2 || raw.length !== poseCount) {
    return null;
  }
  const out: number[] = [];
  for (const value of raw) {
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    out.push(value);
  }
  return out;
}

/** Last index with timestamps[i] <= t (iOS indexAtOrBefore). */
export function indexAtOrBefore(timestamps: number[], t: number): number {
  const n = timestamps.length;
  if (n === 0) return 0;
  if (t <= timestamps[0]) return 0;
  if (t >= timestamps[n - 1]) return n - 1;

  let lo = 0;
  let hi = n - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timestamps[mid] <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Video playhead → pose index.
 * `null` = no sample yet (t before first iOS timestamp). Callers must skip drawing;
 * do not treat null as 0 (`null < n` is true in JS and would paint pose 0).
 */
export function poseIndexAtTime(
  currentTime: number,
  poseCount: number,
  opts: PoseTimeline & { durationSec?: number | null } = {}
): number | null {
  const n = poseCount;
  if (n <= 0) return null;
  const t = Number.isFinite(currentTime) ? currentTime : 0;
  const timestamps = normalizePoseTimestamps(opts.timestamps, n);

  if (timestamps) {
    if (t < timestamps[0]) return null;
    return indexAtOrBefore(timestamps, t);
  }

  const dt = opts.frameIntervalSec;
  if (dt != null && Number.isFinite(dt) && dt > 0) {
    return Math.min(n - 1, Math.max(0, Math.floor(t / dt)));
  }

  const d =
    opts.durationSec != null && Number.isFinite(opts.durationSec) && opts.durationSec > 0
      ? opts.durationSec
      : 1;
  return Math.min(n - 1, Math.max(0, Math.floor(t * (n / d))));
}

/** Inverse: pose index → video time (chart click / seek). */
export function timeSecForPoseIndex(
  index: number,
  poseCount: number,
  opts: PoseTimeline & { durationSec?: number | null } = {}
): number {
  const n = poseCount;
  if (n <= 0) return 0;
  const i = Math.min(n - 1, Math.max(0, Math.floor(index)));
  const timestamps = normalizePoseTimestamps(opts.timestamps, n);
  if (timestamps) return timestamps[i];

  const dt = opts.frameIntervalSec;
  if (dt != null && Number.isFinite(dt) && dt > 0) {
    return i * dt;
  }

  const d =
    opts.durationSec != null && Number.isFinite(opts.durationSec) && opts.durationSec > 0
      ? opts.durationSec
      : 1;
  return (i / n) * d;
}

export function poseSpanSec(
  poseCount: number,
  opts: PoseTimeline & { durationSec?: number | null } = {}
): number {
  const timestamps = normalizePoseTimestamps(opts.timestamps, poseCount);
  if (timestamps && timestamps.length >= 2) {
    return Math.max(timestamps[timestamps.length - 1] - timestamps[0], 0);
  }
  const dt = opts.frameIntervalSec;
  if (dt != null && Number.isFinite(dt) && dt > 0 && poseCount > 0) {
    return poseCount * dt;
  }
  if (opts.durationSec != null && Number.isFinite(opts.durationSec) && opts.durationSec > 0) {
    return opts.durationSec;
  }
  return 0;
}
