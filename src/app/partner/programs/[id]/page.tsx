"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthPageShell from "../../../../components/account/AuthPageShell";
import PartnerGate from "../../../../components/partner/PartnerGate";
import PartnerProgramStatusBadge from "../../../../components/partner/PartnerProgramStatusBadge";
import { useTranslations } from "../../../../i18n/LocaleProvider";
import { getPartnerProgramById } from "../../../../lib/partnerProgramStorage";
import type { PartnerProgramSubmission } from "../../../../types/partnerProgram";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PartnerProgramDetailPage() {
  const params = useParams();
  const t = useTranslations();
  const id = typeof params.id === "string" ? params.id : "";
  const [program, setProgram] = useState<PartnerProgramSubmission | undefined>();

  useEffect(() => {
    setProgram(getPartnerProgramById(id));
  }, [id]);

  return (
    <PartnerGate>
      {!program ? (
        <AuthPageShell title={t("partner.detailTitle")} subtitle="">
          <p className="text-sm text-[color:var(--muted-foreground)]">{t("partner.programNotFound")}</p>
          <Link href="/partner/dashboard" className="mt-4 inline-block text-sm underline">
            {t("partner.backToDashboard")}
          </Link>
        </AuthPageShell>
      ) : (
        <AuthPageShell title={program.title} subtitle={t("partner.detailSubtitle")}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <PartnerProgramStatusBadge status={program.status} />
            <span className="text-xs text-[color:var(--muted-foreground)]">
              {t("partner.submittedOn")} {formatDate(program.submittedAt)}
            </span>
          </div>

          {program.stats ? (
            <div className="mb-4 grid grid-cols-3 gap-2">
              <Stat label={t("partner.statEnrollments")} value={String(program.stats.enrollments)} />
              <Stat
                label={t("partner.activeSubscribers")}
                value={String(program.stats.activeSubscribers)}
              />
              <Stat
                label={t("partner.statRevenue")}
                value={`${program.currency} ${(program.stats.revenueCents / 100).toLocaleString()}`}
              />
            </div>
          ) : null}

          <div
            className="space-y-3 rounded-xl p-4"
            style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
          >
            <DetailRow
              label={t("partner.fieldWeeks")}
              value={`${program.weeks} · ${program.sessionsPerWeek} ${t("partner.sessionsPerWeekLabel")}`}
            />
            <DetailRow label={t("partner.fieldPrice")} value={`${program.currency} ${program.price}`} />
            {program.archiveProgramSlug ? (
              <DetailRow
                label={t("partner.archiveLink")}
                value={
                  <Link href={`/programs/${program.archiveProgramSlug}`} className="underline">
                    /programs/{program.archiveProgramSlug}
                  </Link>
                }
              />
            ) : null}
            {program.notes ? (
              <DetailRow label={t("partner.fieldNotes")} value={program.notes} />
            ) : null}
            {program.adminNotes ? (
              <DetailRow label={t("partner.adminNotes")} value={program.adminNotes} />
            ) : null}
          </div>

          {program.status === "live" ? (
            <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">{t("partner.usageMockNote")}</p>
          ) : (
            <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">{t("partner.reviewMockNote")}</p>
          )}

          <p className="mt-6 text-center text-xs text-[color:var(--muted-foreground)]">
            <Link href="/partner/dashboard" className="underline">
              {t("partner.backToDashboard")}
            </Link>
          </p>
        </AuthPageShell>
      )}
    </PartnerGate>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-2 py-3 text-center"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <p className="text-sm font-semibold text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-[9px] text-[color:var(--muted-foreground)]">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-xs">
      <p className="text-[color:var(--muted-foreground)]">{label}</p>
      <div className="mt-0.5 font-medium text-[color:var(--foreground)]">{value}</div>
    </div>
  );
}
