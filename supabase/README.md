# Day 2 — Supabase Auth setup

## 1. Run the profiles migration (required)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **mova-atletica**
2. Left sidebar → **SQL Editor** → **New query**
3. Paste the contents of [`supabase/migrations/20260715_profiles.sql`](./migrations/20260715_profiles.sql)
4. Click **Run**

This creates `public.profiles`, a signup trigger, backfills existing Parque users, and RLS so users can only read/update their own row.

## 2. Env (already done locally)

`.env.local` should include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PHASE_B_ENABLED=false`

Also add the same keys in **Vercel → Project → Settings → Environment Variables** for production.

## 3. Auth redirect URLs (already mostly done)

Ensure Redirect URLs include:

- `http://localhost:3000`
- `http://localhost:3000/auth/callback`
- `https://mova-mvp-dev-01.vercel.app`
- `https://mova-mvp-dev-01.vercel.app/auth/callback`

Site URL should be `https://mova-mvp-dev-01.vercel.app` (primary).

## 4. Smoke test

1. Restart `npm run dev`
2. Open `/login`
3. Enter email → receive code/link
4. Enter 6-digit code **or** click magic link
5. Land on `/account` with your email shown
6. Complete onboarding → values persist after refresh
