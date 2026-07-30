/**
 * Per-side tracking coverage for sports analyzed from one side of the body.
 *
 * MoveNet emits all 17 keypoints on every frame, so the limb facing away from
 * the camera arrives as a low-confidence guess rather than a gap. When a clip is
 * analyzed against that limb the numbers look plausible but describe the
 * detector, not the athlete. Comparing coverage between sides lets us tell the
 * user which side we could actually see and let them re-analyze.
 */
import { POSE_CONF_MIN } from "../analysisUtils";
import type { SportAnalysisKind } from "./pullUpsTypes";

export type BodySide = "left" | "right";

type SideJoint = "shoulder" | "elbow" | "hip" | "knee" | "ankle";

const KEYPOINT_INDEX: Record<BodySide, Record<SideJoint, number>> = {
  left: { shoulder: 5, elbow: 7, hip: 11, knee: 13, ankle: 15 },
  right: { shoulder: 6, elbow: 8, hip: 12, knee: 14, ankle: 16 },
};

/** Joints each sport's angles depend on, so coverage reflects that sport's needs. */
const SPORT_JOINTS: Record<SportAnalysisKind, SideJoint[]> = {
  plank: ["shoulder", "elbow", "hip", "knee", "ankle"],
  squat: ["shoulder", "hip", "knee", "ankle"],
  cycling: ["hip", "knee", "ankle"],
  poseFlexibility: ["shoulder", "elbow", "hip", "knee", "ankle"],
  // Pull-ups combine both arms rather than selecting a side.
  pullups: ["shoulder", "elbow"],
};

export interface SideCoverage {
  left: number;
  right: number;
}

/**
 * Fraction of frames (0–1) where every joint the sport needs cleared the
 * confidence floor, per side.
 */
export function computeSideCoverage(
  poses: Array<{ keypoints?: Array<{ score?: number }> } | null> | undefined,
  sport: SportAnalysisKind,
  confMin: number = POSE_CONF_MIN
): SideCoverage {
  if (!poses?.length) return { left: 0, right: 0 };

  const joints = SPORT_JOINTS[sport];
  let leftFrames = 0;
  let rightFrames = 0;

  for (const pose of poses) {
    const kp = pose?.keypoints;
    if (!kp?.length) continue;
    const sideTracked = (side: BodySide) =>
      joints.every((joint) => (kp[KEYPOINT_INDEX[side][joint]]?.score ?? 0) >= confMin);
    if (sideTracked("left")) leftFrames += 1;
    if (sideTracked("right")) rightFrames += 1;
  }

  return { left: leftFrames / poses.length, right: rightFrames / poses.length };
}

/** Selected side tracked below this is not worth reporting on. */
const LOW_COVERAGE = 0.5;
/**
 * How much better the other side must be before we suggest switching. Keeps us
 * from nudging on a marginal difference the user cannot act on.
 */
const MEANINGFUL_GAIN = 0.15;

export interface SideCoverageAdvice {
  /** 0–1 coverage of the side the user picked. */
  selectedCoverage: number;
  /** Set when the opposite side tracked meaningfully better. */
  betterSide: BodySide | null;
  betterSideCoverage: number | null;
}

/**
 * Advice for the analyzed clip, or null when the selected side tracked well
 * enough that there is nothing useful to say.
 */
export function adviseOnSelectedSide(
  coverage: SideCoverage,
  selected: BodySide
): SideCoverageAdvice | null {
  const selectedCoverage = coverage[selected];
  if (selectedCoverage >= LOW_COVERAGE) return null;

  const other: BodySide = selected === "left" ? "right" : "left";
  const otherCoverage = coverage[other];
  const otherIsBetter = otherCoverage - selectedCoverage >= MEANINGFUL_GAIN;

  return {
    selectedCoverage,
    betterSide: otherIsBetter ? other : null,
    betterSideCoverage: otherIsBetter ? otherCoverage : null,
  };
}

/** Sentence for the analysis rail; null when there is nothing to warn about. */
export function sideCoverageWarning(advice: SideCoverageAdvice | null): string | null {
  if (!advice) return null;

  const selectedPct = Math.round(advice.selectedCoverage * 100);
  if (advice.betterSide && advice.betterSideCoverage != null) {
    const betterLabel = advice.betterSide === "left" ? "Left" : "Right";
    const betterPct = Math.round(advice.betterSideCoverage * 100);
    return `We could only track the selected side in ${selectedPct}% of frames, but the ${betterLabel.toLowerCase()} side tracked in ${betterPct}%. Switch to ${betterLabel} and analyze again for a more accurate read.`;
  }
  return `We could only track the selected side in ${selectedPct}% of frames, so these numbers are rough. Try a clip filmed square to one side of your body.`;
}
