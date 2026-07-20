import type { CoachAngleChipJoint, CoachJointId } from "../../types/coachSession";
import { getKeypoint, type Pose } from "./joints";

const ANGLE_TRIPLES: Record<CoachAngleChipJoint, [CoachJointId, CoachJointId, CoachJointId]> = {
  left_knee: ["left_hip", "left_knee", "left_ankle"],
  right_knee: ["right_hip", "right_knee", "right_ankle"],
  left_hip: ["left_shoulder", "left_hip", "left_knee"],
  right_hip: ["right_shoulder", "right_hip", "right_knee"],
  left_shoulder: ["left_hip", "left_shoulder", "left_elbow"],
  right_shoulder: ["right_hip", "right_shoulder", "right_elbow"],
  left_elbow: ["left_shoulder", "left_elbow", "left_wrist"],
  right_elbow: ["right_shoulder", "right_elbow", "right_wrist"],
};

export const COACH_ANGLE_CHIP_JOINTS: CoachAngleChipJoint[] = [
  "left_knee",
  "right_knee",
  "left_hip",
  "right_hip",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
];

function angleDeg(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag < 1e-6) return 0;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Interior joint angle in degrees for an angle-chip joint, or null if keypoints missing.
 */
export function computeCoachJointAngle(
  pose: Pose | null,
  joint: CoachAngleChipJoint
): { degrees: number; x: number; y: number } | null {
  const triple = ANGLE_TRIPLES[joint];
  if (!triple) return null;
  const a = getKeypoint(pose, triple[0]);
  const b = getKeypoint(pose, triple[1]);
  const c = getKeypoint(pose, triple[2]);
  if (!a || !b || !c) return null;
  return {
    degrees: Math.round(angleDeg(a, b, c)),
    x: b.x,
    y: b.y,
  };
}
