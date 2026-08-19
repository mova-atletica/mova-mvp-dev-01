/**
 * Derives session metrics from tracked joint angles — the same measurements the
 * Joint Analysis panel displays, so Insights and the replay panel agree.
 */
import {
  DISPLAY_ANGLE_SMOOTH_PRESET,
  hasMeasuredSamples,
  smoothOpenMoveAngleSeries,
  type DisplayAngleSeries,
} from "./angleSeriesSmoothing";
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type {
  MovementJoint,
  PanelJointStat,
  PanelJointStats,
  SessionMovementMetrics,
} from "../types/accountActivity";

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

const PANEL_SIDE_KEYS = [
  "leftKnee",
  "rightKnee",
  "leftHip",
  "rightHip",
  "leftElbow",
  "rightElbow",
  "leftShoulder",
  "rightShoulder",
  "trunk",
] as const;

type PanelSideKey = (typeof PANEL_SIDE_KEYS)[number];

const PANEL_SERIES: { key: PanelSideKey; series: keyof DisplayAngleSeries }[] = [
  { key: "leftKnee", series: "leftKneeAngles" },
  { key: "rightKnee", series: "rightKneeAngles" },
  { key: "leftHip", series: "leftHipAngles" },
  { key: "rightHip", series: "rightHipAngles" },
  { key: "leftElbow", series: "leftElbowAngles" },
  { key: "rightElbow", series: "rightElbowAngles" },
  { key: "leftShoulder", series: "leftShoulderAbdAngles" },
  { key: "rightShoulder", series: "rightShoulderAbdAngles" },
  { key: "trunk", series: "trunkAngles" },
];

function panelStatFromSeries(
  raw: (number | null)[] | undefined,
  display: number[] | undefined
): PanelJointStat | null {
  if (!hasMeasuredSamples(raw) || !display?.length) return null;
  const stats = angleSeriesStats(display);
  if (!stats) return null;
  return { min: stats.min, max: stats.max, range: stats.range, avg: stats.avg };
}

function pairPanelSymmetry(
  left: PanelJointStat | null,
  right: PanelJointStat | null
): number | null {
  return left && right ? pairSymmetryScore(left.avg, right.avg) : null;
}

/** Same formula as MotionAnalysisPanel ROM / Joint Movements (any valid sample). */
export function buildPanelJointStats(angles: OpenMoveAngleSeries): PanelJointStats {
  const smoothed = smoothOpenMoveAngleSeries(angles, DISPLAY_ANGLE_SMOOTH_PRESET);
  const sides = {} as Record<PanelSideKey, PanelJointStat | null>;
  for (const { key, series } of PANEL_SERIES) {
    sides[key] = panelStatFromSeries(angles[series], smoothed[series]);
  }
  return {
    ...sides,
    symmetry: {
      knee: pairPanelSymmetry(sides.leftKnee, sides.rightKnee),
      hip: pairPanelSymmetry(sides.leftHip, sides.rightHip),
      elbow: pairPanelSymmetry(sides.leftElbow, sides.rightElbow),
      shoulder: pairPanelSymmetry(sides.leftShoulder, sides.rightShoulder),
    },
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePanelJointStat(raw: unknown): PanelJointStat | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    !isFiniteNumber(o.min) ||
    !isFiniteNumber(o.max) ||
    !isFiniteNumber(o.range) ||
    !isFiniteNumber(o.avg)
  ) {
    return null;
  }
  return { min: o.min, max: o.max, range: o.range, avg: o.avg };
}

export function parsePanelJointStats(raw: unknown): PanelJointStats | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const symRaw = o.symmetry;
  const sym =
    symRaw && typeof symRaw === "object"
      ? (symRaw as Record<string, unknown>)
      : {};
  const parsedSym = (v: unknown) => (isFiniteNumber(v) ? v : null);
  return {
    leftKnee: parsePanelJointStat(o.leftKnee),
    rightKnee: parsePanelJointStat(o.rightKnee),
    leftHip: parsePanelJointStat(o.leftHip),
    rightHip: parsePanelJointStat(o.rightHip),
    leftElbow: parsePanelJointStat(o.leftElbow),
    rightElbow: parsePanelJointStat(o.rightElbow),
    leftShoulder: parsePanelJointStat(o.leftShoulder),
    rightShoulder: parsePanelJointStat(o.rightShoulder),
    trunk: parsePanelJointStat(o.trunk),
    symmetry: {
      knee: parsedSym(sym.knee),
      hip: parsedSym(sym.hip),
      elbow: parsedSym(sym.elbow),
      shoulder: parsedSym(sym.shoulder),
    },
  };
}

export function parseSessionMovementMetrics(raw: unknown): SessionMovementMetrics | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const panelJointStats = parsePanelJointStats(o.panelJointStats);
  const jointRom: Partial<Record<MovementJoint, number>> = {};
  if (o.jointRom && typeof o.jointRom === "object") {
    for (const [key, value] of Object.entries(o.jointRom as Record<string, unknown>)) {
      if (isFiniteNumber(value)) jointRom[key as MovementJoint] = value;
    }
  }
  const avgRomDegrees = isFiniteNumber(o.avgRomDegrees) ? o.avgRomDegrees : null;
  const peakRomDegrees = isFiniteNumber(o.peakRomDegrees) ? o.peakRomDegrees : null;
  if (avgRomDegrees == null && peakRomDegrees == null && !panelJointStats) {
    return undefined;
  }
  return {
    avgRomDegrees: avgRomDegrees ?? 0,
    peakRomDegrees: peakRomDegrees ?? 0,
    symmetryScore: isFiniteNumber(o.symmetryScore) ? o.symmetryScore : null,
    jointRom,
    ...(panelJointStats ? { panelJointStats } : {}),
  };
}

function panelHasAnyStat(panel: PanelJointStats): boolean {
  return PANEL_SIDE_KEYS.some((key) => panel[key] != null);
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
  const panelJointStats = buildPanelJointStats(angles);
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
  if (romValues.length === 0 && !panelHasAnyStat(panelJointStats)) return null;

  return {
    avgRomDegrees: romValues.length > 0 ? Math.round(mean(romValues)) : 0,
    peakRomDegrees: romValues.length > 0 ? Math.max(...romValues) : 0,
    symmetryScore: symmetryScores.length > 0 ? Math.round(mean(symmetryScores)) : null,
    jointRom,
    panelJointStats,
  };
}
