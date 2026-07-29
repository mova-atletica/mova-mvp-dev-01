"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityPersistAnalysisMeta } from "./activityPersistMeta";
import type { LeaderboardScorePayload } from "../types/account";
import {
  activityKindForMiniApp,
  activitySubtitleForScore,
  activityTitleForScore,
  metricsFromLeaderboardScore,
} from "./activityFromScore";
import {
  createActivitySession,
  updateActivitySessionVideo,
  uploadActivityPoses,
  uploadActivityVideo,
} from "./activitySessions";
import { fetchBlobFromUrl, getVideoBlobDurationMs } from "./encodeVideo720p";
import { defaultOpenMoveSessionTitle } from "./openMoveSessionTitle";

function extensionForVideoBlob(blob: Blob, sourceUrl: string): string {
  const type = blob.type || "";
  if (type.includes("mp4") || type.includes("quicktime")) return "mp4";
  if (type.includes("webm")) return "webm";
  const path = sourceUrl.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".mp4") || path.endsWith(".mov")) return "mp4";
  return "webm";
}

async function attachPosesAndMaybeVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    meta: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<void> {
  const { userId, sessionId, meta, hasProAccess } = opts;

  if (meta.poses?.length) {
    const { path, error } = await uploadActivityPoses(supabase, {
      userId,
      sessionId,
      poses: meta.poses,
      frameIntervalSec: meta.frameIntervalSec ?? null,
    });
    if (error) {
      console.error("Failed to upload activity poses", error);
    } else if (path) {
      await supabase
        .from("activity_sessions")
        .update({ poses_path: path })
        .eq("id", sessionId);
    }
  }

  // Free: poses + angles only. Pro: store the original clip (no 720p re-encode)
  // so Activity reopen keeps pose/video resolution aligned.
  if (!hasProAccess || !meta.videoUrl) return;

  try {
    const raw = await fetchBlobFromUrl(meta.videoUrl);
    if (!raw) return;
    const contentType = raw.type || "video/webm";
    const extension = extensionForVideoBlob(raw, meta.videoUrl);
    const durationMs = await getVideoBlobDurationMs(raw);
    const { path, error: uploadError } = await uploadActivityVideo(supabase, {
      userId,
      sessionId,
      file: raw,
      contentType,
      extension,
    });
    if (uploadError || !path) {
      console.error("Failed to upload activity video", uploadError);
      return;
    }
    await updateActivitySessionVideo(supabase, sessionId, {
      videoPath: path,
      videoDurationMs: durationMs,
    });
  } catch (err) {
    console.error("Pro video save failed", err);
  }
}

export async function persistMiniAppActivitySession(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    score: LeaderboardScorePayload;
    meta?: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<{ activityId: string | null; error: string | null }> {
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
    metrics: metricsFromLeaderboardScore(score),
    sportAnalysisKind: meta?.sportAnalysisKind ?? score.sportSlug,
    frameIntervalSec: meta?.frameIntervalSec ?? null,
    angles: meta?.angles ?? null,
    sportAnalysis: meta?.sportAnalysis ?? null,
    visualConfig: meta?.visualConfig ?? null,
  });

  if (error || !activity) {
    return { activityId: null, error: error ?? "Create failed" };
  }

  if (meta) {
    await attachPosesAndMaybeVideo(supabase, {
      userId,
      sessionId: activity.id,
      meta,
      hasProAccess,
    });
  }

  return { activityId: activity.id, error: null };
}

export async function persistOpenMoveStudioActivitySession(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    meta: ActivityPersistAnalysisMeta;
    hasProAccess: boolean;
  }
): Promise<{ activityId: string | null; error: string | null }> {
  const { userId, meta, hasProAccess } = opts;
  const label = meta.sessionLabel?.trim() || "Open Movement Viz session";
  const title =
    meta.sessionTitle?.trim() ||
    defaultOpenMoveSessionTitle();
  const { data: activity, error } = await createActivitySession(supabase, {
    userId,
    kind: "studio",
    title,
    subtitle: label,
    tags: ["studio"],
    frameIntervalSec: meta.frameIntervalSec ?? null,
    angles: meta.angles ?? null,
    visualConfig: meta.visualConfig ?? null,
  });

  if (error || !activity) {
    return { activityId: null, error: error ?? "Create failed" };
  }

  await attachPosesAndMaybeVideo(supabase, {
    userId,
    sessionId: activity.id,
    meta,
    hasProAccess,
  });

  return { activityId: activity.id, error: null };
}
