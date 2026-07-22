import type { LeaderboardScorePayload } from "../types/account";
import type { SessionMovementMetrics } from "../types/accountActivity";
import type { AccountActivityKind } from "../types/accountActivity";

/** Rough chart metrics so Insights aren't empty for new mini-app sessions. */
export function metricsFromLeaderboardScore(
  score: LeaderboardScorePayload
): SessionMovementMetrics {
  const v = score.metricValue;
  if (score.sportSlug === "plank") {
    const formScore = Math.max(60, Math.min(98, 70 + Math.round(v / 8)));
    return {
      formScore,
      avgRomDegrees: 12,
      peakRomDegrees: 18,
      symmetryScore: Math.min(96, 80 + Math.round(v / 20)),
      bodyFocus: { core: 0.82, lower: 0.12, upper: 0.06 },
      jointRom: { spine: 14, shoulder: 8 },
    };
  }
  if (score.sportSlug === "squat") {
    return {
      formScore: Math.max(65, Math.min(95, 70 + Math.round(v / 2))),
      avgRomDegrees: Math.min(110, 70 + v),
      peakRomDegrees: Math.min(120, 85 + v),
      symmetryScore: 84,
      bodyFocus: { lower: 0.7, core: 0.2, upper: 0.1 },
      jointRom: { knee: Math.min(120, 90 + v), hip: Math.min(110, 80 + v), ankle: 22 },
    };
  }
  if (score.sportSlug === "pullups") {
    return {
      formScore: Math.max(65, Math.min(95, 72 + v)),
      avgRomDegrees: 118,
      peakRomDegrees: 132,
      symmetryScore: 86,
      bodyFocus: { upper: 0.62, core: 0.28, lower: 0.1 },
      jointRom: { shoulder: 132, elbow: 118 },
    };
  }
  return {
    formScore: 80,
    avgRomDegrees: 80,
    peakRomDegrees: 95,
    symmetryScore: 85,
    bodyFocus: { lower: 0.4, core: 0.3, upper: 0.3 },
    jointRom: {},
  };
}

export function activityTitleForScore(score: LeaderboardScorePayload): string {
  if (score.sportSlug === "plank") return "Plank hold";
  if (score.sportSlug === "squat") return "Squat analysis";
  if (score.sportSlug === "pullups") return "Pull-up set";
  return score.sportTitle;
}

export function activitySubtitleForScore(score: LeaderboardScorePayload): string {
  return `${score.metricLabel}: ${score.formattedScore}`;
}

export function activityKindForMiniApp(): AccountActivityKind {
  return "mini-app";
}
