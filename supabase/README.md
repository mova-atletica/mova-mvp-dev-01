# Day 4 — Activity + leaderboards (Supabase)

## What you need to run in the Supabase SQL Editor

Open [Supabase Dashboard](https://supabase.com/dashboard) → project **mova-atletica** → **SQL Editor** → **New query**.

### Step 1 — Schema + storage (required)

Paste and **Run** the full contents of:

[`supabase/migrations/20260721_activity_leaderboards.sql`](./migrations/20260721_activity_leaderboards.sql)

This creates:

- `public.activity_sessions` (+ RLS: own rows only)
- `public.leaderboard_entries` (+ RLS: public read, own write)
- Private Storage bucket **`activity-sessions`** (Pro-only **video** upload via `profiles.tier`)

Confirm in **Table Editor** that both tables exist, and under **Storage** that bucket `activity-sessions` exists.

### Step 2 — Day 4.5 analysis payload (required for Activity replay)

Paste and **Run** the full contents of:

[`supabase/migrations/20260722_activity_analysis_payload.sql`](./migrations/20260722_activity_analysis_payload.sql)

This adds:

- Columns on `activity_sessions`: `sport_analysis_kind`, `frame_interval_sec`, `angles`, `sport_analysis`, `poses_path`, `coach_session_id`
- Extends `kind` check to include `'coach'`
- Allows **`application/json`** in the `activity-sessions` bucket
- Storage insert/update: **any signed-in user** may upload `*.json` poses; **video** remains Pro/partner only

### Step 3 — Demo seed for tresbradley (recommended)

1. Sign into the app at least once with the email tied to **tresbradley** (so `auth.users` + `profiles` exist).
2. Paste and **Run**:

[`supabase/migrations/20260721_seed_tresbradley_demo.sql`](./migrations/20260721_seed_tresbradley_demo.sql)

This will:

- Find your user by email / `display_name` containing `tresbradley`
- Set `profiles.tier = 'pro'` and `onboarding_complete = true`
- Insert seeded **Activity** rows (studio + mini-app) — these stay **non-clickable** until a real analysis payload exists
- Insert public **leaderboard** seed rows for plank / squat / pullups

If you see `Could not find auth user for tresbradley`, check **Authentication → Users** for the exact email, then either sign in once or edit the `like '%tresbradley%'` clause in the seed to match your email.

### Step 4 — Smoke test in the app

1. Restart `npm run dev` (or refresh after deploy).
2. Homepage leaderboard sport picker should only show **Plank / Squat / Pull-ups** (no cycling / flexibility).
3. Sign in as tresbradley → **Account → Activity / Insights** should show seeded sessions (not clickable).
4. Run a mini app → Analyze → Activity row appears with **Open**; click opens the replay modal (metrics + charts; Pro video if uploaded).
5. Run **Open Movement Viz** → analyze a clip → Activity **Studio** row → **Open** replay.
6. Create a **Coach Studio** draft → Activity **Coach** row → **Open** deep-links to `/coach-studio/[id]`.
7. As Pro, mini-app / Open Move completion should also attempt a **720p** video upload into `activity-sessions` (check Storage after a run).

## Notes

- Free users still get **metrics + analysis JSON** activity rows; **video** upload is blocked by Storage RLS unless `tier` is `pro` or `partner`. Poses JSON upload is allowed for all authenticated users.
- Mini apps: no duration cap; Pro video is re-encoded toward **720p ~1.5 Mbps** when practical.
- Open Movement Viz / Coach Studio: existing **30s** caps; no extra compress in this pass.
- Re-running the seed deletes prior `is_seed` rows for that user / public LB seeds, then re-inserts.
- Seed / mock rows without `angles` + sport analysis are intentionally non-clickable.
