import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COACH_SESSIONS_BUCKET,
  emptyCoachEditorState,
  emptyCoachSessionMetadata,
  type CoachEditorState,
  type CoachSession,
  type CoachSessionMetadata,
  type CoachSessionStatus,
} from "../../types/coachSession";
import {
  COACH_SESSION_SELECT,
  mapCoachSessionRow,
  type CoachSessionRow,
} from "./mapCoachSession";

export function coachSourceObjectPath(
  userId: string,
  sessionId: string,
  filename: string
): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${sessionId}/${safe}`;
}

export async function listCoachSessions(
  supabase: SupabaseClient,
  options?: { status?: CoachSessionStatus; limit?: number }
): Promise<{ data: CoachSession[]; error: string | null }> {
  let query = supabase
    .from("coach_sessions")
    .select(COACH_SESSION_SELECT)
    .order("updated_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }
  return {
    data: ((data ?? []) as CoachSessionRow[]).map(mapCoachSessionRow),
    error: null,
  };
}

export async function getCoachSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<{ data: CoachSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from("coach_sessions")
    .select(COACH_SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: null };
  }
  return { data: mapCoachSessionRow(data as CoachSessionRow), error: null };
}

export interface CreateCoachSessionInput {
  id: string;
  userId: string;
  title?: string;
  sourceVideoPath: string;
  sourceDurationMs: number;
  sourceWidth: number;
  sourceHeight: number;
  sourceFps: number | null;
  metadata?: Partial<CoachSessionMetadata>;
  editor?: CoachEditorState;
}

export async function createCoachSession(
  supabase: SupabaseClient,
  input: CreateCoachSessionInput
): Promise<{ data: CoachSession | null; error: string | null }> {
  const title = input.title?.trim() || "Untitled draft";
  const metadata = {
    ...emptyCoachSessionMetadata(title),
    ...input.metadata,
    title: input.metadata?.title?.trim() || title,
  };
  const editor = input.editor ?? emptyCoachEditorState();

  const { data, error } = await supabase
    .from("coach_sessions")
    .insert({
      id: input.id,
      user_id: input.userId,
      title,
      status: "draft",
      source_video_path: input.sourceVideoPath,
      source_duration_ms: input.sourceDurationMs,
      source_width: input.sourceWidth,
      source_height: input.sourceHeight,
      source_fps: input.sourceFps,
      editor,
      metadata,
    })
    .select(COACH_SESSION_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: mapCoachSessionRow(data as CoachSessionRow), error: null };
}

export async function updateCoachSessionDraft(
  supabase: SupabaseClient,
  sessionId: string,
  patch: {
    title?: string;
    status?: CoachSessionStatus;
    editor?: CoachEditorState;
    metadata?: CoachSessionMetadata;
    keypointsPath?: string | null;
  }
): Promise<{ data: CoachSession | null; error: string | null }> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.editor !== undefined) row.editor = patch.editor;
  if (patch.metadata !== undefined) row.metadata = patch.metadata;
  if (patch.keypointsPath !== undefined) row.keypoints_path = patch.keypointsPath;

  const { data, error } = await supabase
    .from("coach_sessions")
    .update(row)
    .eq("id", sessionId)
    .select(COACH_SESSION_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: mapCoachSessionRow(data as CoachSessionRow), error: null };
}

export async function uploadCoachSourceVideo(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    file: File;
  }
): Promise<{ path: string | null; error: string | null }> {
  const ext =
    opts.file.name.split(".").pop()?.toLowerCase() ||
    (opts.file.type.includes("webm") ? "webm" : "mp4");
  const path = coachSourceObjectPath(opts.userId, opts.sessionId, `source.${ext}`);

  const { error } = await supabase.storage
    .from(COACH_SESSIONS_BUCKET)
    .upload(path, opts.file, {
      cacheControl: "3600",
      upsert: true,
      contentType: opts.file.type || "video/mp4",
    });

  if (error) {
    return { path: null, error: error.message };
  }
  return { path, error: null };
}

export async function createSignedCoachVideoUrl(
  supabase: SupabaseClient,
  path: string,
  expiresInSec = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(COACH_SESSIONS_BUCKET)
    .createSignedUrl(path, expiresInSec);

  if (error) {
    return { url: null, error: error.message };
  }
  return { url: data.signedUrl, error: null };
}
