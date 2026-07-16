import type { AccountTier } from "../types/account";

export function hasProAccess(tier: AccountTier): boolean {
  return tier === "pro" || tier === "partner";
}
