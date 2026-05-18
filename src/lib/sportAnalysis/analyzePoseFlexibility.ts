import { getAngleWithConfidence } from "../analysisUtils";
import {
  POSE_FLEXIBILITY_FOCUS_LABELS,
  POSE_FLEXIBILITY_V1_PRESET,
  type PoseFlexibilityPreset,
} from "./poseFlexibilityConfig";
import type {
  PoseFlexibilityAnalysisInput,
  PoseFlexibilityAnalysisResponse,
  PoseFlexibilityAnalysisResult,
  PoseFlexibilityChartSeries,
  PoseFlexibilityFocusArea,
  PoseFlexibilityFocusMetric,
  PoseFlexibilitySide,
} from "./poseFlexibilityTypes";

type Keypoint = { x: number; y: number; score?: number };

type FrameMetrics = {
  legs: number | null;
  hips: number | null;
  torso: number | null;
  shoulders: number | null;
};

const ANGLE_FOCUS_AREAS: PoseFlexibilityFocusArea[] = ["legs", "hips", "torso", "shoulders"];

function finite(v: number | null | undefined): v is number {
  return v != null && Number.isFinite(v);
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function rollingMedian(series: (number | null)[], i: number, win: number): number | null {
  const half = Math.floor(win / 2);
  const vals: number[] = [];
  for (let j = Math.max(0, i - half); j <= Math.min(series.length - 1, i + half); j++) {
    const v = series[j];
    if (finite(v)) vals.push(v);
  }
  if (vals.length === 0) return null;
  vals.sort((a, b) => a - b);
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

function smoothSeries(series: (number | null)[], preset: PoseFlexibilityPreset): (number | null)[] {
  return series.map((_, i) => rollingMedian(series, i, preset.median_window_frames));
}

function sideIndices(side: PoseFlexibilitySide) {
  return side === "left"
    ? { shoulder: 5, elbow: 7, hip: 11, knee: 13, ankle: 15 }
    : { shoulder: 6, elbow: 8, hip: 12, knee: 14, ankle: 16 };
}

function visible(kp: Keypoint | undefined, confMin: number): kp is Keypoint {
  return Boolean(kp) && (kp?.score ?? 0) >= confMin;
}

function angleOrNull(a: Keypoint, b: Keypoint, c: Keypoint, confMin: number): number | null {
  const res = getAngleWithConfidence(a, b, c);
  return res.confidence >= confMin && Number.isFinite(res.angle) ? res.angle : null;
}

function extractFrameMetrics(pose: any, side: PoseFlexibilitySide, confMin: number): FrameMetrics {
  const empty: FrameMetrics = { legs: null, hips: null, torso: null, shoulders: null };
  if (!pose?.keypoints?.length) return empty;

  const kp = pose.keypoints as Keypoint[];
  const idx = sideIndices(side);
  const sh = kp[idx.shoulder];
  const el = kp[idx.elbow];
  const hi = kp[idx.hip];
  const kn = kp[idx.knee];
  const an = kp[idx.ankle];

  const hasShoulderHip = visible(sh, confMin) && visible(hi, confMin);
  const torso =
    hasShoulderHip
      ? (Math.atan2(Math.abs(sh.x - hi.x), Math.abs(sh.y - hi.y) + 1e-8) * 180) / Math.PI
      : null;

  return {
    legs:
      visible(hi, confMin) && visible(kn, confMin) && visible(an, confMin)
        ? angleOrNull(hi, kn, an, confMin)
        : null,
    hips:
      visible(sh, confMin) && visible(hi, confMin) && visible(kn, confMin)
        ? angleOrNull(sh, hi, kn, confMin)
        : null,
    torso,
    shoulders:
      visible(hi, confMin) && visible(sh, confMin) && visible(el, confMin)
        ? angleOrNull(hi, sh, el, confMin)
        : null,
  };
}

function buildAngleMetric(
  focusArea: PoseFlexibilityFocusArea,
  series: (number | null)[]
): PoseFlexibilityFocusMetric | null {
  const vals = series.filter(finite);
  if (vals.length === 0) return null;
  const avg = mean(vals);
  if (avg == null) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const spread = max - min;
  const label = POSE_FLEXIBILITY_FOCUS_LABELS[focusArea];
  const metricLabel =
    focusArea === "legs"
      ? "Knee extension"
      : focusArea === "hips"
        ? "Hip angle"
        : focusArea === "torso"
          ? "Torso lean"
          : "Shoulder angle";
  const value = focusArea === "legs" ? max : avg;

  return {
    focusArea,
    label: metricLabel,
    value,
    unit: "deg",
    valueLabel: `${value.toFixed(0)}°`,
    description:
      focusArea === "torso"
        ? "Average torso lean from vertical across the full clip."
        : `${label} side-view angle summary across the full clip.`,
    avgDeg: avg,
    minDeg: min,
    maxDeg: max,
    rangeDeg: spread,
    seriesKey: focusArea,
  };
}

export function analyzePoseFlexibility(input: PoseFlexibilityAnalysisInput): PoseFlexibilityAnalysisResponse {
  const { poses, frameIntervalSec, side } = input;
  const focusAreas = Array.from(new Set(input.focusAreas)).slice(0, POSE_FLEXIBILITY_V1_PRESET.max_focus_areas);

  if (!poses?.length || !Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "No poses or invalid frame interval for pose flexibility analysis." };
  }
  if (focusAreas.length === 0) {
    return { ok: false, error: "Select at least one focus area for pose flexibility analysis." };
  }

  const preset = POSE_FLEXIBILITY_V1_PRESET;
  const frames = poses.map((pose) => extractFrameMetrics(pose, side, preset.conf_min));
  const rawByArea: Record<PoseFlexibilityFocusArea, (number | null)[]> = {
    legs: frames.map((f) => f.legs),
    hips: frames.map((f) => f.hips),
    torso: frames.map((f) => f.torso),
    shoulders: frames.map((f) => f.shoulders),
  };
  const smoothedByArea = Object.fromEntries(
    ANGLE_FOCUS_AREAS.map((area) => [area, smoothSeries(rawByArea[area], preset)])
  ) as Record<PoseFlexibilityFocusArea, (number | null)[]>;

  const focusMetrics: PoseFlexibilityFocusMetric[] = [];
  const chartSeries: PoseFlexibilityChartSeries[] = [];
  for (const area of focusAreas) {
    const series = smoothedByArea[area];
    const metric = buildAngleMetric(area, series);
    if (!metric) continue;
    focusMetrics.push(metric);
    chartSeries.push({
      key: area,
      label: metric.label,
      focusArea: area,
      values: series,
    });
  }

  const validFrameCount = frames.filter(
    (f) => f.legs != null || f.hips != null || f.torso != null || f.shoulders != null
  ).length;

  if (focusMetrics.length === 0) {
    return {
      ok: false,
      error:
        "No clear side-view flexibility metrics detected. Check that the selected side is visible and the full body is in frame.",
    };
  }

  const result: PoseFlexibilityAnalysisResult = {
    schemaVersion: 1,
    sideUsed: side,
    focusAreas,
    durationSec: poses.length * frameIntervalSec,
    validFramePct: (100 * validFrameCount) / poses.length,
    focusMetrics,
    chartSeries,
  };

  return { ok: true, result };
}
