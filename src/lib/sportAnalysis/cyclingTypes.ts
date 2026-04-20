/** MVP cycling analysis — input/output contracts (client-side; swappable for server later). */

export type CyclingLeg = "left" | "right";

export type CycleEventKind = "peak" | "trough";

/** Pose-derived knee series + sampling; both trough and peak perspectives are computed from one run. */
export interface CyclingAnalysisInput {
  leftKneeAngles: (number | null)[];
  rightKneeAngles: (number | null)[];
  /** Seconds between consecutive pose samples (from MoveNet video pipeline). */
  frameIntervalSec: number;
  leg: CyclingLeg;
}

export interface PedalCycleSegment {
  /** Inclusive index into the (preprocessed) knee angle series. */
  start_idx: number;
  /** Inclusive index into the (preprocessed) knee angle series. */
  end_idx: number;
  start_time: number;
  end_time: number;
}

export interface CyclingSmoothness {
  /** Mean squared error vs mean cycle (per cycle), averaged. */
  overall: number;
  per_cycle: number[];
  /** Root mean MSE in degrees — easier to read than overall MSE. */
  rmseOverallDeg: number;
}

/** One perspective (trough- or peak-segmented strokes) on the same smoothed knee trace. */
export interface CyclingPerspectiveMetrics {
  cycleEventUsed: CycleEventKind;
  cadence_rpm: number;
  cycles: PedalCycleSegment[];
  normalized_cycle: number[];
  per_cycle_resampled: number[][];
  smoothness: CyclingSmoothness;
  /** Knee angle (degrees) at each detected event. */
  extension_angles: number[];
  /** Mean of `extension_angles` (degrees). */
  avg_extension: number;
  kneeAngleAtEventsMinDeg: number;
  kneeAngleAtEventsMaxDeg: number;
  kneeAngleAtEventsStdDeg: number;
}

/** Both trough and peak timing on the same leg + clip (schema for exports / future API). */
export interface CyclingDualAnalysisResult {
  schemaVersion: 3;
  legUsed: "left" | "right";
  trough: CyclingPerspectiveMetrics;
  peak: CyclingPerspectiveMetrics;
}

export type CyclingDualAnalysisResponse =
  | { ok: true; result: CyclingDualAnalysisResult }
  | { ok: false; error: string };
