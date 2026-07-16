"use client";

import Link from "next/link";
import { useState } from "react";
import AuthPageShell from "../../../../components/account/AuthPageShell";
import PartnerGate from "../../../../components/partner/PartnerGate";
import PartnerProgramForm from "../../../../components/partner/PartnerProgramForm";
import { useTranslations } from "../../../../i18n/LocaleProvider";
import { submitPartnerProgram } from "../../../../lib/partnerProgramStorage";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

export default function PartnerNewProgramPage() {
  const t = useTranslations();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <PartnerGate>
        <AuthPageShell title={t("partner.newProgramTitle")} subtitle={t("partner.newProgramSubtitle")}>
        <div
          className="rounded-xl p-6 text-center"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <p className="text-sm text-[color:var(--foreground)]">{t("partner.programSubmitted")}</p>
          <Link
            href="/partner/dashboard"
            className="mt-4 inline-block text-sm underline text-[color:var(--primary)]"
          >
            {t("partner.dashboardTitle")}
          </Link>
        </div>
        </AuthPageShell>
      </PartnerGate>
    );
  }

  return (
    <PartnerGate>
      <AuthPageShell title={t("partner.newProgramTitle")} subtitle={t("partner.newProgramSubtitle")}>
      <div
        className="rounded-xl p-4"
        style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
      >
        <PartnerProgramForm
          onSubmit={(input) => {
            submitPartnerProgram(input);
            setSubmitted(true);
          }}
        />
      </div>

      <p className="mt-4 text-center text-xs text-[color:var(--muted-foreground)]">
        <Link href="/partner/dashboard" className="underline">
          {t("partner.backToDashboard")}
        </Link>
      </p>
    </AuthPageShell>
    </PartnerGate>
  );
}
