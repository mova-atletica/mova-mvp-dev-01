"use client";

import { Sparkles } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import { hasProAccess } from "../../lib/proAccess";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

export default function AccountProAccessBlock() {
  const { tier, openProPaywall } = useAccount();
  const t = useTranslations();
  const isPro = hasProAccess(tier);

  return (
    <section
      className="flex h-full flex-col rounded-xl p-4"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <div>
        <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {t("account.movaPro")}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[color:var(--foreground)]">
          {isPro ? (
            <>
              <Sparkles size={14} className="text-[var(--accent,#3b82f6)]" aria-hidden />
              {t("account.proActive")}
            </>
          ) : (
            t("account.proFree")
          )}
        </p>
        <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
          {isPro ? t("account.proActiveHint") : t("account.proFreeHint")}
        </p>
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
          <button
            type="button"
            disabled
            style={borderAllTheme}
            className="w-full cursor-not-allowed rounded-lg px-4 py-2.5 text-sm text-[color:var(--muted-foreground)] opacity-70"
          >
            {t("account.manageSubscription")} ({t("common.comingSoon")})
          </button>
        )}
      </div>
    </section>
  );
}
