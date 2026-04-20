/**
 * Derives per-frame joint angle arrays from MoveNet pose frames.
 * Matches Open Move Studio processing so MotionAnalysisPanel charts stay consistent.
 */
import { getAngleWithConfidence } from './analysisUtils';

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

    const leftKneeAngle = getAngleWithConfidence(kp[11], kp[13], kp[15]).angle;
    const rightKneeAngle = getAngleWithConfidence(kp[12], kp[14], kp[16]).angle;
    // Hip flexion at hip: shoulder–hip–knee (same convention as PracticeTab / results reference angles).
    const leftHipAngle = getAngleWithConfidence(kp[5], kp[11], kp[13]).angle;
    const rightHipAngle = getAngleWithConfidence(kp[6], kp[12], kp[14]).angle;
    const leftElbowAngle = getAngleWithConfidence(kp[5], kp[7], kp[9]).angle;
    const rightElbowAngle = getAngleWithConfidence(kp[6], kp[8], kp[10]).angle;
    const leftShoulderAbdAngle = getAngleWithConfidence(kp[11], kp[5], kp[7]).angle;
    const rightShoulderAbdAngle = getAngleWithConfidence(kp[12], kp[6], kp[8]).angle;
    const trunkAngle = getAngleWithConfidence(kp[11], kp[12], kp[23]).angle;

    out.leftKneeAngles.push(leftKneeAngle);
    out.rightKneeAngles.push(rightKneeAngle);
    out.leftHipAngles.push(leftHipAngle);
    out.rightHipAngles.push(rightHipAngle);
    out.leftElbowAngles.push(leftElbowAngle);
    out.rightElbowAngles.push(rightElbowAngle);
    out.leftShoulderAbdAngles.push(leftShoulderAbdAngle);
    out.rightShoulderAbdAngles.push(rightShoulderAbdAngle);
    out.trunkAngles.push(trunkAngle);
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
