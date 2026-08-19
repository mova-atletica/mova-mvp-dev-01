import { renderMotionTrails } from './motion-trails';
import { sortEffectsByOverlayDrawOrder } from './overlayDrawOrder';
import { renderJointAngleTraceOverlay, renderStats, type StatsConfig } from './stats';
import { poseIndexAtTime, type PoseTimeline } from '../poseIndexAtTime';

export interface MuybridgeTileRendererOptions {
  activeEffects: Array<{
    enabled: boolean;
    effect: { id: string };
    config: Record<string, unknown>;
  }>;
  sharedStatsSnapshot?: Pick<StatsConfig, 'sportAnalysisKind' | 'sportMetricsSnapshot'>;
  isExport?: boolean;
  timeline?: PoseTimeline | null;
}

function renderSkeletonOverlayForTile(
  frameCtx: CanvasRenderingContext2D,
  frameVideo: HTMLVideoElement,
  framePoses: any[],
  frameTime: number,
  config: Record<string, unknown>,
  timeline?: PoseTimeline | null
): void {
  if (!framePoses?.length) return;

  const currentFrameIndex = poseIndexAtTime(frameTime, framePoses.length, {
    timestamps: timeline?.timestamps,
    frameIntervalSec: timeline?.frameIntervalSec,
    durationSec: frameVideo.duration,
  });
  if (currentFrameIndex == null || currentFrameIndex >= framePoses.length) return;

  const pose = framePoses[currentFrameIndex];
  if (!pose?.keypoints) return;

  const keypoints = pose.keypoints;
  const allConnections: [number, number][] = [
    [5, 7], [7, 9],
    [6, 8], [8, 10],
    [11, 13], [13, 15],
    [12, 14], [14, 16],
    [5, 6],
    [11, 12],
    [5, 11],
    [6, 12],
  ];

  frameCtx.save();

  if (config.showBones) {
    frameCtx.strokeStyle = (config.boneColor as string) || '#00ff00';
    frameCtx.lineWidth = (config.boneWeight as number) || 2;

    const selectedBones = config.selectedBones as string[] | undefined;
    allConnections.forEach(([start, end]) => {
      const key = `${start}-${end}`;
      if (selectedBones && !selectedBones.includes(key)) return;

      const startPoint = keypoints[start];
      const endPoint = keypoints[end];

      if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
        frameCtx.beginPath();
        frameCtx.moveTo(startPoint.x, startPoint.y);
        frameCtx.lineTo(endPoint.x, endPoint.y);
        frameCtx.stroke();
      }
    });
  }

  if (config.showJoints) {
    frameCtx.fillStyle = (config.jointColor as string) || '#00ff00';
    const selectedJoints = config.selectedJoints as number[] | undefined;
    const jointSize = (config.jointSize as number) || 4;

    keypoints.forEach((keypoint: { score: number; x: number; y: number }, idx: number) => {
      if (keypoint.score > 0.3 && selectedJoints?.includes(idx)) {
        frameCtx.beginPath();
        frameCtx.arc(keypoint.x, keypoint.y, jointSize, 0, 2 * Math.PI);
        frameCtx.fill();
      }
    });
  }

  frameCtx.restore();
}

/**
 * Renders all non-muybridge effects onto a single Muybridge tile canvas.
 * Shared by live preview (useAssetVideoEngine) and export (exportService).
 */
export function renderMuybridgeTileEffects(
  frameCtx: CanvasRenderingContext2D,
  frameVideo: HTMLVideoElement,
  framePoses: any[],
  frameTime: number,
  options: MuybridgeTileRendererOptions
): void {
  const { activeEffects, sharedStatsSnapshot = {}, isExport = false, timeline = null } = options;

  for (const effect of activeEffects) {
    if (!effect.enabled || effect.effect.id === 'muybridge') continue;

    switch (effect.effect.id) {
      case 'motion-trails':
        renderMotionTrails(
          frameCtx,
          frameVideo,
          framePoses,
          effect.config,
          frameTime,
          isExport,
          timeline
        );
        break;
      case 'skeleton-overlay':
        renderSkeletonOverlayForTile(
          frameCtx,
          frameVideo,
          framePoses,
          frameTime,
          effect.config,
          timeline
        );
        break;
      default:
        break;
    }
  }

  for (const effect of sortEffectsByOverlayDrawOrder(activeEffects)) {
    if (!effect.enabled || effect.effect.id === 'muybridge') continue;

    switch (effect.effect.id) {
      case 'joint-angle-trace':
        if (framePoses?.length) {
          renderJointAngleTraceOverlay(
            frameCtx,
            frameVideo,
            framePoses,
            effect.config,
            frameTime,
            isExport,
            timeline
          );
        }
        break;
      case 'joint-angles':
      case 'range-of-motion':
      case 'metrics-chips':
      case 'mobility-geometry':
        if (framePoses?.length) {
          renderStats(
            frameCtx,
            frameVideo,
            framePoses,
            { ...effect.config, ...sharedStatsSnapshot },
            frameTime,
            isExport,
            timeline
          );
        }
        break;
      default:
        break;
    }
  }
}
