export type PushUpSide = "left" | "right";

export interface PushUpsAnalysisInput {
  poses: any[];
  frameIntervalSec: number;
  side: PushUpSide;
}

export interface PushUpRepSummary {
  rep_index: number;
  bottom_frame_idx: number;
  top_frame_idx: number;
  bottom_time_sec: number;
  top_time_sec: number;
  bottom_elbow_deg: number;
  rom_deg: number;
  depth_ok: boolean;
}

export interface PushUpsAnalysisResult {
  schemaVersion: 1;
  sideUsed: PushUpSide;
  rep_count: number;
  rep_times_sec: number[];
  rep_frame_indices: number[];
  reps: PushUpRepSummary[];
  depthPassPct: number;
  avgBottomElbowDeg: number;
  avgRomDeg: number;
  /** Frames with soft body line (hip sag / pike) while elbow tracked. */
  advisoryHipSagPct: number;
  chart_smoothed_elbow: (number | null)[];
}

export type PushUpsAnalysisResponse =
  | { ok: true; result: PushUpsAnalysisResult }
  | { ok: false; error: string };
