-- Seed public push-up leaderboard entries (reps only). Safe to re-run.
-- Clears prior pushups seed rows, then inserts engagement placeholders.

delete from public.leaderboard_entries
where is_seed = true
  and user_id is null
  and sport_slug = 'pushups';

insert into public.leaderboard_entries (
  user_id, sport_slug, metric_key, metric_label, metric_value, formatted_score,
  display_name, country_code, is_seed, created_at
) values
(null, 'pushups', 'rep_count', 'Reps', 42, '42', 'Maya L.', 'US', true, '2026-03-01T10:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 31, '31', 'Jonas K.', 'DE', true, '2026-03-02T11:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 30, '30', 'Sofia R.', 'BR', true, '2026-03-03T09:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 29, '29', 'Arjun P.', 'IN', true, '2026-03-03T16:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 22, '22', 'Claire D.', 'FR', true, '2026-03-04T12:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 20, '20', 'Kenji T.', 'JP', true, '2026-03-05T08:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 18, '18', 'Nora S.', 'SE', true, '2026-03-06T13:00:00Z'),
(null, 'pushups', 'rep_count', 'Reps', 18, '18', 'Luis M.', 'MX', true, '2026-03-07T10:00:00Z');
