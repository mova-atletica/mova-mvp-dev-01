import { getQuickAnalysisBySlug } from "../data/quickAnalysisMovements";
import type { LeaderboardScorePayload } from "../types/account";
import type { SportAnalysisKind } from "../lib/sportAnalysis/pullUpsTypes";
import type { CyclingDualAnalysisResult } from "../lib/sportAnalysis/cyclingTypes";
import type { PlankAnalysisResult } from "../lib/sportAnalysis/plankTypes";
import type { PoseFlexibilityAnalysisResult } from "../lib/sportAnalysis/poseFlexibilityTypes";
import type { PullUpsAnalysisResult } from "../lib/sportAnalysis/pullUpsTypes";
import type { SquatAnalysisResult } from "../lib/sportAnalysis/squatTypes";

function formatHoldDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export function buildLeaderboardScorePayload(
  sportSlug: string,
  kind: SportAnalysisKind,
  results: {
    pullUps?: PullUpsAnalysisResult | null;
    plank?: PlankAnalysisResult | null;
    squat?: SquatAnalysisResult | null;
    cycling?: CyclingDualAnalysisResult | null;
    poseFlexibility?: PoseFlexibilityAnalysisResult | null;
  }
): LeaderboardScorePayload | null {
  const movement = getQuickAnalysisBySlug(sportSlug);
  const sportTitle = movement?.title ?? sportSlug;

  if (kind === "pullups" && results.pullUps) {
    return {
      sportSlug,
      sportTitle,
      metricKey: "rep_count",
      metricLabel: "Reps",
      metricValue: results.pullUps.rep_count,
      formattedScore: String(results.pullUps.rep_count),
    };
  }

  if (kind === "plank" && results.plank) {
    const sec = results.plank.holdDurationSec;
    return {
      sportSlug,
      sportTitle,
      metricKey: "holdDurationSec",
      metricLabel: "Hold time",
      metricValue: sec,
      formattedScore: formatHoldDuration(sec),
    };
  }

  if (kind === "squat" && results.squat) {
    return {
      sportSlug,
      sportTitle,
      metricKey: "rep_count",
      metricLabel: "Reps",
      metricValue: results.squat.rep_count,
      formattedScore: String(results.squat.rep_count),
    };
  }

  if (kind === "cycling" && results.cycling) {
    const rpm = Math.round(
      (results.cycling.trough.cadence_rpm + results.cycling.peak.cadence_rpm) / 2
    );
    return {
      sportSlug,
      sportTitle,
      metricKey: "cadence_rpm",
      metricLabel: "Cadence",
      metricValue: rpm,
      formattedScore: `${rpm} rpm`,
    };
  }

  if (kind === "poseFlexibility" && results.poseFlexibility) {
    const metrics = results.poseFlexibility.focusMetrics;
    if (!metrics.length) return null;
    const best = metrics.reduce((a, b) => (b.value > a.value ? b : a));
    return {
      sportSlug,
      sportTitle,
      metricKey: "max_rom_deg",
      metricLabel: "ROM",
      metricValue: best.value,
      formattedScore: best.valueLabel || `${Math.round(best.value)}°`,
    };
  }

  return null;
}
