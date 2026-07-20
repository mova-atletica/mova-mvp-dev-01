import {
  COACH_KEYPOINT_MIN_SCORE,
  type Keypoint,
  type Pose,
} from "./joints";

/**
 * Display-path smoothing for Coach Studio (preview + export).
 * Raw keypoints stay in cache; only displayPoses are filtered.
 *
 * Pipeline: score gate → spike reject → temporal median → light EMA polish.
 */
export const COACH_POSE_SMOOTH_WINDOW_MS = 650;

/** Slightly stricter than draw-time default so weak detections don't pull the median. */
export const COACH_DISPLAY_MIN_SCORE = Math.max(COACH_KEYPOINT_MIN_SCORE, 0.48);

/**
 * Max distance from local median (as a fraction of pose extent) before a
 * sample is treated as a teleport / outlier and excluded.
 */
export const COACH_SPIKE_FRACTION = 0.07;

/** Residual jitter polish after median (0 = off, 1 = freeze on previous). */
export const COACH_DISPLAY_EMA_ALPHA = 0.45;

type CacheEntry = {
  frameIntervalSec: number;
  windowMs: number;
  smoothed: Pose[];
};

const displayPoseCache = new WeakMap<Pose[], CacheEntry>();

function halfWindowFrames(frameIntervalSec: number, windowMs: number): number {
  const interval = Math.max(frameIntervalSec, 1 / 120);
  return Math.max(1, Math.round(windowMs / 1000 / interval / 2));
}

function isReliable(kp: Keypoint | undefined, minScore: number): kp is Keypoint {
  if (!kp) return false;
  if (!Number.isFinite(kp.x) || !Number.isFinite(kp.y)) return false;
  if (typeof kp.score === "number" && kp.score < minScore) return false;
  return true;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function estimatePoseExtent(indexed: Array<Map<string, Keypoint>>, minScore: number): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let any = false;
  for (const map of indexed) {
    for (const kp of map.values()) {
      if (!isReliable(kp, minScore)) continue;
      any = true;
      minX = Math.min(minX, kp.x);
      minY = Math.min(minY, kp.y);
      maxX = Math.max(maxX, kp.x);
      maxY = Math.max(maxY, kp.y);
    }
  }
  if (!any) return 1000;
  return Math.max(80, Math.hypot(maxX - minX, maxY - minY));
}

/**
 * Temporally smooth MoveNet poses for overlay preview/export.
 * Does not mutate the input — keep raw poses in keypoints.json cache.
 */
export function smoothCoachPosesForDisplay(
  poses: Pose[],
  frameIntervalSec: number,
  options?: { windowMs?: number; minScore?: number; spikeFraction?: number; emaAlpha?: number }
): Pose[] {
  if (poses.length <= 1) return poses;

  const windowMs = options?.windowMs ?? COACH_POSE_SMOOTH_WINDOW_MS;
  const minScore = options?.minScore ?? COACH_DISPLAY_MIN_SCORE;
  const spikeFraction = options?.spikeFraction ?? COACH_SPIKE_FRACTION;
  const emaAlpha = options?.emaAlpha ?? COACH_DISPLAY_EMA_ALPHA;
  const half = halfWindowFrames(frameIntervalSec, windowMs);

  const indexed: Array<Map<string, Keypoint>> = poses.map((pose) => {
    const map = new Map<string, Keypoint>();
    for (const kp of pose.keypoints ?? []) {
      if (kp?.name) map.set(kp.name, kp);
    }
    return map;
  });

  const names = new Set<string>();
  for (const map of indexed) {
    for (const name of map.keys()) names.add(name);
  }

  const extent = estimatePoseExtent(indexed, minScore);
  const spikeMax = extent * spikeFraction;

  // Pass 1: per-frame median of reliable, non-spike neighbors
  const medianPass: Array<Map<string, Keypoint>> = poses.map((pose, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(poses.length - 1, i + half);
    const out = new Map<string, Keypoint>();

    for (const name of names) {
      const xs: number[] = [];
      const ys: number[] = [];
      const scores: number[] = [];

      // Local median including self (for spike test baseline of neighbors-only)
      const neighborXs: number[] = [];
      const neighborYs: number[] = [];
      for (let j = start; j <= end; j++) {
        const kp = indexed[j]!.get(name);
        if (!isReliable(kp, minScore)) continue;
        if (j !== i) {
          neighborXs.push(kp.x);
          neighborYs.push(kp.y);
        }
      }

      const nMedX = neighborXs.length ? median(neighborXs) : null;
      const nMedY = neighborYs.length ? median(neighborYs) : null;

      for (let j = start; j <= end; j++) {
        const kp = indexed[j]!.get(name);
        if (!isReliable(kp, minScore)) continue;

        // Reject teleports relative to neighbor median (when we have neighbors)
        if (nMedX != null && nMedY != null) {
          const dist = Math.hypot(kp.x - nMedX, kp.y - nMedY);
          if (dist > spikeMax) continue;
        }

        xs.push(kp.x);
        ys.push(kp.y);
        scores.push(typeof kp.score === "number" ? kp.score : 1);
      }

      if (xs.length === 0) {
        const orig = indexed[i]!.get(name);
        // Drop wild self-only spikes rather than keep them
        if (orig && isReliable(orig, minScore)) {
          if (nMedX != null && nMedY != null) {
            const dist = Math.hypot(orig.x - nMedX, orig.y - nMedY);
            if (dist > spikeMax) {
              out.set(name, {
                name,
                x: nMedX,
                y: nMedY,
                score: typeof orig.score === "number" ? orig.score : 1,
              });
              continue;
            }
          }
          out.set(name, { ...orig });
        }
        continue;
      }

      out.set(name, {
        name,
        x: median(xs),
        y: median(ys),
        score: median(scores),
      });
    }

    return out;
  });

  // Pass 2: light causal EMA to polish residual jitter (non-causal median already applied)
  const prevEma = new Map<string, Keypoint>();
  return poses.map((pose, i) => {
    const med = medianPass[i]!;
    const smoothedByName = new Map<string, Keypoint>();

    for (const name of names) {
      const cur = med.get(name);
      if (!cur) continue;
      const prev = prevEma.get(name);
      let next: Keypoint;
      if (!prev || emaAlpha <= 0) {
        next = { ...cur };
      } else {
        const a = Math.min(1, Math.max(0, emaAlpha));
        next = {
          name,
          x: a * prev.x + (1 - a) * cur.x,
          y: a * prev.y + (1 - a) * cur.y,
          score: cur.score,
        };
      }
      prevEma.set(name, next);
      smoothedByName.set(name, next);
    }

    const keypoints: Keypoint[] = [];
    const used = new Set<string>();
    for (const kp of pose.keypoints ?? []) {
      if (kp?.name && smoothedByName.has(kp.name)) {
        keypoints.push(smoothedByName.get(kp.name)!);
        used.add(kp.name);
      } else if (kp?.name && med.has(kp.name)) {
        // kept via median but skipped EMA path — shouldn't happen
        keypoints.push(med.get(kp.name)!);
        used.add(kp.name);
      }
      // Drop unreliable originals rather than re-injecting spikes
    }
    for (const [name, kp] of smoothedByName) {
      if (!used.has(name)) keypoints.push(kp);
    }

    return { ...pose, keypoints };
  });
}

/**
 * Cached display poses for the same raw array + interval.
 * Safe to call every RAF; recomputes only when the poses reference changes.
 */
export function getDisplayCoachPoses(
  poses: Pose[],
  frameIntervalSec: number,
  windowMs: number = COACH_POSE_SMOOTH_WINDOW_MS
): Pose[] {
  if (poses.length <= 1) return poses;

  const hit = displayPoseCache.get(poses);
  if (
    hit &&
    hit.frameIntervalSec === frameIntervalSec &&
    hit.windowMs === windowMs
  ) {
    return hit.smoothed;
  }

  const smoothed = smoothCoachPosesForDisplay(poses, frameIntervalSec, { windowMs });
  displayPoseCache.set(poses, { frameIntervalSec, windowMs, smoothed });
  return smoothed;
}
