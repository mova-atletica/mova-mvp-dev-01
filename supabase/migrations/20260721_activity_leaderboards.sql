-- Day 4 — activity sessions + leaderboards (+ private video bucket for Pro mini-app saves).
-- Depends on public.handle_updated_at() from 20260715_profiles.sql.
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- activity_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  kind text not null
    check (kind in ('studio', 'mini-app', 'program')),
  title text not null default '',
  subtitle text not null default '',
  sport_slug text,
  tags text[] not null default '{}',

  metric_label text,
  metric_value_text text,
  metric_numeric double precision,

  -- SessionMovementMetrics JSON (formScore, avgRomDegrees, bodyFocus, jointRom, …)
  metrics jsonb,

  -- Pro-only mini-app / studio clip in storage bucket `activity-sessions`
  video_path text,
  video_duration_ms integer
    check (video_duration_ms is null or video_duration_ms > 0),

  is_seed boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activity_sessions_user_occurred_idx
  on public.activity_sessions (user_id, occurred_at desc);

create index if not exists activity_sessions_user_kind_idx
  on public.activity_sessions (user_id, kind);

create index if not exists activity_sessions_sport_idx
  on public.activity_sessions (sport_slug)
  where sport_slug is not null;

drop trigger if exists activity_sessions_updated_at on public.activity_sessions;
create trigger activity_sessions_updated_at
  before update on public.activity_sessions
  for each row execute function public.handle_updated_at();

alter table public.activity_sessions enable row level security;

drop policy if exists "activity_sessions_select_own" on public.activity_sessions;
create policy "activity_sessions_select_own"
  on public.activity_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "activity_sessions_insert_own" on public.activity_sessions;
create policy "activity_sessions_insert_own"
  on public.activity_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "activity_sessions_update_own" on public.activity_sessions;
create policy "activity_sessions_update_own"
  on public.activity_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "activity_sessions_delete_own" on public.activity_sessions;
create policy "activity_sessions_delete_own"
  on public.activity_sessions for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.activity_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- leaderboard_entries
-- ---------------------------------------------------------------------------

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  -- null for public seed / demo rows
  user_id uuid references auth.users (id) on delete cascade,

  sport_slug text not null,
  metric_key text not null,
  metric_label text not null,
  metric_value double precision not null,
  formatted_score text not null,
  display_name text not null,
  country_code text not null default 'US',

  activity_session_id uuid references public.activity_sessions (id) on delete set null,
  is_seed boolean not null default false,

  created_at timestamptz not null default now()
);

create index if not exists leaderboard_entries_sport_value_idx
  on public.leaderboard_entries (sport_slug, metric_value desc);

create index if not exists leaderboard_entries_user_sport_idx
  on public.leaderboard_entries (user_id, sport_slug)
  where user_id is not null;

alter table public.leaderboard_entries enable row level security;

-- Public read so homepage leaderboards work for guests.
drop policy if exists "leaderboard_entries_select_all" on public.leaderboard_entries;
create policy "leaderboard_entries_select_all"
  on public.leaderboard_entries for select
  using (true);

drop policy if exists "leaderboard_entries_insert_own" on public.leaderboard_entries;
create policy "leaderboard_entries_insert_own"
  on public.leaderboard_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_entries_update_own" on public.leaderboard_entries;
create policy "leaderboard_entries_update_own"
  on public.leaderboard_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard_entries_delete_own" on public.leaderboard_entries;
create policy "leaderboard_entries_delete_own"
  on public.leaderboard_entries for delete
  using (auth.uid() = user_id);

grant select on public.leaderboard_entries to anon, authenticated;
grant insert, update, delete on public.leaderboard_entries to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for activity / mini-app videos (Pro uploads)
-- Paths: {user_id}/{session_id}/source.mp4|webm
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-sessions',
  'activity-sessions',
  false,
  209715200, -- 200 MB (long planks at 720p)
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "activity_sessions_storage_select_own" on storage.objects;
create policy "activity_sessions_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "activity_sessions_storage_insert_pro" on storage.objects;
create policy "activity_sessions_storage_insert_pro"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('pro', 'partner')
    )
  );

drop policy if exists "activity_sessions_storage_update_pro" on storage.objects;
create policy "activity_sessions_storage_update_pro"
  on storage.objects for update
  using (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tier in ('pro', 'partner')
    )
  )
  with check (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "activity_sessions_storage_delete_own" on storage.objects;
create policy "activity_sessions_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'activity-sessions'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
