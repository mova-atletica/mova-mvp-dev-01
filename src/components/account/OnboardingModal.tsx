"use client";

import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { useAccount } from "../../contexts/MockAuthContext";
import type { AppLocale } from "../../types/account";
import ExportPanelSelect from "../ExportPanelSelect";
import { exportPanelFieldLabelClass } from "../../app/motion-explore/AssetVideoPlayerExportPanel";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (BR)" },
];

/** Relative to dialog content stacking context (portaled into the dialog). */
const dialogSelectContentClass =
  "!z-[60] max-h-56 overflow-y-auto overscroll-contain";
const dialogSelectContentStyle = { zIndex: 60 } as const;

export default function OnboardingModal() {
  const { onboardingOpen, closeOnboarding, completeOnboarding, profile } = useAccount();
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [locale, setLocale] = useState<AppLocale>("en");
  const [dialogEl, setDialogEl] = useState<HTMLDivElement | null>(null);

  const countryOptions = useMemo(
    () =>
      COUNTRY_OPTIONS.map((c) => ({
        value: c.code,
        label: `${c.flag} ${c.name}`,
      })),
    []
  );

  useEffect(() => {
    if (onboardingOpen) {
      setDisplayName(profile?.displayName ?? "");
      setCountryCode(profile?.countryCode ?? "US");
      setLocale(profile?.locale ?? "en");
    } else {
      setDialogEl(null);
    }
  }, [onboardingOpen, profile]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = displayName.trim();
    if (!name || !countryCode) return;
    void completeOnboarding({ displayName: name, countryCode, locale });
  };

  return (
    <Dialog.Root open={onboardingOpen} onOpenChange={(open) => !open && closeOnboarding()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[400] bg-black/65" />
        <Dialog.Content
          ref={setDialogEl}
          style={borderAllTheme}
          className="fixed left-1/2 top-1/2 z-[410] w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-xl bg-[var(--card-bg)] p-5 shadow-2xl outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-[color:var(--foreground)]">
                Complete your profile
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                Choose how you appear on leaderboards. Required to post scores.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]">
              <X size={16} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className={exportPanelFieldLabelClass}>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear on leaderboards"
                maxLength={32}
                required
                className="w-full rounded-lg border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-2 text-xs font-light text-[color:var(--foreground)] outline-none transition-colors placeholder:text-[color:var(--muted-foreground)] hover:border-border-theme hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
              />
            </label>

            <div className="relative z-10 block min-w-0">
              <div className={exportPanelFieldLabelClass}>Country</div>
              <ExportPanelSelect
                modal
                aria-label="Country"
                value={countryCode}
                options={countryOptions}
                onSelect={setCountryCode}
                portalContainer={dialogEl}
                contentClassName={dialogSelectContentClass}
                contentStyle={dialogSelectContentStyle}
              />
            </div>

            <div className="relative z-10 block min-w-0">
              <div className={exportPanelFieldLabelClass}>Language</div>
              <ExportPanelSelect
                modal
                aria-label="Language"
                value={locale}
                options={LOCALE_OPTIONS}
                onSelect={(v) => setLocale(v as AppLocale)}
                portalContainer={dialogEl}
                contentClassName={dialogSelectContentClass}
                contentStyle={dialogSelectContentStyle}
              />
            </div>

            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--primary-button-bg)",
                color: "var(--primary-button-text)",
                border: "2px solid var(--primary-button-border)",
              }}
            >
              Continue
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
