"use client";

import { useMemo, useState } from "react";
import { QUICK_ANALYSIS_MOVEMENTS } from "../data/quickAnalysisMovements";
import { getCountryFlag } from "../data/countries";
import { useAccount } from "../contexts/MockAuthContext";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const PODIUM_STYLES = [
  { bg: "color-mix(in srgb, #1AAA00 21%, transparent)", ring: "#1AAA00", label: "1" },
  { bg: "color-mix(in srgb, #118000 15%, transparent)", ring: "#118000", label: "2" },
  { bg: "color-mix(in srgb, #085900 9%, transparent)", ring: "#085900", label: "3" },
] as const;

interface HomeLeaderboardBlockProps {
  onTrySport: (sportSlug: string) => void;
  /** Fits the tools hero column beside Mova Studio (no outer section margins). */
  variant?: "standalone" | "hero";
}

export default function HomeLeaderboardBlock({
  onTrySport,
  variant = "standalone",
}: HomeLeaderboardBlockProps) {
  const { getLeaderboard, profile } = useAccount();
  const [sportSlug, setSportSlug] = useState(QUICK_ANALYSIS_MOVEMENTS[0]?.slug ?? "plank");

  const movement = QUICK_ANALYSIS_MOVEMENTS.find((m) => m.slug === sportSlug);
  const entries = useMemo(
    () => getLeaderboard(sportSlug, "global"),
    [getLeaderboard, sportSlug]
  );

  const isHero = variant === "hero";

  const panel = (
    <div
      className={`mini-app-glass-surface flex min-h-0 flex-col overflow-hidden rounded-2xl p-3 sm:p-4 ${
        isHero ? "h-full" : ""
      }`}
      style={{ border: "none", boxShadow: "var(--mini-app-glass-shadow, 0 8px 32px rgba(23, 21, 15, 0.08))" }}
    >
      <div className="mini-app-glass-content relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 flex-col gap-2.5">
          <h2
            className="text-lg font-bold leading-tight sm:text-xl"
            style={{
              color: "var(--section-title)",
              fontFamily: "var(--font-roboto-mono), ui-monospace, monospace",
            }}
          >
            Leaderboard
          </h2>

          <div
            className="flex gap-2 overflow-x-auto pb-0.5 open-move-studio-panel-scroll"
            role="tablist"
            aria-label="Leaderboard sport"
          >
            {QUICK_ANALYSIS_MOVEMENTS.map((m) => {
              const selected = m.slug === sportSlug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setSportSlug(m.slug)}
                  className="shrink-0 rounded-full px-4 py-1.5 text-[10px] font-medium transition-colors sm:px-5 sm:text-[11px]"
                  style={{
                    fontFamily: "var(--font-roboto-mono), ui-monospace, monospace",
                    ...(selected
                      ? {
                          background: "var(--foreground)",
                          color: "var(--background)",
                        }
                      : {
                          background: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                          color: "var(--muted-foreground)",
                        }),
                  }}
                >
                  {m.title}
                </button>
              );
            })}
          </div>

          {movement ? (
            <p className="text-[10px] sm:text-[11px]" style={{ color: "var(--section-subtitle)" }}>
              Top {movement.primaryMetric.toLowerCase()} · {movement.title}
            </p>
          ) : null}
        </div>

        <div
          className="mb-1.5 flex shrink-0 items-center gap-2 px-2 sm:gap-2.5 sm:px-2.5"
          role="row"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:h-7 sm:w-7 sm:text-[10px]"
            role="columnheader"
          >
            #
          </span>
          <span
            className="w-[6.5rem] shrink-0 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:w-[8rem] sm:text-[10px]"
            role="columnheader"
          >
            Athlete
          </span>
          <span
            className="w-12 shrink-0 text-center text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:w-14 sm:text-[10px]"
            role="columnheader"
          >
            Country
          </span>
          <span className="min-w-0 flex-1" aria-hidden />
          <span
            className="w-[4.5rem] shrink-0 text-center text-[9px] font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)] sm:w-[5.25rem] sm:text-[10px]"
            role="columnheader"
          >
            {movement?.primaryMetric ?? "Score"}
          </span>
        </div>

        <ol
          className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto open-move-studio-panel-scroll ${
            isHero ? "max-h-none" : ""
          }`}
          aria-label="Leaderboard rankings"
        >
          {entries.length === 0 ? (
            <li
              className="rounded-lg px-3 py-5 text-center text-xs sm:text-sm"
              style={{ ...borderAllTheme, color: "var(--section-subtitle)" }}
            >
              No scores yet — be the first!
            </li>
          ) : (
            entries.map((entry, index) => {
              const podium = index < 3 ? PODIUM_STYLES[index] : null;
              const isMe = Boolean(profile?.id && entry.userId === profile.id);

              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 sm:gap-2.5 sm:px-2.5 sm:py-2.5"
                  style={{
                    ...borderAllTheme,
                    backgroundColor: isMe
                      ? "color-mix(in srgb, var(--accent, #3b82f6) 10%, transparent)"
                      : podium
                        ? podium.bg
                        : "transparent",
                    boxShadow: podium ? `inset 3px 0 0 ${podium.ring}` : undefined,
                  }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-7 sm:w-7 sm:text-xs"
                    style={{
                      backgroundColor: podium ? podium.ring : "var(--tag-bg)",
                      color: podium ? "#fff" : "var(--tag-text)",
                    }}
                  >
                    {index + 1}
                  </span>
                  <span className="w-[6.5rem] min-w-0 shrink-0 truncate text-xs font-medium text-[color:var(--foreground)] sm:w-[8rem] sm:text-sm">
                    {entry.displayName}
                    {isMe ? (
                      <span className="ml-1 text-[10px] font-normal text-[color:var(--muted-foreground)]">
                        (you)
                      </span>
                    ) : null}
                  </span>
                  <span
                    className="flex w-12 shrink-0 justify-center text-sm sm:w-14 sm:text-base"
                    title={entry.countryCode}
                    aria-label={entry.countryCode}
                  >
                    {getCountryFlag(entry.countryCode)}
                  </span>
                  <span className="min-w-0 flex-1" aria-hidden />
                  <span className="flex w-[4.5rem] shrink-0 justify-center text-xs font-semibold tabular-nums text-[color:var(--foreground)] sm:w-[5.25rem] sm:text-sm">
                    {entry.formattedScore}
                  </span>
                </li>
              );
            })
          )}
        </ol>

        <div className="mt-3 flex shrink-0 flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={() => onTrySport(sportSlug)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 sm:py-4 sm:text-base"
            style={{
              background: "var(--primary-button-bg)",
              color: "var(--primary-button-text)",
              border: "2px solid var(--primary-button-border)",
              boxShadow: "0 8px 24px color-mix(in srgb, var(--primary-button-bg) 35%, transparent)",
            }}
          >
            Try {movement?.title ?? "sport"}
          </button>
        </div>
      </div>
    </div>
  );

  if (isHero) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col" aria-label="Mini app leaderboards">
        {panel}
      </div>
    );
  }

  return (
    <section className="mx-auto mt-8 w-[96%] max-w-[2560px]" aria-label="Mini app leaderboards">
      {panel}
    </section>
  );
}
