import type { User } from "@supabase/supabase-js";
import type { AccountProfile, AccountTier, AppLocale } from "../../types/account";

export interface ProfileRow {
  id: string;
  display_name: string;
  country_code: string;
  locale: string;
  onboarding_complete: boolean;
  tier: string;
  stripe_customer_id: string | null;
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
  };
}
