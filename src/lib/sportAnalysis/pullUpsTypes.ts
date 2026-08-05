/** Pull-up rep counting from elbow angle series (client-side; same pattern as cycling). */

export type SportAnalysisKind =
  | "cycling"
  | "pullups"
  | "pushups"
  | "plank"
  | "squat"
  | "poseFlexibility";

export interface PullUpsAnalysisInput {
  leftElbowAngles: (number | null)[];
  rightElbowAngles: (number | null)[];
  frameIntervalSec: number;
}

export interface PullUpsAnalysisResult {
  schemaVersion: 1;
  /** Number of reps passing spacing + ROM filters. */
  rep_count: number;
  /** Wall-clock seconds from clip start for each rep (top of pull). */
  rep_times_sec: number[];
  /** Frame index into pose series for each rep. */
  rep_frame_indices: number[];
  /** Smoothed series for chart (same length as input frames). */
  chart_smoothed_left: number[];
  chart_smoothed_right: number[];
  chart_smoothed_combined: number[];
}

export type PullUpsAnalysisResponse =
  | { ok: true; result: PullUpsAnalysisResult }
  | { ok: false; error: string };
