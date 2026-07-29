import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import type { LeaderboardScorePayload } from "../types/account";
import type { VisualOverlayPreset } from "./visualOverlayPreset";

/** Extra payload passed with mini-app / studio session saves for Day 4.5 replay. */
export interface ActivityPersistAnalysisMeta {
  videoUrl?: string | null;
  angles?: OpenMoveAngleSeries | null;
  poses?: any[] | null;
  frameIntervalSec?: number | null;
  sportAnalysisKind?: SportAnalysisKind | null;
  /** Matching sport analysis result object (plank / squat / pullups / …). */
  sportAnalysis?: unknown | null;
  /** Technical source label (filename / Live recording) — stored as subtitle. */
  sessionLabel?: string | null;
  /** User-facing session name — stored as activity title for Open Movement Viz. */
  sessionTitle?: string | null;
  /** Open Move overlay preset snapshot. */
  visualConfig?: VisualOverlayPreset | null;
}

export type QuickAnalysisCompleteHandler = (
  score: LeaderboardScorePayload,
  meta?: ActivityPersistAnalysisMeta
) => void;

export type StudioSessionPersistResult = {
  activityId: string | null;
  error?: string | null;
};

export type StudioSessionPersistHandler = (
  meta: ActivityPersistAnalysisMeta
) => void | Promise<StudioSessionPersistResult | void>;
