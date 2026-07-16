"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, LayoutDashboard, Sparkles, X } from "lucide-react";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const PRO_FEATURES = [
  "proPaywall.featureStudio",
  "proPaywall.featureExport",
  "proPaywall.featureSessions",
] as const;

export default function ProPaywallModal() {
  const { proPaywallOpen, closeProPaywall, mockUpgradeToPro, isAuthenticated, openSignIn } =
    useAccount();
  const t = useTranslations();

  return (
    <Dialog.Root open={proPaywallOpen} onOpenChange={(open) => !open && closeProPaywall()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),26rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] px-6 py-6 shadow-2xl outline-none"
        >
          <div className="mb-5 flex items-start justify-between gap-4 pr-1">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-[color:var(--foreground)]">
                <Sparkles size={18} className="shrink-0 text-[var(--accent,#3b82f6)]" aria-hidden />
                {t("proPaywall.title")}
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                {t("proPaywall.subtitle")}
              </Dialog.Description>
            </div>
            <Dialog.Close className="shrink-0 rounded p-1.5 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <X size={16} />
            </Dialog.Close>
          </div>

          <ul className="space-y-3 px-0.5">
            {PRO_FEATURES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm text-[color:var(--foreground)]">
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--accent,#3b82f6)]"
                  aria-hidden
                />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          <div
            className="mt-5 rounded-lg px-4 py-3 text-xs leading-relaxed text-[color:var(--muted-foreground)]"
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
          >
            <LayoutDashboard size={14} className="mb-1 inline text-[color:var(--foreground)]" />{" "}
            {t("proPaywall.note")}
          </div>

          {!isAuthenticated ? (
            <p className="mt-4 px-0.5 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
              {t("proPaywall.signInHint")}{" "}
              <button
                type="button"
                onClick={() => {
                  closeProPaywall();
                  openSignIn();
                }}
                className="underline text-[color:var(--primary)]"
              >
                {t("common.signInCreateAccount")}
              </button>
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={mockUpgradeToPro}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              {t("proPaywall.upgradeCta")}
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                style={borderAllTheme}
                className="w-full rounded-lg px-4 py-2.5 text-sm text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              >
                {t("common.notNow")}
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
