"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";

export default function CoachStudioGate({ children }: { children: ReactNode }) {
  const { hasCoachAccess, authLoading } = useAccount();
  const t = useTranslations();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setAllowed(hasCoachAccess);
    setChecked(true);
  }, [hasCoachAccess, authLoading]);

  if (!checked) {
    return null;
  }

  if (!allowed) {
    return (
      <main className="homepage-canvas min-h-screen">
        <div className="homepage-canvas-backdrop" aria-hidden>
          <div className="homepage-canvas-gradient" />
          <div className="homepage-canvas-noise" />
          <div className="homepage-canvas-dots" />
        </div>
        <div className="homepage-canvas-content relative z-10 flex min-h-screen items-center justify-center px-4">
          <div
            className="max-w-sm rounded-xl p-6 text-center"
            style={{
              border: "1px solid var(--border-secondary)",
              backgroundColor: "var(--card-bg)",
            }}
          >
            <Clapperboard
              size={32}
              className="mx-auto mb-3 text-[var(--accent,#3b82f6)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              {t("coachStudio.lockedTitle")}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
              {t("coachStudio.lockedBody")}
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              {t("common.backToArchive")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
