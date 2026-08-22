import type { Effect } from "./assetVideoTypes";

const DEFAULT_LABEL_CHIP = {
  labelBg: "glass" as const,
  labelBgColor: "#ffffff",
  labelBgOpacity: 0.22,
  labelBlurPx: 14,
};

/** Default per-effect config for Open Move / motion-explore overlays. */
export function getDefaultConfigForEffect(effect: Effect): Record<string, unknown> {
  switch (effect.id) {
    case "muybridge":
      return {
        gridSize: 3,
        gridRows: 3,
        gridCols: 3,
        padding: 0,
        frameStagger: 0.5,
        showBorders: true,
        borderColor: "#00ff00",
        borderWidth: 2,
      };
    case "motion-trails":
      return {
        trailLength: 10,
        trailOpacity: 0.6,
        trailStyle: "simple",
        fadeOut: true,
        color: "#ffffff",
        thickness: 2,
        showBones: true,
        boneColor: "#ffffff",
        boneThickness: 1,
      };
    case "joint-angles":
      return {
        showJointAngles: true,
        enabledJoints: ["left_elbow", "right_elbow"],
        angleColor: "#00ff00",
        angleSize: 12,
        showROM: false,
        romJoints: [],
        safeZoneEnabled: true,
        ...DEFAULT_LABEL_CHIP,
      };
    case "joint-angle-trace":
      return {
        safeZoneEnabled: true,
        jointAngleChartJointA: "left_knee",
        jointAngleChartJointB: "right_knee",
        jointAngleChartColorA: "#000000",
        jointAngleChartColorB: "#ffffff",
        jointAngleChartSecondSeries: true,
        jointAngleChartLineStyleA: "solid",
        jointAngleChartLineStyleB: "solid",
        jointAngleChartLineThickness: 2,
        jointAngleChartInterpolateGaps: true,
        jointAngleChartMaxInterpGapFrames: 20,
        jointAngleChartVerticalOffset: 0.5,
      };
    case "metrics-chips":
      return {
        showJointAngles: false,
        enabledJoints: [],
        showROM: false,
        romJoints: [],
        safeZoneEnabled: false,
        showMetricChips: true,
        metricChipLayout: "bottom_center_row",
        metricChipTextColor: "#ffffff",
        metricChipEdgeOffset: 0,
        metricChips: [],
        ...DEFAULT_LABEL_CHIP,
      };
    case "mobility-geometry":
      return {
        showMobilityGeometry: true,
        mobilityGeometryAxes: [
          {
            id: "axis-v-body",
            target: "body_center",
            orient: "vertical",
            color: "#ffffff",
            lineWidth: 1,
            lineLength: 220,
            lineStyle: "solid",
            capStyle: "tick",
            opacity: 0.9,
          },
          {
            id: "axis-h-hip",
            target: "hip_mid",
            orient: "horizontal",
            color: "#ffffff",
            lineWidth: 1,
            lineLength: 220,
            lineStyle: "solid",
            capStyle: "tick",
            opacity: 0.9,
          },
        ],
        mobilityGeometryArcs: [
          {
            id: "arc-left-hip",
            joint: "left_hip",
            color: "#ffffff",
            lineWidth: 1,
            lineStyle: "solid",
            arcRadius: 40,
            opacity: 0.9,
          },
        ],
      };
    case "skeleton-overlay":
      return {
        showSkeleton: true,
        boneColor: "#00ff00",
        jointColor: "#00ff00",
        boneWeight: 2,
        jointSize: 4,
        boneLineStyle: "solid",
        showJoints: true,
        showBones: true,
        selectedJoints: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        selectedBones: [
          "5-7",
          "7-9",
          "6-8",
          "8-10",
          "11-13",
          "13-15",
          "12-14",
          "14-16",
          "5-6",
          "11-12",
          "5-11",
          "6-12",
        ],
      };
    default:
      return {};
  }
}
