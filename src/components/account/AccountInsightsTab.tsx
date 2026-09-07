"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activeJointsInRomTrends,
  aggregateMovementTags,
  aggregateSportJointRomTrends,
  aggregateSportTrends,
  availableSportTrendKeys,
  formatSportPrimaryMetric,
  jointRomLabel,
  preferredSportTrendKey,
  sportPrimaryMetricKind,
  sportTrendGranularity,
  sportTrendShowsLast12MonthsNote,
  type AccountSportTrendKey,
  type ChartTimeRange,
} from "../../lib/accountActivityInsights";
import type { MovementJoint } from "../../types/accountActivity";
import { useAccountActivityFeed } from "../../lib/useAccountActivityFeed";
import { useTranslations } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n";
import ChartTimeRangeToggle from "./ChartTimeRangeToggle";
import {
  MovementFocusChart,
  SportJointRomTrendChart,
  SportTrendChart,
} from "./AccountMovementCharts";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const SPORT_TAB_LABEL_KEYS: Record<AccountSportTrendKey, MessageKey> = {
  studio: "account.sportTrendStudio",
  pullups: "account.sportTrendPullups",
  pushups: "account.sportTrendPushups",
  squat: "account.sportTrendSquats",
  plank: "account.sportTrendPlank",
};

const PRIMARY_METRIC_LABEL_KEYS = {
  reps: "account.sportTrendReps",
  hold: "account.sportTrendHold",
  duration: "account.sportTrendDuration",
} as const;

export default function AccountInsightsTab() {
  const t = useTranslations();
  const { items: activity } = useAccountActivityFeed();

  const movementData = useMemo(() => aggregateMovementTags(activity), [activity]);

  return (
    <div className="space-y-4">
      <InsightsSection title={t("account.insightsMovementFocus")}>
        <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
          {t("account.insightsSummaryScope")}
        </p>
        <MovementFocusChart data={movementData} xAxisLabel={t("account.chartAxisSessions")} />
      </InsightsSection>

      <AccountSportAnalysisSection items={activity} />
    </div>
  );
}

function AccountSportAnalysisSection({
  items,
}: {
  items: ReturnType<typeof useAccountActivityFeed>["items"];
}) {
  const t = useTranslations();
  const [range, setRange] = useState<ChartTimeRange>("month");
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);

  const availableSports = useMemo(() => availableSportTrendKeys(items), [items]);
  const defaultSport = useMemo(() => preferredSportTrendKey(items), [items]);
  const [sportKey, setSportKey] = useState<AccountSportTrendKey | null>(defaultSport);

  useEffect(() => {
    if (!defaultSport) {
      setSportKey(null);
      return;
    }
    if (!sportKey || !availableSports.includes(sportKey)) {
      setSportKey(defaultSport);
    }
  }, [availableSports, defaultSport, sportKey]);

  useEffect(() => {
    setScrubIndex(null);
  }, [range, sportKey]);

  const trendData = useMemo(
    () => (sportKey ? aggregateSportTrends(items, sportKey, range) : []),
    [items, range, sportKey]
  );
  const romTrendData = useMemo(
    () => (sportKey ? aggregateSportJointRomTrends(items, sportKey, range) : []),
    [items, range, sportKey]
  );
  const romJoints = useMemo(() => activeJointsInRomTrends(romTrendData), [romTrendData]);
  const jointLabels = useMemo(() => {
    const labels: Partial<Record<MovementJoint, string>> = {};
    for (const joint of romJoints) {
      labels[joint] = jointRomLabel(joint);
    }
    return labels;
  }, [romJoints]);

  const activePrimary = scrubIndex != null ? trendData[scrubIndex] : null;
  const romActiveIndex = useMemo(() => {
    if (scrubIndex == null || !activePrimary) return null;
    const idx = romTrendData.findIndex((point) => point.periodKey === activePrimary.periodKey);
    return idx >= 0 ? idx : null;
  }, [activePrimary, romTrendData, scrubIndex]);
  const activeRom = romActiveIndex != null ? romTrendData[romActiveIndex] : null;
  const metricKind = sportKey ? sportPrimaryMetricKind(sportKey) : "reps";
  const granularity = sportTrendGranularity(range);
  const xAxisLabel =
    granularity === "day"
      ? t("account.chartAxisDay")
      : granularity === "week"
        ? t("account.chartAxisWeek")
        : t("account.chartAxisMonth");

  if (availableSports.length === 0) {
    return null;
  }

  return (
    <InsightsSection
      title={t("account.insightsSportTrends")}
      headerAside={
        <div className="flex flex-wrap gap-2">
          {availableSports.map((key) => {
            const active = sportKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSportKey(key)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  ...borderAllTheme,
                  backgroundColor: active ? "var(--primary-button-bg)" : "transparent",
                  color: active ? "var(--primary-button-text)" : "var(--foreground)",
                }}
              >
                {t(SPORT_TAB_LABEL_KEYS[key])}
              </button>
            );
          })}
        </div>
      }
    >
      <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
        {t("account.insightsSportTrendsHint")}
      </p>

      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        {sportTrendShowsLast12MonthsNote(range) ? (
          <span className="text-[10px] text-[color:var(--muted-foreground)]">
            {t("account.insightsSportTrendsLast12Months")}
          </span>
        ) : null}
        <ChartTimeRangeToggle value={range} onChange={setRange} />
      </div>

      {sportKey ? (
        <>
          <SportTrendChart
            data={trendData}
            xAxisLabel={xAxisLabel}
            yAxisLabel={t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}
            activeIndex={scrubIndex}
            onActiveIndexChange={setScrubIndex}
          />

          <div
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
          >
            {activePrimary ? (
              <div className="space-y-1 text-[#22c55e]">
                <p className="font-medium">{activePrimary.detailPeriodLabel}</p>
                <p>
                  {t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}:{" "}
                  <span className="font-medium">
                    {formatSportPrimaryMetric(activePrimary.primaryValue, metricKind)}
                  </span>
                </p>
                {activePrimary.symmetryScore != null ? (
                  <p>
                    {t("account.sportTrendSymmetry")}:{" "}
                    <span className="font-medium">{activePrimary.symmetryScore}/100</span>
                  </p>
                ) : null}
                <p>
                  {t("account.sportTrendSessions")}: {activePrimary.sessions}
                </p>
              </div>
            ) : (
              <p className="text-[color:var(--muted-foreground)]">{t("account.chartScrubHint")}</p>
            )}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {t("account.sportTrendRomOverTime")}
            </h3>
            <SportJointRomTrendChart
              data={romTrendData}
              joints={romJoints}
              jointLabels={jointLabels}
              xAxisLabel={xAxisLabel}
              yAxisLabel={t("account.chartAxisRom")}
              emptyLabel={t("account.sportTrendRomEmpty")}
              activeIndex={romActiveIndex}
              onActiveIndexChange={(index) => {
                if (index == null) {
                  setScrubIndex(null);
                  return;
                }
                const romPoint = romTrendData[index];
                if (!romPoint) {
                  setScrubIndex(null);
                  return;
                }
                const primaryIndex = trendData.findIndex(
                  (point) => point.periodKey === romPoint.periodKey
                );
                setScrubIndex(primaryIndex >= 0 ? primaryIndex : null);
              }}
            />

            <div
              className="mt-3 rounded-lg px-3 py-2 text-xs"
              style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            >
              {activeRom && romJoints.some((joint) => activeRom.joints[joint] != null) ? (
                <p className="text-[#22c55e]">
                  {romJoints
                    .filter((joint) => activeRom.joints[joint] != null)
                    .map((joint) => `${jointRomLabel(joint)} ${activeRom.joints[joint]}°`)
                    .join(" · ")}
                </p>
              ) : (
                <p className="text-[color:var(--muted-foreground)]">{t("account.chartScrubHint")}</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </InsightsSection>
  );
}

function InsightsSection({
  title,
  headerAside,
  action,
  children,
}: {
  title: string;
  headerAside?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex h-full min-w-0 flex-col rounded-xl p-4"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {title}
          </h2>
          {headerAside}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
