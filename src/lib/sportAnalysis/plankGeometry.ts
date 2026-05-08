/**
 * Angle-based side-view plank (shoulder–hip–knee, hip–knee–ankle, hip–shoulder–elbow).
 * Same triples as `computeAngleSeriesFromOpenMovePoses` in `openMoveAngleSeries.ts`.
 */
import { getAngleWithConfidence } from "../analysisUtils";
import type { PlankAnglePreset } from "./plankConfig";
import { PLANK_ANGLE_PRESET } from "./plankConfig";
import type { PlankFacingSide } from "./plankTypes";

export type PlankIssueKey =
  | "not_in_plank"
  | "hip_high"
  | "hip_low"
  | "knee_bent"
  | "shoulder_off"
  | "good_form";

export type PlankHipZone = "ok" | "hip_high" | "hip_low";

/** Mutable hysteresis state; reset `zone` to `"ok"` when not in plank. */
export type PlankHipHysteresisState = { zone: PlankHipZone };

export type PlankFrameIssue = {
  key: PlankIssueKey;
  message: string;
  severity: number;
};

export type PlankFrameMetrics = {
  hip_angle_deg: number | null;
  knee_angle_deg: number | null;
  shoulder_angle_deg: number | null;
  /** @deprecated Use hip_angle_deg; kept for log compatibility. */
  body_angle: number;
  body_len: number;
  /** @deprecated Angle-based plank does not use image-space deviation. */
  hip_deviation: number | null;
  head_rise: number | null;
  head_anchor?: "nose" | "ear";
};

export type PlankFrameResult = {
  in_plank: boolean;
  issues: PlankFrameIssue[];
  metrics: PlankFrameMetrics;
};

export type PlankAngleRollingState = {
  hip: (number | null)[];
  knee: (number | null)[];
  shoulder: (number | null)[];
};

export type AnalyzePlankFrameOptions = {
  facingSide: PlankFacingSide;
  hipHysteresis?: PlankHipHysteresisState | null;
  /** Live: rolling 3-frame median buffers (mutated). */
  rolling?: PlankAngleRollingState | null;
};

const ISSUE_LABEL: Record<PlankIssueKey, string> = {
  not_in_plank: "Get into plank — camera side-on, full body visible.",
  hip_high: "Lower your hips — avoid a pike.",
  hip_low: "Lift your hips — engage your core.",
  knee_bent: "Straighten your legs — stack knees.",
  shoulder_off: "Stack shoulders over elbows — open chest.",
  good_form: "Good alignment.",
};

function labelForIssue(key: PlankIssueKey): string {
  return ISSUE_LABEL[key];
}

/** 3-point rolling median (nulls dropped; if empty returns null). */
export function pushRollingMedian3(buf: (number | null)[], v: number | null): number | null {
  buf.push(v);
  if (buf.length > 3) buf.shift();
  const nums = buf.filter((x): x is number => x != null && Number.isFinite(x));
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  if (s.length === 1) return s[0];
  if (s.length === 2) return (s[0] + s[1]) / 2;
  return s[1];
}

/** Offline: median-of-3 with edge padding. */
export function medianFilter3Angles(series: (number | null)[]): (number | null)[] {
  const n = series.length;
  const out: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const w = [series[i - 1] ?? null, series[i] ?? null, series[i + 1] ?? null];
    const nums = w.filter((x): x is number => x != null && Number.isFinite(x));
    if (nums.length === 0) {
      out.push(null);
      continue;
    }
    const s = [...nums].sort((a, b) => a - b);
    if (s.length === 1) out.push(s[0]);
    else if (s.length === 2) out.push((s[0] + s[1]) / 2);
    else out.push(s[1]);
  }
  return out;
}

/** Hysteresis uses the same bounds as the neutral band: exit pike at ≥ pike enter, exit sag at ≤ sag enter. */
export function nextHipAngleZone(prev: PlankHipZone, hipDeg: number, p: PlankAnglePreset): PlankHipZone {
  const lo = p.hip_pike_enter_deg;
  const hi = p.hip_sag_enter_deg;
  switch (prev) {
    case "ok":
      if (hipDeg < lo) return "hip_high";
      if (hipDeg > hi) return "hip_low";
      return "ok";
    case "hip_high":
      if (hipDeg >= lo) {
        if (hipDeg > hi) return "hip_low";
        return "ok";
      }
      return "hip_high";
    case "hip_low":
      if (hipDeg <= hi) {
        if (hipDeg < lo) return "hip_high";
        return "ok";
      }
      return "hip_low";
    default:
      return "ok";
  }
}

export type RawPlankAngles = {
  hip: number | null;
  knee: number | null;
  shoulder: number | null;
};

export function extractRawPlankAngles(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  facingSide: PlankFacingSide,
  confMin: number
): RawPlankAngles | null {
  if (!pose?.keypoints?.length) return null;
  const kp = pose.keypoints;
  if (facingSide === "left") {
    const h = getAngleWithConfidence(kp[5], kp[11], kp[13]);
    const k = getAngleWithConfidence(kp[11], kp[13], kp[15]);
    const s = getAngleWithConfidence(kp[11], kp[5], kp[7]);
    return {
      hip: h.confidence >= confMin ? h.angle : null,
      knee: k.confidence >= confMin ? k.angle : null,
      shoulder: s.confidence >= confMin ? s.angle : null,
    };
  }
  const h = getAngleWithConfidence(kp[6], kp[12], kp[14]);
  const k = getAngleWithConfidence(kp[12], kp[14], kp[16]);
  const s = getAngleWithConfidence(kp[12], kp[6], kp[8]);
  return {
    hip: h.confidence >= confMin ? h.angle : null,
    knee: k.confidence >= confMin ? k.angle : null,
    shoulder: s.confidence >= confMin ? s.angle : null,
  };
}

function hipZoneToIssues(zone: PlankHipZone, hipDeg: number, p: PlankAnglePreset): PlankFrameIssue[] {
  const mid = (p.hip_pike_enter_deg + p.hip_sag_enter_deg) / 2;
  if (zone === "hip_high") {
    const span = Math.max(1, mid - p.hip_pike_enter_deg);
    return [{ key: "hip_high", message: labelForIssue("hip_high"), severity: (mid - hipDeg) / span }];
  }
  if (zone === "hip_low") {
    const span = Math.max(1, p.hip_sag_enter_deg - mid);
    return [{ key: "hip_low", message: labelForIssue("hip_low"), severity: (hipDeg - mid) / span }];
  }
  return [];
}

/** Core frame evaluation from (possibly smoothed) angles — shared by live and offline. */
export function buildPlankFrameFromAngles(
  hip: number | null,
  knee: number | null,
  shoulder: number | null,
  preset: PlankAnglePreset,
  hipHysteresis?: PlankHipHysteresisState | null
): PlankFrameResult {
  const metrics: PlankFrameMetrics = {
    hip_angle_deg: hip,
    knee_angle_deg: knee,
    shoulder_angle_deg: shoulder,
    body_angle: hip ?? 0,
    body_len: 0,
    hip_deviation: null,
    head_rise: null,
  };

  if (hip == null || knee == null || shoulder == null) {
    return {
      in_plank: false,
      issues: [
        {
          key: "not_in_plank",
          message: "We need a clearer view of your shoulder, hip, and knee on the side facing the camera.",
          severity: 1,
        },
      ],
      metrics,
    };
  }

  const kneeOk = knee >= preset.knee_min_deg;
  const hipNeutral = hip >= preset.hip_pike_enter_deg && hip <= preset.hip_sag_enter_deg;
  const shoulderOk = shoulder >= preset.shoulder_min_deg && shoulder <= preset.shoulder_max_deg;
  const inPlank = kneeOk && hipNeutral && shoulderOk;

  if (!inPlank) {
    if (hipHysteresis) hipHysteresis.zone = "ok";
    const issues: PlankFrameIssue[] = [];
    if (!kneeOk) {
      issues.push({
        key: "knee_bent",
        message: labelForIssue("knee_bent"),
        severity: Math.max(0, (preset.knee_min_deg - knee) / Math.max(5, preset.knee_min_deg - 90)),
      });
    }
    if (!hipNeutral) {
      if (hip < preset.hip_pike_enter_deg) {
        issues.push({
          key: "hip_high",
          message: labelForIssue("hip_high"),
          severity: (preset.hip_pike_enter_deg - hip) / Math.max(5, preset.hip_pike_enter_deg),
        });
      } else {
        issues.push({
          key: "hip_low",
          message: labelForIssue("hip_low"),
          severity: (hip - preset.hip_sag_enter_deg) / Math.max(5, 180 - preset.hip_sag_enter_deg),
        });
      }
    }
    if (!shoulderOk) {
      const distIn =
        shoulder < preset.shoulder_min_deg
          ? preset.shoulder_min_deg - shoulder
          : shoulder - preset.shoulder_max_deg;
      issues.push({
        key: "shoulder_off",
        message: labelForIssue("shoulder_off"),
        severity: distIn / Math.max(5, 40),
      });
    }
    if (issues.length === 0) {
      issues.push({ key: "not_in_plank", message: labelForIssue("not_in_plank"), severity: 1 });
    }
    return { in_plank: false, issues, metrics };
  }

  let zone: PlankHipZone;
  if (hipHysteresis) {
    hipHysteresis.zone = nextHipAngleZone(hipHysteresis.zone, hip, preset);
    zone = hipHysteresis.zone;
  } else {
    zone = "ok";
    if (hip < preset.hip_pike_enter_deg) zone = "hip_high";
    else if (hip > preset.hip_sag_enter_deg) zone = "hip_low";
  }

  const issues: PlankFrameIssue[] = [...hipZoneToIssues(zone, hip, preset)];

  if (issues.length === 0) {
    issues.push({ key: "good_form", message: labelForIssue("good_form"), severity: 0 });
  }

  return { in_plank: true, issues, metrics };
}

/**
 * Analyze one pose frame. Uses 3-frame median when `rolling` is provided (live).
 */
export function analyzePlankFrame(
  pose: { keypoints?: Array<{ x: number; y: number; score?: number }> } | null,
  preset: PlankAnglePreset = PLANK_ANGLE_PRESET,
  options?: AnalyzePlankFrameOptions
): PlankFrameResult | null {
  const facingSide: PlankFacingSide = options?.facingSide ?? "left";
  const hipHysteresis = options?.hipHysteresis;
  const rolling = options?.rolling;

  const raw = extractRawPlankAngles(pose, facingSide, preset.conf_min);
  if (!raw) return null;

  let hip = raw.hip;
  let knee = raw.knee;
  let shoulder = raw.shoulder;

  if (rolling) {
    hip = pushRollingMedian3(rolling.hip, raw.hip);
    knee = pushRollingMedian3(rolling.knee, raw.knee);
    shoulder = pushRollingMedian3(rolling.shoulder, raw.shoulder);
  }

  return buildPlankFrameFromAngles(hip, knee, shoulder, preset, hipHysteresis);
}

export function isPlankPostureIssueKey(k: PlankIssueKey): boolean {
  return k === "hip_high" || k === "hip_low" || k === "knee_bent" || k === "shoulder_off";
}
