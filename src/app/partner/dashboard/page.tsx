"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import AuthPageShell from "../../../components/account/AuthPageShell";
import PartnerGate from "../../../components/partner/PartnerGate";
import PartnerProgramStatusBadge from "../../../components/partner/PartnerProgramStatusBadge";
import { useTranslations } from "../../../i18n/LocaleProvider";
import { getPartnerPrograms } from "../../../lib/partnerProgramStorage";
import type { PartnerProgramSubmission } from "../../../types/partnerProgram";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRevenue(cents: number, currency: string): string {
  const amount = cents / 100;
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PartnerDashboardPage() {
  const t = useTranslations();
  const [programs, setPrograms] = useState<PartnerProgramSubmission[]>([]);

  useEffect(() => {
    setPrograms(getPartnerPrograms());
  }, []);

  const totals = useMemo(() => {
    return programs.reduce(
      (acc, p) => {
        if (p.status === "live") acc.live += 1;
        if (p.status === "in_review") acc.review += 1;
        acc.enrollments += p.stats?.enrollments ?? 0;
        acc.revenueCents += p.stats?.revenueCents ?? 0;
        return acc;
      },
      { live: 0, review: 0, enrollments: 0, revenueCents: 0 }
    );
  }, [programs]);

  return (
    <PartnerGate>
      <AuthPageShell title={t("partner.dashboardTitle")} subtitle={t("partner.dashboardSubtitle")}>
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label={t("partner.statLive")} value={String(totals.live)} />
          <StatTile label={t("partner.statInReview")} value={String(totals.review)} />
          <StatTile label={t("partner.statEnrollments")} value={String(totals.enrollments)} />
          <StatTile
            label={t("partner.statRevenue")}
            value={formatRevenue(totals.revenueCents, "MXN")}
          />
        </div>

        <Link
          href="/partner/programs/new"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{
            background: "var(--primary-button-bg)",
            color: "var(--primary-button-text)",
            border: "2px solid var(--primary-button-border)",
          }}
        >
          <Plus size={16} aria-hidden />
          {t("partner.newProgram")}
        </Link>

        {programs.length === 0 ? (
          <p
            className="rounded-xl px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]"
            style={borderAllTheme}
          >
            {t("partner.dashboardEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {programs.map((program) => (
              <li key={program.id}>
                <Link
                  href={`/partner/programs/${program.id}`}
                  className="block rounded-xl p-4 transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                  style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--foreground)]">
                        {program.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                        {program.weeks} {t("partner.weeksLabel")} · {program.sessionsPerWeek}{" "}
                        {t("partner.sessionsPerWeekLabel")} · {program.currency} {program.price}
                      </p>
                    </div>
                    <PartnerProgramStatusBadge status={program.status} />
                  </div>
                  {program.stats && program.status === "live" ? (
                    <p className="mt-2 text-[10px] text-[color:var(--muted-foreground)]">
                      {program.stats.activeSubscribers} {t("partner.activeSubscribers")} ·{" "}
                      {program.stats.enrollments} {t("partner.totalEnrollments")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[10px] text-[color:var(--muted-foreground)]">
                    {t("partner.submittedOn")} {formatDate(program.submittedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-xs text-[color:var(--muted-foreground)]">
          <Link href="/account" className="underline">
            {t("account.title")}
          </Link>
        </p>
      </AuthPageShell>
    </PartnerGate>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <p className="text-base font-semibold tabular-nums text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-[color:var(--muted-foreground)]">{label}</p>
    </div>
  );
}
