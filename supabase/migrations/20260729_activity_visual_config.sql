-- Persist Open Move visual overlay configs with activity sessions.
alter table public.activity_sessions
  add column if not exists visual_config jsonb;
