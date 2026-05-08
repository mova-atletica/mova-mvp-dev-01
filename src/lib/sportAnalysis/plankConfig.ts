/** Angle-based plank (v2); bands match Open Move joint-angle conventions. */

export type PlankAnglePreset = {
  /** Knee extension: hip–knee–ankle internal angle must be ≥ this (degrees). */
  knee_min_deg: number;
  /** Hip below this (shoulder–hip–knee) → pike / hip_high; exit pike when hip ≥ this. */
  hip_pike_enter_deg: number;
  /** Hip above this → sag / hip_low; exit sag when hip ≤ this. */
  hip_sag_enter_deg: number;
  /** Shoulder stack: hip–shoulder–elbow internal angle must be in [min, max]. */
  shoulder_min_deg: number;
  shoulder_max_deg: number;
  /** Minimum mean keypoint confidence (0–1) to trust an angle triple. */
  conf_min: number;
  consecutive_frames: number;
  cooldown_sec: number;
};

export const PLANK_GOOD_FORM_VOICE_INTERVAL_SEC = 15;
/** After any hip_high / hip_low voice cue, suppress both hip cues for this long (live only). */
export const PLANK_HIP_SHARED_COOLDOWN_SEC = 6;

export const PLANK_ANGLE_PRESET: PlankAnglePreset = {
  knee_min_deg: 155,
  hip_pike_enter_deg: 125,
  hip_sag_enter_deg: 170,
  shoulder_min_deg: 70,
  shoulder_max_deg: 130,
  conf_min: 0.25,
  consecutive_frames: 12,
  cooldown_sec: 5,
};

/** @deprecated Legacy geometry preset — use {@link PLANK_ANGLE_PRESET}. */
export const PLANK_MEDIUM_PRESET = PLANK_ANGLE_PRESET;
