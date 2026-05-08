/**
 * Live plank voice coach: consecutive frames + per-issue cooldown + non-overlapping speech.
 */
import {
  PLANK_ANGLE_PRESET,
  PLANK_GOOD_FORM_VOICE_INTERVAL_SEC,
  PLANK_HIP_SHARED_COOLDOWN_SEC,
} from "./plankConfig";
import {
  analyzePlankFrame,
  isPlankPostureIssueKey,
  type PlankAngleRollingState,
  type PlankIssueKey,
} from "./plankGeometry";
import type { PlankFacingSide } from "./plankTypes";

const VOICE_LINES: Record<PlankIssueKey, string[]> = {
  not_in_plank: [
    "Get into plank. Camera to your side, selected side toward the lens.",
    "Side view works best. Show the shoulder, hip, and knee we analyze.",
    "Step back so we can see your full side line.",
  ],
  hip_high: ["Lower your hips.", "Bring your hips down to straighten your line."],
  hip_low: ["Lift your hips. Engage your core.", "Raise your hips slightly."],
  knee_bent: ["Straighten your knees.", "Lock your legs in one long line."],
  shoulder_off: ["Open your chest.", "Stack shoulders over your elbows."],
  good_form: ["Great form. Keep holding.", "Nice alignment. Stay strong."],
};

export type PlankCoachRefs = {
  issueCounters: Partial<Record<PlankIssueKey, number>>;
  lastSpokenSec: Partial<Record<PlankIssueKey, number>>;
  speechBusyUntilSec: number;
  rotIndex: Partial<Record<PlankIssueKey, number>>;
  hipHysteresis: { zone: "ok" | "hip_high" | "hip_low" };
  lastAnyHipCueSec: number;
  rolling: PlankAngleRollingState;
};

export function createPlankCoachRefs(): PlankCoachRefs {
  return {
    issueCounters: {},
    lastSpokenSec: {},
    speechBusyUntilSec: 0,
    rotIndex: {},
    hipHysteresis: { zone: "ok" },
    lastAnyHipCueSec: -1e9,
    rolling: { hip: [], knee: [], shoulder: [] },
  };
}

function pickLine(key: PlankIssueKey, rot: PlankCoachRefs): string {
  const arr = VOICE_LINES[key];
  const i = rot.rotIndex[key] ?? 0;
  rot.rotIndex[key] = (i + 1) % arr.length;
  return arr[i % arr.length];
}

/**
 * One frame step. Returns text for speech synthesis if a cue should fire.
 * `nowSec` monotonic (performance.now()/1000 or audio context time).
 */
export function stepPlankLiveCoach(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  nowSec: number,
  rot: PlankCoachRefs,
  facingSide: PlankFacingSide
): string | null {
  const preset = PLANK_ANGLE_PRESET;
  const frame = analyzePlankFrame(pose, preset, {
    facingSide,
    hipHysteresis: rot.hipHysteresis,
    rolling: rot.rolling,
  });
  if (!frame) return null;

  const active = new Set(frame.issues.map((i) => i.key));
  for (const k of Object.keys(rot.issueCounters) as PlankIssueKey[]) {
    if (!active.has(k)) rot.issueCounters[k] = 0;
  }

  if (nowSec < rot.speechBusyUntilSec) {
    return null;
  }

  for (const iss of frame.issues) {
    const key = iss.key;
    if (key === "good_form") {
      const prev = rot.issueCounters[key] ?? 0;
      rot.issueCounters[key] = prev + 1;
      if (rot.issueCounters[key]! >= preset.consecutive_frames) {
        const last = rot.lastSpokenSec[key] ?? -1e9;
        if (nowSec - last >= PLANK_GOOD_FORM_VOICE_INTERVAL_SEC) {
          rot.lastSpokenSec[key] = nowSec;
          rot.issueCounters[key] = 0;
          const line = pickLine("good_form", rot);
          rot.speechBusyUntilSec = nowSec + 2;
          return line;
        }
      }
      continue;
    }

    if (key === "not_in_plank") {
      const prev = rot.issueCounters[key] ?? 0;
      rot.issueCounters[key] = prev + 1;
      if (rot.issueCounters[key]! >= preset.consecutive_frames) {
        const last = rot.lastSpokenSec[key] ?? -1e9;
        if (nowSec - last >= preset.cooldown_sec) {
          rot.lastSpokenSec[key] = nowSec;
          rot.issueCounters[key] = 0;
          const line = pickLine("not_in_plank", rot);
          rot.speechBusyUntilSec = nowSec + 2.5;
          return line;
        }
      }
      continue;
    }

    if (!isPlankPostureIssueKey(key)) continue;

    const prev = rot.issueCounters[key] ?? 0;
    rot.issueCounters[key] = prev + 1;
    if (rot.issueCounters[key]! >= preset.consecutive_frames) {
      const last = rot.lastSpokenSec[key] ?? -1e9;
      if (nowSec - last >= preset.cooldown_sec) {
        if (
          (key === "hip_high" || key === "hip_low") &&
          nowSec - rot.lastAnyHipCueSec < PLANK_HIP_SHARED_COOLDOWN_SEC
        ) {
          continue;
        }
        rot.lastSpokenSec[key] = nowSec;
        rot.issueCounters[key] = 0;
        if (key === "hip_high" || key === "hip_low") {
          rot.lastAnyHipCueSec = nowSec;
        }
        const line = pickLine(key, rot);
        rot.speechBusyUntilSec = nowSec + 2.5;
        return line;
      }
    }
  }

  return null;
}

export function speakPlankLine(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
