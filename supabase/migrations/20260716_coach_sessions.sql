-- Coach Studio sessions (Phase A / Pro). Safe to re-run.
-- Depends on public.handle_updated_at() from 20260715_profiles.sql.
-- Source videos live in private Storage bucket `coach-sessions`.
-- Exports are local downloads only in v1 (no export_video_path).

create table if not exists public.coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'archived')),

  -- e.g. {user_id}/{session_id}/source.mp4
  source_video_path text,
  source_duration_ms integer
    check (
      source_duration_ms is null
      or (source_duration_ms > 0 and source_duration_ms <= 30000)
    ),
  source_width integer,
  source_height integer,
  -- Used by Coach Export so playback speed matches the upload
  source_fps real
    check (source_fps is null or source_fps > 0),

  -- Optional cached pose dump: {user_id}/{session_id}/keypoints.json
  keypoints_path text,

  editor jsonb not null default jsonb_build_object(
    'version', 1,
    'selectedJoints', '[]'::jsonb,
    'connectors', '[]'::jsonb,
    'jointArrows', '[]'::jsonb,
    'freezes', '[]'::jsonb,
    'captions', '[]'::jsonb,
    'annotations', '[]'::jsonb
  ),
  metadata jsonb not null default jsonb_build_object(
    'title', '',
    'instructions', '',
    'equipment', '[]'::jsonb,
    'jointsOfInterest', '[]'::jsonb,
    'movementLabel', null,
    'tags', '[]'::jsonb
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coach_sessions_user_updated_idx
  on public.coach_sessions (user_id, updated_at desc);

create index if not exists coach_sessions_user_status_idx
  on public.coach_sessions (user_id, status);

drop trigger if exists coach_sessions_updated_at on public.coach_sessions;
create trigger coach_sessions_updated_at
  before update on public.coach_sessions
  for each row execute function public.handle_updated_at();

alter table public.coach_sessions enable row level security;

drop policy if exists "coach_sessions_select_own" on public.coach_sessions;
create policy "coach_sessions_select_own"
  on public.coach_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "coach_sessions_insert_own" on public.coach_sessions;
create policy "coach_sessions_insert_own"
  on public.coach_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "coach_sessions_update_own" on public.coach_sessions;
create policy "coach_sessions_update_own"
  on public.coach_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "coach_sessions_delete_own" on public.coach_sessions;
create policy "coach_sessions_delete_own"
  on public.coach_sessions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.coach_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for Coach Studio source videos (+ optional keypoints)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-sessions',
  'coach-sessions',
  false,
  104857600, -- 100 MB
  array['video/mp4', 'video/webm', 'video/quicktime', 'application/json']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Paths: {user_id}/{session_id}/source.* | keypoints.json
drop policy if exists "coach_sessions_storage_select_own" on storage.objects;
create policy "coach_sessions_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'coach-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach_sessions_storage_insert_own" on storage.objects;
create policy "coach_sessions_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'coach-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach_sessions_storage_update_own" on storage.objects;
create policy "coach_sessions_storage_update_own"
  on storage.objects for update
  using (
    bucket_id = 'coach-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'coach-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "coach_sessions_storage_delete_own" on storage.objects;
create policy "coach_sessions_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'coach-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
