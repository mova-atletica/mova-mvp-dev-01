"use client";

import { useMemo } from "react";
import { QUICK_ANALYSIS_MOVEMENTS } from "../../data/quickAnalysisMovements";
import { useAccount } from "../../contexts/MockAuthContext";
import { useAccountActivityFeed } from "../../lib/useAccountActivityFeed";
import { useTranslations } from "../../i18n/LocaleProvider";
import type { AccountActivityItem } from "../../types/accountActivity";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const TAG_TO_SPORT: Record<string, string> = {
  squat: "squat",
  plank: "plank",
  "pull-ups": "pullups",
  pullups: "pullups",
};

interface ActivityBestScore {
  sportSlug: string;
  sportTitle: string;
  metricLabel: string;
  formattedScore: string;
  occurredAt: string;
}

function bestScoresFromActivity(activity: AccountActivityItem[]): ActivityBestScore[] {
  const bestBySport = new Map<string, ActivityBestScore & { sortKey: number }>();

  for (const item of activity) {
    if (item.kind !== "mini-app" || !item.metricValue) continue;
    const tag = item.tags?.find((t) => TAG_TO_SPORT[t.toLowerCase()]);
    if (!tag) continue;
    const sportSlug = TAG_TO_SPORT[tag.toLowerCase()];
    const movement = QUICK_ANALYSIS_MOVEMENTS.find((m) => m.slug === sportSlug);
    if (!movement) continue;

    const numeric =
      item.metricLabel?.toLowerCase() === "reps"
        ? Number.parseInt(item.metricValue, 10) || 0
        : item.metricValue.includes(":")
          ? item.metricValue.split(":").reduce((acc, part) => acc * 60 + Number(part), 0)
          : Number.parseFloat(item.metricValue) || 0;

    const prev = bestBySport.get(sportSlug);
    if (prev && prev.sortKey >= numeric) continue;

    bestBySport.set(sportSlug, {
      sportSlug,
      sportTitle: movement.title,
      metricLabel: item.metricLabel ?? movement.primaryMetric,
      formattedScore: item.metricValue,
      occurredAt: item.occurredAt,
      sortKey: numeric,
    });
  }

  return [...bestBySport.values()]
    .sort((a, b) => b.sortKey - a.sortKey)
    .map(({ sortKey: _s, ...row }) => row);
}

export default function AccountLeaderboardStatus({ embedded = false }: { embedded?: boolean }) {
  const { getMyLeaderboardRanks } = useAccount();
  const { items: activity } = useAccountActivityFeed();
  const t = useTranslations();
  const ranks = getMyLeaderboardRanks();
  const activityBests = useMemo(() => bestScoresFromActivity(activity), [activity]);

  if (ranks.length > 0) {
    return (
      <ul className="space-y-2">
        {ranks.map((row) => (
          <li
            key={row.sportSlug}
            className="rounded-xl p-3"
            style={
              embedded
                ? { ...borderAllTheme, backgroundColor: "var(--background)" }
                : { ...borderAllTheme, backgroundColor: "var(--card-bg)" }
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-[color:var(--foreground)]">{row.sportTitle}</p>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {row.formattedScore}
                <span className="ml-1 text-xs font-normal text-[color:var(--muted-foreground)]">
                  {row.metricLabel}
                </span>
              </p>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-[color:var(--muted-foreground)]">
              <span>
                {t("account.globalRank")}:{" "}
                <span className="font-medium text-[color:var(--foreground)]">
                  {row.globalRank ? `#${row.globalRank}` : "—"}
                </span>
              </span>
              <span>
                {t("account.countryRank")}:{" "}
                <span className="font-medium text-[color:var(--foreground)]">
                  {row.countryRank ? `#${row.countryRank}` : "—"}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (activityBests.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-[color:var(--muted-foreground)]">
          {t("account.leaderboardsActivityOnly")}
        </p>
        <ul className="space-y-2">
          {activityBests.map((row) => (
            <li
              key={row.sportSlug}
              className="rounded-xl p-3"
              style={
                embedded
                  ? { ...borderAllTheme, backgroundColor: "var(--background)" }
                  : { ...borderAllTheme, backgroundColor: "var(--card-bg)" }
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[color:var(--foreground)]">{row.sportTitle}</p>
                <p className="text-sm font-semibold text-[color:var(--foreground)]">
                  {row.formattedScore}
                  <span className="ml-1 text-xs font-normal text-[color:var(--muted-foreground)]">
                    {row.metricLabel}
                  </span>
                </p>
              </div>
              <p className="mt-1.5 text-[11px] text-[color:var(--muted-foreground)]">
                {t("account.leaderboardsNotPosted")}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p
      className={`text-center text-sm text-[color:var(--muted-foreground)] ${embedded ? "py-4" : "rounded-xl px-4 py-8"}`}
      style={embedded ? undefined : borderAllTheme}
    >
      {t("account.leaderboardsEmpty")}
    </p>
  );
}
