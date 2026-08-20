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
import {
  getVideoBlobDurationMs,
  resolveVideoBlobForUpload,
  videoUploadFormatForBlob,
} from "./videoBlobUtils";

export interface PersistActivityResult {
  activityId: string | null;
  error: string | null;
  /** Session saved, but part of the replay payload did not. */
  warning: string | null;
  videoUploadFailed?: boolean;
}

export const POSES_WARNING =
  "Analysis data could not be saved, so this session will not replay.";
export const VIDEO_WARNING =
  "Analysis saved, but the video did not upload. Stay on this screen to retry.";

async function attachPoses(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: ActivityPersistAnalysisMeta;
  }
): Promise<string | null> {
  const { userId, sessionId, meta } = opts;
  if (!meta.poses?.length) return null;

  const { path, error } = await uploadActivityPoses(supabase, {
    userId,
    sessionId,
    poses: meta.poses,
    frameIntervalSec: meta.frameIntervalSec ?? null,
    timestamps: meta.poseTimestamps ?? null,
  });
  if (error || !path) {
    console.error("Failed to upload activity poses", error);
    return POSES_WARNING;
  }
  const { error: pathError } = await supabase
    .from("activity_sessions")
    .update({ poses_path: path })
    .eq("id", sessionId);
  if (pathError) {
    console.error("Failed to link activity poses", pathError.message);
    return POSES_WARNING;
  }
  return null;
}

async function attachVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: ActivityPersistAnalysisMeta;
  }
): Promise<string | null> {
  const { userId, sessionId, meta } = opts;
  try {
    const raw = await resolveVideoBlobForUpload({
      videoBlob: meta.videoBlob,
      videoUrl: meta.videoUrl,
    });
    if (!raw) return VIDEO_WARNING;

    const { contentType, extension } = videoUploadFormatForBlob(
      raw,
      meta.videoFileName
    );
    const { path, error: uploadError } = await uploadActivityVideo(supabase, {
      userId,
      sessionId,
      file: raw,
      contentType,
      extension,
    });
    if (uploadError || !path) {
      console.error("Failed to upload activity video", uploadError);
      return VIDEO_WARNING;
    }
    const durationMs = await getVideoBlobDurationMs(raw);
    const { error: videoError } = await updateActivitySessionVideo(supabase, sessionId, {
      videoPath: path,
      videoDurationMs: durationMs,
    });
    if (videoError) {
      console.error("Failed to link activity video", videoError);
      return VIDEO_WARNING;
    }
    return null;
  } catch (err) {
    console.error("Pro video save failed", err);
    return VIDEO_WARNING;
  }
}

async function attachPosesAndMaybeVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<{ warnings: string[]; videoUploadFailed: boolean }> {
  const { userId, sessionId, meta, hasProAccess } = opts;
  const warnings: string[] = [];

  const posesWarn = await attachPoses(supabase, { userId, sessionId, meta });
  if (posesWarn) warnings.push(posesWarn);

  // Free tier keeps metrics and analysis; video storage is Pro only.
  const hasVideoSource = Boolean(meta.videoBlob || meta.videoUrl);
  if (!hasProAccess || !hasVideoSource) {
    return { warnings, videoUploadFailed: false };
  }

  const videoWarn = await attachVideo(supabase, { userId, sessionId, meta });
  if (videoWarn) {
    warnings.push(videoWarn);
    return { warnings, videoUploadFailed: true };
  }
  return { warnings, videoUploadFailed: false };
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
    return {
      activityId: null,
      error: error ?? "Create failed",
      warning: null,
      videoUploadFailed: false,
    };
  }

  const { warnings, videoUploadFailed } = meta
    ? await attachPosesAndMaybeVideo(supabase, {
        userId,
        sessionId: activity.id,
        meta,
        hasProAccess,
      })
    : { warnings: [] as string[], videoUploadFailed: false };

  return {
    activityId: activity.id,
    error: null,
    warning: warnings[0] ?? null,
    videoUploadFailed,
  };
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
  const label = meta.sessionLabel?.trim() || "Motion Studio session";
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
    return {
      activityId: null,
      error: error ?? "Create failed",
      warning: null,
      videoUploadFailed: false,
    };
  }

  const { warnings, videoUploadFailed } = await attachPosesAndMaybeVideo(supabase, {
    userId,
    sessionId: activity.id,
    meta,
    hasProAccess,
  });

  return {
    activityId: activity.id,
    error: null,
    warning: warnings[0] ?? null,
    videoUploadFailed,
  };
}

/** In-session retry after analysis saved but video upload failed. */
export async function retryActivitySessionVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: Pick<ActivityPersistAnalysisMeta, "videoBlob" | "videoUrl" | "videoFileName">;
  }
): Promise<{ error: string | null }> {
  const videoWarn = await attachVideo(supabase, {
    userId: opts.userId,
    sessionId: opts.sessionId,
    meta: opts.meta,
  });
  return { error: videoWarn };
}
