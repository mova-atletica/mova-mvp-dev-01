"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getProgramBySlug } from "../../data/programs";
import { getEntitlementStatus, useEntitlements } from "../../contexts/MockEntitlementsContext";
import { useTranslations } from "../../i18n/LocaleProvider";
import {
  daysUntilExpiry,
  formatExpiryDate,
} from "../../lib/entitlementAccess";
import { loadProgramProgressSummary } from "../../lib/programProgressSummary";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const STATUS_STYLES = {
  active: { color: "#22c55e", labelKey: "account.entitlementActive" as const },
  expiring: { color: "#f59e0b", labelKey: "account.entitlementExpiring" as const },
  expired: { color: "var(--muted-foreground)", labelKey: "account.entitlementExpired" as const },
};

export default function AccountMyPrograms() {
  const { entitlements } = useEntitlements();
  const t = useTranslations();

  const rows = useMemo(
    () =>
      entitlements.map((ent) => {
        const program = getProgramBySlug(ent.programSlug);
        const status = getEntitlementStatus(ent);
        const progress = loadProgramProgressSummary(ent.programSlug, program);
        return { ent, program, status, progress };
      }),
    [entitlements]
  );

  if (rows.length === 0) {
    return (
      <section
        className="rounded-xl p-4"
        style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {t("account.myPrograms")}
        </h2>
        <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{t("account.myProgramsEmpty")}</p>
        <Link href="/" className="mt-3 inline-block text-sm underline text-[color:var(--primary)]">
          {t("account.browsePrograms")}
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
        {t("account.myPrograms")}
      </h2>
      {rows.map(({ ent, program, status, progress }) => {
        const style = STATUS_STYLES[status];
        const daysLeft = daysUntilExpiry(ent);

        return (
          <div
            key={ent.id}
            className="rounded-xl p-4"
            style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[color:var(--foreground)]">
                  {program?.title ?? ent.programTitle}
                </p>
                {program ? (
                  <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
                    {program.durationWeeks} weeks · {program.sessionsPerWeek} sessions/week
                  </p>
                ) : null}
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{ ...borderAllTheme, color: style.color }}
              >
                {t(style.labelKey)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-[color:var(--muted-foreground)]">
              {status === "expired" ? (
                <span>
                  {t("account.accessEnded")} {formatExpiryDate(ent.expiresAt)}
                </span>
              ) : (
                <span>
                  {t("account.accessUntil")} {formatExpiryDate(ent.expiresAt)} ·{" "}
                  {daysLeft} {t("account.daysLeft")}
                </span>
              )}
              {progress.totalExercises > 0 ? (
                <span>
                  {t("account.programProgress")}: {progress.completedExercises}/{progress.totalExercises}{" "}
                  · {t("account.week")} {progress.unlockedWeek}/{program?.durationWeeks ?? "—"}
                </span>
              ) : null}
            </div>

            <Link
              href={`/programs/${ent.programSlug}`}
              className="mt-3 inline-flex rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                ...borderAllTheme,
                backgroundColor: status === "expired" ? "transparent" : "var(--primary-button-bg)",
                color: status === "expired" ? "var(--foreground)" : "var(--primary-button-text)",
              }}
            >
              {status === "expired" ? t("account.repurchase") : t("account.continueProgram")}
            </Link>
          </div>
        );
      })}
    </section>
  );
}
