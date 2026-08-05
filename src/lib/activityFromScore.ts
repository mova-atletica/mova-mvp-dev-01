import type { LeaderboardScorePayload } from "../types/account";
import type { AccountActivityKind } from "../types/accountActivity";

export function activityTitleForScore(score: LeaderboardScorePayload): string {
  if (score.sportSlug === "plank") return "Plank hold";
  if (score.sportSlug === "squat") return "Squat analysis";
  if (score.sportSlug === "pullups") return "Pull-up set";
  if (score.sportSlug === "pushups") return "Push-up set";
  return score.sportTitle;
}

export function activitySubtitleForScore(score: LeaderboardScorePayload): string {
  return `${score.metricLabel}: ${score.formattedScore}`;
}

export function activityKindForMiniApp(): AccountActivityKind {
  return "mini-app";
}
