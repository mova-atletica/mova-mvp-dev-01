import type { OpenMoveActivityHydration } from "./loadActivityHydration";
import { smoothOpenMoveAngleSeries } from "./angleSeriesSmoothing";
import type {
  AngleSeries,
  ResolvedSegment,
  SegmentChartConfig,
  VisualOverlayPreset,
} from "../../reels/src/types";

const DEFAULT_SEGMENT_FRAMES = 240;

export type SegmentDraft = {
  source: "activity" | "media";
  activityId: string;
  plateSrc: string;
  chart: SegmentChartConfig;
  overlays: "on" | "off";
  durationInFrames?: number;
};

export function hydrationToAngleSeries(
  angles: OpenMoveActivityHydration["angles"] | null | undefined,
  smooth = true
): AngleSeries | null {
  if (!angles?.leftKneeAngles?.length) return null;
  if (!smooth) return angles as AngleSeries;
  return smoothOpenMoveAngleSeries(angles) as unknown as AngleSeries;
}

export function resolveSegmentFromHydration(
  draft: SegmentDraft,
  hydration: OpenMoveActivityHydration | null,
  fps: number
): { segment: ResolvedSegment | null; error: string | null } {
  const plateUrl =
    draft.source === "media"
      ? draft.plateSrc.trim()
      : hydration?.videoUrl ?? "";

  if (!plateUrl) {
    return {
      segment: null,
      error:
        draft.source === "media"
          ? "Media segment needs a plate file or URL"
          : "Activity has no signed video URL (metrics-only session?)",
    };
  }

  const durationInFrames =
    draft.durationInFrames ??
    (hydration?.frameIntervalSec && hydration.angles?.leftKneeAngles?.length
      ? Math.max(
          30,
          Math.round(
            hydration.angles.leftKneeAngles.length *
              hydration.frameIntervalSec *
              fps
          )
      )
      : DEFAULT_SEGMENT_FRAMES);

  const hasPoses = Array.isArray(hydration?.poses) && hydration!.poses.length > 0;

  const segment: ResolvedSegment = {
    plateUrl,
    durationInFrames,
    poses: hasPoses ? (hydration!.poses as ResolvedSegment["poses"]) : undefined,
    poseTimestamps: hydration?.poseTimestamps ?? null,
    frameIntervalSec: hydration?.frameIntervalSec ?? null,
    playbackPixelSize: hydration?.playbackPixelSize ?? null,
    visualConfig: (hydration?.visualConfig as VisualOverlayPreset | null) ?? null,
    angles: hydrationToAngleSeries(hydration?.angles, true),
    sportAnalysisKind: hydration?.sportAnalysisKind ?? null,
    sportAnalysis: hydration?.sportAnalysis ?? null,
    chart: draft.chart,
    overlays: draft.overlays === "on" && hasPoses ? "on" : "off",
  };

  return { segment, error: null };
}
