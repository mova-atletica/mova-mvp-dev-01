import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import type { LeaderboardScorePayload } from "../types/account";
import type { VisualOverlayPreset } from "./visualOverlayPreset";

/** Extra payload passed with mini-app / studio session saves for Day 4.5 replay. */
export interface ActivityPersistAnalysisMeta {
  videoUrl?: string | null;
  /**
   * In-memory recording/upload bytes. Prefer this over re-fetching `videoUrl`
   * (especially live `blob:` URLs on mobile).
   */
  videoBlob?: Blob | null;
  /** Original filename hint for extension/content-type (uploads). */
  videoFileName?: string | null;
  angles?: OpenMoveAngleSeries | null;
  poses?: any[] | null;
  frameIntervalSec?: number | null;
  /** Intrinsic pixel size at estimatePoses time (for iOS keypoint normalize). */
  videoWidth?: number | null;
  videoHeight?: number | null;
  poseTimestamps?: number[] | null;
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

export type ActivitySavePersistResult = {
  activityId: string | null;
  error?: string | null;
  /** Session row saved, but part of the replay payload did not. */
  warning?: string | null;
  /** True when analysis saved but Pro video upload failed (in-session retry possible). */
  videoUploadFailed?: boolean;
};

/** Legacy alias — studio and mini-app saves report the same shape. */
export type StudioSessionPersistResult = ActivitySavePersistResult;

export type QuickAnalysisCompleteHandler = (
  score: LeaderboardScorePayload,
  meta?: ActivityPersistAnalysisMeta
) => void | Promise<ActivitySavePersistResult | void>;

export type StudioSessionPersistHandler = (
  meta: ActivityPersistAnalysisMeta
) => void | Promise<ActivitySavePersistResult | void>;
