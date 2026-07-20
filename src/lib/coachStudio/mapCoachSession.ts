import type {
  CoachEditorState,
  CoachSession,
  CoachSessionMetadata,
  CoachSessionStatus,
} from "../../types/coachSession";
import { emptyCoachSessionMetadata } from "../../types/coachSession";
import { migrateCoachEditorState } from "./migrateEditor";

export interface CoachSessionRow {
  id: string;
  user_id: string;
  title: string;
  status: string;
  source_video_path: string | null;
  source_duration_ms: number | null;
  source_width: number | null;
  source_height: number | null;
  source_fps: number | null;
  keypoints_path: string | null;
  editor: unknown;
  metadata: CoachSessionMetadata | null;
  created_at: string;
  updated_at: string;
}

function asMetadata(value: unknown): CoachSessionMetadata {
  if (value && typeof value === "object") {
    const m = value as Partial<CoachSessionMetadata>;
    return {
      ...emptyCoachSessionMetadata(typeof m.title === "string" ? m.title : ""),
      ...m,
      equipment: Array.isArray(m.equipment) ? m.equipment : [],
      jointsOfInterest: Array.isArray(m.jointsOfInterest) ? m.jointsOfInterest : [],
      tags: Array.isArray(m.tags) ? m.tags : [],
    };
  }
  return emptyCoachSessionMetadata();
}

function asStatus(value: string): CoachSessionStatus {
  return value === "archived" ? "archived" : "draft";
}

export function mapCoachSessionRow(row: CoachSessionRow): CoachSession {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? "",
    status: asStatus(row.status),
    sourceVideoPath: row.source_video_path,
    sourceDurationMs: row.source_duration_ms,
    sourceWidth: row.source_width,
    sourceHeight: row.source_height,
    sourceFps: row.source_fps,
    keypointsPath: row.keypoints_path,
    editor: migrateCoachEditorState(row.editor),
    metadata: asMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const COACH_SESSION_SELECT =
  "id, user_id, title, status, source_video_path, source_duration_ms, source_width, source_height, source_fps, keypoints_path, editor, metadata, created_at, updated_at";
