export type AccountTier = "guest" | "free" | "pro" | "partner";

export type BillingSource = "stripe" | "apple" | "both";

export type AppLocale = "en" | "es" | "pt-BR";

export interface AccountProfile {
  id: string;
  email: string;
  displayName: string;
  countryCode: string;
  locale: AppLocale;
  onboardingComplete: boolean;
  tier: Exclude<AccountTier, "guest">;
  /** Present when the user has been through Stripe Checkout (or customer created). */
  stripeCustomerId: string | null;
  /** Which store currently entitles Pro. Null for free / grandfathered. */
  billingSource: BillingSource | null;
}

export interface LeaderboardScorePayload {
  sportSlug: string;
  sportTitle: string;
  metricKey: string;
  metricLabel: string;
  /** Numeric value used for sorting (higher is better unless noted). */
  metricValue: number;
  formattedScore: string;
}

export interface LeaderboardEntry {
  id: string;
  sportSlug: string;
  metricKey: string;
  metricLabel: string;
  metricValue: number;
  formattedScore: string;
  displayName: string;
  countryCode: string;
  userId?: string;
  createdAt: string;
}

export type LeaderboardScope = "global" | "country";

export interface OnboardingInput {
  displayName: string;
  countryCode: string;
  locale: AppLocale;
}
