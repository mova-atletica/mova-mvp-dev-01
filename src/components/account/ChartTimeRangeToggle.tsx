"use client";

import type { ChartTimeRange } from "../../lib/accountActivityInsights";
import { useTranslations } from "../../i18n/LocaleProvider";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const RANGES: ChartTimeRange[] = ["week", "month", "ytd", "all"];

const RANGE_KEYS: Record<ChartTimeRange, "account.chartRangeWeek" | "account.chartRangeMonth" | "account.chartRangeYtd" | "account.chartRangeAll"> = {
  week: "account.chartRangeWeek",
  month: "account.chartRangeMonth",
  ytd: "account.chartRangeYtd",
  all: "account.chartRangeAll",
};

export default function ChartTimeRangeToggle({
  value,
  onChange,
}: {
  value: ChartTimeRange;
  onChange: (next: ChartTimeRange) => void;
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-1.5">
      {RANGES.map((range) => {
        const active = value === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            className="rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
            style={{
              ...borderAllTheme,
              backgroundColor: active ? "var(--primary-button-bg)" : "transparent",
              color: active ? "var(--primary-button-text)" : "var(--muted-foreground)",
            }}
          >
            {t(RANGE_KEYS[range])}
          </button>
        );
      })}
    </div>
  );
}
