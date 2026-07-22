import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import type { LeaderboardScorePayload } from "../types/account";

/** Extra payload passed with mini-app / studio session saves for Day 4.5 replay. */
export interface ActivityPersistAnalysisMeta {
  videoUrl?: string | null;
  angles?: OpenMoveAngleSeries | null;
  poses?: any[] | null;
  frameIntervalSec?: number | null;
  sportAnalysisKind?: SportAnalysisKind | null;
  /** Matching sport analysis result object (plank / squat / pullups / …). */
  sportAnalysis?: unknown | null;
  sessionLabel?: string | null;
}

export type QuickAnalysisCompleteHandler = (
  score: LeaderboardScorePayload,
  meta?: ActivityPersistAnalysisMeta
) => void;

export type StudioSessionPersistHandler = (meta: ActivityPersistAnalysisMeta) => void;
