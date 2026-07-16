"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountActivityList from "../../components/account/AccountActivityList";
import AccountInsightsTab from "../../components/account/AccountInsightsTab";
import AccountMyPrograms from "../../components/account/AccountMyPrograms";
import AccountProAccessBlock from "../../components/account/AccountProAccessBlock";
import UserAvatar from "../../components/account/UserAvatar";
import LibraryShell from "../../components/LibraryShell";
import { getCountryFlag, getCountryName } from "../../data/countries";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../../lib/archiveLayout";
import { EMPTY_HOME_FILTERS } from "../../lib/homeFilters";
import { PHASE_B_ENABLED } from "../../lib/productPhase";
import type { AppLocale } from "../../types/account";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

type AccountTab = "profile" | "activity" | "insights";

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  "pt-BR": "Português (BR)",
};

export default function AccountPage() {
  const router = useRouter();
  const t = useTranslations();
  const { isAuthenticated, authLoading, profile, tier, signOut, openOnboarding, openSignIn } =
    useAccount();
  const [tab, setTab] = useState<AccountTab>("profile");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      openSignIn();
      router.replace("/");
    }
  }, [isAuthenticated, authLoading, router, openSignIn]);

  if (authLoading || !isAuthenticated || !profile) {
    return (
      <LibraryShell
        filters={EMPTY_HOME_FILTERS}
        onFiltersChange={() => undefined}
        muscleGroupOptions={[]}
        equipmentOptions={[]}
        showFilters={false}
      >
        <main className="homepage-canvas relative min-h-full">
          <div className="homepage-canvas-content relative z-10">
            <div className="mx-auto max-w-6xl pb-16 pt-6" style={ARCHIVE_CONTENT_LAYOUT_STYLE}>
              <p className="text-sm text-[color:var(--muted-foreground)]">Loading account…</p>
            </div>
          </div>
        </main>
      </LibraryShell>
    );
  }

  const tabs: { id: AccountTab; label: string }[] = [
    { id: "profile", label: t("account.tabs.profile") },
    { id: "activity", label: t("account.tabs.activity") },
    { id: "insights", label: t("account.tabs.insights") },
  ];

  return (
    <LibraryShell
      filters={EMPTY_HOME_FILTERS}
      onFiltersChange={() => {}}
      muscleGroupOptions={[]}
      equipmentOptions={[]}
      showFilters={false}
    >
      <main className="homepage-canvas">
        <div className="homepage-canvas-backdrop" aria-hidden>
          <div className="homepage-canvas-gradient" />
          <div className="homepage-canvas-noise" />
          <div className="homepage-canvas-dots" />
        </div>

        <div className="homepage-canvas-content relative z-10">
          <div className="mx-auto max-w-6xl pb-16 pt-6" style={ARCHIVE_CONTENT_LAYOUT_STYLE}>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)]">{t("account.title")}</h1>
            <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{t("account.subtitle")}</p>

            <div
              className="mt-6 flex gap-1 rounded-lg p-1"
              style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            >
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className="flex-1 rounded-md px-2 py-2 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: tab === id ? "var(--card-bg)" : "transparent",
                    color: tab === id ? "var(--foreground)" : "var(--muted-foreground)",
                    border: tab === id ? "1px solid var(--border-secondary)" : "1px solid transparent",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-6">
              {tab === "profile" ? (
                <ProfileTab
                  profile={profile}
                  tier={tier}
                  onCompleteSetup={openOnboarding}
                    onSignOut={() => {
                      void signOut().then(() => router.push("/"));
                    }}
                  t={t}
                />
              ) : null}
              {tab === "activity" ? <AccountActivityList /> : null}
              {tab === "insights" ? <AccountInsightsTab /> : null}
            </div>
          </div>
        </div>
      </main>
    </LibraryShell>
  );
}

function ProfileTab({
  profile,
  tier,
  onCompleteSetup,
  onSignOut,
  t,
}: {
  profile: NonNullable<ReturnType<typeof useAccount>["profile"]>;
  tier: ReturnType<typeof useAccount>["tier"];
  onCompleteSetup: () => void;
  onSignOut: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-4">
      {!profile.onboardingComplete ? (
        <button
          type="button"
          onClick={onCompleteSetup}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium md:w-auto"
          style={{
            background: "var(--primary-button-bg)",
            color: "var(--primary-button-text)",
            border: "2px solid var(--primary-button-border)",
          }}
        >
          {t("account.completeSetup")}
        </button>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <div
          className="flex flex-col rounded-xl p-4"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <div className="flex items-center gap-3">
            <UserAvatar displayName={profile.displayName} size={56} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[color:var(--foreground)]">
                {profile.displayName || (
                  <span className="text-[color:var(--muted-foreground)]">Not set</span>
                )}
              </p>
              <p className="truncate text-xs text-[color:var(--muted-foreground)]">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
                {t("account.country")}
              </p>
              <p className="text-sm text-[color:var(--foreground)]">
                {profile.countryCode ? (
                  <>
                    {getCountryFlag(profile.countryCode)} {getCountryName(profile.countryCode)}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[color:var(--muted-foreground)]">
                {t("account.locale")}
              </p>
              <p className="text-sm text-[color:var(--foreground)]">
                {LOCALE_LABELS[profile.locale]}
              </p>
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-6">
            <button
              type="button"
              disabled
              style={borderAllTheme}
              className="w-full cursor-not-allowed rounded-lg px-4 py-2.5 text-left text-sm text-[color:var(--muted-foreground)] opacity-70"
            >
              {t("account.deleteAccount")} ({t("common.comingSoon")})
            </button>
            {PHASE_B_ENABLED && tier === "partner" ? (
              <Link
                href="/partner/dashboard"
                style={borderAllTheme}
                className="block w-full rounded-lg px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              >
                {t("account.partnerDashboard")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onSignOut}
              style={borderAllTheme}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
            >
              {t("common.signOut")}
            </button>
          </div>
        </div>

        <AccountProAccessBlock />
      </div>

      {PHASE_B_ENABLED ? <AccountMyPrograms /> : null}
    </div>
  );
}
