"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LayoutDashboard } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";

const OpenMoveStudio = dynamic(() => import("./OpenMoveStudio"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-sm text-[color:var(--muted-foreground)]">
      Loading Studio…
    </div>
  ),
});

export default function OpenMoveStudioGate() {
  const { hasProAccess, requestStudioAccess, authLoading } = useAccount();
  const t = useTranslations();
  const [studioAllowed, setStudioAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    setStudioAllowed(hasProAccess);
    setChecked(true);
  }, [hasProAccess, authLoading]);

  useEffect(() => {
    const onOpenStudio = () => {
      setStudioAllowed(true);
      setChecked(true);
    };
    window.addEventListener("mova:open-studio", onOpenStudio);
    return () => window.removeEventListener("mova:open-studio", onOpenStudio);
  }, []);

  const reopenPaywall = () => {
    requestStudioAccess(() => {
      setStudioAllowed(true);
      setChecked(true);
    });
  };

  if (!checked) {
    return null;
  }

  if (!studioAllowed) {
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
            <LayoutDashboard
              size={32}
              className="mx-auto mb-3 text-[var(--accent,#3b82f6)]"
              aria-hidden
            />
            <p className="text-sm text-[color:var(--muted-foreground)]">{t("proPaywall.subtitle")}</p>
            <button
              type="button"
              onClick={reopenPaywall}
              className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              {t("account.upgradePro")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <OpenMoveStudio />;
}
