"use client";

import { useEffect, useMemo, useState } from "react";
import {
  aggregateJointRom,
  aggregateMovementTags,
  aggregateSportTrends,
  availableSportTrendKeys,
  formatSportPrimaryMetric,
  preferredSportTrendKey,
  sportPrimaryMetricKind,
  sportTrendGranularity,
  sportTrendShowsLast12MonthsNote,
  type AccountSportTrendKey,
  type ChartTimeRange,
} from "../../lib/accountActivityInsights";
import { useAccountActivityFeed } from "../../lib/useAccountActivityFeed";
import { useTranslations } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n";
import ChartTimeRangeToggle from "./ChartTimeRangeToggle";
import { JointRomChart, MovementFocusChart, SportTrendChart } from "./AccountMovementCharts";

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

  const jointRomData = useMemo(() => aggregateJointRom(activity), [activity]);
  const movementData = useMemo(() => aggregateMovementTags(activity), [activity]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
        <InsightsSection title={t("account.insightsJointRom")}>
          <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
            {t("account.insightsSummaryScope")}
          </p>
          <JointRomChart
            data={jointRomData}
            xAxisLabel={t("account.chartAxisJoint")}
            yAxisLabel={t("account.chartAxisRom")}
          />
        </InsightsSection>

        <InsightsSection title={t("account.insightsMovementFocus")}>
          <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
            {t("account.insightsSummaryScope")}
          </p>
          <MovementFocusChart data={movementData} xAxisLabel={t("account.chartAxisSessions")} />
        </InsightsSection>
      </div>

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

  const activePoint = scrubIndex != null ? trendData[scrubIndex] : null;
  const metricKind = sportKey ? sportPrimaryMetricKind(sportKey) : "reps";
  const granularity = sportTrendGranularity(range);

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
        <SportTrendChart
          data={trendData}
          xAxisLabel={
            granularity === "day"
              ? t("account.chartAxisDay")
              : granularity === "week"
                ? t("account.chartAxisWeek")
                : t("account.chartAxisMonth")
          }
          yAxisLabel={t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}
          activeIndex={scrubIndex}
          onActiveIndexChange={setScrubIndex}
        />
      ) : null}

      <div
        className="mt-3 rounded-lg px-3 py-2 text-xs"
        style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
      >
        {activePoint ? (
          <div className="space-y-1 text-[color:var(--foreground)]">
            <p className="font-medium">{activePoint.detailPeriodLabel}</p>
            <p>
              {t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}:{" "}
              <span className="font-medium">
                {formatSportPrimaryMetric(activePoint.primaryValue, metricKind)}
              </span>
            </p>
            {activePoint.romDegrees != null ? (
              <p>
                {t("account.sportTrendRom")}:{" "}
                <span className="font-medium">{activePoint.romDegrees}°</span>
              </p>
            ) : null}
            {activePoint.symmetryScore != null ? (
              <p>
                {t("account.sportTrendSymmetry")}:{" "}
                <span className="font-medium">{activePoint.symmetryScore}/100</span>
              </p>
            ) : null}
            <p className="text-[color:var(--muted-foreground)]">
              {t("account.sportTrendSessions")}: {activePoint.sessions}
            </p>
          </div>
        ) : (
          <p className="text-[color:var(--muted-foreground)]">{t("account.chartScrubHint")}</p>
        )}
      </div>
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
