import type { OpenMoveActivityHydration } from "./loadActivityHydration";
import { smoothOpenMoveAngleSeries } from "./angleSeriesSmoothing";
import type {
  AngleSeries,
  JointAngleChart,
  PoseFrame,
  ResolvedSegment,
  VisualOverlayPreset,
} from "../../reels/src/types";
import { normalizeJointCharts } from "../../reels/src/types";

const DEFAULT_SEGMENT_FRAMES = 240;

export type SegmentDraft = {
  source: "activity" | "media";
  activityId: string;
  plateSrc: string;
  charts: JointAngleChart[];
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

/**
 * Raw activity poses for reel overlays — same source as Open Move account /
 * useAssetVideoEngine. Do not Coach-smooth here: that drops keypoints and
 * shifts COCO indices so index-based bones/joints break.
 */
export function hydrationToPoses(
  poses: OpenMoveActivityHydration["poses"] | null | undefined
): PoseFrame[] | undefined {
  if (!Array.isArray(poses) || poses.length === 0) return undefined;
  return poses as PoseFrame[];
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

  const poses = hydrationToPoses(hydration?.poses);
  const hasPoses = Boolean(poses?.length);

  const charts = normalizeJointCharts(draft.charts, null);

  const segment: ResolvedSegment = {
    plateUrl,
    durationInFrames,
    poses,
    poseTimestamps: hydration?.poseTimestamps ?? null,
    frameIntervalSec: hydration?.frameIntervalSec ?? null,
    playbackPixelSize: hydration?.playbackPixelSize ?? null,
    visualConfig: (hydration?.visualConfig as VisualOverlayPreset | null) ?? null,
    angles: hydrationToAngleSeries(hydration?.angles, true),
    sportAnalysisKind: hydration?.sportAnalysisKind ?? null,
    sportAnalysis: hydration?.sportAnalysis ?? null,
    charts,
    chart: charts[0] ?? null,
    overlays: draft.overlays === "on" && hasPoses ? "on" : "off",
  };

  return { segment, error: null };
}
