"use client";

import { useMemo, useState } from "react";
import { LayoutDashboard, Smartphone, Trophy } from "lucide-react";
import { MOCK_ACCOUNT_ACTIVITY } from "../../data/mockAccountActivity";
import type { AccountActivityKind, AccountActivityItem } from "../../types/accountActivity";
import {
  aggregateActivityByTimeRange,
  aggregateActivityMix,
  type ChartTimeRange,
  xAxisLabelForRange,
} from "../../lib/accountActivityInsights";
import { useTranslations } from "../../i18n/LocaleProvider";
import { PHASE_B_ENABLED } from "../../lib/productPhase";
import AccountLeaderboardStatus from "./AccountLeaderboardStatus";
import ChartTimeRangeToggle from "./ChartTimeRangeToggle";
import {
  ActivityMixDonut,
  ChartLegend,
  KIND_COLORS,
  WeeklyVolumeChart,
} from "./AccountMovementCharts";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

type ActivityFilter = "all" | AccountActivityKind;

const KIND_ICONS: Record<AccountActivityKind, typeof LayoutDashboard> = {
  studio: LayoutDashboard,
  "mini-app": Smartphone,
  program: Trophy,
};

const KIND_LABELS: Record<AccountActivityKind, string> = {
  studio: "Studio",
  "mini-app": "Mini app",
  program: "Program",
};

const PHASE_A_ACTIVITY = MOCK_ACCOUNT_ACTIVITY.filter((item) => item.kind !== "program");
const SOURCE_ACTIVITY = PHASE_B_ENABLED ? MOCK_ACCOUNT_ACTIVITY : PHASE_A_ACTIVITY;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AccountActivityList() {
  const t = useTranslations();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [volumeRange, setVolumeRange] = useState<ChartTimeRange>("month");

  const items = useMemo(() => {
    if (filter === "all") return SOURCE_ACTIVITY;
    return SOURCE_ACTIVITY.filter((item) => item.kind === filter);
  }, [filter]);

  const kindLabels = useMemo(
    (): Record<AccountActivityKind, string> => ({
      studio: t("account.activityFilterStudio"),
      "mini-app": t("account.activityFilterMiniApp"),
      program: t("account.activityFilterProgram"),
    }),
    [t]
  );

  const weeklyData = useMemo(
    () => aggregateActivityByTimeRange(SOURCE_ACTIVITY, volumeRange),
    [volumeRange]
  );
  const mixData = useMemo(() => aggregateActivityMix(SOURCE_ACTIVITY), []);
  const volumeXLabel =
    xAxisLabelForRange(volumeRange) === "Day"
      ? t("account.chartAxisDay")
      : t("account.chartAxisWeek");

  const filters: { id: ActivityFilter; label: string }[] = [
    { id: "all", label: t("account.activityFilterAll") },
    { id: "studio", label: t("account.activityFilterStudio") },
    { id: "mini-app", label: t("account.activityFilterMiniApp") },
    ...(PHASE_B_ENABLED
      ? [{ id: "program" as const, label: t("account.activityFilterProgram") }]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          {filters.map(({ id, label }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  ...borderAllTheme,
                  backgroundColor: active ? "var(--primary-button-bg)" : "transparent",
                  color: active ? "var(--primary-button-text)" : "var(--foreground)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p
            className="rounded-xl px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]"
            style={borderAllTheme}
          >
            {t("account.activityEmpty")}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
        <section
          className="rounded-xl p-4"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {t("account.insightsActivityMix")}
          </h2>
          <ActivityMixDonut data={mixData} labels={kindLabels} />
        </section>

        <section
          className="rounded-xl p-4"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {t("account.insightsWeeklyVolume")}
            </h2>
            <ChartTimeRangeToggle value={volumeRange} onChange={setVolumeRange} />
          </div>
          <WeeklyVolumeChart
            data={weeklyData}
            labels={kindLabels}
            includeProgram={PHASE_B_ENABLED}
            xAxisLabel={volumeXLabel}
            yAxisLabel={t("account.chartAxisSessions")}
          />
          <ChartLegend
            items={[
              { color: KIND_COLORS["mini-app"], label: kindLabels["mini-app"] },
              { color: KIND_COLORS.studio, label: kindLabels.studio },
              ...(PHASE_B_ENABLED
                ? [{ color: KIND_COLORS.program, label: kindLabels.program }]
                : []),
            ]}
          />
        </section>

        <section
          className="rounded-xl p-4"
          style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
        >
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {t("account.insightsLeaderboards")}
          </h2>
          <AccountLeaderboardStatus embedded />
        </section>
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: AccountActivityItem }) {
  const Icon = KIND_ICONS[item.kind];

  return (
    <li
      className="flex gap-3 rounded-xl p-3"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--background)", ...borderAllTheme }}
        aria-hidden
      >
        <Icon size={16} className="text-[color:var(--foreground)]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[color:var(--foreground)]">{item.title}</p>
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]"
            style={borderAllTheme}
          >
            {KIND_LABELS[item.kind]}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{item.subtitle}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[color:var(--muted-foreground)]">
          <span>{formatDate(item.occurredAt)}</span>
          {item.metricLabel && item.metricValue ? (
            <span>
              · {item.metricLabel}:{" "}
              <span className="font-medium text-[color:var(--foreground)]">{item.metricValue}</span>
            </span>
          ) : null}
        </div>
      </div>
    </li>
  );
}
