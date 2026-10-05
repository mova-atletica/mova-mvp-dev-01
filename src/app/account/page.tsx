"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AccountActivityList from "../../components/account/AccountActivityList";
import AccountInsightsTab from "../../components/account/AccountInsightsTab";
import AccountMyPrograms from "../../components/account/AccountMyPrograms";
import AccountProAccessBlock from "../../components/account/AccountProAccessBlock";
import UserAvatar from "../../components/account/UserAvatar";
import MobileDesktopBrowseBanner from "../../components/MobileDesktopBrowseBanner";
import LibraryShell from "../../components/LibraryShell";
import ExportPanelSelect from "../../components/ExportPanelSelect";
import { getCountryFlag, getCountryName } from "../../data/countries";
import { useAccount } from "../../contexts/MockAuthContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import { LOCALE_OPTIONS } from "../../i18n/localeOptions";
import { ARCHIVE_CONTENT_LAYOUT_STYLE } from "../../lib/archiveLayout";
import { EMPTY_HOME_FILTERS } from "../../lib/homeFilters";
import { PHASE_B_ENABLED } from "../../lib/productPhase";
import type { AppLocale } from "../../types/account";
import { exportPanelFieldLabelClass } from "../motion-explore/AssetVideoPlayerExportPanel";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

type AccountTab = "profile" | "activity" | "insights";

export default function AccountPage() {
  const router = useRouter();
  const t = useTranslations();
  const { isAuthenticated, authLoading, profile, tier, signOut, openOnboarding, openSignIn, updateLocale } =
    useAccount();
  const [tab, setTab] = useState<AccountTab>("profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("tab");
    if (next === "profile" || next === "activity" || next === "insights") {
      setTab(next);
    }
  }, []);

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
                  signOut={signOut}
                  updateLocale={updateLocale}
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
  signOut,
  updateLocale,
  t,
}: {
  profile: NonNullable<ReturnType<typeof useAccount>["profile"]>;
  tier: ReturnType<typeof useAccount>["tier"];
  onCompleteSetup: () => void;
  onSignOut: () => void;
  signOut: () => Promise<void>;
  updateLocale: (locale: AppLocale) => Promise<void>;
  t: ReturnType<typeof useTranslations>;
}) {
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setDeleteError(payload.error ?? t("account.deleteAccountFailed"));
        return;
      }
      setDeleteConfirmOpen(false);
      await signOut();
      router.push("/");
    } catch {
      setDeleteError(t("account.deleteAccountFailed"));
    } finally {
      setDeleteLoading(false);
    }
  };

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
              <div className={exportPanelFieldLabelClass}>{t("account.locale")}</div>
              <ExportPanelSelect
                aria-label={t("account.locale")}
                value={profile.locale}
                options={LOCALE_OPTIONS}
                onSelect={(value) => {
                  void updateLocale(value as AppLocale);
                }}
              />
            </div>
          </div>

          <div className="mt-auto space-y-2 pt-6">
            {PHASE_B_ENABLED && tier === "partner" ? (
              <Link
                href="/partner/dashboard"
                style={borderAllTheme}
                className="block w-full rounded-lg px-4 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              >
                {t("account.partnerDashboard")}
              </Link>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
                style={borderAllTheme}
                className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-center text-sm text-red-500 hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              >
                {t("account.deleteAccount")}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                style={borderAllTheme}
                className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm font-medium text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_6%,transparent)]"
              >
                {t("common.signOut")}
              </button>
            </div>
          </div>
        </div>

        <AccountProAccessBlock />
      </div>

      {PHASE_B_ENABLED ? <AccountMyPrograms /> : null}

      <MobileDesktopBrowseBanner
        title={t("account.nowOnIosTitle")}
        body={t("account.nowOnIosBody")}
        cta={t("account.nowOnIosCta")}
        className="mt-2"
      />

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label={t("account.deleteAccountCancel")}
            onClick={() => {
              if (!deleteLoading) {
                setDeleteConfirmOpen(false);
                setDeleteError(null);
              }
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="account-delete-confirm-title"
              aria-describedby="account-delete-confirm-desc"
              style={borderAllTheme}
              className="pointer-events-auto w-[min(92vw,24rem)] rounded-xl bg-[var(--card-bg)] p-6 shadow-2xl outline-none"
            >
              <h2
                id="account-delete-confirm-title"
                className="text-sm font-medium text-[color:var(--foreground)]"
              >
                {t("account.deleteAccountConfirmTitle")}
              </h2>
              <p
                id="account-delete-confirm-desc"
                className="mt-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]"
              >
                {t("account.deleteAccountConfirmBody")}
              </p>
              {deleteError ? (
                <p className="mt-3 text-xs leading-relaxed text-red-500">{deleteError}</p>
              ) : null}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteError(null);
                  }}
                  style={borderAllTheme}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)] disabled:opacity-60"
                >
                  {t("account.deleteAccountCancel")}
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => {
                    void handleDeleteAccount();
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                >
                  {deleteLoading ? t("account.deleteAccountDeleting") : t("account.deleteAccountConfirmAction")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
