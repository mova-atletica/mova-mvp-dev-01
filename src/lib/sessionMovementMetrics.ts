/**
 * Derives session metrics from tracked joint angles — the same measurements the
 * Joint Analysis panel displays, so Insights and the replay panel agree.
 */
import {
  DISPLAY_ANGLE_SMOOTH_PRESET,
  smoothOpenMoveAngleSeries,
  type DisplayAngleSeries,
} from "./angleSeriesSmoothing";
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { MovementJoint, SessionMovementMetrics } from "../types/accountActivity";

/** Too few confidently tracked frames to call anything a range of motion. */
const MIN_VALID_SAMPLES = 5;
/** Below this the series is noise around a constant, and would round to 0°. */
const MIN_RANGE_DEGREES = 1;
/**
 * Symmetry needs comparable coverage on both sides. On a profile clip the far
 * limb is largely inferred, and scoring it against the near limb reports a
 * balance figure that describes the detector rather than the athlete.
 */
const MIN_SYMMETRY_COVERAGE_RATIO = 0.6;

export interface AngleSeriesStats {
  min: number;
  max: number;
  range: number;
  avg: number;
  sampleCount: number;
}

/** Min/max/mean over tracked frames. Null when the series has no valid samples. */
export function angleSeriesStats(
  series: readonly (number | null)[] | undefined
): AngleSeriesStats | null {
  if (!series?.length) return null;

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let sum = 0;
  let sampleCount = 0;

  for (const value of series) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
    sampleCount += 1;
  }

  if (sampleCount === 0) return null;

  return { min, max, range: max - min, avg: sum / sampleCount, sampleCount };
}

interface JointMeasurement {
  /** Frames the detector resolved confidently, before smoothing filled gaps. */
  sampleCount: number;
  range: number;
  avg: number;
}

/**
 * Measures a joint only when it was tracked well enough to mean something.
 * Coverage comes from the raw series because smoothing interpolates gaps and
 * holds edges, so a smoothed series never reports missing frames — an untracked
 * joint arrives zero-filled and would otherwise look like a real 0°.
 */
function measureJoint(
  raw: OpenMoveAngleSeries,
  smoothed: DisplayAngleSeries,
  key: keyof DisplayAngleSeries
): JointMeasurement | null {
  const rawStats = angleSeriesStats(raw[key]);
  if (!rawStats || rawStats.sampleCount < MIN_VALID_SAMPLES) return null;

  const displayStats = angleSeriesStats(smoothed[key]);
  if (!displayStats || displayStats.range < MIN_RANGE_DEGREES) return null;

  return {
    sampleCount: rawStats.sampleCount,
    range: displayStats.range,
    avg: displayStats.avg,
  };
}

/**
 * The side worth reporting is the better tracked one. An occluded limb is a
 * low-confidence guess whose jitter spans a wider range than the real joint, so
 * choosing by range alone would systematically report the side we can't see.
 */
function betterTrackedSide(
  left: JointMeasurement | null,
  right: JointMeasurement | null
): JointMeasurement | null {
  if (!left) return right;
  if (!right) return left;
  if (left.sampleCount !== right.sampleCount) {
    return left.sampleCount > right.sampleCount ? left : right;
  }
  return left.range >= right.range ? left : right;
}

/** Both sides tracked closely enough that a left/right comparison is meaningful. */
function coverageIsComparable(left: JointMeasurement, right: JointMeasurement): boolean {
  const stronger = Math.max(left.sampleCount, right.sampleCount);
  const weaker = Math.min(left.sampleCount, right.sampleCount);
  return weaker / stronger >= MIN_SYMMETRY_COVERAGE_RATIO;
}

const PAIRED_JOINTS: {
  joint: MovementJoint;
  left: keyof DisplayAngleSeries;
  right: keyof DisplayAngleSeries;
}[] = [
  { joint: "knee", left: "leftKneeAngles", right: "rightKneeAngles" },
  { joint: "hip", left: "leftHipAngles", right: "rightHipAngles" },
  { joint: "elbow", left: "leftElbowAngles", right: "rightElbowAngles" },
  {
    joint: "shoulder",
    left: "leftShoulderAbdAngles",
    right: "rightShoulderAbdAngles",
  },
];

const UNPAIRED_JOINTS: { joint: MovementJoint; series: keyof DisplayAngleSeries }[] = [
  { joint: "spine", series: "trunkAngles" },
];

/** 0–100 agreement between a joint's left and right mean angle. */
export function pairSymmetryScore(leftAvg: number, rightAvg: number): number {
  const larger = Math.max(Math.abs(leftAvg), Math.abs(rightAvg));
  if (larger === 0) return 0;
  const diff = Math.abs(leftAvg - rightAvg);
  return Math.max(0, Math.min(100, 100 - (diff / larger) * 100));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Peak ROM per joint plus session-level ROM and left/right symmetry.
 * Returns null when no joint was tracked well enough to measure.
 */
export function deriveSessionMovementMetrics(
  angles: OpenMoveAngleSeries | null | undefined
): SessionMovementMetrics | null {
  if (!angles) return null;

  const smoothed = smoothOpenMoveAngleSeries(angles, DISPLAY_ANGLE_SMOOTH_PRESET);
  const jointRom: Partial<Record<MovementJoint, number>> = {};
  const symmetryScores: number[] = [];

  for (const { joint, left, right } of PAIRED_JOINTS) {
    const leftStats = measureJoint(angles, smoothed, left);
    const rightStats = measureJoint(angles, smoothed, right);

    const reported = betterTrackedSide(leftStats, rightStats);
    if (reported) jointRom[joint] = Math.round(reported.range);

    if (leftStats && rightStats && coverageIsComparable(leftStats, rightStats)) {
      symmetryScores.push(pairSymmetryScore(leftStats.avg, rightStats.avg));
    }
  }

  for (const { joint, series } of UNPAIRED_JOINTS) {
    const stats = measureJoint(angles, smoothed, series);
    if (stats) jointRom[joint] = Math.round(stats.range);
  }

  const romValues = Object.values(jointRom).filter(
    (value): value is number => typeof value === "number"
  );
  if (romValues.length === 0) return null;

  return {
    avgRomDegrees: Math.round(mean(romValues)),
    peakRomDegrees: Math.max(...romValues),
    symmetryScore: symmetryScores.length > 0 ? Math.round(mean(symmetryScores)) : null,
    jointRom,
  };
}
