"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import { hasProAccess } from "../../lib/proAccess";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const PRO_FEATURES = [
  "proPaywall.featureStudio",
  "proPaywall.featureExport",
  "proPaywall.featureSessions",
] as const;

export default function AccountProAccessBlock() {
  const { tier, profile, openProPaywall, openBillingPortal, authError } = useAccount();
  const t = useTranslations();
  const isPro = hasProAccess(tier);
  const billingSource = profile?.billingSource ?? null;
  const isAppleBilled = billingSource === "apple" || billingSource === "both";
  const canManageStripe =
    billingSource === "stripe" ||
    billingSource === "both" ||
    (!billingSource && Boolean(profile?.stripeCustomerId));
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      await openBillingPortal();
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <section
      className="flex h-full flex-col rounded-xl p-4"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {t("account.movaPro")}
        </p>
        <p className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
          {isPro ? t("account.proActive") : t("account.proFree")}
        </p>
        {isPro ? (
          <>
            <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
              {billingSource === "apple"
                ? t("account.proAppleHint")
                : billingSource === "both"
                  ? t("account.proBothHint")
                  : canManageStripe
                    ? t("account.proActiveHint")
                    : t("account.proGrandfatherHint")}
            </p>
            <ul className="mt-3 space-y-2">
              {PRO_FEATURES.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 text-xs text-[color:var(--foreground)]"
                >
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--accent,#3b82f6)]"
                    aria-hidden
                  />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            {t("account.proFreeHint")}
          </p>
        )}
      </div>
      <div className="mt-auto pt-4">
        {!isPro ? (
          <button
            type="button"
            onClick={openProPaywall}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-medium"
            style={{
              background: "var(--primary-button-bg)",
              color: "var(--primary-button-text)",
              border: "2px solid var(--primary-button-border)",
            }}
          >
            {t("account.upgradePro")}
          </button>
        ) : (
          <div className="space-y-2">
            {canManageStripe ? (
              <button
                type="button"
                onClick={handleManage}
                disabled={portalLoading}
                style={borderAllTheme}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)] disabled:opacity-60"
              >
                {portalLoading ? t("account.openingPortal") : t("account.manageSubscription")}
              </button>
            ) : null}
            {isAppleBilled ? (
              <p className="text-xs leading-relaxed text-[color:var(--muted-foreground)]">
                {t("account.manageOnIphoneHint")}
              </p>
            ) : null}
          </div>
        )}
        {authError ? (
          <p className="mt-2 text-xs leading-relaxed text-red-500">{authError}</p>
        ) : null}
      </div>
    </section>
  );
}
