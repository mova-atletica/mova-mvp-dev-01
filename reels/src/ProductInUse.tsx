import React, { useCallback, useRef } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Series,
  useCurrentFrame,
  useVideoConfig,
  type OnVideoFrame,
} from "remotion";
import { AngleSeriesChart } from "./chart/AngleSeriesChart";
import {
  buildGlassComposite,
  copyFrameToCanvas,
} from "./helpers/plateFrameCanvas";
import { computeEntryAnim } from "./helpers/entryAnim";
import {
  PoseOverlayCanvas,
  type PoseOverlayPaintApi,
} from "./overlay/PoseOverlayCanvas";
import type {
  ChartGlassTone,
  ProductInUseProps,
  ResolvedSegment,
} from "./types";
import {
  DEFAULT_CHART_H,
  DEFAULT_CHART_W,
  DEFAULT_CHART_X,
  DEFAULT_CHART_Y,
} from "./types";
import { CoverVideo } from "./ui/CoverVideo";
import { CtaOverlay } from "./ui/CtaOverlay";
import { GlassDeviceFrame } from "./ui/GlassDeviceFrame";

const DEVICE_BASE_W = 420;
const DEVICE_BASE_H = 760;

type ChartHudKnobs = {
  chartGlassTone: ChartGlassTone;
  glassOpacity: number;
  glassBlur: number;
  chartX: number;
  chartY: number;
  chartWidth: number;
  chartHeight: number;
};

function SegmentLayer({
  segment,
  localFrame,
  overlayOpacity,
  glass,
}: {
  segment: ResolvedSegment;
  localFrame: number;
  overlayOpacity: number;
  glass: ChartHudKnobs;
}) {
  const { width: compW, height: compH } = useVideoConfig();
  const plateCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeRef = useRef<HTMLCanvasElement | null>(null);
  const chipGlassSourceRef = useRef<CanvasImageSource | null>(null);
  const chartGlassSourceRef = useRef<CanvasImageSource | null>(null);
  const overlayApiRef = useRef<PoseOverlayPaintApi | null>(null);
  const chartPaintRef = useRef<(() => void) | null>(null);

  const refreshChartGlass = useCallback(() => {
    const plate = plateCanvasRef.current;
    const overlay = overlayApiRef.current?.getCanvas() ?? null;
    const composite = buildGlassComposite(
      compositeRef,
      plate,
      overlay,
      compW,
      compH
    );
    if (composite) {
      chartGlassSourceRef.current = composite;
      chartPaintRef.current?.();
    }
  }, [compW, compH]);

  const onPlateFrame = useCallback<OnVideoFrame>(
    (frame) => {
      const plate = copyFrameToCanvas(plateCanvasRef, frame);
      if (!plate) return;
      chipGlassSourceRef.current = plate;
      // Paint overlays (chips use visualConfig + plate for their own glass).
      overlayApiRef.current?.paint(plate);
      // If no overlay layer, still rebuild chart composite from plate alone.
      if (!overlayApiRef.current) {
        refreshChartGlass();
      }
    },
    [refreshChartGlass]
  );

  const hasPoses =
    segment.overlays === "on" &&
    Array.isArray(segment.poses) &&
    segment.poses.length > 0;

  const chart =
    segment.chart?.kind === "jointAngle" &&
    segment.angles &&
    Array.isArray(segment.angles[segment.chart.joint])
      ? segment.chart
      : null;

  return (
    <AbsoluteFill>
      <CoverVideo src={segment.plateUrl} muted={false} onVideoFrame={onPlateFrame} />
      {hasPoses ? (
        <PoseOverlayCanvas
          poses={segment.poses!}
          localFrame={localFrame}
          durationInFrames={segment.durationInFrames}
          visualConfig={segment.visualConfig}
          poseTimestamps={segment.poseTimestamps}
          frameIntervalSec={segment.frameIntervalSec}
          playbackPixelSize={segment.playbackPixelSize}
          opacity={overlayOpacity}
          chipGlassSourceRef={chipGlassSourceRef}
          paintApiRef={overlayApiRef}
          onPainted={refreshChartGlass}
        />
      ) : null}
      {chart ? (
        <AbsoluteFill style={{ opacity: overlayOpacity }}>
          <AngleSeriesChart
            angles={segment.angles!}
            joint={chart.joint}
            localFrame={localFrame}
            durationInFrames={segment.durationInFrames}
            x={glass.chartX}
            y={glass.chartY}
            width={glass.chartWidth}
            height={glass.chartHeight}
            glassOpacity={glass.glassOpacity}
            glassBlur={glass.glassBlur}
            chartGlassTone={glass.chartGlassTone}
            glassSourceRef={chartGlassSourceRef}
            paintTriggerRef={chartPaintRef}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}

function SegmentWithFrame({
  segment,
  overlayOpacity,
  glass,
}: {
  segment: ResolvedSegment;
  overlayOpacity: number;
  glass: ChartHudKnobs;
}) {
  const frame = useCurrentFrame();
  return (
    <SegmentLayer
      segment={segment}
      localFrame={frame}
      overlayOpacity={overlayOpacity}
      glass={glass}
    />
  );
}

export const ProductInUse: React.FC<ProductInUseProps> = (props) => {
  const frame = useCurrentFrame();

  const segments =
    props.segments?.length > 0
      ? props.segments
      : ([
          {
            plateUrl: "",
            durationInFrames: 240,
            chart: null,
            overlays: "off",
          },
        ] satisfies ResolvedSegment[]);

  const overlayStart = props.overlayStartFrame ?? 0;
  const overlayDur = Math.max(1, props.overlayAnimDurationFrames ?? 20);
  const overlayOpacity = interpolate(
    frame,
    [overlayStart, overlayStart + overlayDur],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const anim = computeEntryAnim({
    frame,
    uiStartFrame: props.uiStartFrame,
    uiAnimDurationFrames: props.uiAnimDurationFrames,
    entry: props.entry,
    parkX: props.x,
    parkY: props.y,
    parkScale: props.scale,
  });

  const deviceW = DEVICE_BASE_W * anim.scale;
  const deviceH = DEVICE_BASE_H * anim.scale;

  const glass: ChartHudKnobs = {
    chartGlassTone: props.chartGlassTone ?? "dark",
    glassOpacity: props.glassOpacity,
    glassBlur: props.glassBlur,
    chartX: props.chartX ?? DEFAULT_CHART_X,
    chartY: props.chartY ?? DEFAULT_CHART_Y,
    chartWidth: props.chartWidth ?? DEFAULT_CHART_W,
    chartHeight: props.chartHeight ?? DEFAULT_CHART_H,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#050506" }}>
      <Series>
        {segments.map((segment, i) => (
          <Series.Sequence
            key={`seg-${i}`}
            durationInFrames={Math.max(1, segment.durationInFrames)}
          >
            <SegmentWithFrame
              segment={segment}
              overlayOpacity={overlayOpacity}
              glass={glass}
            />
          </Series.Sequence>
        ))}
      </Series>

      {anim.opacity > 0.001 ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <GlassDeviceFrame
            uiSrc={props.uiSrc}
            width={deviceW}
            height={deviceH}
            borderRadius={props.borderRadius * anim.scale}
            glassBorderOpacity={props.glassBorderOpacity}
            glassShadow={props.glassShadow}
            style={{
              left: anim.left - deviceW / 2 + anim.translateX,
              top: anim.top - deviceH / 2 + anim.translateY,
              opacity: anim.opacity,
            }}
          />
        </AbsoluteFill>
      ) : null}

      {props.ctaText && props.ctaStartFrame != null ? (
        <CtaOverlay
          text={props.ctaText}
          startFrame={props.ctaStartFrame}
          durationFrames={props.ctaDurationFrames}
        />
      ) : null}
    </AbsoluteFill>
  );
};
