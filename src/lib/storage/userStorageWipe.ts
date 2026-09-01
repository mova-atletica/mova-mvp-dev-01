import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVITY_SESSIONS_BUCKET } from "../activitySessions";
import { COACH_SESSIONS_BUCKET } from "../../types/coachSession";

const USER_STORAGE_BUCKETS = [ACTIVITY_SESSIONS_BUCKET, COACH_SESSIONS_BUCKET] as const;

async function removeStoragePrefix(
  admin: SupabaseClient,
  bucket: string,
  prefix: string
): Promise<void> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) {
    throw error;
  }
  if (!data?.length) {
    return;
  }

  const filePaths: string[] = [];

  for (const item of data) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      await removeStoragePrefix(admin, bucket, path);
    } else {
      filePaths.push(path);
    }
  }

  if (filePaths.length > 0) {
    const { error: removeError } = await admin.storage.from(bucket).remove(filePaths);
    if (removeError) {
      throw removeError;
    }
  }
}

/** Delete all storage objects owned by a user under activity-sessions and coach-sessions. */
export async function wipeUserStorage(admin: SupabaseClient, userId: string): Promise<void> {
  for (const bucket of USER_STORAGE_BUCKETS) {
    await removeStoragePrefix(admin, bucket, userId);
  }
}
