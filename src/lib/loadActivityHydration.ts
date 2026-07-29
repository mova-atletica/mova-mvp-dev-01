import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import {
  createSignedActivityVideoUrl,
  fetchActivityPosesJson,
  getActivitySession,
} from "./activitySessions";

export interface OpenMoveActivityHydration {
  activityId: string;
  videoUrl: string;
  poses: any[];
  angles: OpenMoveAngleSeries;
  frameIntervalSec: number | null;
  sessionLabel: string;
  /** Rail header: activity title, plus metric when present (e.g. "Pull-up set: 3"). */
  headerTitle: string;
  sportAnalysisKind: SportAnalysisKind | null;
  sportAnalysis: unknown | null;
  visualConfig?: import("./visualOverlayPreset").VisualOverlayPreset | null;
}

function formatHydrationHeaderTitle(
  title: string,
  metricValue?: string | null
): string {
  const base = title.trim() || "Open Movement Viz";
  const metric = metricValue?.trim();
  return metric ? `${base}: ${metric}` : base;
}

const SPORT_KINDS = new Set<SportAnalysisKind>([
  "cycling",
  "pullups",
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
  if (!activity.videoPath) return { data: null, error: "No video saved for this activity" };

  const angles = activity.angles;
  if (
    !angles ||
    !Array.isArray(angles.leftKneeAngles) ||
    angles.leftKneeAngles.length === 0
  ) {
    return { data: null, error: "No analysis payload for this activity" };
  }

  const { url, error: signError } = await createSignedActivityVideoUrl(
    supabase,
    activity.videoPath
  );
  if (signError || !url) {
    return { data: null, error: signError ?? "Could not sign video URL" };
  }

  let poses: any[] = [];
  let frameIntervalSec = activity.frameIntervalSec ?? null;
  if (activity.posesPath) {
    const loaded = await fetchActivityPosesJson(supabase, activity.posesPath);
    if (loaded.error) {
      console.warn("Activity poses load failed", loaded.error);
    } else {
      poses = loaded.poses;
      if (loaded.frameIntervalSec != null) frameIntervalSec = loaded.frameIntervalSec;
    }
  }
  if (!poses.length) {
    poses = stubPoses(angles.leftKneeAngles.length);
  }

  return {
    data: {
      activityId: activity.id,
      videoUrl: url,
      poses,
      angles,
      frameIntervalSec,
      sessionLabel: activity.subtitle?.trim() || activity.title || "Saved session",
      headerTitle: formatHydrationHeaderTitle(activity.title, activity.metricValue),
      sportAnalysisKind: asSportKind(activity.sportAnalysisKind ?? activity.sportSlug),
      sportAnalysis: activity.sportAnalysis ?? null,
      visualConfig: activity.visualConfig ?? null,
    },
    error: null,
  };
}
