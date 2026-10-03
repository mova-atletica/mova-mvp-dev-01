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
import { computeEntryAnim, computeChartEntryAnim } from "./helpers/entryAnim";
import {
  PoseOverlayCanvas,
  type PoseOverlayPaintApi,
} from "./overlay/PoseOverlayCanvas";
import type {
  ChartGlassTone,
  JointAngleChart,
  ProductInUseProps,
  ResolvedSegment,
} from "./types";
import {
  DEFAULT_CHART_H,
  DEFAULT_CHART_W,
  DEFAULT_CHART_X,
  DEFAULT_CHART_Y,
  normalizeJointCharts,
  resolveChartLayout,
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
  defaultFadeStartFrame: number;
  defaultFadeDurationFrames: number;
};

function activeCharts(segment: ResolvedSegment): JointAngleChart[] {
  return normalizeJointCharts(segment.charts, segment.chart ?? null).filter(
    (c) => segment.angles && Array.isArray(segment.angles[c.joint])
  );
}

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
  const chartPaintRegisterRef = useRef<Set<() => void>>(new Set());

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
      for (const paint of chartPaintRegisterRef.current) {
        paint();
      }
    }
  }, [compW, compH]);

  const onPlateFrame = useCallback<OnVideoFrame>(
    (frame) => {
      const plate = copyFrameToCanvas(plateCanvasRef, frame);
      if (!plate) return;
      chipGlassSourceRef.current = plate;
      overlayApiRef.current?.paint(plate);
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

  const charts = activeCharts(segment);
  const layoutDefaults = {
    x: glass.chartX,
    y: glass.chartY,
    height: glass.chartHeight,
    fadeStartFrame: glass.defaultFadeStartFrame,
    fadeDurationFrames: glass.defaultFadeDurationFrames,
    entry: "fade" as const,
  };

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
      {charts.map((chart, i) => {
        const layout = resolveChartLayout(chart, i, layoutDefaults);
        const anim = computeChartEntryAnim({
          frame: localFrame,
          fadeStartFrame: layout.fadeStartFrame,
          fadeDurationFrames: layout.fadeDurationFrames,
          entry: layout.entry,
        });
        if (anim.opacity < 0.01) return null;
        return (
          <AbsoluteFill
            key={`${chart.joint}-${i}`}
            style={{
              opacity: anim.opacity,
              transform: `translate(${anim.translateX}px, ${anim.translateY}px) scale(${anim.scaleMul})`,
            }}
          >
            <AngleSeriesChart
              angles={segment.angles!}
              joint={chart.joint}
              localFrame={localFrame}
              durationInFrames={segment.durationInFrames}
              x={layout.x}
              y={layout.y}
              width={glass.chartWidth}
              height={glass.chartHeight}
              glassOpacity={glass.glassOpacity}
              glassBlur={glass.glassBlur}
              chartGlassTone={glass.chartGlassTone}
              glassSourceRef={chartGlassSourceRef}
              paintRegisterRef={chartPaintRegisterRef}
            />
          </AbsoluteFill>
        );
      })}
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
  const showUi = props.showUiDevice !== false;

  const segments =
    props.segments?.length > 0
      ? props.segments
      : ([
          {
            plateUrl: "",
            durationInFrames: 240,
            charts: [],
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

  const anim = showUi
    ? computeEntryAnim({
        frame,
        uiStartFrame: props.uiStartFrame,
        uiAnimDurationFrames: props.uiAnimDurationFrames,
        entry: props.entry,
        parkX: props.x,
        parkY: props.y,
        parkScale: props.scale,
      })
    : null;

  const deviceW = anim ? DEVICE_BASE_W * anim.scale : 0;
  const deviceH = anim ? DEVICE_BASE_H * anim.scale : 0;

  const glass: ChartHudKnobs = {
    chartGlassTone: props.chartGlassTone ?? "dark",
    glassOpacity: props.glassOpacity,
    glassBlur: props.glassBlur,
    chartX: props.chartX ?? DEFAULT_CHART_X,
    chartY: props.chartY ?? DEFAULT_CHART_Y,
    chartWidth: props.chartWidth ?? DEFAULT_CHART_W,
    chartHeight: props.chartHeight ?? DEFAULT_CHART_H,
    defaultFadeStartFrame: props.overlayStartFrame ?? 0,
    defaultFadeDurationFrames: props.overlayAnimDurationFrames ?? 20,
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

      {anim && anim.opacity > 0.001 ? (
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
