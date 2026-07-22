import type { SupabaseClient } from "@supabase/supabase-js";
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
  is_seed: boolean;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

export const ACTIVITY_SESSION_SELECT =
  "id, user_id, kind, title, subtitle, sport_slug, tags, metric_label, metric_value_text, metric_numeric, metrics, video_path, video_duration_ms, is_seed, occurred_at, created_at, updated_at";

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
