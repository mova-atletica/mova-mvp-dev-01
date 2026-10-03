import React, {
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import {
  applyBoneLineStyle,
  normalizeBoneLineStyle,
  resetBoneLineStyle,
} from "../../../src/lib/effects/skeletonOverlay";
import {
  extractJointAngles,
  renderJointAngles,
  renderMobilityGeometry,
  type StatsConfig,
} from "../../../src/lib/effects/stats";
import { poseIndexAtTime } from "../../../src/lib/poseIndexAtTime";
import type { PoseFrame, VisualOverlayPreset } from "../types";

/** COCO-17 bone pairs — same list as useAssetVideoEngine / exportService. */
const ALL_CONNECTIONS: [number, number][] = [
  [5, 7],
  [7, 9],
  [6, 8],
  [8, 10],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [5, 6],
  [11, 12],
  [5, 11],
  [6, 12],
];

const CONF_MIN = 0.3;

function getEffect(
  visualConfig: VisualOverlayPreset | null | undefined,
  id: string
): { enabled: boolean; config: Record<string, unknown> } | null {
  const e = visualConfig?.effects?.find((x) => x.id === id);
  if (!e) return null;
  return { enabled: e.enabled, config: e.config ?? {} };
}

function inferSourceSize(
  playbackPixelSize: { width: number; height: number } | null | undefined,
  kps: { x: number; y: number }[],
  fallbackW: number,
  fallbackH: number
): { sw: number; sh: number } {
  if (playbackPixelSize && playbackPixelSize.width > 1 && playbackPixelSize.height > 1) {
    return { sw: playbackPixelSize.width, sh: playbackPixelSize.height };
  }
  let maxX = 0;
  let maxY = 0;
  for (const kp of kps) {
    if (!kp) continue;
    if (kp.x > maxX) maxX = kp.x;
    if (kp.y > maxY) maxY = kp.y;
  }
  return {
    sw: maxX > 1 ? Math.ceil(maxX) : fallbackW,
    sh: maxY > 1 ? Math.ceil(maxY) : fallbackH,
  };
}

export type PoseOverlayPaintApi = {
  /** Paint overlays; optional plate for chip glass when visualConfig uses glass. */
  paint: (chipGlassSource?: CanvasImageSource | null) => void;
  getCanvas: () => HTMLCanvasElement | null;
};

type Props = {
  poses: PoseFrame[];
  localFrame: number;
  durationInFrames: number;
  visualConfig?: VisualOverlayPreset | null;
  poseTimestamps?: number[] | null;
  frameIntervalSec?: number | null;
  playbackPixelSize?: { width: number; height: number } | null;
  opacity?: number;
  /** Plate canvas for chip glass when visualConfig requests frosted labels. */
  chipGlassSourceRef?: React.MutableRefObject<CanvasImageSource | null>;
  paintApiRef?: React.MutableRefObject<PoseOverlayPaintApi | null>;
  /** Fired after each paint so parent can rebuild plate+overlay composite. */
  onPainted?: () => void;
};

/**
 * Draws activity visualConfig overlays in the same coordinate system as
 * object-fit:cover plate video. Pose index + skeleton draw match Open Move
 * account (useAssetVideoEngine / exportService): raw poses, poseIndexAtTime,
 * selectedBones.includes, score > 0.3.
 */
export const PoseOverlayCanvas: React.FC<Props> = ({
  poses,
  localFrame,
  durationInFrames,
  visualConfig,
  poseTimestamps,
  frameIntervalSec,
  playbackPixelSize,
  opacity = 1,
  chipGlassSourceRef,
  paintApiRef,
  onPainted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { width, height, fps } = useVideoConfig();

  const paint = useCallback(
    (chipGlassSource?: CanvasImageSource | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (opacity < 0.01) {
        onPainted?.();
        return;
      }

      const durationSec = durationInFrames / Math.max(1, fps);
      const idx = poseIndexAtTime(localFrame / fps, poses.length, {
        timestamps: poseTimestamps,
        frameIntervalSec,
        durationSec,
      });
      if (idx == null) {
        onPainted?.();
        return;
      }
      const pose = poses[idx];
      const kps = pose?.keypoints;
      if (!kps?.length) {
        onPainted?.();
        return;
      }

      const { sw, sh } = inferSourceSize(playbackPixelSize, kps, width, height);
      const coverScale = Math.max(width / sw, height / sh);
      const ox = (width - sw * coverScale) / 2;
      const oy = (height - sh * coverScale) / 2;

      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0, opacity));
      ctx.setTransform(coverScale, 0, 0, coverScale, ox, oy);

      const skeleton = getEffect(visualConfig, "skeleton-overlay");
      const jointAnglesFx = getEffect(visualConfig, "joint-angles");
      const mobility = getEffect(visualConfig, "mobility-geometry");

      const showSkeleton =
        skeleton?.enabled === true || !visualConfig?.effects?.length;
      const showJointsFx = jointAnglesFx?.enabled === true;
      const showMobility = mobility?.enabled === true;

      if (showSkeleton) {
        const cfg = skeleton?.config ?? {};
        const showBones = cfg.showBones !== false;
        const showJoints = cfg.showJoints !== false;
        const boneColor = (cfg.boneColor as string) || "#00ff00";
        const jointColor = (cfg.jointColor as string) || "#00ff00";
        const boneWeight =
          typeof cfg.boneWeight === "number" ? cfg.boneWeight : 2;
        const jointSize = typeof cfg.jointSize === "number" ? cfg.jointSize : 4;
        const boneLineStyle = normalizeBoneLineStyle(cfg.boneLineStyle);
        const selectedBones = Array.isArray(cfg.selectedBones)
          ? (cfg.selectedBones as string[])
          : null;
        const selectedJoints = Array.isArray(cfg.selectedJoints)
          ? (cfg.selectedJoints as number[])
          : null;

        if (showBones) {
          ctx.strokeStyle = boneColor;
          ctx.lineWidth = boneWeight;
          for (const [start, end] of ALL_CONNECTIONS) {
            const key = `${start}-${end}`;
            // Match account: require selectedBones.includes(key). If unset, draw all
            // connections so recipes without a saved bone list still show a skeleton.
            if (selectedBones && !selectedBones.includes(key)) continue;
            const startPoint = kps[start];
            const endPoint = kps[end];
            // Same gate as useAssetVideoEngine: score > 0.3 (undefined fails).
            if (
              !startPoint ||
              !endPoint ||
              !((startPoint.score ?? 0) > CONF_MIN) ||
              !((endPoint.score ?? 0) > CONF_MIN)
            ) {
              continue;
            }
            applyBoneLineStyle(ctx, boneLineStyle);
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
            resetBoneLineStyle(ctx);
          }
        }

        if (showJoints) {
          ctx.fillStyle = jointColor;
          for (let i = 0; i < kps.length; i++) {
            // Match account when selectedJoints is set; otherwise draw all confident joints.
            if (selectedJoints && !selectedJoints.includes(i)) continue;
            const kp = kps[i];
            if (!kp || !((kp.score ?? 0) > CONF_MIN)) continue;
            ctx.beginPath();
            ctx.arc(kp.x, kp.y, jointSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      if (showMobility && mobility) {
        const cfg = {
          ...mobility.config,
          showMobilityGeometry: true,
        } as Partial<StatsConfig>;
        renderMobilityGeometry(ctx, poses as any[], cfg, idx);
      }

      if (showJointsFx && jointAnglesFx) {
        // Chip styling comes from activity visualConfig only.
        const cfg = {
          ...jointAnglesFx.config,
          showJointAngles: true,
        } as Partial<StatsConfig>;

        const jointAngles = extractJointAngles(poses as any[], idx);
        const source =
          chipGlassSource ?? chipGlassSourceRef?.current ?? null;
        renderJointAngles(ctx, jointAngles, cfg, source);
      }

      ctx.restore();
      onPainted?.();
    },
    [
      poses,
      localFrame,
      durationInFrames,
      visualConfig,
      poseTimestamps,
      frameIntervalSec,
      playbackPixelSize,
      opacity,
      chipGlassSourceRef,
      onPainted,
      width,
      height,
      fps,
    ]
  );

  useLayoutEffect(() => {
    if (!paintApiRef) return;
    paintApiRef.current = {
      paint,
      getCanvas: () => canvasRef.current,
    };
    return () => {
      paintApiRef.current = null;
    };
  }, [paint, paintApiRef]);

  useLayoutEffect(() => {
    paint(chipGlassSourceRef?.current ?? null);
  }, [paint, chipGlassSourceRef]);

  if (opacity < 0.01) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </AbsoluteFill>
  );
};
