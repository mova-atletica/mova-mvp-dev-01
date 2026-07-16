"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Trophy } from "lucide-react";
import { QUICK_ANALYSIS_MOVEMENTS } from "../data/quickAnalysisMovements";
import { getCountryFlag } from "../data/countries";
import {
  leaderboardAvatarTone,
  leaderboardInitials,
} from "../data/mockLeaderboards";
import { useAccount } from "../contexts/MockAuthContext";
import type { LeaderboardScope } from "../types/account";
import ExportPanelSelect from "./ExportPanelSelect";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const PODIUM_STYLES = [
  { bg: "color-mix(in srgb, #eab308 18%, transparent)", ring: "#ca8a04", label: "1" },
  { bg: "color-mix(in srgb, #94a3b8 22%, transparent)", ring: "#64748b", label: "2" },
  { bg: "color-mix(in srgb, #d97706 18%, transparent)", ring: "#b45309", label: "3" },
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
  const [scope, setScope] = useState<LeaderboardScope>("global");

  const movement = QUICK_ANALYSIS_MOVEMENTS.find((m) => m.slug === sportSlug);
  const countryCode = profile?.countryCode;
  const entries = useMemo(
    () => getLeaderboard(sportSlug, scope, countryCode),
    [getLeaderboard, sportSlug, scope, countryCode]
  );

  const uniqueCountries = useMemo(() => {
    const codes = new Set(entries.map((e) => e.countryCode).filter(Boolean));
    return codes.size;
  }, [entries]);

  const scopeDisabled = scope === "country" && !countryCode;
  const isHero = variant === "hero";

  const sportOptions = useMemo(
    () => QUICK_ANALYSIS_MOVEMENTS.map((m) => ({ value: m.slug, label: m.title })),
    []
  );

  const panel = (
    <div
      className={`mini-app-glass-surface flex min-h-0 flex-col overflow-hidden rounded-2xl p-3 sm:p-4 ${
        isHero ? "h-full" : ""
      }`}
      style={borderAllTheme}
    >
      <div
        className={`mb-3 flex shrink-0 flex-col gap-2 ${isHero ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}
      >
        <div className="flex items-center gap-2.5">
          {movement ? (
            <div
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg sm:h-10 sm:w-10"
              style={borderAllTheme}
            >
              <Image
                src={movement.tileImage}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <Trophy
              size={isHero ? 16 : 18}
              className="text-[color:var(--section-title)]"
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <h2
              className={`font-bold leading-tight ${isHero ? "text-sm" : "text-base sm:text-lg"}`}
              style={{ color: "var(--section-title)" }}
            >
              Leaderboards
            </h2>
            {movement ? (
              <p className="truncate text-[10px] sm:text-[11px]" style={{ color: "var(--section-subtitle)" }}>
                Top {movement.primaryMetric.toLowerCase()} · {movement.title}
                {uniqueCountries > 0 ? ` · ${uniqueCountries} countries` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportPanelSelect
            value={sportSlug}
            options={sportOptions}
            onSelect={setSportSlug}
            aria-label="Select sport"
            triggerClassName="w-auto min-w-[8.5rem] max-w-[11rem] sm:min-w-[9.5rem]"
          />

          <div
            className="flex shrink-0 rounded-lg p-0.5"
            style={{ ...borderAllTheme, backgroundColor: "var(--background)" }}
            role="tablist"
            aria-label="Leaderboard scope"
          >
            {(["global", "country"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={scope === tab}
                disabled={tab === "country" && !countryCode}
                title={
                  tab === "country" && !countryCode
                    ? "Sign in and set your country to filter"
                    : undefined
                }
                onClick={() => setScope(tab)}
                className="rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-3 sm:py-1.5 sm:text-[11px]"
                style={{
                  backgroundColor: scope === tab ? "var(--tag-bg)" : "transparent",
                  color: scope === tab ? "var(--tag-text)" : "var(--muted-foreground)",
                }}
              >
                {tab === "global" ? "Global" : "Country"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {scopeDisabled ? (
        <p className="mb-2 shrink-0 text-[10px] text-[color:var(--muted-foreground)] sm:text-xs">
          Set your country in profile to filter by country.
        </p>
      ) : null}

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
            const tone = leaderboardAvatarTone(entry.displayName);
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
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold sm:h-8 sm:w-8 sm:text-[11px]"
                  style={{ backgroundColor: tone.bg, color: tone.fg }}
                  aria-hidden
                >
                  {leaderboardInitials(entry.displayName)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[color:var(--foreground)] sm:text-sm">
                  {entry.displayName}
                  {isMe ? (
                    <span className="ml-1 text-[10px] font-normal text-[color:var(--muted-foreground)]">
                      (you)
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm sm:text-base" title={entry.countryCode} aria-hidden>
                  {getCountryFlag(entry.countryCode)}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[color:var(--foreground)] sm:text-sm">
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
        <p className="text-center text-[10px] text-[color:var(--muted-foreground)] sm:text-[11px]">
          Tracked sessions · public ranks · {entries.length || 0} athletes shown
        </p>
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
