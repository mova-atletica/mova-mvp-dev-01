export type PoseFlexibilitySide = "left" | "right";

export type PoseFlexibilityFocusArea = "legs" | "hips" | "torso" | "shoulders";

export interface PoseFlexibilityAnalysisInput {
  poses: any[];
  frameIntervalSec: number;
  side: PoseFlexibilitySide;
  focusAreas: PoseFlexibilityFocusArea[];
}

export interface PoseFlexibilityFocusMetric {
  focusArea: PoseFlexibilityFocusArea;
  label: string;
  value: number;
  unit: "deg";
  valueLabel: string;
  description: string;
  avgDeg?: number;
  minDeg?: number;
  maxDeg?: number;
  rangeDeg?: number;
  seriesKey?: string;
}

export interface PoseFlexibilityChartSeries {
  key: string;
  label: string;
  focusArea: PoseFlexibilityFocusArea;
  values: (number | null)[];
}

export interface PoseFlexibilityAnalysisResult {
  schemaVersion: 1;
  sideUsed: PoseFlexibilitySide;
  focusAreas: PoseFlexibilityFocusArea[];
  durationSec: number;
  validFramePct: number;
  focusMetrics: PoseFlexibilityFocusMetric[];
  chartSeries: PoseFlexibilityChartSeries[];
}

export type PoseFlexibilityAnalysisResponse =
  | { ok: true; result: PoseFlexibilityAnalysisResult }
  | { ok: false; error: string };
