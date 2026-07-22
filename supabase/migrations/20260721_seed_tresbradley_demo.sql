-- Day 4 seed — demo activity for tresbradley + public leaderboard seeds.
-- Run AFTER 20260721_activity_leaderboards.sql
-- Safe-ish to re-run: deletes prior is_seed rows for this user / public seeds first.

do $$
declare
  target_user uuid;
begin
  -- Prefer email match, then display_name (case-insensitive).
  select u.id
  into target_user
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) like '%tresbradley%'
     or lower(coalesce(p.display_name, '')) like '%tresbradley%'
  order by u.created_at asc
  limit 1;

  if target_user is null then
    raise exception 'Could not find auth user for tresbradley (email or display_name). Sign in once, then re-run.';
  end if;

  -- Demo Pro so video-save + Studio gates work without Stripe yet.
  update public.profiles
  set
    tier = 'pro',
    onboarding_complete = true,
    display_name = case
      when coalesce(display_name, '') = '' then 'tresbradley'
      else display_name
    end
  where id = target_user;

  -- Clear previous seeds for this user + public LB seeds.
  delete from public.leaderboard_entries
  where is_seed = true
     or (user_id = target_user and is_seed = true);

  delete from public.activity_sessions
  where user_id = target_user and is_seed = true;

  -- Personal activity (Phase A: studio + mini-app; skip program commerce rows).
  insert into public.activity_sessions (
    user_id, kind, title, subtitle, sport_slug, tags,
    metric_label, metric_value_text, metric_numeric, metrics,
    is_seed, occurred_at
  ) values
  (
    target_user, 'mini-app', 'Squat analysis', 'Side view · 32 reps detected', 'squat', array['squat'],
    'Reps', '32', 32,
    '{"formScore":86,"avgRomDegrees":96,"peakRomDegrees":112,"symmetryScore":90,"bodyFocus":{"lower":0.68,"core":0.22,"upper":0.1},"jointRom":{"knee":112,"hip":98,"ankle":24}}'::jsonb,
    true, '2026-03-08T18:30:00Z'
  ),
  (
    target_user, 'studio', 'Hip hinge demo', 'Motion trails + skeleton overlay', null, array['studio','export-ready'],
    null, null, null,
    '{"formScore":88,"avgRomDegrees":92,"peakRomDegrees":105,"symmetryScore":92,"bodyFocus":{"lower":0.55,"core":0.35,"upper":0.1},"jointRom":{"hip":105,"spine":48,"knee":78}}'::jsonb,
    true, '2026-03-07T14:10:00Z'
  ),
  (
    target_user, 'mini-app', 'Plank hold', 'Side view · alignment cues', 'plank', array['plank'],
    'Hold', '1:42', 102,
    '{"formScore":92,"avgRomDegrees":14,"peakRomDegrees":18,"symmetryScore":94,"bodyFocus":{"core":0.82,"lower":0.12,"upper":0.06},"jointRom":{"spine":16,"shoulder":8}}'::jsonb,
    true, '2026-03-05T20:15:00Z'
  ),
  (
    target_user, 'studio', 'Squat depth check', 'Angle overlays saved', 'squat', array['squat'],
    null, null, null,
    '{"formScore":78,"avgRomDegrees":88,"peakRomDegrees":102,"symmetryScore":84,"bodyFocus":{"lower":0.7,"core":0.2,"upper":0.1},"jointRom":{"knee":102,"hip":92,"ankle":22}}'::jsonb,
    true, '2026-02-24T16:30:00Z'
  ),
  (
    target_user, 'mini-app', 'Pull-up set', 'Strict form · 12 reps', 'pullups', array['pull-ups'],
    'Reps', '12', 12,
    '{"formScore":80,"avgRomDegrees":118,"peakRomDegrees":132,"symmetryScore":86,"bodyFocus":{"upper":0.62,"core":0.28,"lower":0.1},"jointRom":{"shoulder":132,"elbow":118}}'::jsonb,
    true, '2026-03-01T10:00:00Z'
  ),
  (
    target_user, 'mini-app', 'Squat challenge', '28 reps', 'squat', array['squat'],
    'Reps', '28', 28,
    '{"formScore":78,"avgRomDegrees":88,"peakRomDegrees":102,"symmetryScore":84,"bodyFocus":{"lower":0.7,"core":0.2,"upper":0.1},"jointRom":{"knee":102,"hip":92,"ankle":22}}'::jsonb,
    true, '2026-02-22T19:00:00Z'
  ),
  (
    target_user, 'mini-app', 'Plank hold', '1:28 hold', 'plank', array['plank'],
    'Hold', '1:28', 88,
    '{"formScore":85,"avgRomDegrees":12,"peakRomDegrees":15,"symmetryScore":88,"bodyFocus":{"core":0.85,"lower":0.1,"upper":0.05},"jointRom":{"spine":14}}'::jsonb,
    true, '2026-02-17T21:10:00Z'
  ),
  (
    target_user, 'studio', 'Mobility flow capture', 'Trail effect review', null, array['studio'],
    null, null, null,
    '{"formScore":84,"avgRomDegrees":78,"peakRomDegrees":95,"symmetryScore":89,"bodyFocus":{"core":0.4,"lower":0.38,"upper":0.22},"jointRom":{"spine":52,"hip":95,"shoulder":88}}'::jsonb,
    true, '2026-02-10T13:20:00Z'
  ),
  (
    target_user, 'mini-app', 'Squat analysis', '24 reps', 'squat', array['squat'],
    'Reps', '24', 24,
    '{"formScore":71,"avgRomDegrees":82,"peakRomDegrees":94,"symmetryScore":79,"bodyFocus":{"lower":0.72,"core":0.18,"upper":0.1},"jointRom":{"knee":94,"hip":86,"ankle":20}}'::jsonb,
    true, '2026-02-05T17:40:00Z'
  );

  raise notice 'Seeded activity for user %', target_user;
end $$;

-- Public leaderboard seeds (plank / squat / pullups only). user_id null.
delete from public.leaderboard_entries where is_seed = true and user_id is null;

insert into public.leaderboard_entries (
  user_id, sport_slug, metric_key, metric_label, metric_value, formatted_score,
  display_name, country_code, is_seed, created_at
) values
-- Plank
(null, 'plank', 'holdDurationSec', 'Hold time', 182, '3:02', 'Ana R.', 'MX', true, '2026-03-01T12:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 156, '2:36', 'Kenji S.', 'JP', true, '2026-03-02T09:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 142, '2:22', 'Chris M.', 'US', true, '2026-03-02T15:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 128, '2:08', 'Léa D.', 'FR', true, '2026-03-03T08:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 118, '1:58', 'Priya N.', 'IN', true, '2026-03-03T19:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 105, '1:45', 'Omar H.', 'AE', true, '2026-03-04T11:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 98, '1:38', 'Mia K.', 'CA', true, '2026-03-05T07:00:00Z'),
(null, 'plank', 'holdDurationSec', 'Hold time', 90, '1:30', 'Diego L.', 'AR', true, '2026-03-06T10:00:00Z'),
-- Squat
(null, 'squat', 'rep_count', 'Reps', 48, '48', 'Sofia P.', 'BR', true, '2026-03-01T14:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 44, '44', 'James T.', 'GB', true, '2026-03-02T11:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 41, '41', 'Yuki M.', 'JP', true, '2026-03-03T09:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 38, '38', 'Elena V.', 'ES', true, '2026-03-03T16:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 35, '35', 'Noah B.', 'US', true, '2026-03-04T12:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 33, '33', 'Aisha K.', 'NG', true, '2026-03-05T08:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 30, '30', 'Luca R.', 'IT', true, '2026-03-06T13:00:00Z'),
(null, 'squat', 'rep_count', 'Reps', 28, '28', 'Hana W.', 'KR', true, '2026-03-07T10:00:00Z'),
-- Pull-ups
(null, 'pullups', 'rep_count', 'Reps', 22, '22', 'Marcus J.', 'US', true, '2026-03-01T10:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 20, '20', 'Inês F.', 'PT', true, '2026-03-02T12:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 18, '18', 'Chen W.', 'CN', true, '2026-03-03T15:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 16, '16', 'Tomás G.', 'CL', true, '2026-03-04T09:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 15, '15', 'Amelia S.', 'AU', true, '2026-03-05T11:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 14, '14', 'Ravi P.', 'IN', true, '2026-03-06T14:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 12, '12', 'Nina O.', 'SE', true, '2026-03-07T08:00:00Z'),
(null, 'pullups', 'rep_count', 'Reps', 11, '11', 'Carlos M.', 'MX', true, '2026-03-08T16:00:00Z');
