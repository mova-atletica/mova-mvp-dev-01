/**
 * Display-only joint angle smoothing: interpolate short gaps, hold edges, rolling median.
 * Raw pose-derived series stay unchanged upstream; use at chart/overlay boundaries only.
 */
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";

export type DisplayAngleSeries = {
  leftKneeAngles: number[];
  rightKneeAngles: number[];
  leftHipAngles: number[];
  rightHipAngles: number[];
  leftElbowAngles: number[];
  rightElbowAngles: number[];
  leftShoulderAbdAngles: number[];
  rightShoulderAbdAngles: number[];
  trunkAngles: number[];
};

export type DisplayAngleSmoothPreset = {
  method: "median";
  windowFrames: number;
  maxGapInterpolate: number;
};

export const DISPLAY_ANGLE_SMOOTH_PRESET: DisplayAngleSmoothPreset = {
  method: "median",
  windowFrames: 10,
  maxGapInterpolate: 7,
};

function isValid(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v);
}

/**
 * True when a joint was tracked at all. Smoothing holds edges and zero-fills a
 * fully untracked series, so callers must check this before charting a joint or
 * an occluded limb reads as a real flat 0°.
 */
export function hasMeasuredSamples(series: readonly (number | null)[] | undefined): boolean {
  return Boolean(series?.some(isValid));
}

/** Linear fill for runs of null/NaN up to maxGap frames between valid samples. */
function interpolateShortGaps(arr: (number | null)[], maxGap: number): (number | null)[] {
  const n = arr.length;
  const out = arr.slice();
  let i = 0;
  while (i < n) {
    if (isValid(out[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !isValid(out[j])) j++;
    const gapLen = j - i;
    const leftVal = i > 0 && isValid(out[i - 1]) ? out[i - 1]! : null;
    const rightVal = j < n && isValid(out[j]) ? out[j]! : null;
    if (gapLen <= maxGap && leftVal !== null && rightVal !== null) {
      for (let k = 0; k < gapLen; k++) {
        const t = (k + 1) / (gapLen + 1);
        out[i + k] = leftVal + t * (rightVal - leftVal);
      }
    }
    i = j;
  }
  return out;
}

/** Forward- then backward-fill so chart/overlay lines stay continuous. */
function holdEdgeValues(arr: (number | null)[]): number[] {
  const n = arr.length;
  if (n === 0) return [];

  let firstValid = -1;
  for (let i = 0; i < n; i++) {
    if (isValid(arr[i])) {
      firstValid = i;
      break;
    }
  }
  if (firstValid === -1) return new Array(n).fill(0);

  const out = new Array<number>(n);
  let last = arr[firstValid]!;
  for (let i = 0; i < n; i++) {
    if (isValid(arr[i])) last = arr[i]!;
    out[i] = last;
  }
  for (let i = firstValid - 1; i >= 0; i--) {
    out[i] = out[firstValid];
  }
  return out;
}

function rollingMedian(arr: number[], win: number): number[] {
  const half = Math.floor(win / 2);
  return arr.map((_, i) => {
    const nums: number[] = [];
    for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
      if (Number.isFinite(arr[j])) nums.push(arr[j]);
    }
    if (nums.length === 0) return arr[i];
    nums.sort((a, b) => a - b);
    if (nums.length % 2 === 1) return nums[Math.floor(nums.length / 2)];
    return (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2;
  });
}

/**
 * Returns a same-length numeric series for display (no null gaps in output).
 */
export function smoothAngleSeries(
  series: (number | null)[],
  preset: DisplayAngleSmoothPreset = DISPLAY_ANGLE_SMOOTH_PRESET
): number[] {
  if (!series.length) return [];

  const normalized = series.map((v) => (isValid(v) ? v : null));
  const interpolated = interpolateShortGaps(normalized, preset.maxGapInterpolate);
  const filled = holdEdgeValues(interpolated);

  if (preset.method === "median") {
    return rollingMedian(filled, preset.windowFrames);
  }
  return filled;
}

/** Smooth all joint arrays in an Open Move angle bundle (display-only). */
export function smoothOpenMoveAngleSeries(
  raw: OpenMoveAngleSeries,
  preset: DisplayAngleSmoothPreset = DISPLAY_ANGLE_SMOOTH_PRESET
): DisplayAngleSeries {
  const smooth = (s: (number | null)[]) => smoothAngleSeries(s, preset);
  return {
    leftKneeAngles: smooth(raw.leftKneeAngles),
    rightKneeAngles: smooth(raw.rightKneeAngles),
    leftHipAngles: smooth(raw.leftHipAngles),
    rightHipAngles: smooth(raw.rightHipAngles),
    leftElbowAngles: smooth(raw.leftElbowAngles),
    rightElbowAngles: smooth(raw.rightElbowAngles),
    leftShoulderAbdAngles: smooth(raw.leftShoulderAbdAngles),
    rightShoulderAbdAngles: smooth(raw.rightShoulderAbdAngles),
    trunkAngles: smooth(raw.trunkAngles),
  };
}
