import type { User } from "@supabase/supabase-js";
import type {
  AccountProfile,
  AccountTier,
  AppLocale,
  BillingSource,
} from "../../types/account";

export const PROFILE_ACCOUNT_SELECT =
  "id, display_name, country_code, locale, onboarding_complete, tier, stripe_customer_id, billing_source";

const VALID_BILLING = new Set<BillingSource>(["stripe", "apple", "both"]);

export interface ProfileRow {
  id: string;
  display_name: string;
  country_code: string;
  locale: string;
  onboarding_complete: boolean;
  tier: string;
  stripe_customer_id: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  billing_source?: string | null;
}

const VALID_LOCALES = new Set<AppLocale>(["en", "es", "pt-BR"]);
const VALID_TIERS = new Set<Exclude<AccountTier, "guest">>(["free", "pro", "partner"]);

export function mapProfileRow(row: ProfileRow, user: User): AccountProfile {
  const locale = VALID_LOCALES.has(row.locale as AppLocale)
    ? (row.locale as AppLocale)
    : "en";
  const tier = VALID_TIERS.has(row.tier as Exclude<AccountTier, "guest">)
    ? (row.tier as Exclude<AccountTier, "guest">)
    : "free";

  return {
    id: row.id,
    email: user.email?.trim() || "",
    displayName: row.display_name ?? "",
    countryCode: row.country_code || "US",
    locale,
    onboardingComplete: Boolean(row.onboarding_complete),
    tier,
    stripeCustomerId: row.stripe_customer_id ?? null,
    billingSource: VALID_BILLING.has(row.billing_source as BillingSource)
      ? (row.billing_source as BillingSource)
      : null,
  };
}
