export type SquatPreset = {
  knee_top_deg: number;
  knee_depth_target_deg: number;
  knee_depth_warn_deg: number;
  min_rom_deg: number;
  min_rep_interval_sec: number;
  median_window_frames: 5;
  conf_min: number;
  /** Advisory threshold: |knee.x - ankle.x| / shank_len above this => knee-over-ankle cue. */
  knee_over_ankle_ratio_max: number;
  /** Advisory threshold: shoulder-hip segment lean from vertical (deg). */
  trunk_lean_max_deg: number;
};

export const SQUAT_V1_PRESET: SquatPreset = {
  knee_top_deg: 155,
  knee_depth_target_deg: 100,
  knee_depth_warn_deg: 110,
  min_rom_deg: 28,
  min_rep_interval_sec: 0.55,
  median_window_frames: 5,
  conf_min: 0.25,
  knee_over_ankle_ratio_max: 0.65,
  trunk_lean_max_deg: 35,
};
