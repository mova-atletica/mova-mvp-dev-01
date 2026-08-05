export type PushUpsPreset = {
  elbow_top_deg: number;
  elbow_depth_target_deg: number;
  min_rom_deg: number;
  min_rep_interval_sec: number;
  median_window_frames: 5;
  conf_min: number;
  /** Shoulder–hip–ankle body-line minimum (°); below = hip sag / pike advisory. */
  body_line_min_deg: number;
};

export const PUSHUPS_V1_PRESET: PushUpsPreset = {
  elbow_top_deg: 155,
  elbow_depth_target_deg: 95,
  min_rom_deg: 35,
  min_rep_interval_sec: 0.5,
  median_window_frames: 5,
  conf_min: 0.25,
  body_line_min_deg: 150,
};
