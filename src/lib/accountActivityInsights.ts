import type {
  AccountActivityItem,
  AccountActivityKind,
  MovementJoint,
} from "../types/accountActivity";

export type ChartTimeRange = "week" | "month" | "ytd" | "all";

export interface WeeklyActivityBucket {
  weekLabel: string;
  weekStart: string;
  total: number;
  studio: number;
  "mini-app": number;
  program: number;
}

export interface MovementTagCount {
  tag: string;
  label: string;
  count: number;
}

export interface ActivityMixSlice {
  kind: AccountActivityKind;
  count: number;
}

export interface MovementTrendPoint {
  weekLabel: string;
  avgRom: number | null;
  symmetry: number | null;
  sessions: number;
}

export interface JointRomAverage {
  joint: MovementJoint;
  label: string;
  degrees: number;
}

export interface MovementSummaryStats {
  avgRom: number;
  avgSymmetry: number;
  sessionsWithMetrics: number;
}

const GENERIC_TAGS = new Set(["studio", "program", "export-ready", "coach-studio"]);

const JOINT_LABELS: Record<MovementJoint, string> = {
  knee: "Knee",
  hip: "Hip",
  shoulder: "Shoulder",
  spine: "Spine",
  elbow: "Elbow",
};

function itemsWithMetrics(items: AccountActivityItem[]): AccountActivityItem[] {
  return items.filter((item) => item.metrics);
}

const TAG_LABELS: Record<string, string> = {
  squat: "Squat",
  plank: "Plank",
  "pull-ups": "Pull-ups",
  cycling: "Cycling",
  program: "Program",
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatPeriodLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Anchor ranges to latest activity so mock/demo data stays visible. */
export function activityAnchorDate(items: AccountActivityItem[]): Date {
  if (items.length === 0) return new Date();
  return new Date(
    Math.max(...items.map((item) => new Date(item.occurredAt).getTime()))
  );
}

export function filterActivityByTimeRange(
  items: AccountActivityItem[],
  range: ChartTimeRange
): AccountActivityItem[] {
  if (range === "all" || items.length === 0) return items;
  const anchor = activityAnchorDate(items);
  let start: Date;

  if (range === "week") {
    start = startOfWeek(anchor);
  } else if (range === "month") {
    start = startOfDay(anchor);
    start.setDate(start.getDate() - 29);
  } else {
    start = new Date(anchor.getFullYear(), 0, 1);
  }

  const end = startOfDay(anchor);
  end.setDate(end.getDate() + 1);
  return items.filter((item) => {
    const t = new Date(item.occurredAt).getTime();
    return t >= start.getTime() && t < end.getTime();
  });
}

function emptyBucket(start: Date): WeeklyActivityBucket {
  return {
    weekLabel: formatPeriodLabel(start),
    weekStart: start.toISOString(),
    total: 0,
    studio: 0,
    "mini-app": 0,
    program: 0,
  };
}

function chartKind(kind: AccountActivityKind): keyof Pick<
  WeeklyActivityBucket,
  "studio" | "mini-app" | "program"
> {
  if (kind === "coach") return "studio";
  return kind;
}

function fillBuckets(
  items: AccountActivityItem[],
  starts: Date[],
  stepDays: number
): WeeklyActivityBucket[] {
  return starts.map((start) => {
    const bucket = emptyBucket(start);
    const end = new Date(start);
    end.setDate(end.getDate() + stepDays);
    for (const item of items) {
      const t = new Date(item.occurredAt).getTime();
      if (t >= start.getTime() && t < end.getTime()) {
        bucket[chartKind(item.kind)] += 1;
        bucket.total += 1;
      }
    }
    return bucket;
  });
}

/** Build day/week buckets for the selected chart range. */
export function aggregateActivityByTimeRange(
  items: AccountActivityItem[],
  range: ChartTimeRange = "month"
): WeeklyActivityBucket[] {
  const anchor = activityAnchorDate(items);

  if (range === "week") {
    const weekStart = startOfWeek(anchor);
    const starts = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
    return fillBuckets(items, starts, 1);
  }

  if (range === "month") {
    const endWeek = startOfWeek(anchor);
    const starts = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(endWeek);
      d.setDate(d.getDate() - (4 - i) * 7);
      return d;
    });
    return fillBuckets(items, starts, 7);
  }

  if (range === "ytd") {
    const yearStart = startOfWeek(new Date(anchor.getFullYear(), 0, 1));
    const endWeek = startOfWeek(anchor);
    const starts: Date[] = [];
    for (let d = new Date(yearStart); d.getTime() <= endWeek.getTime(); ) {
      starts.push(new Date(d));
      d.setDate(d.getDate() + 7);
    }
    return fillBuckets(items, starts.length ? starts : [endWeek], 7);
  }

  // all time — weekly from earliest session through anchor
  if (items.length === 0) {
    return aggregateActivityByTimeRange(items, "month");
  }
  const earliest = new Date(
    Math.min(...items.map((item) => new Date(item.occurredAt).getTime()))
  );
  const startWeek = startOfWeek(earliest);
  const endWeek = startOfWeek(anchor);
  const starts: Date[] = [];
  for (let d = new Date(startWeek); d.getTime() <= endWeek.getTime(); ) {
    starts.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return fillBuckets(items, starts.length ? starts : [endWeek], 7);
}

export function aggregateWeeklyActivity(
  items: AccountActivityItem[],
  weekCount = 5
): WeeklyActivityBucket[] {
  if (weekCount !== 5) {
    // Legacy path: fixed trailing week window
    const anchor = startOfWeek(activityAnchorDate(items));
    const starts = Array.from({ length: weekCount }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() - (weekCount - 1 - i) * 7);
      return d;
    });
    return fillBuckets(items, starts, 7);
  }
  return aggregateActivityByTimeRange(items, "month");
}

export function xAxisLabelForRange(range: ChartTimeRange): "Day" | "Week" {
  return range === "week" ? "Day" : "Week";
}

export function aggregateActivityMix(items: AccountActivityItem[]): ActivityMixSlice[] {
  const counts: Record<"studio" | "mini-app" | "program", number> = {
    studio: 0,
    "mini-app": 0,
    program: 0,
  };
  for (const item of items) {
    counts[chartKind(item.kind)] += 1;
  }
  return (Object.entries(counts) as [AccountActivityKind, number][])
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => ({ kind, count }));
}

export function aggregateMovementTags(items: AccountActivityItem[]): MovementTagCount[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const tags = item.tags?.length ? item.tags : [item.kind];
    for (const tag of tags) {
      if (GENERIC_TAGS.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    if (item.kind === "program" && !item.tags?.includes("program")) {
      counts.set("program", (counts.get("program") ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({
      tag,
      label: TAG_LABELS[tag] ?? tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function computeActiveDayStreak(items: AccountActivityItem[]): number {
  if (items.length === 0) return 0;

  const dayKeys = [
    ...new Set(items.map((item) => new Date(item.occurredAt).toISOString().slice(0, 10))),
  ].sort().reverse();

  let streak = 1;
  for (let i = 0; i < dayKeys.length - 1; i += 1) {
    const current = new Date(`${dayKeys[i]}T00:00:00`);
    const next = new Date(`${dayKeys[i + 1]}T00:00:00`);
    const diffDays = Math.round((current.getTime() - next.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function countRecentSessions(items: AccountActivityItem[], days = 30): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => new Date(item.occurredAt).getTime() >= cutoff).length;
}

function meanOrZero(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Sessions without a tracked pair have no symmetry score and are skipped. */
function symmetryValues(items: AccountActivityItem[]): number[] {
  return items
    .map((item) => item.metrics?.symmetryScore)
    .filter((value): value is number => typeof value === "number");
}

export function summarizeMovementStats(items: AccountActivityItem[]): MovementSummaryStats {
  const measured = itemsWithMetrics(items);
  if (measured.length === 0) {
    return { avgRom: 0, avgSymmetry: 0, sessionsWithMetrics: 0 };
  }
  return {
    avgRom: meanOrZero(measured.map((item) => item.metrics!.avgRomDegrees)),
    avgSymmetry: meanOrZero(symmetryValues(measured)),
    sessionsWithMetrics: measured.length,
  };
}

export function aggregateMovementTrends(
  items: AccountActivityItem[],
  range: ChartTimeRange | number = "month"
): MovementTrendPoint[] {
  const weekly =
    typeof range === "number"
      ? aggregateWeeklyActivity(items, range)
      : aggregateActivityByTimeRange(items, range);
  const stepDays = typeof range === "number" ? 7 : range === "week" ? 1 : 7;

  return weekly.map((bucket) => {
    const start = new Date(bucket.weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + stepDays);

    const weekItems = itemsWithMetrics(items).filter((item) => {
      const t = new Date(item.occurredAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });

    if (weekItems.length === 0) {
      return {
        weekLabel: bucket.weekLabel,
        avgRom: null,
        symmetry: null,
        sessions: 0,
      };
    }

    const symmetry = symmetryValues(weekItems);

    return {
      weekLabel: bucket.weekLabel,
      avgRom: meanOrZero(weekItems.map((item) => item.metrics!.avgRomDegrees)),
      symmetry: symmetry.length > 0 ? meanOrZero(symmetry) : null,
      sessions: weekItems.length,
    };
  });
}

export function aggregateJointRom(items: AccountActivityItem[]): JointRomAverage[] {
  const measured = itemsWithMetrics(items);
  const totals = new Map<MovementJoint, { sum: number; count: number }>();

  for (const item of measured) {
    for (const [joint, degrees] of Object.entries(item.metrics!.jointRom)) {
      // Older rows may carry joints we no longer derive (e.g. ankle).
      if (!(joint in JOINT_LABELS) || typeof degrees !== "number") continue;
      const key = joint as MovementJoint;
      const prev = totals.get(key) ?? { sum: 0, count: 0 };
      totals.set(key, { sum: prev.sum + degrees, count: prev.count + 1 });
    }
  }

  return [...totals.entries()]
    .map(([joint, { sum, count }]) => ({
      joint,
      label: JOINT_LABELS[joint],
      degrees: Math.round(sum / count),
    }))
    .sort((a, b) => b.degrees - a.degrees);
}
