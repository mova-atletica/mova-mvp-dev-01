/** Angle series shape — mirrors OpenMoveAngleSeries in the main app. */
export type AngleSeries = {
  leftKneeAngles: (number | null)[];
  rightKneeAngles: (number | null)[];
  leftHipAngles: (number | null)[];
  rightHipAngles: (number | null)[];
  leftElbowAngles: (number | null)[];
  rightElbowAngles: (number | null)[];
  leftShoulderAbdAngles: (number | null)[];
  rightShoulderAbdAngles: (number | null)[];
  trunkAngles: (number | null)[];
};

export type AngleJointKey = keyof AngleSeries;

export type EntryPreset = "bottom" | "side" | "sideLeft" | "scale" | "fade";

/** Active chart slot (never null). Per-chart layout + fade are optional. */
export type JointAngleChart = {
  kind: "jointAngle";
  joint: AngleJointKey;
  /** Normalized composition X (falls back to recipe chartX). */
  x?: number;
  /** Normalized composition Y (falls back to recipe chartY + stack). */
  y?: number;
  /** Segment-local fade-in start frame. */
  fadeStartFrame?: number;
  /** Segment-local fade-in duration in frames. */
  fadeDurationFrames?: number;
  /** Slide/fade entry direction (same presets as UI device). */
  entry?: EntryPreset;
};

export type SegmentChartConfig =
  | null
  | JointAngleChart
  | { kind: "sport"; seriesKey: string };

/** Normalize draft/legacy chart fields into a joint-angle list. */
export function normalizeJointCharts(
  charts?: JointAngleChart[] | null,
  legacy?: SegmentChartConfig | null
): JointAngleChart[] {
  if (Array.isArray(charts) && charts.length > 0) {
    return charts.filter((c): c is JointAngleChart => c?.kind === "jointAngle");
  }
  if (legacy?.kind === "jointAngle") return [legacy];
  return [];
}

/** Chart HUD frosted panel tint. */
export type ChartGlassTone = "light" | "dark";

export const CHART_GLASS_TINT: Record<ChartGlassTone, string> = {
  light: "#ffffff",
  dark: "#0c0c10",
};

/** Minimal visual-config effect entry (from activity visualConfig). */
export type OverlayEffectConfig = {
  id: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
};

export type VisualOverlayPreset = {
  version: number;
  updatedAt: string;
  effects: OverlayEffectConfig[];
};

export type PoseKeypoint = {
  x: number;
  y: number;
  score?: number;
  name?: string;
};

export type PoseFrame = {
  keypoints?: PoseKeypoint[];
};

export type ResolvedSegment = {
  plateUrl: string;
  durationInFrames: number;
  poses?: PoseFrame[];
  poseTimestamps?: number[] | null;
  frameIntervalSec?: number | null;
  /** Native plate video size — required for keypoint → cover alignment */
  playbackPixelSize?: { width: number; height: number } | null;
  visualConfig?: VisualOverlayPreset | null;
  angles?: AngleSeries | null;
  sportAnalysisKind?: string | null;
  sportAnalysis?: unknown | null;
  /** HUD chart slots (0+). Prefer this over legacy `chart`. */
  charts: JointAngleChart[];
  /** @deprecated Use `charts`. Kept for older props / Studio demos. */
  chart?: SegmentChartConfig;
  overlays: "on" | "off";
};

export type RecipeKnobs = {
  id: string;
  fps: number;
  activityIds?: string[];
  uiSrc: string;
  /** When false, skip UI device frame + entry animation. */
  showUiDevice?: boolean;
  uiStartFrame: number;
  uiAnimDurationFrames: number;
  entry: EntryPreset;
  x: number;
  y: number;
  scale: number;
  borderRadius: number;
  /** @deprecated Prefer chartGlassTone for chart HUD. Kept for recipe compat. */
  glassColor: string;
  glassOpacity: number;
  glassBlur: number;
  /** Chart HUD frosted panel: light or dark tint over plate+overlays. */
  chartGlassTone?: ChartGlassTone;
  /** Chart HUD position/size (normalized 0–1 of composition). */
  chartX?: number;
  chartY?: number;
  chartWidth?: number;
  chartHeight?: number;
  glassBorderOpacity?: number;
  glassShadow?: number;
  ctaText?: string;
  ctaStartFrame?: number;
  ctaDurationFrames?: number;
  /** Overlay fade-in (composition timeline) */
  overlayStartFrame?: number;
  overlayAnimDurationFrames?: number;
  segmentChartDefaults?: SegmentChartConfig[];
};

export type ProductInUseProps = RecipeKnobs & {
  segments: ResolvedSegment[];
};

export const COMP_WIDTH = 1080;
export const COMP_HEIGHT = 1920;
export const DEFAULT_FPS = 30;

/** Soft park bounds (normalized). Y can sit quite low for bottom-third UI. */
export const SAFE_X_MAX = 0.82;
export const SAFE_Y_MAX = 0.9;
export const SAFE_X_MIN = 0.12;
export const SAFE_Y_MIN = 0.1;

/**
 * Soft chart HUD bounds — keep clear of typical IG Reels chrome
 * (top status/username band, right action rail).
 */
export const CHART_X_MIN = 0.04;
export const CHART_X_MAX = 0.55;
export const CHART_Y_MIN = 0.06;
export const CHART_Y_MAX = 0.7;
export const CHART_W_MIN = 0.28;
export const CHART_W_MAX = 0.7;
export const CHART_H_MIN = 0.06;
export const CHART_H_MAX = 0.32;

export const DEFAULT_CHART_X = 0.08;
export const DEFAULT_CHART_Y = 0.15;
export const DEFAULT_CHART_W = 0.42;
export const DEFAULT_CHART_H = 0.18;
/** Vertical gap between stacked HUD charts (normalized). */
export const CHART_STACK_GAP = 0.02;

export type ChartLayoutDefaults = {
  x: number;
  y: number;
  height: number;
  fadeStartFrame: number;
  fadeDurationFrames: number;
  entry: EntryPreset;
};

/** Resolve per-chart position + fade with recipe fallbacks / stack offset. */
export function resolveChartLayout(
  chart: JointAngleChart,
  index: number,
  defaults: ChartLayoutDefaults
): {
  x: number;
  y: number;
  fadeStartFrame: number;
  fadeDurationFrames: number;
  entry: EntryPreset;
} {
  return {
    x: typeof chart.x === "number" ? chart.x : defaults.x,
    y:
      typeof chart.y === "number"
        ? chart.y
        : defaults.y + index * (defaults.height + CHART_STACK_GAP),
    fadeStartFrame:
      typeof chart.fadeStartFrame === "number"
        ? chart.fadeStartFrame
        : defaults.fadeStartFrame,
    fadeDurationFrames: Math.max(
      1,
      typeof chart.fadeDurationFrames === "number"
        ? chart.fadeDurationFrames
        : defaults.fadeDurationFrames
    ),
    entry: chart.entry ?? defaults.entry,
  };
}
