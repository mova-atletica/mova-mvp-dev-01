import type { CoachJointId } from "../../types/coachSession";

/** MoveNet / COCO-17 keypoint shape (what processVideoUrlForPoses returns). */
export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export interface Pose {
  keypoints: Keypoint[];
  score?: number;
}

export const COACH_JOINT_IDS: CoachJointId[] = [
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

/** Joints worth exposing as connector/arrow endpoints (skip face detail). */
export const COACH_PRIMARY_JOINTS: CoachJointId[] = [
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

const JOINT_LABELS: Record<CoachJointId, string> = {
  nose: "Nose",
  left_eye: "Left eye",
  right_eye: "Right eye",
  left_ear: "Left ear",
  right_ear: "Right ear",
  left_shoulder: "Left shoulder",
  right_shoulder: "Right shoulder",
  left_elbow: "Left elbow",
  right_elbow: "Right elbow",
  left_wrist: "Left wrist",
  right_wrist: "Right wrist",
  left_hip: "Left hip",
  right_hip: "Right hip",
  left_knee: "Left knee",
  right_knee: "Right knee",
  left_ankle: "Left ankle",
  right_ankle: "Right ankle",
};

export function jointLabel(id: CoachJointId): string {
  return JOINT_LABELS[id] ?? id;
}

/** COCO-17 skeleton bone pairs, for the optional skeleton overlay. */
export const COACH_SKELETON_BONES: [CoachJointId, CoachJointId][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

/** Default score below which a keypoint is treated as unreliable. */
export const COACH_KEYPOINT_MIN_SCORE = 0.3;

const nameIndexCache = new WeakMap<Pose, Map<string, Keypoint>>();

export function getKeypoint(
  pose: Pose | null | undefined,
  joint: CoachJointId,
  minScore = COACH_KEYPOINT_MIN_SCORE
): Keypoint | null {
  if (!pose || !Array.isArray(pose.keypoints)) return null;

  let index = nameIndexCache.get(pose);
  if (!index) {
    index = new Map<string, Keypoint>();
    for (const kp of pose.keypoints) {
      if (kp?.name) index.set(kp.name, kp);
    }
    nameIndexCache.set(pose, index);
  }

  const kp = index.get(joint);
  if (!kp) return null;
  if (typeof kp.score === "number" && kp.score < minScore) return null;
  return kp;
}

/**
 * Nearest pose index for a given time.
 * Poses are sampled every `frameIntervalSec` seconds.
 */
export function poseIndexForTime(
  timeSec: number,
  poseCount: number,
  frameIntervalSec: number
): number {
  if (poseCount <= 0 || frameIntervalSec <= 0) return 0;
  const idx = Math.round(timeSec / frameIntervalSec);
  return Math.min(poseCount - 1, Math.max(0, idx));
}
