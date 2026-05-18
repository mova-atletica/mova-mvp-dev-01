import type { PoseFlexibilityFocusArea } from "./poseFlexibilityTypes";

export type PoseFlexibilityPreset = {
  conf_min: number;
  median_window_frames: 5;
  max_focus_areas: 3;
};

export const POSE_FLEXIBILITY_V1_PRESET: PoseFlexibilityPreset = {
  conf_min: 0.25,
  median_window_frames: 5,
  max_focus_areas: 3,
};

export const POSE_FLEXIBILITY_FOCUS_LABELS: Record<PoseFlexibilityFocusArea, string> = {
  legs: "Legs",
  hips: "Hips",
  torso: "Torso",
  shoulders: "Shoulders",
};

export const POSE_FLEXIBILITY_FOCUS_OPTIONS: Array<{
  key: PoseFlexibilityFocusArea;
  label: string;
}> = [
  { key: "legs", label: "Legs" },
  { key: "hips", label: "Hips" },
  { key: "torso", label: "Torso" },
  { key: "shoulders", label: "Shoulders" },
];
