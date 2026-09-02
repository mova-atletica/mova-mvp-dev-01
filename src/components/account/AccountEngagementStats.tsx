"use client";

import {
  computeActiveDayStreak,
  countRecentSessions,
} from "../../lib/accountActivityInsights";
import type { AccountActivityItem } from "../../types/accountActivity";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

export default function AccountEngagementStats({ items }: { items: AccountActivityItem[] }) {
  const t = useTranslations();
  const activeStreak = computeActiveDayStreak(items);
  const recentSessions = countRecentSessions(items);

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard label={t("account.insightsActiveStreak")} value={String(activeStreak)} />
      <StatCard label={t("account.insightsRecentSessions")} value={String(recentSessions)} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <p className="text-lg font-semibold tabular-nums text-[color:var(--foreground)]">{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-[color:var(--muted-foreground)]">{label}</p>
    </div>
  );
}
