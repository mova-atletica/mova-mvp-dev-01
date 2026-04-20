/** Shared joint keys/labels for stats effect config UIs (joint angles + ROM). */
export const EFFECT_CONFIG_JOINT_OPTIONS = [
  { key: "left_knee", label: "Left Knee" },
  { key: "right_knee", label: "Right Knee" },
  { key: "left_hip", label: "Left Hip" },
  { key: "right_hip", label: "Right Hip" },
  { key: "left_elbow", label: "Left Elbow" },
  { key: "right_elbow", label: "Right Elbow" },
] as const;

export type EffectConfigJointKey = (typeof EFFECT_CONFIG_JOINT_OPTIONS)[number]["key"];
