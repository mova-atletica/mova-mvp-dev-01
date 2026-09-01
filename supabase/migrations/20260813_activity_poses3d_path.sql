-- Optional 3D pose file path for ARKit live sessions (iOS uploads poses3d.json).
alter table public.activity_sessions
  add column if not exists poses3d_path text;
