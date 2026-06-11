/** Shared joint keys/labels for stats (joint angles overlay, ROM, metric ROM, trace selects). */
export const EFFECT_CONFIG_JOINT_OPTIONS = [
  { key: "left_shoulder", label: "Left Shoulder" },
  { key: "right_shoulder", label: "Right Shoulder" },
  { key: "left_elbow", label: "Left Elbow" },
  { key: "right_elbow", label: "Right Elbow" },
  { key: "left_hip", label: "Left Hip" },
  { key: "right_hip", label: "Right Hip" },
  { key: "left_knee", label: "Left Knee" },
  { key: "right_knee", label: "Right Knee" },
] as const;

export type EffectConfigJointKey = (typeof EFFECT_CONFIG_JOINT_OPTIONS)[number]["key"];

/** Arc joints for Mobility Geometry (subset of landmarks with defined angle triples). */
export const MOBILITY_ARC_JOINT_OPTIONS = [
  { key: "left_knee", label: "Left Knee" },
  { key: "right_knee", label: "Right Knee" },
  { key: "left_hip", label: "Left Hip" },
  { key: "right_hip", label: "Right Hip" },
  { key: "left_shoulder", label: "Left Shoulder" },
  { key: "right_shoulder", label: "Right Shoulder" },
  { key: "left_elbow", label: "Left Elbow" },
  { key: "right_elbow", label: "Right Elbow" },
] as const;

/** Anchor points for mobility vertical / horizontal axes. */
export const MOBILITY_AXIS_POINT_OPTIONS = [
  { key: "shoulder_mid", label: "Shoulder mid" },
  { key: "hip_mid", label: "Hip mid" },
  { key: "body_center", label: "Body center" },
  { key: "left_shoulder", label: "L shoulder" },
  { key: "right_shoulder", label: "R shoulder" },
  { key: "left_hip", label: "L hip" },
  { key: "right_hip", label: "R hip" },
  { key: "left_elbow", label: "L elbow" },
  { key: "right_elbow", label: "R elbow" },
  { key: "left_wrist", label: "L wrist" },
  { key: "right_wrist", label: "R wrist" },
  { key: "left_knee", label: "L knee" },
  { key: "right_knee", label: "R knee" },
  { key: "left_ankle", label: "L ankle" },
  { key: "right_ankle", label: "R ankle" },
] as const;

/** COCO-17 keypoint indices for skeleton overlay multi-select (string keys in UI). */
export const SKELETON_JOINT_OPTIONS = [
  { key: "0", label: "Nose" },
  { key: "1", label: "L eye" },
  { key: "2", label: "R eye" },
  { key: "3", label: "L ear" },
  { key: "4", label: "R ear" },
  { key: "5", label: "L shoulder" },
  { key: "6", label: "R shoulder" },
  { key: "7", label: "L elbow" },
  { key: "8", label: "R elbow" },
  { key: "9", label: "L wrist" },
  { key: "10", label: "R wrist" },
  { key: "11", label: "L hip" },
  { key: "12", label: "R hip" },
  { key: "13", label: "L knee" },
  { key: "14", label: "R knee" },
  { key: "15", label: "L ankle" },
  { key: "16", label: "R ankle" },
] as const;

/** Bone segments as start-end index keys (matches renderer `selectedBones`). */
export const SKELETON_BONE_OPTIONS = [
  { key: "5-7", label: "L upper arm" },
  { key: "7-9", label: "L forearm" },
  { key: "6-8", label: "R upper arm" },
  { key: "8-10", label: "R forearm" },
  { key: "11-13", label: "L thigh" },
  { key: "13-15", label: "L shin" },
  { key: "12-14", label: "R thigh" },
  { key: "14-16", label: "R shin" },
  { key: "5-6", label: "Shoulders" },
  { key: "11-12", label: "Hips" },
  { key: "5-11", label: "L torso" },
  { key: "6-12", label: "R torso" },
] as const;

export function skeletonJointKeysFromIndices(indices: number[]): string[] {
  return indices.map((n) => String(n));
}

export function skeletonIndicesFromKeys(keys: string[]): number[] {
  return keys.map((k) => parseInt(k, 10)).filter((n) => !Number.isNaN(n));
}

/** Keys for left- or right-prefixed options (e.g. left_knee, "L shoulder", L upper arm). */
export function optionKeysForSide(
  options: readonly { key: string; label: string }[],
  side: "left" | "right"
): string[] {
  if (side === "left") {
    return options
      .filter(
        (o) =>
          o.key.startsWith("left_") || o.label.startsWith("L ") || o.label.startsWith("Left ")
      )
      .map((o) => o.key);
  }
  return options
    .filter(
      (o) =>
        o.key.startsWith("right_") ||
        o.label.startsWith("R ") ||
        o.label.startsWith("Right ")
    )
    .map((o) => o.key);
}

export function hasSideSpecificOptions(options: readonly { key: string; label: string }[]): boolean {
  const left = optionKeysForSide(options, "left");
  const right = optionKeysForSide(options, "right");
  return left.length > 0 && right.length > 0;
}

export function mergeSelectedWithSideKeys(selectedKeys: string[], sideKeys: string[]): string[] {
  const sideSet = new Set(sideKeys);
  const kept = selectedKeys.filter((k) => !sideSet.has(k));
  return [...kept, ...sideKeys];
}
