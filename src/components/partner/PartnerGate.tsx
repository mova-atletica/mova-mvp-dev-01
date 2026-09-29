"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import AuthPageShell from "../account/AuthPageShell";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

/**
 * Partner-tier gate. Waits for auth hydration (same pattern as CoachStudioGate)
 * so signed-in partners are not bounced home during the loading window.
 */
export default function PartnerGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useTranslations();
  const { isAuthenticated, hasCoachAccess, authLoading, openSignIn } =
    useAccount();

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      openSignIn();
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router, openSignIn]);

  if (authLoading) return null;

  if (!isAuthenticated) return null;

  if (!hasCoachAccess) {
    return (
      <AuthPageShell title={t("partner.gateTitle")} subtitle={t("partner.gateSubtitle")}>
        <div
          className="rounded-xl p-6 text-center"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <p className="text-sm text-[color:var(--foreground)]">{t("partner.gateBody")}</p>
          <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">{t("partner.gateDevHint")}</p>
          <Link
            href="/account"
            className="mt-4 inline-block text-sm underline text-[color:var(--primary)]"
          >
            {t("account.title")}
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return children;
}
