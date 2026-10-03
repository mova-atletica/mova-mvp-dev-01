"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  activeJointsInRomTrends,
  aggregateSportJointRomTrends,
  aggregateSportTrends,
  availableSportTrendKeys,
  availableSportTrendKeysForRange,
  formatSportPrimaryMetric,
  jointRomLabel,
  preferredSportTrendKeyForRange,
  sportPrimaryMetricKind,
  sportTrendGranularity,
  sportTrendShowsLast12MonthsNote,
  summarizeSportRange,
  type AccountSportTrendKey,
  type ChartTimeRange,
} from "../../lib/accountActivityInsights";
import type { MovementJoint } from "../../types/accountActivity";
import { useAccountActivityFeed } from "../../lib/useAccountActivityFeed";
import { useTranslations } from "../../i18n/LocaleProvider";
import type { MessageKey } from "../../i18n";
import ChartTimeRangeToggle from "./ChartTimeRangeToggle";
import SportSummaryCard from "./SportSummaryCard";
import { SportJointRomTrendChart, SportTrendChart } from "./AccountMovementCharts";

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
  duration: "account.sportTrendMinutes",
} as const;

export default function AccountInsightsTab() {
  const t = useTranslations();
  const { items: activity, loading } = useAccountActivityFeed();

  if (loading) {
    return <InsightsLoadingState label={t("account.insightsLoading")} />;
  }

  return (
    <div className="w-full">
      <AccountSportAnalysisSection items={activity} />
    </div>
  );
}

function InsightsLoadingState({ label }: { label: string }) {
  return (
    <section
      className="flex min-h-[280px] w-full flex-col rounded-xl p-4"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="mb-4 h-3 w-28 animate-pulse rounded bg-[color:var(--border-secondary)]" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-full"
            style={{ backgroundColor: "var(--border-secondary)" }}
          />
        ))}
      </div>
      <div
        className="mb-5 grid flex-1 grid-cols-1 gap-3 rounded-xl p-4 sm:grid-cols-2"
        style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
      >
        <div className="h-28 animate-pulse rounded-lg" style={{ backgroundColor: "var(--card-bg)" }} />
        <div className="h-28 animate-pulse rounded-lg" style={{ backgroundColor: "var(--card-bg)" }} />
        <div
          className="h-20 animate-pulse rounded-lg sm:col-span-2"
          style={{ backgroundColor: "var(--card-bg)" }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg" style={{ backgroundColor: "var(--background)" }} />
        <div className="h-40 animate-pulse rounded-lg" style={{ backgroundColor: "var(--background)" }} />
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[color:var(--muted-foreground)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    </section>
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

  const sportsEver = useMemo(() => availableSportTrendKeys(items), [items]);
  const availableSports = useMemo(
    () => availableSportTrendKeysForRange(items, range),
    [items, range]
  );
  const defaultSport = useMemo(
    () => preferredSportTrendKeyForRange(items, range),
    [items, range]
  );
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

  const summary = useMemo(
    () => (sportKey ? summarizeSportRange(items, sportKey, range) : null),
    [items, range, sportKey]
  );
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

  if (sportsEver.length === 0) {
    return (
      <InsightsSection title={t("account.insightsSportTrends")}>
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {t("account.sportSummaryEmptyRange")}
        </p>
      </InsightsSection>
    );
  }

  return (
    <InsightsSection title={t("account.insightsSportTrends")}>
      <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
        {t("account.insightsSportTrendsHint")}
      </p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {availableSports.length > 0 ? (
          <div className="flex min-w-0 flex-wrap gap-2">
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
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 sm:justify-end">
          {sportTrendShowsLast12MonthsNote(range) ? (
            <span className="text-[10px] text-[color:var(--muted-foreground)]">
              {t("account.insightsSportTrendsLast12Months")}
            </span>
          ) : null}
          <ChartTimeRangeToggle value={range} onChange={setRange} />
        </div>
      </div>

      {availableSports.length === 0 ? (
        <p className="text-sm text-[color:var(--muted-foreground)]">
          {t("account.sportSummaryEmptyRange")}
        </p>
      ) : (
        <>
          {sportKey && summary ? (
            <div className="mb-6">
              <SportSummaryCard sportKey={sportKey} range={range} summary={summary} />
            </div>
          ) : null}

          {sportKey ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <div className="min-w-0">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
                  {t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}
                </h3>
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
                    <div className="space-y-1 text-[color:var(--foreground)]">
                      <p className="font-medium">{activePrimary.detailPeriodLabel}</p>
                      <p>
                        {t(PRIMARY_METRIC_LABEL_KEYS[metricKind])}:{" "}
                        <span className="font-medium">
                          {metricKind === "duration"
                            ? String(Math.max(0, Math.round(activePrimary.primaryValue / 60)))
                            : formatSportPrimaryMetric(activePrimary.primaryValue, metricKind)}
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
              </div>

              <div className="min-w-0">
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
                    <p className="text-[color:var(--foreground)]">
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
            </div>
          ) : null}
        </>
      )}
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
  headerAside?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="flex h-full min-w-0 flex-col rounded-xl p-4 sm:p-5"
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
