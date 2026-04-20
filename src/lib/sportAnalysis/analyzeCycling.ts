import type {
  CyclingAnalysisInput,
  CyclingDualAnalysisResponse,
  CyclingDualAnalysisResult,
  CyclingPerspectiveMetrics,
  CycleEventKind,
  PedalCycleSegment,
} from "./cyclingTypes";

const SCHEMA_VERSION = 3 as const;
const MAX_SAMPLES = 30_000;
const MAX_GAP_INTERPOLATE = 5;
const MAX_NULL_FRACTION = 0.35;
const NORMALIZED_LEN = 100;
const MAX_CADENCE_RPM = 180;
const MOVING_AVG_WINDOW_SEC = 0.25;

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
    return { values: [], ok: false, reason: "Too many consecutive missing knee angles to interpolate." };
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

function localMaximaIndices(y: number[]): number[] {
  const idx: number[] = [];
  for (let i = 1; i < y.length - 1; i++) {
    if (y[i] > y[i - 1] && y[i] > y[i + 1]) idx.push(i);
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

function findEventIndices(y: number[], minDistanceSamples: number, wantTroughs: boolean): number[] {
  const signal = wantTroughs ? y.map((v) => -v) : y;
  const locals = localMaximaIndices(signal);
  const cand = locals.map((i) => ({ i, v: signal[i] }));
  return pickPeaksNMS(cand, minDistanceSamples);
}

function resampleLinear(segment: number[], outLen: number): number[] {
  if (segment.length === 0) return Array(outLen).fill(0);
  if (segment.length === 1) return Array(outLen).fill(segment[0]);
  const out: number[] = [];
  const last = segment.length - 1;
  for (let k = 0; k < outLen; k++) {
    const u = (k / (outLen - 1)) * last;
    const j0 = Math.floor(u);
    const j1 = Math.min(j0 + 1, last);
    const t = u - j0;
    out.push(segment[j0] * (1 - t) + segment[j1] * t);
  }
  return out;
}

function pickSeries(
  leftKnee: (number | null)[],
  rightKnee: (number | null)[],
  leg: CyclingAnalysisInput["leg"]
): { series: (number | null)[]; legUsed: "left" | "right" } {
  if (leg === "left") return { series: leftKnee, legUsed: "left" };
  return { series: rightKnee, legUsed: "right" };
}

function computePerspective(
  smoothed: number[],
  frameIntervalSec: number,
  cycleEvent: CycleEventKind
): { ok: true; metrics: CyclingPerspectiveMetrics } | { ok: false; error: string } {
  const minPeriodSec = 60 / MAX_CADENCE_RPM;
  const minDistanceSamples = Math.max(2, Math.ceil(minPeriodSec / frameIntervalSec));
  const wantTroughs = cycleEvent === "trough";
  const events = findEventIndices(smoothed, minDistanceSamples, wantTroughs);

  if (events.length < 2) {
    const label = cycleEvent === "trough" ? "bottom (trough)" : "top (peak)";
    return {
      ok: false,
      error: `Not enough clear pedal events for ${label} timing—try another leg or a clearer side-on clip.`,
    };
  }

  const cycles: PedalCycleSegment[] = [];
  const perCycleResampled: number[][] = [];

  for (let c = 0; c < events.length - 1; c++) {
    const a = events[c];
    const b = events[c + 1];
    if (b <= a) continue;
    const seg = smoothed.slice(a, b + 1);
    if (seg.length < 2) continue;
    perCycleResampled.push(resampleLinear(seg, NORMALIZED_LEN));
    cycles.push({
      start_idx: a,
      end_idx: b,
      start_time: a * frameIntervalSec,
      end_time: b * frameIntervalSec,
    });
  }

  if (cycles.length === 0) {
    return { ok: false, error: `No complete cycles for ${cycleEvent} timing after detection.` };
  }

  const normalized = Array(NORMALIZED_LEN).fill(0);
  for (let k = 0; k < NORMALIZED_LEN; k++) {
    let s = 0;
    for (const row of perCycleResampled) s += row[k];
    normalized[k] = s / perCycleResampled.length;
  }

  const perCycleMse: number[] = perCycleResampled.map((row) => {
    let acc = 0;
    for (let k = 0; k < NORMALIZED_LEN; k++) {
      const d = row[k] - normalized[k];
      acc += d * d;
    }
    return acc / NORMALIZED_LEN;
  });

  const overallMse =
    perCycleMse.length > 0 ? perCycleMse.reduce((a, b) => a + b, 0) / perCycleMse.length : 0;
  const rmseOverallDeg = Math.sqrt(overallMse);

  const t0 = events[0] * frameIntervalSec;
  const t1 = events[events.length - 1] * frameIntervalSec;
  const spanSec = Math.max(t1 - t0, frameIntervalSec);
  const cadenceRpm = (cycles.length / spanSec) * 60;

  const extensionAngles = events.map((idx) => smoothed[idx]);
  const avgExtension =
    extensionAngles.length > 0
      ? extensionAngles.reduce((a, b) => a + b, 0) / extensionAngles.length
      : 0;

  const kneeMin = extensionAngles.length > 0 ? Math.min(...extensionAngles) : 0;
  const kneeMax = extensionAngles.length > 0 ? Math.max(...extensionAngles) : 0;
  let kneeStd = 0;
  if (extensionAngles.length > 1) {
    let acc = 0;
    for (const x of extensionAngles) acc += (x - avgExtension) ** 2;
    kneeStd = Math.sqrt(acc / (extensionAngles.length - 1));
  }

  const metrics: CyclingPerspectiveMetrics = {
    cycleEventUsed: cycleEvent,
    cadence_rpm: cadenceRpm,
    cycles,
    normalized_cycle: normalized,
    per_cycle_resampled: perCycleResampled,
    smoothness: {
      overall: overallMse,
      per_cycle: perCycleMse,
      rmseOverallDeg,
    },
    extension_angles: extensionAngles,
    avg_extension: avgExtension,
    kneeAngleAtEventsMinDeg: kneeMin,
    kneeAngleAtEventsMaxDeg: kneeMax,
    kneeAngleAtEventsStdDeg: kneeStd,
  };

  return { ok: true, metrics };
}

/**
 * Runs trough- and peak-segmented cycling metrics on the same knee trace (same smoothing).
 */
export function analyzeCyclingDual(input: CyclingAnalysisInput): CyclingDualAnalysisResponse {
  const { frameIntervalSec, leftKneeAngles, rightKneeAngles } = input;

  if (!Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "Invalid frame_interval_sec." };
  }

  const { series, legUsed } = pickSeries(leftKneeAngles, rightKneeAngles, input.leg);

  if (series.length < 10) {
    return { ok: false, error: "Not enough knee samples for cycling analysis." };
  }
  if (series.length > MAX_SAMPLES) {
    return { ok: false, error: `Series exceeds max length (${MAX_SAMPLES}).` };
  }

  const nullFrac = countNulls(series) / series.length;
  if (nullFrac > MAX_NULL_FRACTION) {
    return { ok: false, error: "Too many missing knee angles in this clip." };
  }

  const interp = interpolateShortGaps(series, MAX_GAP_INTERPOLATE);
  if (!interp.ok) {
    return { ok: false, error: interp.reason ?? "Interpolation failed." };
  }

  const y0 = interp.values;
  const sampleRate = 1 / frameIntervalSec;
  const targetWin = Math.max(3, 2 * Math.floor((MOVING_AVG_WINDOW_SEC * sampleRate) / 2) + 1);
  const maxOdd = y0.length % 2 === 0 ? y0.length - 1 : y0.length;
  let winSamples = Math.min(maxOdd, targetWin);
  if (winSamples % 2 === 0) winSamples = Math.max(3, winSamples - 1);
  const smoothed = movingAverage(y0, winSamples);

  const troughRes = computePerspective(smoothed, frameIntervalSec, "trough");
  const peakRes = computePerspective(smoothed, frameIntervalSec, "peak");

  if (!troughRes.ok && !peakRes.ok) {
    return {
      ok: false,
      error: `${troughRes.error} ${peakRes.error}`.trim(),
    };
  }
  if (!troughRes.ok) {
    return { ok: false, error: `Bottom timing: ${troughRes.error}` };
  }
  if (!peakRes.ok) {
    return { ok: false, error: `Top timing: ${peakRes.error}` };
  }

  const result: CyclingDualAnalysisResult = {
    schemaVersion: SCHEMA_VERSION,
    legUsed,
    trough: troughRes.metrics,
    peak: peakRes.metrics,
  };

  return { ok: true, result };
}

/** @deprecated Use `analyzeCyclingDual`; kept for any stray imports. */
export function analyzeCycling(input: CyclingAnalysisInput): CyclingDualAnalysisResponse {
  return analyzeCyclingDual(input);
}
