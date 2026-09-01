import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { SessionMovementMetrics } from "../types/accountActivity";
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import { normalizeSportAnalysis } from "./normalizeSportAnalysis";
import {
  createSignedActivityVideoUrl,
  fetchActivityPosesJson,
  getActivitySession,
} from "./activitySessions";

export interface OpenMoveActivityHydration {
  activityId: string;
  /** Null when free tier saved metrics-only (poses + overlays replay). */
  videoUrl: string | null;
  poses: any[];
  angles: OpenMoveAngleSeries;
  frameIntervalSec: number | null;
  /** ARKit Live: seconds on the mp4 timeline; same length as poses. */
  poseTimestamps: number[] | null;
  metrics: SessionMovementMetrics | null;
  sessionLabel: string;
  /** Rail header: activity title, plus metric when present (e.g. "Pull-up set: 3"). */
  headerTitle: string;
  sportAnalysisKind: SportAnalysisKind | null;
  sportAnalysis: unknown | null;
  visualConfig?: import("./visualOverlayPreset").VisualOverlayPreset | null;
  playbackPixelSize?: { width: number; height: number } | null;
  poses3dPath?: string | null;
}

function formatHydrationHeaderTitle(
  title: string,
  metricValue?: string | null
): string {
  const base = title.trim() || "Motion Studio";
  const metric = metricValue?.trim();
  return metric ? `${base}: ${metric}` : base;
}

const SPORT_KINDS = new Set<SportAnalysisKind>([
  "cycling",
  "pullups",
  "pushups",
  "plank",
  "squat",
  "poseFlexibility",
]);

function asSportKind(value: string | null | undefined): SportAnalysisKind | null {
  if (!value) return null;
  return SPORT_KINDS.has(value as SportAnalysisKind) ? (value as SportAnalysisKind) : null;
}

function stubPoses(length: number): any[] {
  return Array.from({ length }, () => ({ keypoints: [] }));
}

/** Load a saved activity into an Open Move Studio-ready hydration payload. */
export async function loadActivityHydration(
  supabase: SupabaseClient,
  activityId: string
): Promise<{ data: OpenMoveActivityHydration | null; error: string | null }> {
  const { data: activity, error } = await getActivitySession(supabase, activityId);
  if (error) return { data: null, error };
  if (!activity) return { data: null, error: "Activity not found" };

  const angles = activity.angles;
  if (
    !angles ||
    !Array.isArray(angles.leftKneeAngles) ||
    angles.leftKneeAngles.length === 0
  ) {
    return { data: null, error: "No analysis payload for this activity" };
  }

  let videoUrl: string | null = null;
  if (activity.videoPath) {
    const { url, error: signError } = await createSignedActivityVideoUrl(
      supabase,
      activity.videoPath
    );
    if (signError || !url) {
      return { data: null, error: signError ?? "Could not sign video URL" };
    }
    videoUrl = url;
  }

  let poses: any[] = [];
  let frameIntervalSec = activity.frameIntervalSec ?? null;
  let poseTimestamps: number[] | null = null;
  let playbackPixelSize: { width: number; height: number } | null = null;
  if (activity.posesPath) {
    const loaded = await fetchActivityPosesJson(supabase, activity.posesPath);
    if (loaded.error) {
      console.warn("Activity poses load failed", loaded.error);
    } else {
      poses = loaded.poses;
      poseTimestamps = loaded.timestamps;
      if (loaded.frameIntervalSec != null) frameIntervalSec = loaded.frameIntervalSec;
      if (loaded.videoWidth && loaded.videoHeight) {
        playbackPixelSize = {
          width: loaded.videoWidth,
          height: loaded.videoHeight,
        };
      }
    }
  }
  if (!poses.length) {
    poses = stubPoses(angles.leftKneeAngles.length);
    poseTimestamps = null;
  }

  const sportKind = asSportKind(activity.sportAnalysisKind ?? activity.sportSlug);

  return {
    data: {
      activityId: activity.id,
      videoUrl,
      poses,
      angles,
      frameIntervalSec,
      poseTimestamps,
      metrics: activity.metrics ?? null,
      sessionLabel: activity.subtitle?.trim() || activity.title || "Saved session",
      headerTitle: formatHydrationHeaderTitle(activity.title, activity.metricValue),
      sportAnalysisKind: sportKind,
      sportAnalysis: normalizeSportAnalysis(activity.sportAnalysis, sportKind),
      visualConfig: activity.visualConfig ?? null,
      playbackPixelSize,
      poses3dPath: activity.poses3dPath ?? null,
    },
    error: null,
  };
}
