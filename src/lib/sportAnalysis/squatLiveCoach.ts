import { SQUAT_V1_PRESET } from "./squatConfig";
import type { SquatSide } from "./squatTypes";
import { getAngleWithConfidence } from "../analysisUtils";

export type SquatCoachRefs = {
  rollingKnee: (number | null)[];
  phase: "top" | "down" | "up";
  topRef: number | null;
  bottomAngle: number;
  bottomIdx: number;
  depthHit: boolean;
  repCount: number;
  lastRepSec: number;
  lastSpokenSecByKey: Record<string, number>;
  speechBusyUntilSec: number;
};

export type SquatLiveFrame = {
  kneeDeg: number | null;
  issueKey: "setup" | "depth" | "knee_over_ankle" | "trunk_lean" | "good";
  message: string;
  variant: "setup" | "adjust" | "good";
  repCount: number;
};

function median3(arr: (number | null)[]): number | null {
  const nums = arr.filter((v): v is number => v != null && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return (nums[0] + nums[1]) / 2;
  return nums[1];
}

function pickSideIndices(side: SquatSide): { shoulder: number; elbow: number; hip: number; knee: number; ankle: number } {
  return side === "left"
    ? { shoulder: 5, elbow: 7, hip: 11, knee: 13, ankle: 15 }
    : { shoulder: 6, elbow: 8, hip: 12, knee: 14, ankle: 16 };
}

function computeFrameSignals(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  side: SquatSide
): { knee: number | null; kneeOverAnkle: boolean; trunkLean: boolean } | null {
  if (!pose?.keypoints?.length) return null;
  const kp = pose.keypoints;
  const idx = pickSideIndices(side);
  const sh = kp[idx.shoulder];
  const el = kp[idx.elbow];
  const hi = kp[idx.hip];
  const kn = kp[idx.knee];
  const an = kp[idx.ankle];
  if (!sh || !el || !hi || !kn || !an) return null;

  const kneeRes = getAngleWithConfidence(hi, kn, an);
  const knee = kneeRes.confidence >= SQUAT_V1_PRESET.conf_min ? kneeRes.angle : null;

  const shankLen = Math.hypot(kn.x - an.x, kn.y - an.y);
  const ratio = shankLen > 1e-4 ? Math.abs(kn.x - an.x) / shankLen : 0;
  const kneeOverAnkle =
    (kn.score ?? 0) >= SQUAT_V1_PRESET.conf_min &&
    (an.score ?? 0) >= SQUAT_V1_PRESET.conf_min &&
    ratio > SQUAT_V1_PRESET.knee_over_ankle_ratio_max;

  const trunkLeanDeg =
    (sh.score ?? 0) >= SQUAT_V1_PRESET.conf_min && (hi.score ?? 0) >= SQUAT_V1_PRESET.conf_min
      ? (Math.atan2(Math.abs(sh.x - hi.x), Math.abs(sh.y - hi.y) + 1e-8) * 180) / Math.PI
      : 0;
  const trunkLean = trunkLeanDeg > SQUAT_V1_PRESET.trunk_lean_max_deg;

  return { knee, kneeOverAnkle, trunkLean };
}

export function createSquatCoachRefs(): SquatCoachRefs {
  return {
    rollingKnee: [],
    phase: "top",
    topRef: null,
    bottomAngle: Number.POSITIVE_INFINITY,
    bottomIdx: -1,
    depthHit: false,
    repCount: 0,
    lastRepSec: -1e9,
    lastSpokenSecByKey: {},
    speechBusyUntilSec: 0,
  };
}

export function stepSquatLiveCoach(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  nowSec: number,
  refs: SquatCoachRefs,
  side: SquatSide
): { line: string | null; frame: SquatLiveFrame | null } {
  const sig = computeFrameSignals(pose, side);
  if (!sig) return { line: null, frame: null };

  refs.rollingKnee.push(sig.knee);
  if (refs.rollingKnee.length > 3) refs.rollingKnee.shift();
  const knee = median3(refs.rollingKnee);

  if (knee == null) {
    return {
      line: null,
      frame: {
        kneeDeg: null,
        issueKey: "setup",
        message: "Show your selected side clearly — shoulder, hip, knee, ankle in view.",
        variant: "setup",
        repCount: refs.repCount,
      },
    };
  }

  if (refs.phase === "top") {
    if (knee >= SQUAT_V1_PRESET.knee_top_deg) refs.topRef = refs.topRef == null ? knee : Math.max(refs.topRef, knee);
    if (knee < SQUAT_V1_PRESET.knee_top_deg - 5 && refs.topRef != null) {
      refs.phase = "down";
      refs.bottomAngle = knee;
      refs.depthHit = knee <= SQUAT_V1_PRESET.knee_depth_target_deg;
    }
  } else if (refs.phase === "down") {
    if (knee < refs.bottomAngle) refs.bottomAngle = knee;
    if (knee <= SQUAT_V1_PRESET.knee_depth_target_deg) refs.depthHit = true;
    if (knee > refs.bottomAngle + 4) refs.phase = "up";
  } else {
    if (knee < refs.bottomAngle - 2) refs.phase = "down";
    if (knee >= SQUAT_V1_PRESET.knee_top_deg) {
      const rom = refs.topRef != null ? refs.topRef - refs.bottomAngle : 0;
      const valid =
        refs.depthHit &&
        rom >= SQUAT_V1_PRESET.min_rom_deg &&
        nowSec - refs.lastRepSec >= SQUAT_V1_PRESET.min_rep_interval_sec;
      if (valid) {
        refs.repCount += 1;
        refs.lastRepSec = nowSec;
      }
      refs.phase = "top";
      refs.topRef = knee;
      refs.bottomAngle = Number.POSITIVE_INFINITY;
      refs.depthHit = false;
    }
  }

  let frame: SquatLiveFrame;
  if (knee > SQUAT_V1_PRESET.knee_depth_warn_deg && refs.phase !== "top") {
    frame = {
      kneeDeg: knee,
      issueKey: "depth",
      message: "Sit a bit lower for depth.",
      variant: "adjust",
      repCount: refs.repCount,
    };
  } else if (sig.kneeOverAnkle) {
    frame = {
      kneeDeg: knee,
      issueKey: "knee_over_ankle",
      message: "Keep knees tracking over mid-foot.",
      variant: "adjust",
      repCount: refs.repCount,
    };
  } else if (sig.trunkLean) {
    frame = {
      kneeDeg: knee,
      issueKey: "trunk_lean",
      message: "Keep chest a little more upright.",
      variant: "adjust",
      repCount: refs.repCount,
    };
  } else {
    frame = {
      kneeDeg: knee,
      issueKey: "good",
      message: "Good squat form.",
      variant: "good",
      repCount: refs.repCount,
    };
  }

  if (nowSec < refs.speechBusyUntilSec) return { line: null, frame };
  const key = frame.issueKey;
  const last = refs.lastSpokenSecByKey[key] ?? -1e9;
  const cooldown = key === "good" ? 8 : 3.5;
  if (nowSec - last < cooldown) return { line: null, frame };
  refs.lastSpokenSecByKey[key] = nowSec;
  refs.speechBusyUntilSec = nowSec + 2;
  return { line: frame.message, frame };
}
