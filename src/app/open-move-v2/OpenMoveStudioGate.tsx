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
  const { hasProAccess, requestStudioAccess } = useAccount();
  const t = useTranslations();
  const [studioAllowed, setStudioAllowed] = useState(hasProAccess);
  const [checked, setChecked] = useState(hasProAccess);

  useEffect(() => {
    if (hasProAccess) {
      setStudioAllowed(true);
      setChecked(true);
      return;
    }
    requestStudioAccess(() => {
      setStudioAllowed(true);
      setChecked(true);
    });
    setChecked(true);
  }, [hasProAccess, requestStudioAccess]);

  if (!checked) {
    return null;
  }

  if (!studioAllowed) {
    return (
      <main className="homepage-canvas flex min-h-screen items-center justify-center px-4">
        <div className="homepage-canvas-backdrop" aria-hidden>
          <div className="homepage-canvas-gradient" />
          <div className="homepage-canvas-noise" />
          <div className="homepage-canvas-dots" />
        </div>
        <div
          className="relative z-10 max-w-sm rounded-xl p-6 text-center"
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
        </div>
      </main>
    );
  }

  return <OpenMoveStudio />;
}
