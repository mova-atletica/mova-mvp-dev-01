-- Apple StoreKit billing fields + lock them from client updates.
-- Safe to re-run.

alter table public.profiles
  add column if not exists billing_source text;

alter table public.profiles
  add column if not exists apple_original_transaction_id text;

alter table public.profiles
  drop constraint if exists profiles_billing_source_check;

alter table public.profiles
  add constraint profiles_billing_source_check
  check (billing_source is null or billing_source in ('stripe', 'apple', 'both'));

create unique index if not exists profiles_apple_original_transaction_id_key
  on public.profiles (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

create or replace function public.profiles_preserve_entitlements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Block end-user JWTs from changing billing/entitlement fields.
  -- Allow: service_role (webhooks / admin client) and Dashboard SQL (no JWT).
  if auth.uid() is not null and coalesce(auth.role(), '') is distinct from 'service_role' then
    new.tier := old.tier;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.stripe_price_id := old.stripe_price_id;
    new.billing_source := old.billing_source;
    new.apple_original_transaction_id := old.apple_original_transaction_id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_preserve_entitlements on public.profiles;
create trigger profiles_preserve_entitlements
  before update on public.profiles
  for each row
  execute function public.profiles_preserve_entitlements();
