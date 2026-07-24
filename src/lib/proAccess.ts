import type { AccountTier } from "../types/account";

/** Pro tier features (Open Movement Viz, video storage). Partner includes Pro. */
export function hasProAccess(tier: AccountTier): boolean {
  return tier === "pro" || tier === "partner";
}

/**
 * Coach Studio access. DB tier is `partner` (publicly "Coach");
 * includes all Pro features as well.
 */
export function hasCoachAccess(tier: AccountTier): boolean {
  return tier === "partner";
}
