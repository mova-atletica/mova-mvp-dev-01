import type { PullUpsAnalysisInput, PullUpsAnalysisResponse, PullUpsAnalysisResult } from "./pullUpsTypes";

const SCHEMA_VERSION = 1 as const;
const MAX_SAMPLES = 30_000;
const MAX_GAP_INTERPOLATE = 5;
const MAX_NULL_FRACTION = 0.35;
const MOVING_AVG_WINDOW_SEC = 0.95;
/** Minimum time between counted reps (NMS spacing). */
const MIN_REP_SPACING_SEC = 0.55;
/** Minimum flexion ROM (degrees) from recent extension before each top. */
const MIN_ROM_DEG = 35;
/** Window to look back for “extended” elbow before each minimum. */
const ROM_WINDOW_SEC = 0.7;

function countNulls(arr: (number | null)[]): number {
  let n = 0;
  for (const v of arr) if (v === null || v === undefined || Number.isNaN(v as number)) n++;
  return n;
}

function interpolateShortGaps(
  arr: (number | null)[],
  maxGap: number
): { values: number[]; ok: boolean; reason?: string } {
  const n = arr.length;
  const out: number[] = new Array(n).fill(NaN);
  let i = 0;
  while (i < n) {
    const v = arr[i];
    if (v !== null && v !== undefined && !Number.isNaN(v as number)) {
      out[i] = v as number;
      i++;
      continue;
    }
    let j = i;
    while (j < n && (arr[j] === null || arr[j] === undefined || Number.isNaN(arr[j] as number))) j++;
    const gapLen = j - i;
    const leftVal = i > 0 && !Number.isNaN(out[i - 1]) ? out[i - 1] : null;
    const rightVal = j < n && arr[j] !== null && !Number.isNaN(arr[j] as number) ? (arr[j] as number) : null;
    if (gapLen <= maxGap && leftVal !== null && rightVal !== null) {
      for (let k = 0; k < gapLen; k++) {
        const t = (k + 1) / (gapLen + 1);
        out[i + k] = leftVal + t * (rightVal - leftVal);
      }
      i = j;
      continue;
    }
    return { values: [], ok: false, reason: "Too many consecutive missing elbow angles to interpolate." };
  }
  return { values: out, ok: true };
}

function movingAverage(y: number[], winSize: number): number[] {
  const w = Math.max(1, Math.floor(winSize));
  if (w === 1) return y.slice();
  const half = Math.floor(w / 2);
  const out: number[] = [];
  for (let i = 0; i < y.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(y.length - 1, i + half); j++) {
      s += y[j];
      c++;
    }
    out.push(s / c);
  }
  return out;
}

function localMinimaIndices(y: number[]): number[] {
  const idx: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] < y[i - 1] && y[i] < y[i + 1]) idx.push(i);
  }
  return idx;
}

function pickPeaksNMS(candidates: { i: number; v: number }[], minDistance: number): number[] {
  const sorted = [...candidates].sort((a, b) => b.v - a.v);
  const picked: number[] = [];
  for (const { i } of sorted) {
    if (picked.every((p) => Math.abs(p - i) >= minDistance)) picked.push(i);
  }
  return picked.sort((a, b) => a - b);
}

function combineElbows(
  left: (number | null)[],
  right: (number | null)[]
): (number | null)[] {
  const n = Math.min(left.length, right.length);
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const L = left[i];
    const R = right[i];
    const lOk = L !== null && L !== undefined && !Number.isNaN(L as number);
    const rOk = R !== null && R !== undefined && !Number.isNaN(R as number);
    if (lOk && rOk) out.push(((L as number) + (R as number)) / 2);
    else if (lOk) out.push(L as number);
    else if (rOk) out.push(R as number);
    else out.push(null);
  }
  return out;
}

function romBeforeMinimum(smoothed: number[], i: number, winSamples: number): number {
  const lo = Math.max(0, i - winSamples);
  let maxV = -Infinity;
  for (let k = lo; k <= i; k++) {
    if (smoothed[k] > maxV) maxV = smoothed[k];
  }
  return maxV - smoothed[i];
}

function smoothPipeline(
  series: (number | null)[],
  frameIntervalSec: number
): { smoothed: number[]; ok: boolean; reason?: string } {
  const interp = interpolateShortGaps(series, MAX_GAP_INTERPOLATE);
  if (!interp.ok) return { smoothed: [], ok: false, reason: interp.reason };
  const y0 = interp.values;
  const sampleRate = 1 / frameIntervalSec;
  const targetWin = Math.max(3, 2 * Math.floor((MOVING_AVG_WINDOW_SEC * sampleRate) / 2) + 1);
  const maxOdd = y0.length % 2 === 0 ? y0.length - 1 : y0.length;
  let winSamples = Math.min(maxOdd, targetWin);
  if (winSamples % 2 === 0) winSamples = Math.max(3, winSamples - 1);
  return { smoothed: movingAverage(y0, winSamples), ok: true };
}

/**
 * Counts pull-up reps from mean(L,R) elbow angles (when both valid), else single side.
 * Reps = local minima in smoothed combined angle (flexion peak), NMS + minimum ROM.
 */
export function analyzePullUps(input: PullUpsAnalysisInput): PullUpsAnalysisResponse {
  const { frameIntervalSec, leftElbowAngles, rightElbowAngles } = input;

  if (!Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "Invalid frame_interval_sec." };
  }

  if (leftElbowAngles.length !== rightElbowAngles.length) {
    return { ok: false, error: "Left and right elbow series length mismatch." };
  }

  const n = leftElbowAngles.length;
  if (n < 10) {
    return { ok: false, error: "Not enough elbow samples for pull-up analysis." };
  }
  if (n > MAX_SAMPLES) {
    return { ok: false, error: `Series exceeds max length (${MAX_SAMPLES}).` };
  }

  const combined = combineElbows(leftElbowAngles, rightElbowAngles);
  const nullFrac = countNulls(combined) / combined.length;
  if (nullFrac > MAX_NULL_FRACTION) {
    return { ok: false, error: "Too many missing elbow angles in this clip." };
  }

  const combinedInterp = interpolateShortGaps(combined, MAX_GAP_INTERPOLATE);
  if (!combinedInterp.ok) {
    return { ok: false, error: combinedInterp.reason ?? "Interpolation failed." };
  }

  const y0 = combinedInterp.values;
  const sampleRate = 1 / frameIntervalSec;
  const targetWin = Math.max(3, 2 * Math.floor((MOVING_AVG_WINDOW_SEC * sampleRate) / 2) + 1);
  const maxOdd = y0.length % 2 === 0 ? y0.length - 1 : y0.length;
  let winSamples = Math.min(maxOdd, targetWin);
  if (winSamples % 2 === 0) winSamples = Math.max(3, winSamples - 1);
  const smoothedCombined = movingAverage(y0, winSamples);

  const minDistanceSamples = Math.max(2, Math.ceil(MIN_REP_SPACING_SEC / frameIntervalSec));
  const romWinSamples = Math.max(2, Math.ceil(ROM_WINDOW_SEC / frameIntervalSec));

  const locals = localMinimaIndices(smoothedCombined);
  const cand = locals.map((i) => ({ i, v: -smoothedCombined[i] }));
  const picked = pickPeaksNMS(cand, minDistanceSamples);

  const repFrameIndices: number[] = [];
  for (const i of picked) {
    const rom = romBeforeMinimum(smoothedCombined, i, romWinSamples);
    if (rom >= MIN_ROM_DEG) repFrameIndices.push(i);
  }

  if (repFrameIndices.length === 0) {
    return {
      ok: false,
      error:
        "No clear pull-up reps detected—try a clearer view of your arms, steady reps, or a longer clip, then run Analyze again.",
    };
  }

  const rep_times_sec = repFrameIndices.map((idx) => idx * frameIntervalSec);

  const leftPipe = smoothPipeline(leftElbowAngles, frameIntervalSec);
  const rightPipe = smoothPipeline(rightElbowAngles, frameIntervalSec);
  const chartLeft = leftPipe.ok ? leftPipe.smoothed : Array.from({ length: n }, () => NaN);
  const chartRight = rightPipe.ok ? rightPipe.smoothed : Array.from({ length: n }, () => NaN);

  const result: PullUpsAnalysisResult = {
    schemaVersion: SCHEMA_VERSION,
    rep_count: repFrameIndices.length,
    rep_times_sec,
    rep_frame_indices: repFrameIndices,
    chart_smoothed_left: chartLeft,
    chart_smoothed_right: chartRight,
    /** Same series used for rep detection (interpolated mean L/R, then smoothed). */
    chart_smoothed_combined: smoothedCombined,
  };

  return { ok: true, result };
}
