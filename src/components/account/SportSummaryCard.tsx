"use client";

import type { ReactNode } from "react";
import type { MessageKey } from "../../i18n";
import { useTranslations } from "../../i18n/LocaleProvider";
import {
  formatSportPrimaryMetric,
  type AccountSportTrendKey,
  type ChartTimeRange,
  type SportRangeSummary,
} from "../../lib/accountActivityInsights";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const SPORT_LABEL_KEYS: Record<AccountSportTrendKey, MessageKey> = {
  studio: "account.sportTrendStudio",
  pullups: "account.sportTrendPullups",
  pushups: "account.sportTrendPushups",
  squat: "account.sportTrendSquats",
  plank: "account.sportTrendPlank",
};

const RANGE_LABEL_KEYS: Record<ChartTimeRange, MessageKey> = {
  week: "account.chartRangeWeek",
  month: "account.chartRangeMonth",
  ytd: "account.chartRangeYtd",
  all: "account.chartRangeAll",
};

const PRIOR_LABEL_KEYS: Record<ChartTimeRange, MessageKey> = {
  week: "account.sportSummaryPriorWeek",
  month: "account.sportSummaryPriorMonth",
  ytd: "account.sportSummaryPriorYtd",
  all: "account.sportSummaryPriorAll",
};

const FIRST_RANGE_LABEL_KEYS: Record<ChartTimeRange, MessageKey> = {
  week: "account.sportSummaryFirstRangeWeek",
  month: "account.sportSummaryFirstRangeMonth",
  ytd: "account.sportSummaryFirstRangeYtd",
  all: "account.sportSummaryFirstRangeAll",
};

/** Unit noun for comparison / takeaway copy. */
const UNIT_NOUN_KEYS: Record<AccountSportTrendKey, MessageKey> = {
  studio: "account.sportSummaryMinutes",
  pullups: "account.sportTrendPullups",
  pushups: "account.sportTrendPushups",
  squat: "account.sportTrendSquats",
  plank: "account.sportSummaryMinutes",
};

const VOLUME_LABEL_KEYS: Record<AccountSportTrendKey, MessageKey> = {
  studio: "account.sportSummaryVolumeDuration",
  pullups: "account.sportTrendPullups",
  pushups: "account.sportTrendPushups",
  squat: "account.sportTrendSquats",
  plank: "account.sportSummaryVolumeDuration",
};

function SummarySubCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg px-4 py-4 ${className}`}
      style={{ ...borderAllTheme, backgroundColor: "var(--card-bg)" }}
    >
      {children}
    </div>
  );
}

/** Shared divider height so Volume + Sessions rules match. */
const METRIC_SPLIT_DIVIDER_HEIGHT = 48;

/** Primary metric left · vertical rule · subline right. */
function MetricSplitChip({
  hero,
  heroKey,
  label,
  sub,
}: {
  hero: ReactNode;
  heroKey: string;
  label: string;
  sub?: ReactNode;
}) {
  const hasSub = Boolean(sub);

  if (!hasSub) {
    return (
      <SummarySubCard className="flex flex-1 flex-col justify-center">
        <p
          key={heroKey}
          className="sport-summary-fade-in font-mono text-3xl font-medium tabular-nums leading-none tracking-tight text-[color:var(--foreground)]"
        >
          {hero}
        </p>
        <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
          {label}
        </p>
      </SummarySubCard>
    );
  }

  return (
    <SummarySubCard className="flex flex-1">
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          width: "100%",
          minHeight: METRIC_SPLIT_DIVIDER_HEIGHT,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: "1 1 0",
            minWidth: 0,
            flexDirection: "column",
            justifyContent: "center",
            paddingRight: 16,
          }}
        >
          <p
            key={heroKey}
            className="sport-summary-fade-in font-mono text-3xl font-medium tabular-nums leading-none tracking-tight text-[color:var(--foreground)]"
          >
            {hero}
          </p>
          <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
            {label}
          </p>
        </div>

        <div
          aria-hidden
          style={{
            width: 1,
            height: METRIC_SPLIT_DIVIDER_HEIGHT,
            flexShrink: 0,
            alignSelf: "center",
            backgroundColor: "color-mix(in srgb, var(--foreground) 35%, transparent)",
          }}
        />

        <div
          style={{
            display: "flex",
            flex: "1 1 0",
            minWidth: 0,
            flexDirection: "column",
            justifyContent: "center",
            gap: 4,
            paddingLeft: 16,
            fontSize: 14,
            color: "var(--muted-foreground)",
          }}
        >
          {sub}
        </div>
      </div>
    </SummarySubCard>
  );
}

function formatMinutesWhole(seconds: number): string {
  return String(Math.max(0, Math.round(seconds / 60)));
}

function usesMinutesHero(metricKind: SportRangeSummary["metricKind"]): boolean {
  return metricKind === "duration" || metricKind === "hold";
}

function volumeComparisonLine(
  t: (key: MessageKey) => string,
  range: ChartTimeRange,
  unitNoun: string,
  comparison: NonNullable<SportRangeSummary["volumeComparison"]>
): string {
  const prior = t(PRIOR_LABEL_KEYS[range]);
  if (comparison.kind === "first") {
    return t("account.sportSummaryVsPriorFirst").replace(
      "{range}",
      t(FIRST_RANGE_LABEL_KEYS[range])
    );
  }
  if (comparison.kind === "flat") {
    return t("account.sportSummaryVsPriorFlat").replace("{prior}", prior);
  }
  const template =
    comparison.kind === "up"
      ? t("account.sportSummaryVsPriorUp")
      : t("account.sportSummaryVsPriorDown");
  return template
    .replace("{percent}", String(comparison.percent ?? 0))
    .replace("{unit}", unitNoun)
    .replace("{prior}", prior);
}

function bestSessionLine(
  t: (key: MessageKey) => string,
  summary: SportRangeSummary,
  unitNoun: string
): string | null {
  if (summary.bestSessionPrimary == null) return null;

  if (summary.metricKind === "hold") {
    return t("account.sportSummaryBestHold").replace(
      "{value}",
      formatSportPrimaryMetric(summary.bestSessionPrimary, "hold")
    );
  }
  if (summary.metricKind === "duration") {
    return t("account.sportSummaryBestDuration").replace(
      "{value}",
      formatMinutesWhole(summary.bestSessionPrimary)
    );
  }
  return t("account.sportSummaryBestReps")
    .replace("{value}", formatSportPrimaryMetric(summary.bestSessionPrimary, "reps"))
    .replace("{unit}", unitNoun);
}

function formatSessionsPerWeek(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
}

function formatMostRecentDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildTakeaways(
  t: (key: MessageKey) => string,
  range: ChartTimeRange,
  summary: SportRangeSummary,
  unitNoun: string
): string[] {
  const lines: string[] = [];

  if (summary.volumeComparison) {
    lines.push(volumeComparisonLine(t, range, unitNoun, summary.volumeComparison));
  }

  if (summary.primaryAvgPerSession != null && summary.sessions > 0) {
    if (summary.metricKind === "hold") {
      lines.push(
        t("account.sportSummaryTakeawayAvgHold").replace(
          "{avg}",
          formatMinutesWhole(summary.primaryAvgPerSession)
        )
      );
    } else if (summary.metricKind === "duration") {
      lines.push(
        t("account.sportSummaryTakeawayAvgDuration").replace(
          "{avg}",
          formatMinutesWhole(summary.primaryAvgPerSession)
        )
      );
    } else {
      lines.push(
        t("account.sportSummaryTakeawayAvgReps")
          .replace(
            "{avg}",
            formatSportPrimaryMetric(summary.primaryAvgPerSession, summary.metricKind)
          )
          .replace("{unit}", unitNoun)
      );
    }
  }

  if (summary.sessions > 0) {
    lines.push(
      t("account.sportSummaryTakeawaySessions")
        .replace("{count}", String(summary.sessions))
        .replace("{range}", t(RANGE_LABEL_KEYS[range]).toLocaleLowerCase())
    );
  }

  return lines.slice(0, 3);
}

export default function SportSummaryCard({
  sportKey,
  range,
  summary,
}: {
  sportKey: AccountSportTrendKey;
  range: ChartTimeRange;
  summary: SportRangeSummary;
}) {
  const t = useTranslations();
  const unitNoun = t(UNIT_NOUN_KEYS[sportKey]).toLocaleLowerCase();
  const hero =
    summary.primaryTotal == null
      ? "—"
      : usesMinutesHero(summary.metricKind)
        ? formatMinutesWhole(summary.primaryTotal)
        : formatSportPrimaryMetric(summary.primaryTotal, summary.metricKind);

  const volumeInsight = bestSessionLine(t, summary, unitNoun);

  const sessionsCadence =
    summary.sessionsPerWeek != null && summary.sessions > 0
      ? t("account.sportSummarySessionsPerWeek").replace(
          "{rate}",
          formatSessionsPerWeek(summary.sessionsPerWeek)
        )
      : null;
  const sessionsRecent =
    summary.mostRecentAt != null
      ? t("account.sportSummarySessionsMostRecent").replace(
          "{date}",
          formatMostRecentDate(summary.mostRecentAt)
        )
      : null;

  const takeaways = buildTakeaways(t, range, summary, unitNoun);

  return (
    <div
      className="relative overflow-hidden rounded-xl px-4 py-5 sm:px-5 sm:py-6"
      style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
        {t(SPORT_LABEL_KEYS[sportKey])}
        <span className="mx-1.5 opacity-50">·</span>
        {t(RANGE_LABEL_KEYS[range])}
      </p>

      <div
        className={
          takeaways.length > 0
            ? "mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch"
            : "mt-4 grid grid-cols-1 gap-3"
        }
      >
        <div className="flex min-h-0 flex-col gap-3 md:h-full">
          <MetricSplitChip
            hero={hero}
            heroKey={`${sportKey}-${range}-${hero}`}
            label={t(VOLUME_LABEL_KEYS[sportKey])}
            sub={volumeInsight ? <p>{volumeInsight}</p> : undefined}
          />

          <MetricSplitChip
            hero={summary.sessions}
            heroKey={`${sportKey}-${range}-sessions`}
            label={t("account.sportTrendSessions")}
            sub={
              sessionsCadence || sessionsRecent ? (
                <>
                  {sessionsCadence ? <p>{sessionsCadence}</p> : null}
                  {sessionsRecent ? <p>{sessionsRecent}</p> : null}
                </>
              ) : undefined
            }
          />
        </div>

        {takeaways.length > 0 ? (
          <SummarySubCard className="flex h-full min-h-0 flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--muted-foreground)]">
              {t("account.sportSummaryTakeaways")}
            </p>
            <ul className="sport-summary-fade-in mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--foreground)] marker:text-[color:var(--foreground)]">
              {takeaways.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </SummarySubCard>
        ) : null}
      </div>
    </div>
  );
}
