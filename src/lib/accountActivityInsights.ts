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

const GENERIC_TAGS = new Set([
  "studio",
  "program",
  "export-ready",
  "coach-studio",
  "ios_3d_live_arkit",
  "ios_vision_live",
  "ios_3d_vision",
]);

const JOINT_LABELS: Record<MovementJoint, string> = {
  knee: "Knee",
  hip: "Hip",
  shoulder: "Shoulder",
  spine: "Spine",
  elbow: "Elbow",
};

const JOINT_ROM_TREND_ORDER: MovementJoint[] = [
  "knee",
  "hip",
  "elbow",
  "shoulder",
  "spine",
];

function itemsWithMetrics(items: AccountActivityItem[]): AccountActivityItem[] {
  return items.filter((item) => item.metrics);
}

const TAG_LABELS: Record<string, string> = {
  squat: "Squat",
  plank: "Plank",
  "pull-ups": "Pull-ups",
  pullups: "Pull-ups",
  pushups: "Push-ups",
  "push-ups": "Push-ups",
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
  // Match session-volume chart / legend order: Exercises → Studio → Programs
  const order: Array<"mini-app" | "studio" | "program"> = ["mini-app", "studio", "program"];
  return order
    .filter((kind) => counts[kind] > 0)
    .map((kind) => ({ kind, count: counts[kind] }));
}

export function aggregateMovementTags(items: AccountActivityItem[]): MovementTagCount[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    const tags = item.tags?.length ? item.tags : [item.kind];
    for (const tag of tags) {
      if (GENERIC_TAGS.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
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

export type AccountSportTrendKey = "studio" | "pullups" | "pushups" | "squat" | "plank";

export const SPORT_TREND_ORDER: AccountSportTrendKey[] = [
  "studio",
  "pullups",
  "pushups",
  "squat",
  "plank",
];

const RELEVANT_ROM_JOINTS: Record<AccountSportTrendKey, MovementJoint[]> = {
  pullups: ["elbow", "shoulder"],
  pushups: ["elbow", "shoulder"],
  squat: ["knee", "hip"],
  plank: ["hip", "spine"],
  studio: ["knee", "hip", "elbow", "shoulder", "spine"],
};

export function relevantRomJointsForSport(key: AccountSportTrendKey): MovementJoint[] {
  return RELEVANT_ROM_JOINTS[key];
}

export function jointRomLabel(joint: MovementJoint): string {
  return JOINT_LABELS[joint];
}

export type SportPrimaryMetricKind = "reps" | "hold" | "duration";

export interface SportTrendPoint {
  periodKey: string;
  periodLabel: string;
  detailPeriodLabel: string;
  primaryValue: number;
  romDegrees: number | null;
  symmetryScore: number | null;
  sessions: number;
}

export interface SportJointRomTrendPoint {
  periodKey: string;
  periodLabel: string;
  detailPeriodLabel: string;
  sessions: number;
  joints: Partial<Record<MovementJoint, number>>;
}

function parseMetricValueText(text: string | undefined): number | null {
  if (!text?.trim()) return null;
  const trimmed = text.trim();
  if (/^\d+:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  const num = Number.parseFloat(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(num) ? num : null;
}

export function primaryMetricValue(item: AccountActivityItem): number | null {
  if (item.metricNumeric != null && Number.isFinite(item.metricNumeric)) {
    return item.metricNumeric;
  }
  return parseMetricValueText(item.metricValue);
}

export function sportTrendKeyForItem(item: AccountActivityItem): AccountSportTrendKey | null {
  if (item.kind === "studio" || item.kind === "coach") return "studio";
  const slug = item.sportSlug?.toLowerCase();
  if (slug === "pullups" || slug === "pull-ups") return "pullups";
  if (slug === "pushups" || slug === "push-ups") return "pushups";
  if (slug === "squat" || slug === "squats") return "squat";
  if (slug === "plank") return "plank";
  return null;
}

export function availableSportTrendKeys(items: AccountActivityItem[]): AccountSportTrendKey[] {
  const found = new Set<AccountSportTrendKey>();
  for (const item of items) {
    const key = sportTrendKeyForItem(item);
    if (key) found.add(key);
  }
  return SPORT_TREND_ORDER.filter((key) => found.has(key));
}

export function preferredSportTrendKey(items: AccountActivityItem[]): AccountSportTrendKey | null {
  const available = availableSportTrendKeys(items);
  if (available.length === 0) return null;
  const sorted = [...items].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );
  for (const item of sorted) {
    const key = sportTrendKeyForItem(item);
    if (key && available.includes(key)) return key;
  }
  return available[0];
}

export function sportPrimaryMetricKind(key: AccountSportTrendKey): SportPrimaryMetricKind {
  if (key === "plank") return "hold";
  if (key === "studio") return "duration";
  return "reps";
}

export function sportTrendGranularity(range: ChartTimeRange): "day" | "week" | "month" {
  if (range === "week") return "day";
  if (range === "month") return "week";
  return "month";
}

export function sportTrendShowsLast12MonthsNote(range: ChartTimeRange): boolean {
  return range === "all";
}

export function formatSportPrimaryMetric(
  value: number,
  kind: SportPrimaryMetricKind
): string {
  if (kind === "reps") {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }
  const secs = Math.round(value);
  if (secs >= 60) {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  return String(secs);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatMonthAxisLabel(date: Date, range: ChartTimeRange): string {
  if (range === "ytd") {
    return date.toLocaleDateString(undefined, { month: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function formatDetailPeriodLabel(date: Date, granularity: "day" | "week" | "month"): string {
  if (granularity === "month") {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface SportTrendBucketSpec {
  start: Date;
  end: Date;
  axisLabel: string;
  detailLabel: string;
  periodKey: string;
}

function sportItemsForRange(
  items: AccountActivityItem[],
  range: ChartTimeRange
): AccountActivityItem[] {
  if (range === "all") {
    const anchor = activityAnchorDate(items);
    const start = startOfMonth(anchor);
    start.setMonth(start.getMonth() - 11);
    return items.filter((item) => new Date(item.occurredAt).getTime() >= start.getTime());
  }
  return filterActivityByTimeRange(items, range);
}

function buildSportTrendBuckets(
  items: AccountActivityItem[],
  range: ChartTimeRange
): SportTrendBucketSpec[] {
  const anchor = activityAnchorDate(items);
  const granularity = sportTrendGranularity(range);

  if (range === "week") {
    const weekStart = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const start = new Date(weekStart);
      start.setDate(start.getDate() + i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        start,
        end,
        axisLabel: formatPeriodLabel(start),
        detailLabel: formatDetailPeriodLabel(start, "day"),
        periodKey: start.toISOString().slice(0, 10),
      };
    });
  }

  if (range === "month") {
    const endWeek = startOfWeek(anchor);
    return Array.from({ length: 5 }, (_, i) => {
      const start = new Date(endWeek);
      start.setDate(start.getDate() - (4 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        start,
        end,
        axisLabel: formatPeriodLabel(start),
        detailLabel: formatDetailPeriodLabel(start, "week"),
        periodKey: start.toISOString().slice(0, 10),
      };
    });
  }

  if (range === "ytd") {
    const specs: SportTrendBucketSpec[] = [];
    const year = anchor.getFullYear();
    for (let month = 0; month <= anchor.getMonth(); month += 1) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 1);
      specs.push({
        start,
        end,
        axisLabel: formatMonthAxisLabel(start, range),
        detailLabel: formatDetailPeriodLabel(start, "month"),
        periodKey: `${year}-${String(month + 1).padStart(2, "0")}`,
      });
    }
    return specs;
  }

  const specs: SportTrendBucketSpec[] = [];
  const endMonth = startOfMonth(anchor);
  for (let offset = 11; offset >= 0; offset -= 1) {
    const start = new Date(endMonth);
    start.setMonth(start.getMonth() - offset);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    specs.push({
      start,
      end,
      axisLabel: formatMonthAxisLabel(start, range),
      detailLabel: formatDetailPeriodLabel(start, "month"),
      periodKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return specs;
}

function romForSportItem(
  item: AccountActivityItem,
  key: AccountSportTrendKey
): number | null {
  const metrics = item.metrics;
  if (!metrics) return null;
  switch (key) {
    case "pullups":
    case "pushups":
      return typeof metrics.jointRom.elbow === "number" ? metrics.jointRom.elbow : null;
    case "squat":
      return typeof metrics.jointRom.knee === "number" ? metrics.jointRom.knee : null;
    case "plank":
      return typeof metrics.jointRom.hip === "number" ? metrics.jointRom.hip : null;
    case "studio":
      return metrics.avgRomDegrees;
    default:
      return null;
  }
}

function symmetryForSportItem(
  item: AccountActivityItem,
  key: AccountSportTrendKey
): number | null {
  if (key === "pushups" || key === "squat" || key === "plank") return null;
  const metrics = item.metrics;
  if (!metrics) return null;
  if (key === "pullups") {
    return metrics.panelJointStats?.symmetry.elbow ?? metrics.symmetryScore;
  }
  if (key === "studio") {
    const symmetry = metrics.panelJointStats?.symmetry;
    if (symmetry) {
      const values = [symmetry.knee, symmetry.hip, symmetry.elbow, symmetry.shoulder].filter(
        (value): value is number => typeof value === "number"
      );
      if (values.length > 0) return Math.round(meanOrZero(values));
    }
    return metrics.symmetryScore;
  }
  return null;
}

function averageDefined(values: number[]): number | null {
  if (values.length === 0) return null;
  return meanOrZero(values);
}

function sumDefined(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

export function aggregateSportTrends(
  items: AccountActivityItem[],
  sportKey: AccountSportTrendKey,
  range: ChartTimeRange
): SportTrendPoint[] {
  const sportItems = items.filter((item) => sportTrendKeyForItem(item) === sportKey);
  const rangedItems = sportItemsForRange(sportItems, range);
  const buckets = buildSportTrendBuckets(rangedItems.length > 0 ? rangedItems : sportItems, range);
  const points: SportTrendPoint[] = [];

  for (const bucket of buckets) {
    const bucketItems = rangedItems.filter((item) => {
      const t = new Date(item.occurredAt).getTime();
      return t >= bucket.start.getTime() && t < bucket.end.getTime();
    });
    if (bucketItems.length === 0) continue;

    const primaryValues = bucketItems
      .map((item) => primaryMetricValue(item))
      .filter((value): value is number => value != null);
    if (primaryValues.length === 0) continue;

    const romValues = bucketItems
      .map((item) => romForSportItem(item, sportKey))
      .filter((value): value is number => value != null);
    const symmetryValues = bucketItems
      .map((item) => symmetryForSportItem(item, sportKey))
      .filter((value): value is number => value != null);

    points.push({
      periodKey: bucket.periodKey,
      periodLabel: bucket.axisLabel,
      detailPeriodLabel: bucket.detailLabel,
      primaryValue: sumDefined(primaryValues),
      romDegrees: averageDefined(romValues),
      symmetryScore: averageDefined(symmetryValues),
      sessions: bucketItems.length,
    });
  }

  return points;
}

export function aggregateSportJointRomTrends(
  items: AccountActivityItem[],
  sportKey: AccountSportTrendKey,
  range: ChartTimeRange
): SportJointRomTrendPoint[] {
  const relevantJoints = RELEVANT_ROM_JOINTS[sportKey];
  const sportItems = items.filter((item) => sportTrendKeyForItem(item) === sportKey);
  const rangedItems = sportItemsForRange(sportItems, range);
  const buckets = buildSportTrendBuckets(rangedItems.length > 0 ? rangedItems : sportItems, range);
  const points: SportJointRomTrendPoint[] = [];

  for (const bucket of buckets) {
    const bucketItems = rangedItems.filter((item) => {
      const t = new Date(item.occurredAt).getTime();
      return t >= bucket.start.getTime() && t < bucket.end.getTime();
    });
    if (bucketItems.length === 0) continue;

    const joints: Partial<Record<MovementJoint, number>> = {};
    let hasAnyJoint = false;
    for (const joint of relevantJoints) {
      const values = bucketItems
        .map((item) => item.metrics?.jointRom?.[joint])
        .filter((value): value is number => typeof value === "number");
      const avg = averageDefined(values);
      if (avg != null) {
        joints[joint] = avg;
        hasAnyJoint = true;
      }
    }
    if (!hasAnyJoint) continue;

    points.push({
      periodKey: bucket.periodKey,
      periodLabel: bucket.axisLabel,
      detailPeriodLabel: bucket.detailLabel,
      sessions: bucketItems.length,
      joints,
    });
  }

  return points;
}

export function activeJointsInRomTrends(
  points: SportJointRomTrendPoint[]
): MovementJoint[] {
  const found = new Set<MovementJoint>();
  for (const point of points) {
    for (const joint of Object.keys(point.joints) as MovementJoint[]) {
      if (typeof point.joints[joint] === "number") found.add(joint);
    }
  }
  return JOINT_ROM_TREND_ORDER.filter((joint) => found.has(joint));
}
