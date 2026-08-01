-- Lock entitlement columns so clients cannot self-upgrade to Pro.
-- Service role (Dashboard SQL, Stripe webhook) still bypasses RLS and can update tier.
-- Safe to re-run.

alter table public.profiles
  add column if not exists stripe_subscription_id text;

alter table public.profiles
  add column if not exists stripe_price_id text;

create or replace function public.profiles_preserve_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Block end-user JWTs from changing billing/entitlement fields.
  -- Allow: service_role (Stripe webhook / admin client) and Dashboard SQL (no JWT).
  if auth.uid() is not null and coalesce(auth.role(), '') is distinct from 'service_role' then
    new.tier := old.tier;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_price_id := old.stripe_price_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_preserve_entitlements on public.profiles;
create trigger profiles_preserve_entitlements
  before update on public.profiles
  for each row
  execute function public.profiles_preserve_entitlements();
