import { getAngleWithConfidence } from "../analysisUtils";
import { PUSHUPS_V1_PRESET, type PushUpsPreset } from "./pushUpsConfig";
import type {
  PushUpRepSummary,
  PushUpSide,
  PushUpsAnalysisInput,
  PushUpsAnalysisResponse,
  PushUpsAnalysisResult,
} from "./pushUpsTypes";

type PushUpFrameAngles = {
  elbow: number | null;
  /** Shoulder–hip–ankle body line (°). */
  bodyLine: number | null;
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

function extractAnglesForPose(pose: any, side: PushUpSide, confMin: number): PushUpFrameAngles | null {
  if (!pose?.keypoints?.length) return null;
  const kp = pose.keypoints as Array<{ x: number; y: number; score?: number }>;

  const idx =
    side === "left"
      ? { shoulder: 5, elbow: 7, wrist: 9, hip: 11, ankle: 15 }
      : { shoulder: 6, elbow: 8, wrist: 10, hip: 12, ankle: 16 };

  const sh = kp[idx.shoulder];
  const el = kp[idx.elbow];
  const wr = kp[idx.wrist];
  const hi = kp[idx.hip];
  const an = kp[idx.ankle];
  if (!sh || !el || !wr || !hi || !an) return null;

  const elbowRes = getAngleWithConfidence(sh, el, wr);
  const bodyRes = getAngleWithConfidence(sh, hi, an);

  return {
    elbow: elbowRes.confidence >= confMin ? elbowRes.angle : null,
    bodyLine: bodyRes.confidence >= confMin ? bodyRes.angle : null,
  };
}

function smoothElbowSeries(raw: (number | null)[], preset: PushUpsPreset): (number | null)[] {
  const medianed = raw.map((_, i) => rollingMedian(raw, i, preset.median_window_frames));
  return forwardFillShort(medianed, 4);
}

export function analyzePushUps(input: PushUpsAnalysisInput): PushUpsAnalysisResponse {
  const { poses, frameIntervalSec, side } = input;
  if (!poses?.length || !Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "No poses or invalid frame interval for push-up analysis." };
  }

  const p = PUSHUPS_V1_PRESET;
  const perFrame: PushUpFrameAngles[] = poses.map(
    (pose) =>
      extractAnglesForPose(pose, side, p.conf_min) ?? {
        elbow: null,
        bodyLine: null,
      }
  );

  const rawElbow = perFrame.map((f) => f.elbow);
  const elbow = smoothElbowSeries(rawElbow, p);

  let phase: "top" | "down" | "up" = "top";
  let topRef: number | null = null;
  let bottomAngle = Number.POSITIVE_INFINITY;
  let bottomIdx = -1;
  let depthHit = false;
  let lastRepSec = -1e9;

  const reps: PushUpRepSummary[] = [];

  let advisorySamples = 0;
  let advisoryHipSagHits = 0;

  for (let i = 0; i < elbow.length; i++) {
    const e = elbow[i];
    if (e == null || !Number.isFinite(e)) continue;

    const bodyLine = perFrame[i].bodyLine;
    if (bodyLine != null) {
      advisorySamples++;
      if (bodyLine < p.body_line_min_deg) advisoryHipSagHits++;
    }

    if (phase === "top") {
      if (e >= p.elbow_top_deg) topRef = topRef == null ? e : Math.max(topRef, e);
      if (e < p.elbow_top_deg - 5 && topRef != null) {
        phase = "down";
        bottomAngle = e;
        bottomIdx = i;
        depthHit = e <= p.elbow_depth_target_deg;
      }
      continue;
    }

    if (phase === "down") {
      if (e < bottomAngle) {
        bottomAngle = e;
        bottomIdx = i;
      }
      if (e <= p.elbow_depth_target_deg) depthHit = true;
      if (e > bottomAngle + 4) {
        phase = "up";
      }
      continue;
    }

    // phase === "up"
    if (e < bottomAngle - 2) {
      phase = "down";
      continue;
    }
    if (e >= p.elbow_top_deg) {
      const nowSec = i * frameIntervalSec;
      const rom = topRef != null ? topRef - bottomAngle : 0;
      const valid =
        depthHit && rom >= p.min_rom_deg && nowSec - lastRepSec >= p.min_rep_interval_sec;
      if (valid) {
        const repIdx = reps.length + 1;
        reps.push({
          rep_index: repIdx,
          bottom_frame_idx: bottomIdx,
          top_frame_idx: i,
          bottom_time_sec: bottomIdx * frameIntervalSec,
          top_time_sec: nowSec,
          bottom_elbow_deg: bottomAngle,
          rom_deg: rom,
          depth_ok: bottomAngle <= p.elbow_depth_target_deg,
        });
        lastRepSec = nowSec;
      }
      phase = "top";
      topRef = e;
      bottomAngle = Number.POSITIVE_INFINITY;
      bottomIdx = -1;
      depthHit = false;
    }
  }

  if (reps.length === 0) {
    return {
      ok: false,
      error:
        "No clear push-up reps detected — use side view, select the correct side, and perform full down-and-up reps.",
    };
  }

  const rep_times_sec = reps.map((r) => r.top_time_sec);
  const rep_frame_indices = reps.map((r) => r.top_frame_idx);
  const depthPass = reps.filter((r) => r.depth_ok).length;
  const avgBottom = reps.reduce((s, r) => s + r.bottom_elbow_deg, 0) / reps.length;
  const avgRom = reps.reduce((s, r) => s + r.rom_deg, 0) / reps.length;

  const result: PushUpsAnalysisResult = {
    schemaVersion: 1,
    sideUsed: side,
    rep_count: reps.length,
    rep_times_sec,
    rep_frame_indices,
    reps,
    depthPassPct: (100 * depthPass) / reps.length,
    avgBottomElbowDeg: avgBottom,
    avgRomDeg: avgRom,
    advisoryHipSagPct: advisorySamples > 0 ? (100 * advisoryHipSagHits) / advisorySamples : 0,
    chart_smoothed_elbow: elbow,
  };

  return { ok: true, result };
}
