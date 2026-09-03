import type { SupabaseClient } from "@supabase/supabase-js";

export type BillingSource = "stripe" | "apple" | "both";

export type ProfileBillingRow = {
  id: string;
  tier: string;
  billing_source: BillingSource | null;
  apple_original_transaction_id: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id?: string | null;
  stripe_price_id?: string | null;
};

export const PROFILE_BILLING_SELECT =
  "id, tier, billing_source, apple_original_transaction_id, stripe_subscription_id, stripe_customer_id, stripe_price_id";

export function billingSourceFromFlags(
  stripeActive: boolean,
  appleActive: boolean
): BillingSource | null {
  if (stripeActive && appleActive) return "both";
  if (stripeActive) return "stripe";
  if (appleActive) return "apple";
  return null;
}

export function isStripeEntitled(row: Pick<ProfileBillingRow, "stripe_subscription_id">): boolean {
  return Boolean(row.stripe_subscription_id);
}

export function isAppleEntitled(row: Pick<ProfileBillingRow, "billing_source">): boolean {
  return row.billing_source === "apple" || row.billing_source === "both";
}

function nextTier(currentTier: string, entitled: boolean): string {
  if (currentTier === "partner") return "partner";
  return entitled ? "pro" : "free";
}

export async function applyStripeEntitlement(
  admin: SupabaseClient,
  profile: ProfileBillingRow,
  input: {
    stripeActive: boolean;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
  }
): Promise<void> {
  const appleActive = isAppleEntitled(profile);
  const entitled = input.stripeActive || appleActive;
  const { error } = await admin
    .from("profiles")
    .update({
      tier: nextTier(profile.tier, entitled),
      stripe_customer_id: input.stripeCustomerId,
      stripe_subscription_id: input.stripeActive ? input.stripeSubscriptionId : null,
      stripe_price_id: input.stripeActive ? input.stripePriceId : null,
      billing_source: billingSourceFromFlags(input.stripeActive, appleActive),
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to apply Stripe entitlement", error);
    throw new Error("Could not update billing");
  }
}

export async function applyAppleEntitlement(
  admin: SupabaseClient,
  profile: ProfileBillingRow,
  input: {
    appleActive: boolean;
    originalTransactionId: string;
  }
): Promise<void> {
  const stripeActive = isStripeEntitled(profile);
  const entitled = stripeActive || input.appleActive;
  const { error } = await admin
    .from("profiles")
    .update({
      tier: nextTier(profile.tier, entitled),
      apple_original_transaction_id: input.originalTransactionId,
      billing_source: billingSourceFromFlags(stripeActive, input.appleActive),
    })
    .eq("id", profile.id);

  if (error) {
    if (error.code === "23505") {
      const conflict = new Error("Apple subscription already linked to another account");
      (conflict as Error & { code: string }).code = "apple_transaction_conflict";
      throw conflict;
    }
    console.error("Failed to apply Apple entitlement", error);
    throw new Error("Could not update billing");
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function findProfileForAppleTransaction(
  admin: SupabaseClient,
  input: {
    originalTransactionId: string;
    userId?: string | null;
    appAccountToken?: string | null;
  }
): Promise<ProfileBillingRow | null> {
  const { data: byTx, error: txError } = await admin
    .from("profiles")
    .select(PROFILE_BILLING_SELECT)
    .eq("apple_original_transaction_id", input.originalTransactionId)
    .maybeSingle();

  if (txError) {
    console.error("Apple profile lookup by transaction failed", txError);
    throw new Error("Could not load profile");
  }

  if (byTx) {
    if (input.userId && byTx.id !== input.userId) {
      const conflict = new Error("Apple subscription already linked to another account");
      (conflict as Error & { code: string }).code = "apple_transaction_conflict";
      throw conflict;
    }
    return byTx as ProfileBillingRow;
  }

  const candidateId =
    input.userId ||
    (input.appAccountToken && isUuid(input.appAccountToken) ? input.appAccountToken : null);

  if (!candidateId) return null;

  const { data: byUser, error: userError } = await admin
    .from("profiles")
    .select(PROFILE_BILLING_SELECT)
    .eq("id", candidateId)
    .maybeSingle();

  if (userError) {
    console.error("Apple profile lookup by user failed", userError);
    throw new Error("Could not load profile");
  }

  return (byUser as ProfileBillingRow | null) ?? null;
}
