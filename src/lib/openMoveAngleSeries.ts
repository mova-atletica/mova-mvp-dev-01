/**
 * Derives per-frame joint angle arrays from MoveNet pose frames.
 * Matches Open Move Studio processing so MotionAnalysisPanel charts stay consistent.
 */
import {
  POSE_CONF_MIN,
  getAngleWithConfidence,
  getTrunkAngleWithConfidence,
} from './analysisUtils';

type Keypoint = { x: number; y: number; score?: number };

/** Angle only when the contributing keypoints were tracked confidently. */
function gatedAngle(res: { angle: number; confidence: number }): number | null {
  if (res.confidence < POSE_CONF_MIN) return null;
  return Number.isFinite(res.angle) ? res.angle : null;
}

/**
 * Trunk lean measured from the shoulder and hip midpoints, where 180° is an
 * upright torso. Each midpoint is scored by its weaker endpoint so a single
 * occluded shoulder or hip drops the frame rather than skewing the line.
 */
function trunkAngle(kp: Keypoint[]): { angle: number; confidence: number } {
  const leftShoulder = kp[5];
  const rightShoulder = kp[6];
  const leftHip = kp[11];
  const rightHip = kp[12];
  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return { angle: 0, confidence: 0 };
  }
  return getTrunkAngleWithConfidence(
    {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      score: Math.min(leftShoulder.score ?? 0, rightShoulder.score ?? 0),
    },
    {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      score: Math.min(leftHip.score ?? 0, rightHip.score ?? 0),
    }
  );
}

export type OpenMoveAngleSeries = {
  leftKneeAngles: (number | null)[];
  rightKneeAngles: (number | null)[];
  leftHipAngles: (number | null)[];
  rightHipAngles: (number | null)[];
  leftElbowAngles: (number | null)[];
  rightElbowAngles: (number | null)[];
  leftShoulderAbdAngles: (number | null)[];
  rightShoulderAbdAngles: (number | null)[];
  trunkAngles: (number | null)[];
};

export function computeAngleSeriesFromOpenMovePoses(poses: any[]): OpenMoveAngleSeries {
  const empty = (): OpenMoveAngleSeries => ({
    leftKneeAngles: [],
    rightKneeAngles: [],
    leftHipAngles: [],
    rightHipAngles: [],
    leftElbowAngles: [],
    rightElbowAngles: [],
    leftShoulderAbdAngles: [],
    rightShoulderAbdAngles: [],
    trunkAngles: [],
  });

  if (!poses?.length) return empty();

  const out = empty();

  for (const pose of poses) {
    if (!pose || !pose.keypoints) {
      out.leftKneeAngles.push(null);
      out.rightKneeAngles.push(null);
      out.leftHipAngles.push(null);
      out.rightHipAngles.push(null);
      out.leftElbowAngles.push(null);
      out.rightElbowAngles.push(null);
      out.leftShoulderAbdAngles.push(null);
      out.rightShoulderAbdAngles.push(null);
      out.trunkAngles.push(null);
      continue;
    }

    const kp = pose.keypoints;

    out.leftKneeAngles.push(gatedAngle(getAngleWithConfidence(kp[11], kp[13], kp[15])));
    out.rightKneeAngles.push(gatedAngle(getAngleWithConfidence(kp[12], kp[14], kp[16])));
    // Hip flexion at hip: shoulder–hip–knee (same convention as PracticeTab / results reference angles).
    out.leftHipAngles.push(gatedAngle(getAngleWithConfidence(kp[5], kp[11], kp[13])));
    out.rightHipAngles.push(gatedAngle(getAngleWithConfidence(kp[6], kp[12], kp[14])));
    out.leftElbowAngles.push(gatedAngle(getAngleWithConfidence(kp[5], kp[7], kp[9])));
    out.rightElbowAngles.push(gatedAngle(getAngleWithConfidence(kp[6], kp[8], kp[10])));
    out.leftShoulderAbdAngles.push(gatedAngle(getAngleWithConfidence(kp[11], kp[5], kp[7])));
    out.rightShoulderAbdAngles.push(gatedAngle(getAngleWithConfidence(kp[12], kp[6], kp[8])));
    out.trunkAngles.push(gatedAngle(trunkAngle(kp)));
  }

  return out;
}

/**
 * Rounds keypoint coords for smaller payloads; preserves frame count and null frames.
 */
export function optimizeOpenMovePosesForClient(poses: any[]): any[] {
  return poses.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    return {
      keypoints: pose.keypoints.map((keypoint: any) => ({
        x: Math.round(keypoint.x * 100) / 100,
        y: Math.round(keypoint.y * 100) / 100,
        score: Math.round((keypoint.score ?? 0) * 1000) / 1000,
      })),
    };
  });
}
