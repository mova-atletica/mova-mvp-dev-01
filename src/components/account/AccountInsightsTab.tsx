"use client";

import { useMemo, useState } from "react";
import { MOCK_ACCOUNT_ACTIVITY } from "../../data/mockAccountActivity";
import {
  aggregateBodyFocus,
  aggregateJointRom,
  aggregateMovementTags,
  aggregateMovementTrends,
  computeActiveDayStreak,
  countRecentSessions,
  summarizeMovementStats,
  type ChartTimeRange,
  xAxisLabelForRange,
} from "../../lib/accountActivityInsights";
import { useTranslations } from "../../i18n/LocaleProvider";
import ChartTimeRangeToggle from "./ChartTimeRangeToggle";
import {
  BodyFocusRadar,
  ChartLegend,
  JointRomChart,
  MovementFocusChart,
  MovementTrendChart,
} from "./AccountMovementCharts";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const TREND_LEGEND = [
  { color: "#3b82f6", labelKey: "account.insightsAvgForm" as const },
  { color: "#22c55e", labelKey: "account.insightsAvgRom" as const },
  { color: "#a855f7", labelKey: "account.insightsSymmetry" as const },
];

export default function AccountInsightsTab() {
  const t = useTranslations();
  const [trendRange, setTrendRange] = useState<ChartTimeRange>("month");

  const movementSummary = useMemo(() => summarizeMovementStats(MOCK_ACCOUNT_ACTIVITY), []);
  const trendData = useMemo(
    () => aggregateMovementTrends(MOCK_ACCOUNT_ACTIVITY, trendRange),
    [trendRange]
  );
  const bodyFocusData = useMemo(() => aggregateBodyFocus(MOCK_ACCOUNT_ACTIVITY), []);
  const jointRomData = useMemo(() => aggregateJointRom(MOCK_ACCOUNT_ACTIVITY), []);
  const movementData = useMemo(() => aggregateMovementTags(MOCK_ACCOUNT_ACTIVITY), []);

  const recentSessions = countRecentSessions(MOCK_ACCOUNT_ACTIVITY);
  const activeStreak = computeActiveDayStreak(MOCK_ACCOUNT_ACTIVITY);
  const trendXLabel =
    xAxisLabelForRange(trendRange) === "Day"
      ? t("account.chartAxisDay")
      : t("account.chartAxisWeek");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          label={t("account.insightsAvgForm")}
          value={movementSummary.avgFormScore ? `${movementSummary.avgFormScore}` : "—"}
          suffix={movementSummary.avgFormScore ? "/100" : undefined}
        />
        <StatCard
          label={t("account.insightsAvgRom")}
          value={movementSummary.avgRom ? `${movementSummary.avgRom}` : "—"}
          suffix={movementSummary.avgRom ? "°" : undefined}
        />
        <StatCard label={t("account.insightsActiveStreak")} value={String(activeStreak)} />
        <StatCard label={t("account.insightsRecentSessions")} value={String(recentSessions)} />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <InsightsSection
          title={t("account.insightsStatsOverTime")}
          action={<ChartTimeRangeToggle value={trendRange} onChange={setTrendRange} />}
        >
          <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
            {t("account.insightsStatsOverTimeHint")}
          </p>
          <MovementTrendChart
            data={trendData}
            labels={{
              form: t("account.insightsAvgForm"),
              rom: t("account.insightsAvgRom"),
              symmetry: t("account.insightsSymmetry"),
            }}
            xAxisLabel={trendXLabel}
            yAxisLabel={`${t("account.chartAxisScore")} / ${t("account.chartAxisRom")}`}
          />
          <ChartLegend
            items={TREND_LEGEND.map((item) => ({
              color: item.color,
              label: t(item.labelKey),
            }))}
          />
        </InsightsSection>

        <InsightsSection title={t("account.insightsJointRom")}>
          <p className="mb-3 text-xs text-[color:var(--muted-foreground)]">
            {t("account.insightsJointRomHint")}
          </p>
          <JointRomChart
            data={jointRomData}
            xAxisLabel={t("account.chartAxisJoint")}
            yAxisLabel={t("account.chartAxisRom")}
          />
        </InsightsSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InsightsSection title={t("account.insightsBodyFocus")}>
          <p className="mb-2 text-xs text-[color:var(--muted-foreground)]">
            {t("account.insightsBodyFocusHint")}
          </p>
          <BodyFocusRadar data={bodyFocusData} />
        </InsightsSection>

        <InsightsSection title={t("account.insightsMovementFocus")}>
          <MovementFocusChart
            data={movementData}
            xAxisLabel={t("account.chartAxisSessions")}
          />
        </InsightsSection>
      </div>
    </div>
  );
}

function InsightsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="min-w-0 rounded-xl p-4"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div
      className="rounded-xl px-3 py-3 text-center"
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      <p className="text-lg font-semibold tabular-nums text-[color:var(--foreground)]">
        {value}
        {suffix ? (
          <span className="text-sm font-normal text-[color:var(--muted-foreground)]">{suffix}</span>
        ) : null}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-[color:var(--muted-foreground)]">{label}</p>
    </div>
  );
}
