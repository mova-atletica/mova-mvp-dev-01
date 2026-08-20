import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COACH_SESSIONS_BUCKET,
  type CoachSession,
} from "../../types/coachSession";
import type { Pose } from "./joints";
import {
  coachSourceObjectPath,
  updateCoachSessionDraft,
} from "./coachSessions";

/** Versioned pose dump stored at `{user}/{session}/keypoints.json`. */
export interface CoachKeypointsFile {
  version: 1;
  frameIntervalSec: number;
  /** Intrinsic pixel size at estimatePoses time (iOS keypoint normalize). */
  videoWidth?: number;
  videoHeight?: number;
  poses: Pose[];
  /** ISO timestamp when tracking completed. */
  trackedAt?: string;
}

export function coachKeypointsObjectPath(userId: string, sessionId: string): string {
  return coachSourceObjectPath(userId, sessionId, "keypoints.json");
}

/** Include only when > 1 (omit rather than writing 0). */
function optionalVideoPixelSize(
  videoWidth?: number | null,
  videoHeight?: number | null
): { videoWidth?: number; videoHeight?: number } {
  const out: { videoWidth?: number; videoHeight?: number } = {};
  if (typeof videoWidth === "number" && videoWidth > 1) out.videoWidth = videoWidth;
  if (typeof videoHeight === "number" && videoHeight > 1) out.videoHeight = videoHeight;
  return out;
}

export function buildCoachKeypointsFile(
  poses: Pose[],
  frameIntervalSec: number,
  videoSize?: { videoWidth?: number | null; videoHeight?: number | null }
): CoachKeypointsFile {
  return {
    version: 1,
    frameIntervalSec,
    ...optionalVideoPixelSize(videoSize?.videoWidth, videoSize?.videoHeight),
    poses,
    trackedAt: new Date().toISOString(),
  };
}

export function parseCoachKeypointsFile(
  raw: unknown
): { data: CoachKeypointsFile | null; error: string | null } {
  if (!raw || typeof raw !== "object") {
    return { data: null, error: "Invalid keypoints file." };
  }
  const obj = raw as Partial<CoachKeypointsFile>;
  if (obj.version !== 1) {
    return { data: null, error: "Unsupported keypoints version." };
  }
  if (!Array.isArray(obj.poses)) {
    return { data: null, error: "Keypoints missing poses." };
  }
  const frameIntervalSec =
    typeof obj.frameIntervalSec === "number" && obj.frameIntervalSec > 0
      ? obj.frameIntervalSec
      : 0.1;
  const size = optionalVideoPixelSize(
    typeof obj.videoWidth === "number" ? obj.videoWidth : null,
    typeof obj.videoHeight === "number" ? obj.videoHeight : null
  );
  return {
    data: {
      version: 1,
      frameIntervalSec,
      ...size,
      poses: obj.poses as Pose[],
      trackedAt: typeof obj.trackedAt === "string" ? obj.trackedAt : undefined,
    },
    error: null,
  };
}

/**
 * Download + parse cached keypoints. Returns null data when missing/corrupt
 * so the caller can fall back to MoveNet.
 */
export async function loadCoachKeypoints(
  supabase: SupabaseClient,
  path: string
): Promise<{ data: CoachKeypointsFile | null; error: string | null }> {
  const { data: blob, error } = await supabase.storage
    .from(COACH_SESSIONS_BUCKET)
    .download(path);

  if (error || !blob) {
    return { data: null, error: error?.message ?? "Could not download keypoints." };
  }

  try {
    const text = await blob.text();
    const json = JSON.parse(text) as unknown;
    const parsed = parseCoachKeypointsFile(json);
    if (parsed.error) return { data: null, error: parsed.error };
    return { data: parsed.data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Could not parse keypoints.",
    };
  }
}

/**
 * Upload keypoints JSON and persist `keypoints_path` on the session row.
 */
export async function saveCoachKeypoints(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    poses: Pose[];
    frameIntervalSec: number;
    videoWidth?: number | null;
    videoHeight?: number | null;
  }
): Promise<{ path: string | null; session: CoachSession | null; error: string | null }> {
  const path = coachKeypointsObjectPath(opts.userId, opts.sessionId);
  const file = buildCoachKeypointsFile(opts.poses, opts.frameIntervalSec, {
    videoWidth: opts.videoWidth,
    videoHeight: opts.videoHeight,
  });
  const body = new Blob([JSON.stringify(file)], { type: "application/json" });

  const { error: uploadError } = await supabase.storage
    .from(COACH_SESSIONS_BUCKET)
    .upload(path, body, {
      cacheControl: "3600",
      upsert: true,
      contentType: "application/json",
    });

  if (uploadError) {
    return { path: null, session: null, error: uploadError.message };
  }

  const { data: session, error: updateError } = await updateCoachSessionDraft(
    supabase,
    opts.sessionId,
    { keypointsPath: path }
  );

  if (updateError || !session) {
    return {
      path,
      session: null,
      error: updateError ?? "Uploaded keypoints but failed to update session.",
    };
  }

  return { path, session, error: null };
}
