import { getAngleWithConfidence } from "../analysisUtils";
import { SQUAT_V1_PRESET, type SquatPreset } from "./squatConfig";
import type { SquatAnalysisInput, SquatAnalysisResponse, SquatAnalysisResult, SquatRepSummary, SquatSide } from "./squatTypes";

type SquatFrameAngles = {
  knee: number | null;
  hip: number | null;
  shoulder: number | null;
  kneeOverAnkleRatio: number | null;
  trunkLeanDeg: number | null;
};

function rollingMedian(arr: (number | null)[], i: number, win: number): number | null {
  const half = Math.floor(win / 2);
  const nums: number[] = [];
  for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
    const v = arr[j];
    if (v != null && Number.isFinite(v)) nums.push(v);
  }
  if (nums.length === 0) return null;
  nums.sort((a, b) => a - b);
  if (nums.length % 2 === 1) return nums[Math.floor(nums.length / 2)];
  return (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2;
}

function forwardFillShort(series: (number | null)[], maxGap: number): (number | null)[] {
  const out = series.slice();
  let last: number | null = null;
  let gap = 0;
  for (let i = 0; i < out.length; i++) {
    const v = out[i];
    if (v == null || !Number.isFinite(v)) {
      gap++;
      if (last != null && gap <= maxGap) out[i] = last;
      continue;
    }
    last = v;
    gap = 0;
  }
  return out;
}

function extractAnglesForPose(pose: any, side: SquatSide, confMin: number): SquatFrameAngles | null {
  if (!pose?.keypoints?.length) return null;
  const kp = pose.keypoints as Array<{ x: number; y: number; score?: number }>;

  const idx =
    side === "left"
      ? { shoulder: 5, elbow: 7, hip: 11, knee: 13, ankle: 15 }
      : { shoulder: 6, elbow: 8, hip: 12, knee: 14, ankle: 16 };

  const sh = kp[idx.shoulder];
  const el = kp[idx.elbow];
  const hi = kp[idx.hip];
  const kn = kp[idx.knee];
  const an = kp[idx.ankle];
  if (!sh || !el || !hi || !kn || !an) return null;

  const kneeRes = getAngleWithConfidence(hi, kn, an);
  const hipRes = getAngleWithConfidence(sh, hi, kn);
  const shoulderRes = getAngleWithConfidence(hi, sh, el);

  const shankLen = Math.hypot(kn.x - an.x, kn.y - an.y);
  const kneeOverAnkleRatio =
    shankLen > 1e-4 && (kn.score ?? 0) >= confMin && (an.score ?? 0) >= confMin
      ? Math.abs(kn.x - an.x) / shankLen
      : null;

  const trunkLeanDeg =
    (sh.score ?? 0) >= confMin && (hi.score ?? 0) >= confMin
      ? (Math.atan2(Math.abs(sh.x - hi.x), Math.abs(sh.y - hi.y) + 1e-8) * 180) / Math.PI
      : null;

  return {
    knee: kneeRes.confidence >= confMin ? kneeRes.angle : null,
    hip: hipRes.confidence >= confMin ? hipRes.angle : null,
    shoulder: shoulderRes.confidence >= confMin ? shoulderRes.angle : null,
    kneeOverAnkleRatio,
    trunkLeanDeg,
  };
}

function smoothKneeSeries(raw: (number | null)[], preset: SquatPreset): (number | null)[] {
  const medianed = raw.map((_, i) => rollingMedian(raw, i, preset.median_window_frames));
  return forwardFillShort(medianed, 4);
}

export function analyzeSquat(input: SquatAnalysisInput): SquatAnalysisResponse {
  const { poses, frameIntervalSec, side } = input;
  if (!poses?.length || !Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "No poses or invalid frame interval for squat analysis." };
  }

  const p = SQUAT_V1_PRESET;
  const perFrame: SquatFrameAngles[] = poses.map((pose) => extractAnglesForPose(pose, side, p.conf_min) ?? {
    knee: null,
    hip: null,
    shoulder: null,
    kneeOverAnkleRatio: null,
    trunkLeanDeg: null,
  });

  const rawKnee = perFrame.map((f) => f.knee);
  const knee = smoothKneeSeries(rawKnee, p);

  let phase: "top" | "down" | "up" = "top";
  let topRef: number | null = null;
  let bottomAngle = Number.POSITIVE_INFINITY;
  let bottomIdx = -1;
  let depthHit = false;
  let lastRepSec = -1e9;

  const reps: SquatRepSummary[] = [];

  let advisorySamples = 0;
  let advisoryKneeOverAnkleHits = 0;
  let advisoryTrunkLeanHits = 0;

  for (let i = 0; i < knee.length; i++) {
    const k = knee[i];
    if (k == null || !Number.isFinite(k)) continue;

    const r = perFrame[i];
    if (r.kneeOverAnkleRatio != null) {
      advisorySamples++;
      if (r.kneeOverAnkleRatio > p.knee_over_ankle_ratio_max) advisoryKneeOverAnkleHits++;
    }
    if (r.trunkLeanDeg != null) {
      if (r.trunkLeanDeg > p.trunk_lean_max_deg) advisoryTrunkLeanHits++;
    }

    if (phase === "top") {
      if (k >= p.knee_top_deg) topRef = topRef == null ? k : Math.max(topRef, k);
      if (k < p.knee_top_deg - 5 && topRef != null) {
        phase = "down";
        bottomAngle = k;
        bottomIdx = i;
        depthHit = k <= p.knee_depth_target_deg;
      }
      continue;
    }

    if (phase === "down") {
      if (k < bottomAngle) {
        bottomAngle = k;
        bottomIdx = i;
      }
      if (k <= p.knee_depth_target_deg) depthHit = true;
      if (k > bottomAngle + 4) {
        phase = "up";
      }
      continue;
    }

    // phase === "up"
    if (k < bottomAngle - 2) {
      phase = "down";
      continue;
    }
    if (k >= p.knee_top_deg) {
      const nowSec = i * frameIntervalSec;
      const rom = topRef != null ? topRef - bottomAngle : 0;
      const valid =
        depthHit &&
        rom >= p.min_rom_deg &&
        nowSec - lastRepSec >= p.min_rep_interval_sec;
      if (valid) {
        const repIdx = reps.length + 1;
        reps.push({
          rep_index: repIdx,
          bottom_frame_idx: bottomIdx,
          top_frame_idx: i,
          bottom_time_sec: bottomIdx * frameIntervalSec,
          top_time_sec: nowSec,
          bottom_knee_deg: bottomAngle,
          rom_deg: rom,
          depth_ok: bottomAngle <= p.knee_depth_target_deg,
        });
        lastRepSec = nowSec;
      }
      phase = "top";
      topRef = k;
      bottomAngle = Number.POSITIVE_INFINITY;
      bottomIdx = -1;
      depthHit = false;
    }
  }

  if (reps.length === 0) {
    return {
      ok: false,
      error:
        "No clear squat reps detected — use side view, select the correct side, and perform full down-and-up reps.",
    };
  }

  const rep_times_sec = reps.map((r) => r.top_time_sec);
  const rep_frame_indices = reps.map((r) => r.top_frame_idx);
  const depthPass = reps.filter((r) => r.depth_ok).length;
  const avgBottom =
    reps.reduce((s, r) => s + r.bottom_knee_deg, 0) / Math.max(1, reps.length);

  const result: SquatAnalysisResult = {
    schemaVersion: 1,
    sideUsed: side,
    rep_count: reps.length,
    rep_times_sec,
    rep_frame_indices,
    reps,
    depthPassPct: (100 * depthPass) / reps.length,
    avgBottomKneeDeg: avgBottom,
    advisoryKneeOverAnklePct:
      advisorySamples > 0 ? (100 * advisoryKneeOverAnkleHits) / advisorySamples : 0,
    advisoryTrunkLeanPct:
      advisorySamples > 0 ? (100 * advisoryTrunkLeanHits) / advisorySamples : 0,
    chart_smoothed_knee: knee,
  };

  return { ok: true, result };
}
