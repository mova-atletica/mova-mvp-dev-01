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

/** Free mini-app users may enable these overlays (always on; config editable). */
export const FREE_MINI_APP_EFFECT_IDS = ["skeleton-overlay", "joint-angles"] as const;

export type FreeMiniAppEffectId = (typeof FREE_MINI_APP_EFFECT_IDS)[number];

export function isFreeMiniAppEffect(effectId: string): boolean {
  return (FREE_MINI_APP_EFFECT_IDS as readonly string[]).includes(effectId);
}

export function isEffectLocked(
  effectId: string,
  restrictMiniAppOverlays: boolean
): boolean {
  return restrictMiniAppOverlays && !isFreeMiniAppEffect(effectId);
}

export function isEffectConfigurable(
  effectId: string,
  restrictMiniAppOverlays: boolean
): boolean {
  return !isEffectLocked(effectId, restrictMiniAppOverlays);
}

/**
 * True when the session is a free mini-app analysis: restrict overlays and watermark exports.
 * Studio (`default` mode) is Pro-only at the gate, so it never needs this path.
 */
export function isRestrictedMiniAppSession(
  isQuickAnalysis: boolean,
  userHasProAccess: boolean
): boolean {
  return isQuickAnalysis && !userHasProAccess;
}
