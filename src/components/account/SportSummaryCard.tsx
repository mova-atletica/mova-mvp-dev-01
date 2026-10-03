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
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ backgroundColor: "var(--accent, #3b82f6)" }}
        aria-hidden
      />

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
          <SummarySubCard className="flex flex-1 flex-col justify-center">
            <p
              key={`${sportKey}-${range}-${hero}`}
              className="sport-summary-fade-in font-mono text-5xl font-semibold tabular-nums leading-none tracking-tight text-[color:var(--foreground)]"
            >
              {hero}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {t(VOLUME_LABEL_KEYS[sportKey])}
            </p>
            {volumeInsight ? (
              <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{volumeInsight}</p>
            ) : null}
          </SummarySubCard>

          <SummarySubCard className="flex flex-1 flex-col justify-center">
            <p
              key={`${sportKey}-${range}-sessions`}
              className="sport-summary-fade-in font-mono text-5xl font-semibold tabular-nums leading-none tracking-tight text-[color:var(--foreground)]"
            >
              {summary.sessions}
            </p>
            <p className="mt-2 text-xs uppercase tracking-wide text-[color:var(--muted-foreground)]">
              {t("account.sportTrendSessions")}
            </p>
            {sessionsCadence ? (
              <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">{sessionsCadence}</p>
            ) : null}
            {sessionsRecent ? (
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">{sessionsRecent}</p>
            ) : null}
          </SummarySubCard>
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
