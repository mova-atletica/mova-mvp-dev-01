"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, LayoutDashboard, Pencil, Smartphone, Trophy } from "lucide-react";
import type { AccountActivityKind, AccountActivityItem } from "../../types/accountActivity";
import {
  aggregateActivityByTimeRange,
  aggregateActivityMix,
  type ChartTimeRange,
  xAxisLabelForRange,
} from "../../lib/accountActivityInsights";
import { updateActivitySessionTitle } from "../../lib/activitySessions";
import { useAccountActivityFeed } from "../../lib/useAccountActivityFeed";
import { createClient } from "../../lib/supabase/client";
import { useTranslations } from "../../i18n/LocaleProvider";
import { PHASE_B_ENABLED } from "../../lib/productPhase";
import type { OpenMoveStudioModalTarget } from "../../types/openMoveStudioModal";
import OpenMoveStudioModal from "../open-move/OpenMoveStudioModal";
import AccountLeaderboardStatus from "./AccountLeaderboardStatus";
import ActivityReplayModal from "./ActivityReplayModal";
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
  coach: Clapperboard,
};

const KIND_LABELS: Record<AccountActivityKind, string> = {
  studio: "Studio",
  "mini-app": "Mini app",
  program: "Program",
  coach: "Coach",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isActivityClickable(item: AccountActivityItem): boolean {
  if (item.isSeed) return false;
  if (item.coachSessionId) return true;
  return Boolean(item.hasReplayPayload);
}

function canRenameActivity(item: AccountActivityItem): boolean {
  return item.kind === "studio" && !item.isSeed && !item.coachSessionId;
}

export default function AccountActivityList() {
  const t = useTranslations();
  const router = useRouter();
  const { items: sourceActivity, refresh } = useAccountActivityFeed();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [volumeRange, setVolumeRange] = useState<ChartTimeRange>("month");
  const [replayActivity, setReplayActivity] = useState<AccountActivityItem | null>(null);
  const [studioTarget, setStudioTarget] = useState<OpenMoveStudioModalTarget | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const items = useMemo(() => {
    if (filter === "all") return sourceActivity;
    if (filter === "studio") {
      return sourceActivity.filter((item) => item.kind === "studio" || item.kind === "coach");
    }
    return sourceActivity.filter((item) => item.kind === filter);
  }, [filter, sourceActivity]);

  const kindLabels = useMemo(
    (): Record<AccountActivityKind, string> => ({
      studio: t("account.activityFilterStudio"),
      "mini-app": t("account.activityFilterMiniApp"),
      program: t("account.activityFilterProgram"),
      coach: t("account.activityFilterCoach"),
    }),
    [t]
  );

  const weeklyData = useMemo(
    () => aggregateActivityByTimeRange(sourceActivity, volumeRange),
    [volumeRange, sourceActivity]
  );
  const mixData = useMemo(() => aggregateActivityMix(sourceActivity), [sourceActivity]);
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

  const onActivityActivate = (item: AccountActivityItem) => {
    if (item.coachSessionId) {
      router.push(`/coach-studio/${item.coachSessionId}`);
      return;
    }
    if (item.videoPath && item.hasReplayPayload) {
      setStudioTarget({
        type: "hydrate",
        activityId: item.id,
        title: item.title,
      });
      return;
    }
    if (item.hasReplayPayload) {
      setReplayActivity(item);
    }
  };

  const startRename = (item: AccountActivityItem) => {
    setRenamingId(item.id);
    setRenameDraft(item.title);
    setRenameError(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameDraft("");
    setRenameError(null);
  };

  const saveRename = async () => {
    if (!renamingId) return;
    const title = renameDraft.trim();
    if (!title) {
      setRenameError("Enter a name");
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    const supabase = createClient();
    const { error } = await updateActivitySessionTitle(supabase, renamingId, title);
    setRenameBusy(false);
    if (error) {
      setRenameError(error);
      return;
    }
    cancelRename();
    refresh();
  };

  return (
    <>
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
                <ActivityCard
                  key={item.id}
                  item={item}
                  clickable={isActivityClickable(item)}
                  canRename={canRenameActivity(item)}
                  renaming={renamingId === item.id}
                  renameDraft={renameDraft}
                  renameBusy={renameBusy}
                  renameError={renamingId === item.id ? renameError : null}
                  onActivate={() => onActivityActivate(item)}
                  onStartRename={() => startRename(item)}
                  onRenameDraftChange={setRenameDraft}
                  onCancelRename={cancelRename}
                  onSaveRename={() => void saveRename()}
                />
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

      <OpenMoveStudioModal
        open={studioTarget != null}
        onOpenChange={(open) => {
          if (!open) setStudioTarget(null);
        }}
        target={studioTarget}
      />
      <ActivityReplayModal
        open={replayActivity != null}
        onOpenChange={(open) => {
          if (!open) setReplayActivity(null);
        }}
        activity={replayActivity}
      />
    </>
  );
}

function ActivityCard({
  item,
  clickable,
  canRename,
  renaming,
  renameDraft,
  renameBusy,
  renameError,
  onActivate,
  onStartRename,
  onRenameDraftChange,
  onCancelRename,
  onSaveRename,
}: {
  item: AccountActivityItem;
  clickable: boolean;
  canRename: boolean;
  renaming: boolean;
  renameDraft: string;
  renameBusy: boolean;
  renameError: string | null;
  onActivate: () => void;
  onStartRename: () => void;
  onRenameDraftChange: (value: string) => void;
  onCancelRename: () => void;
  onSaveRename: () => void;
}) {
  const Icon = KIND_ICONS[item.kind];
  const showHoverBorder = clickable && !renaming;
  const [hovered, setHovered] = useState(false);

  return (
    <li
      className="rounded-xl p-3"
      style={{
        backgroundColor: "var(--card-bg)",
        border: `1px solid ${showHoverBorder && hovered ? "#10b981" : "var(--border-secondary)"}`,
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={() => {
        if (showHoverBorder) setHovered(true);
      }}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--border-secondary)]"
          style={{ backgroundColor: "var(--background)" }}
          aria-hidden
        >
          <Icon size={16} className="text-[color:var(--foreground)]" />
        </span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="space-y-2">
              <input
                type="text"
                value={renameDraft}
                onChange={(event) => onRenameDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onSaveRename();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelRename();
                  }
                }}
                disabled={renameBusy}
                autoFocus
                className="w-full rounded-lg px-2 py-1.5 text-sm text-[color:var(--foreground)] outline-none"
                style={{
                  border: "1px solid var(--border-secondary)",
                  backgroundColor: "var(--background)",
                }}
                aria-label="Session name"
              />
              {renameError ? (
                <p className="text-[10px] text-red-500">{renameError}</p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancelRename}
                  disabled={renameBusy}
                  style={borderAllTheme}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveRename}
                  disabled={renameBusy}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--accent,#3b82f6)" }}
                >
                  {renameBusy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                {clickable ? (
                  <button
                    type="button"
                    onClick={onActivate}
                    className="min-w-0 flex-1 cursor-pointer text-left"
                  >
                    <ActivityCardBody item={item} clickable />
                  </button>
                ) : (
                  <div className="min-w-0 flex-1">
                    <ActivityCardBody item={item} clickable={false} />
                  </div>
                )}
                {canRename ? (
                  <button
                    type="button"
                    onClick={onStartRename}
                    className="inline-flex shrink-0 rounded-lg p-1.5 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-[color:var(--foreground)]"
                    aria-label="Rename session"
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function ActivityCardBody({
  item,
  clickable,
}: {
  item: AccountActivityItem;
  clickable: boolean;
}) {
  return (
    <>
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
        {clickable ? (
          <span className="font-medium text-[color:var(--primary)]">· Open</span>
        ) : null}
      </div>
    </>
  );
}
