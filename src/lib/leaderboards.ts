import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeaderboardEntry, LeaderboardScorePayload } from "../types/account";

export interface LeaderboardEntryRow {
  id: string;
  user_id: string | null;
  sport_slug: string;
  metric_key: string;
  metric_label: string;
  metric_value: number;
  formatted_score: string;
  display_name: string;
  country_code: string;
  activity_session_id: string | null;
  is_seed: boolean;
  created_at: string;
}

export const LEADERBOARD_ENTRY_SELECT =
  "id, user_id, sport_slug, metric_key, metric_label, metric_value, formatted_score, display_name, country_code, activity_session_id, is_seed, created_at";

export function mapLeaderboardEntryRow(row: LeaderboardEntryRow): LeaderboardEntry {
  return {
    id: row.id,
    sportSlug: row.sport_slug,
    metricKey: row.metric_key,
    metricLabel: row.metric_label,
    metricValue: row.metric_value,
    formattedScore: row.formatted_score,
    displayName: row.display_name,
    countryCode: row.country_code,
    userId: row.user_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function listLeaderboardEntries(
  supabase: SupabaseClient,
  options?: { sportSlug?: string; limit?: number }
): Promise<{ data: LeaderboardEntry[]; error: string | null }> {
  let query = supabase
    .from("leaderboard_entries")
    .select(LEADERBOARD_ENTRY_SELECT)
    .order("metric_value", { ascending: false });

  if (options?.sportSlug) {
    query = query.eq("sport_slug", options.sportSlug);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }
  return {
    data: ((data ?? []) as LeaderboardEntryRow[]).map(mapLeaderboardEntryRow),
    error: null,
  };
}

export async function insertLeaderboardEntry(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    score: LeaderboardScorePayload;
    displayName: string;
    countryCode: string;
    activitySessionId?: string | null;
  }
): Promise<{ data: LeaderboardEntry | null; error: string | null }> {
  const row = {
    user_id: opts.userId,
    sport_slug: opts.score.sportSlug,
    metric_key: opts.score.metricKey,
    metric_label: opts.score.metricLabel,
    metric_value: opts.score.metricValue,
    formatted_score: opts.score.formattedScore,
    display_name: opts.displayName,
    country_code: opts.countryCode,
    activity_session_id: opts.activitySessionId ?? null,
    is_seed: false,
  };

  const { data, error } = await supabase
    .from("leaderboard_entries")
    .insert(row)
    .select(LEADERBOARD_ENTRY_SELECT)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data: mapLeaderboardEntryRow(data as LeaderboardEntryRow), error: null };
}
