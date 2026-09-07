"use client";

import {
  aggregateActivityMix,
  computeActiveDayStreak,
  type ActivityMixSlice,
} from "../../lib/accountActivityInsights";
import type { AccountActivityItem, AccountActivityKind } from "../../types/accountActivity";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const MIX_COLORS: Record<AccountActivityKind, string> = {
  "mini-app": "#3b82f6",
  studio: "#a855f7",
  coach: "#f59e0b",
  program: "#22c55e",
};

export default function AccountEngagementStats({
  items,
  kindLabels,
  includeStudio = true,
  includeProgram = false,
}: {
  items: AccountActivityItem[];
  kindLabels: Record<AccountActivityKind, string>;
  includeStudio?: boolean;
  includeProgram?: boolean;
}) {
  const t = useTranslations();
  const activeStreak = computeActiveDayStreak(items);
  const totalSessions = items.length;
  const mixData = aggregateActivityMix(items).filter((slice) => {
    if (slice.kind === "studio" || slice.kind === "coach") return includeStudio;
    if (slice.kind === "program") return includeProgram;
    return true;
  });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <StatCard label={t("account.insightsActiveStreak")} value={String(activeStreak)} />
      <StatCard label={t("account.insightsTotalSessions")} value={String(totalSessions)} />
      <div
        className="col-span-2 rounded-xl px-3 py-3 sm:col-span-1"
        style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
      >
        <p className="text-center text-[10px] leading-snug text-[color:var(--muted-foreground)]">
          {t("account.insightsActivityMix")}
        </p>
        <ActivityMixBar data={mixData} labels={kindLabels} />
      </div>
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

function ActivityMixBar({
  data,
  labels,
}: {
  data: ActivityMixSlice[];
  labels: Record<AccountActivityKind, string>;
}) {
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <p className="mt-2 text-center text-xs text-[color:var(--muted-foreground)]">—</p>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
        aria-hidden
      >
        {data.map((slice) => (
          <span
            key={slice.kind}
            className="h-full"
            style={{
              width: `${(slice.count / total) * 100}%`,
              backgroundColor: MIX_COLORS[slice.kind],
            }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {data.map((slice) => (
          <li key={slice.kind} className="flex items-center gap-1.5 text-[10px] text-[color:var(--muted-foreground)]">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: MIX_COLORS[slice.kind] }}
              aria-hidden
            />
            <span>{labels[slice.kind]}</span>
            <span className="font-medium tabular-nums text-[color:var(--foreground)]">{slice.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
