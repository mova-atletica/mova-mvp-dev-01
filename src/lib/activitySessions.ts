import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenMoveAngleSeries } from "./openMoveAngleSeries";
import type {
  AccountActivityItem,
  AccountActivityKind,
  SessionMovementMetrics,
} from "../types/accountActivity";

export const ACTIVITY_SESSIONS_BUCKET = "activity-sessions";

export interface ActivitySessionRow {
  id: string;
  user_id: string;
  kind: AccountActivityKind;
  title: string;
  subtitle: string;
  sport_slug: string | null;
  tags: string[] | null;
  metric_label: string | null;
  metric_value_text: string | null;
  metric_numeric: number | null;
  metrics: SessionMovementMetrics | null;
  video_path: string | null;
  video_duration_ms: number | null;
  sport_analysis_kind: string | null;
  frame_interval_sec: number | null;
  angles: OpenMoveAngleSeries | null;
  sport_analysis: unknown | null;
  poses_path: string | null;
  coach_session_id: string | null;
  is_seed: boolean;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export const ACTIVITY_SESSION_SELECT =
  "id, user_id, kind, title, subtitle, sport_slug, tags, metric_label, metric_value_text, metric_numeric, metrics, video_path, video_duration_ms, sport_analysis_kind, frame_interval_sec, angles, sport_analysis, poses_path, coach_session_id, is_seed, occurred_at, created_at, updated_at";

function hasReplayPayload(row: ActivitySessionRow): boolean {
  if (row.coach_session_id) return true;
  if (row.is_seed) return false;
  const hasAngles =
    row.angles != null &&
    Array.isArray(row.angles.leftKneeAngles) &&
    row.angles.leftKneeAngles.length > 0;
  if (!hasAngles) return false;
  if (row.kind === "mini-app") return row.sport_analysis != null;
  if (row.kind === "studio") return true;
  return false;
}

export function mapActivitySessionRow(row: ActivitySessionRow): AccountActivityItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    occurredAt: row.occurred_at,
    tags: row.tags ?? undefined,
    metricLabel: row.metric_label ?? undefined,
    metricValue: row.metric_value_text ?? undefined,
    metrics: row.metrics ?? undefined,
    sportSlug: row.sport_slug,
    sportAnalysisKind: row.sport_analysis_kind,
    frameIntervalSec: row.frame_interval_sec,
    hasReplayPayload: hasReplayPayload(row),
    videoPath: row.video_path,
    posesPath: row.poses_path,
    coachSessionId: row.coach_session_id,
    isSeed: row.is_seed,
    angles: row.angles,
    sportAnalysis: row.sport_analysis,
  };
}

export interface CreateActivitySessionInput {
  userId: string;
  kind: AccountActivityKind;
  title: string;
  subtitle?: string;
  sportSlug?: string | null;
  tags?: string[];
  metricLabel?: string | null;
  metricValueText?: string | null;
  metricNumeric?: number | null;
  metrics?: SessionMovementMetrics | null;
  videoPath?: string | null;
  videoDurationMs?: number | null;
  sportAnalysisKind?: string | null;
  frameIntervalSec?: number | null;
  angles?: OpenMoveAngleSeries | null;
  sportAnalysis?: unknown | null;
  posesPath?: string | null;
  coachSessionId?: string | null;
  occurredAt?: string;
  isSeed?: boolean;
}

export async function listActivitySessions(
  supabase: SupabaseClient,
  options?: { limit?: number; kind?: AccountActivityKind }
): Promise<{ data: AccountActivityItem[]; error: string | null }> {
  let query = supabase
    .from("activity_sessions")
    .select(ACTIVITY_SESSION_SELECT)
    .order("occurred_at", { ascending: false });

  if (options?.kind) {
    query = query.eq("kind", options.kind);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }
  return {
    data: ((data ?? []) as ActivitySessionRow[]).map(mapActivitySessionRow),
    error: null,
  };
}

export async function getActivitySession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ data: AccountActivityItem | null; row: ActivitySessionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("activity_sessions")
    .select(ACTIVITY_SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { data: null, row: null, error: error.message };
  }
  if (!data) {
    return { data: null, row: null, error: null };
  }
  const row = data as ActivitySessionRow;
  return { data: mapActivitySessionRow(row), row, error: null };
}

export async function createActivitySession(
  supabase: SupabaseClient,
  input: CreateActivitySessionInput
): Promise<{ data: AccountActivityItem | null; error: string | null }> {
  const row = {
    user_id: input.userId,
    kind: input.kind,
    title: input.title,
    subtitle: input.subtitle ?? "",
    sport_slug: input.sportSlug ?? null,
    tags: input.tags ?? [],
    metric_label: input.metricLabel ?? null,
    metric_value_text: input.metricValueText ?? null,
    metric_numeric: input.metricNumeric ?? null,
    metrics: input.metrics ?? null,
    video_path: input.videoPath ?? null,
    video_duration_ms: input.videoDurationMs ?? null,
    sport_analysis_kind: input.sportAnalysisKind ?? null,
    frame_interval_sec: input.frameIntervalSec ?? null,
    angles: input.angles ?? null,
    sport_analysis: input.sportAnalysis ?? null,
    poses_path: input.posesPath ?? null,
    coach_session_id: input.coachSessionId ?? null,
    is_seed: input.isSeed ?? false,
    occurred_at: input.occurredAt ?? new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("activity_sessions")
    .insert(row)
    .select(ACTIVITY_SESSION_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: mapActivitySessionRow(data as ActivitySessionRow), error: null };
}

export async function updateActivitySessionVideo(
  supabase: SupabaseClient,
  sessionId: string,
  opts: { videoPath: string; videoDurationMs?: number | null }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("activity_sessions")
    .update({
      video_path: opts.videoPath,
      video_duration_ms: opts.videoDurationMs ?? null,
    })
    .eq("id", sessionId);

  return { error: error?.message ?? null };
}

export async function updateActivitySessionAnalysis(
  supabase: SupabaseClient,
  sessionId: string,
  opts: {
    angles?: OpenMoveAngleSeries | null;
    sportAnalysis?: unknown | null;
    sportAnalysisKind?: string | null;
    frameIntervalSec?: number | null;
    posesPath?: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("activity_sessions")
    .update({
      angles: opts.angles ?? null,
      sport_analysis: opts.sportAnalysis ?? null,
      sport_analysis_kind: opts.sportAnalysisKind ?? null,
      frame_interval_sec: opts.frameIntervalSec ?? null,
      poses_path: opts.posesPath ?? null,
    })
    .eq("id", sessionId);

  return { error: error?.message ?? null };
}

export function activityVideoObjectPath(
  userId: string,
  sessionId: string,
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${sessionId}/${safe}`;
}

export async function uploadActivityVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    file: Blob;
    contentType?: string;
    extension?: string;
  }
): Promise<{ path: string | null; error: string | null }> {
  const ext = opts.extension ?? (opts.contentType?.includes("webm") ? "webm" : "mp4");
  const path = activityVideoObjectPath(opts.userId, opts.sessionId, `source.${ext}`);
  const contentType = opts.contentType || (ext === "webm" ? "video/webm" : "video/mp4");

  const { error } = await supabase.storage.from(ACTIVITY_SESSIONS_BUCKET).upload(path, opts.file, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });

  if (error) {
    return { path: null, error: error.message };
  }
  return { path, error: null };
}

export async function uploadActivityPoses(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    poses: unknown[];
    frameIntervalSec: number | null;
  }
): Promise<{ path: string | null; error: string | null }> {
  const path = activityVideoObjectPath(opts.userId, opts.sessionId, "poses.json");
  const body = JSON.stringify({
    version: 1,
    frameIntervalSec: opts.frameIntervalSec,
    poses: opts.poses,
  });
  const { error } = await supabase.storage.from(ACTIVITY_SESSIONS_BUCKET).upload(path, body, {
    cacheControl: "3600",
    upsert: true,
    contentType: "application/json",
  });

  if (error) {
    return { path: null, error: error.message };
  }
  return { path, error: null };
}

export async function createSignedActivityVideoUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSec = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(ACTIVITY_SESSIONS_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error) {
    return { url: null, error: error.message };
  }
  return { url: data.signedUrl, error: null };
}

export async function fetchActivityPosesJson(
  supabase: SupabaseClient,
  path: string
): Promise<{ poses: any[]; frameIntervalSec: number | null; error: string | null }> {
  const { data, error } = await supabase.storage.from(ACTIVITY_SESSIONS_BUCKET).download(path);
  if (error || !data) {
    return { poses: [], frameIntervalSec: null, error: error?.message ?? "Download failed" };
  }
  try {
    const text = await data.text();
    const parsed = JSON.parse(text) as { poses?: any[]; frameIntervalSec?: number | null };
    return {
      poses: Array.isArray(parsed.poses) ? parsed.poses : [],
      frameIntervalSec: parsed.frameIntervalSec ?? null,
      error: null,
    };
  } catch (err) {
    return {
      poses: [],
      frameIntervalSec: null,
      error: err instanceof Error ? err.message : "Invalid poses JSON",
    };
  }
}
