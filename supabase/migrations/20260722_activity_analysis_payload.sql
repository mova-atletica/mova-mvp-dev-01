-- Day 4.5 — store analysis replay payloads on activity_sessions.
-- Run AFTER 20260721_activity_leaderboards.sql
-- Safe to re-run.

-- Allow coach activity rows (link to coach_sessions editor).
alter table public.activity_sessions
  drop constraint if exists activity_sessions_kind_check;

alter table public.activity_sessions
  add constraint activity_sessions_kind_check
  check (kind in ('studio', 'mini-app', 'program', 'coach'));

alter table public.activity_sessions
  add column if not exists sport_analysis_kind text;

alter table public.activity_sessions
  add column if not exists frame_interval_sec double precision
    check (frame_interval_sec is null or frame_interval_sec > 0);

-- OpenMoveAngleSeries (9 joint arrays)
alter table public.activity_sessions
  add column if not exists angles jsonb;

-- Sport-specific analysis result (Plank|Squat|PullUps|… AnalysisResult)
alter table public.activity_sessions
  add column if not exists sport_analysis jsonb;

-- Optimized poses JSON in Storage: {user_id}/{session_id}/poses.json
alter table public.activity_sessions
  add column if not exists poses_path text;

-- When kind = 'coach', open /coach-studio/{id}
alter table public.activity_sessions
  add column if not exists coach_session_id uuid
    references public.coach_sessions (id) on delete set null;

create index if not exists activity_sessions_coach_session_idx
  on public.activity_sessions (coach_session_id)
  where coach_session_id is not null;

-- Storage bucket already allows application/json from coach-sessions pattern;
-- ensure activity-sessions accepts JSON poses too.
update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/webm', 'video/quicktime', 'application/json']
where id = 'activity-sessions';

-- Free users may upload poses.json for analysis replay; video files stay Pro-only.
drop policy if exists "activity_sessions_storage_insert_pro" on storage.objects;
create policy "activity_sessions_storage_insert_authenticated"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (
      name like '%.json'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.tier in ('pro', 'partner')
      )
    )
  );

drop policy if exists "activity_sessions_storage_update_pro" on storage.objects;
create policy "activity_sessions_storage_update_authenticated"
  on storage.objects for update
  using (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
    and (
      name like '%.json'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.tier in ('pro', 'partner')
      )
    )
  )
  with check (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );