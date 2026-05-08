import { PLANK_ANGLE_PRESET } from "./plankConfig";
import {
  buildPlankFrameFromAngles,
  extractRawPlankAngles,
  isPlankPostureIssueKey,
  medianFilter3Angles,
  type PlankHipHysteresisState,
  type PlankIssueKey,
} from "./plankGeometry";
import type { PlankAnalysisInput, PlankAnalysisResponse, PlankAnalysisResult } from "./plankTypes";

export function analyzePlank(input: PlankAnalysisInput): PlankAnalysisResponse {
  const { poses, frameIntervalSec, facingSide = "left" } = input;
  if (!poses?.length || !Number.isFinite(frameIntervalSec) || frameIntervalSec <= 0) {
    return { ok: false, error: "No poses or invalid frame interval for plank analysis." };
  }

  const preset = PLANK_ANGLE_PRESET;
  const dt = frameIntervalSec;

  const rawHip: (number | null)[] = [];
  const rawKnee: (number | null)[] = [];
  const rawShoulder: (number | null)[] = [];

  for (const pose of poses) {
    const r = extractRawPlankAngles(pose, facingSide, preset.conf_min);
    if (!r) {
      rawHip.push(null);
      rawKnee.push(null);
      rawShoulder.push(null);
    } else {
      rawHip.push(r.hip);
      rawKnee.push(r.knee);
      rawShoulder.push(r.shoulder);
    }
  }

  const hipAngleSeries = medianFilter3Angles(rawHip);
  const kneeAngleSeries = medianFilter3Angles(rawKnee);
  const shoulderAngleSeries = medianFilter3Angles(rawShoulder);

  let holdSec = 0;
  let goodFormFrames = 0;
  let inPlankFrames = 0;
  let sumHip = 0;
  let sumKnee = 0;
  let sumShoulder = 0;
  let angleSamples = 0;
  let correctionEvents = 0;

  let validFrames = 0;
  let framesKneeOk = 0;
  let framesHipNeutral = 0;
  let framesShoulderOk = 0;

  const issueCounters: Partial<Record<PlankIssueKey, number>> = {};
  const hipHysteresis: PlankHipHysteresisState = { zone: "ok" };

  for (let i = 0; i < poses.length; i++) {
    const hip = hipAngleSeries[i];
    const knee = kneeAngleSeries[i];
    const shoulder = shoulderAngleSeries[i];

    const frame = buildPlankFrameFromAngles(hip, knee, shoulder, preset, hipHysteresis);

    if (hip != null && knee != null && shoulder != null) {
      validFrames++;
      if (knee >= preset.knee_min_deg) framesKneeOk++;
      if (hip >= preset.hip_pike_enter_deg && hip <= preset.hip_sag_enter_deg) framesHipNeutral++;
      if (shoulder >= preset.shoulder_min_deg && shoulder <= preset.shoulder_max_deg) framesShoulderOk++;
    }

    if (!frame.in_plank) {
      for (const k of Object.keys(issueCounters) as PlankIssueKey[]) {
        issueCounters[k] = 0;
      }
      continue;
    }

    inPlankFrames++;
    holdSec += dt;
    if (hip != null && knee != null && shoulder != null) {
      sumHip += hip;
      sumKnee += knee;
      sumShoulder += shoulder;
      angleSamples++;
    }

    const activeKeys = new Set(frame.issues.map((iss) => iss.key));
    for (const k of Object.keys(issueCounters) as PlankIssueKey[]) {
      if (!activeKeys.has(k)) issueCounters[k] = 0;
    }

    const hasGoodOnly = frame.issues.length === 1 && frame.issues[0].key === "good_form";
    if (hasGoodOnly) goodFormFrames++;

    for (const iss of frame.issues) {
      const key = iss.key;
      if (key === "good_form" || key === "not_in_plank") continue;
      if (!isPlankPostureIssueKey(key)) continue;
      const prev = issueCounters[key] ?? 0;
      const next = prev + 1;
      issueCounters[key] = next;
      if (next >= preset.consecutive_frames) {
        correctionEvents++;
        issueCounters[key] = 0;
      }
    }
  }

  if (inPlankFrames === 0) {
    return {
      ok: false,
      error:
        "No plank posture detected. Use a side view with the selected side toward the camera; we use hip, knee, and shoulder angles.",
    };
  }

  const result: PlankAnalysisResult = {
    schemaVersion: 2,
    holdDurationSec: holdSec,
    timeInZonePct: (100 * goodFormFrames) / inPlankFrames,
    timeKneeExtendedPct: validFrames > 0 ? (100 * framesKneeOk) / validFrames : 0,
    timeHipNeutralPct: validFrames > 0 ? (100 * framesHipNeutral) / validFrames : 0,
    timeShoulderStackPct: validFrames > 0 ? (100 * framesShoulderOk) / validFrames : 0,
    correctionCount: correctionEvents,
    avgHipAngleDeg: angleSamples > 0 ? sumHip / angleSamples : 0,
    avgKneeAngleDeg: angleSamples > 0 ? sumKnee / angleSamples : 0,
    avgShoulderAngleDeg: angleSamples > 0 ? sumShoulder / angleSamples : 0,
    inPlankFrameCount: inPlankFrames,
    hipAngleSeries,
    kneeAngleSeries,
    shoulderAngleSeries,
  };

  return { ok: true, result };
}
