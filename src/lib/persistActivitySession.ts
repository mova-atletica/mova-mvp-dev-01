"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityPersistAnalysisMeta } from "./activityPersistMeta";
import type { LeaderboardScorePayload } from "../types/account";
import {
  activityKindForMiniApp,
  activitySubtitleForScore,
  activityTitleForScore,
} from "./activityFromScore";
import {
  createActivitySession,
  updateActivitySessionVideo,
  uploadActivityPoses,
  uploadActivityVideo,
} from "./activitySessions";
import { defaultOpenMoveSessionTitle } from "./openMoveSessionTitle";
import { deriveSessionMovementMetrics } from "./sessionMovementMetrics";
import { fetchBlobFromUrl, getVideoBlobDurationMs } from "./videoBlobUtils";

export interface PersistActivityResult {
  activityId: string | null;
  error: string | null;
  /** Session saved, but part of the replay payload did not. */
  warning: string | null;
}

const POSES_WARNING = "Analysis data could not be saved, so this session will not replay.";
const VIDEO_WARNING = "The video could not be saved. The session was saved without it.";

async function attachPosesAndMaybeVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<string[]> {
  const { userId, sessionId, meta, hasProAccess } = opts;
  const warnings: string[] = [];

  if (meta.poses?.length) {
    const { path, error } = await uploadActivityPoses(supabase, {
      userId,
      sessionId,
      poses: meta.poses,
      frameIntervalSec: meta.frameIntervalSec ?? null,
    });
    if (error || !path) {
      console.error("Failed to upload activity poses", error);
      warnings.push(POSES_WARNING);
    } else {
      const { error: pathError } = await supabase
        .from("activity_sessions")
        .update({ poses_path: path })
        .eq("id", sessionId);
      if (pathError) {
        console.error("Failed to link activity poses", pathError.message);
        warnings.push(POSES_WARNING);
      }
    }
  }

  // Free tier keeps metrics and analysis; video storage is Pro only.
  if (!hasProAccess || !meta.videoUrl) return warnings;

  try {
    const raw = await fetchBlobFromUrl(meta.videoUrl);
    if (!raw) {
      warnings.push(VIDEO_WARNING);
      return warnings;
    }
    const contentType = raw.type || "video/webm";
    const extension = contentType.includes("mp4") ? "mp4" : "webm";
    const { path, error: uploadError } = await uploadActivityVideo(supabase, {
      userId,
      sessionId,
      file: raw,
      contentType,
      extension,
    });
    if (uploadError || !path) {
      console.error("Failed to upload activity video", uploadError);
      warnings.push(VIDEO_WARNING);
      return warnings;
    }
    const durationMs = await getVideoBlobDurationMs(raw);
    const { error: videoError } = await updateActivitySessionVideo(supabase, sessionId, {
      videoPath: path,
      videoDurationMs: durationMs,
    });
    if (videoError) {
      console.error("Failed to link activity video", videoError);
      warnings.push(VIDEO_WARNING);
    }
  } catch (err) {
    console.error("Pro video save failed", err);
    warnings.push(VIDEO_WARNING);
  }

  return warnings;
}

export async function persistMiniAppActivitySession(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    score: LeaderboardScorePayload;
    meta?: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<PersistActivityResult> {
  const { userId, score, meta, hasProAccess } = opts;
  const { data: activity, error } = await createActivitySession(supabase, {
    userId,
    kind: activityKindForMiniApp(),
    title: activityTitleForScore(score),
    subtitle: activitySubtitleForScore(score),
    sportSlug: score.sportSlug,
    tags: [score.sportSlug],
    metricLabel: score.metricLabel,
    metricValueText: score.formattedScore,
    metricNumeric: score.metricValue,
    metrics: deriveSessionMovementMetrics(meta?.angles),
    sportAnalysisKind: meta?.sportAnalysisKind ?? score.sportSlug,
    frameIntervalSec: meta?.frameIntervalSec ?? null,
    angles: meta?.angles ?? null,
    sportAnalysis: meta?.sportAnalysis ?? null,
    visualConfig: meta?.visualConfig ?? null,
  });

  if (error || !activity) {
    return { activityId: null, error: error ?? "Create failed", warning: null };
  }

  const warnings = meta
    ? await attachPosesAndMaybeVideo(supabase, {
        userId,
        sessionId: activity.id,
        meta,
        hasProAccess,
      })
    : [];

  return { activityId: activity.id, error: null, warning: warnings[0] ?? null };
}

export async function persistOpenMoveStudioActivitySession(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    meta: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<PersistActivityResult> {
  const { userId, meta, hasProAccess } = opts;
  const label = meta.sessionLabel?.trim() || "Open Movement Viz session";
  const title = meta.sessionTitle?.trim() || defaultOpenMoveSessionTitle();
  const { data: activity, error } = await createActivitySession(supabase, {
    userId,
    kind: "studio",
    title,
    subtitle: label,
    tags: ["studio"],
    metrics: deriveSessionMovementMetrics(meta.angles),
    frameIntervalSec: meta.frameIntervalSec ?? null,
    angles: meta.angles ?? null,
    visualConfig: meta.visualConfig ?? null,
  });

  if (error || !activity) {
    return { activityId: null, error: error ?? "Create failed", warning: null };
  }

  const warnings = await attachPosesAndMaybeVideo(supabase, {
    userId,
    sessionId: activity.id,
    meta,
    hasProAccess,
  });

  return { activityId: activity.id, error: null, warning: warnings[0] ?? null };
}
