export type SquatSide = "left" | "right";

export interface SquatAnalysisInput {
  poses: any[];
  frameIntervalSec: number;
  side: SquatSide;
}

export interface SquatRepSummary {
  rep_index: number;
  bottom_frame_idx: number;
  top_frame_idx: number;
  bottom_time_sec: number;
  top_time_sec: number;
  bottom_knee_deg: number;
  rom_deg: number;
  depth_ok: boolean;
}

export interface SquatAnalysisResult {
  schemaVersion: 1;
  sideUsed: SquatSide;
  rep_count: number;
  rep_times_sec: number[];
  rep_frame_indices: number[];
  reps: SquatRepSummary[];
  depthPassPct: number;
  avgBottomKneeDeg: number;
  advisoryKneeOverAnklePct: number;
  advisoryTrunkLeanPct: number;
  chart_smoothed_knee: (number | null)[];
}

export type SquatAnalysisResponse =
  | { ok: true; result: SquatAnalysisResult }
  | { ok: false; error: string };
