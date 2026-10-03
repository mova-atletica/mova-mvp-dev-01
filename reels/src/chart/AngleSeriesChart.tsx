import React, { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { drawGlassBackground } from "../../../src/lib/canvasGlassChip";
import type { AngleJointKey, AngleSeries, ChartGlassTone } from "../types";
import { CHART_GLASS_TINT } from "../types";

const JOINT_LABELS: Partial<Record<AngleJointKey, string>> = {
  leftKneeAngles: "L Knee",
  rightKneeAngles: "R Knee",
  leftHipAngles: "L Hip",
  rightHipAngles: "R Hip",
  leftElbowAngles: "L Elbow",
  rightElbowAngles: "R Elbow",
  leftShoulderAbdAngles: "L Shoulder",
  rightShoulderAbdAngles: "R Shoulder",
  trunkAngles: "Trunk",
};

/** Plot inset so stroke stays inside the glass card (viewBox 0–100). */
const PAD = 6;
const RADIUS = 16;

type Props = {
  angles: AngleSeries;
  joint: AngleJointKey;
  localFrame: number;
  durationInFrames: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  glassOpacity?: number;
  glassBlur?: number;
  chartGlassTone?: ChartGlassTone;
  /** Composition-sized plate+overlay composite for frost sampling. */
  glassSourceRef?: React.MutableRefObject<CanvasImageSource | null>;
  /** Parent registers paint callbacks so multi-chart glass stays in sync. */
  paintRegisterRef?: React.MutableRefObject<Set<() => void>>;
};

/**
 * Chart glass is drawn on canvas (not CSS backdrop-filter) so web-renderer
 * export matches Player preview. Samples plate+overlays composite.
 */
export const AngleSeriesChart: React.FC<Props> = ({
  angles,
  joint,
  localFrame,
  durationInFrames,
  x = 0.08,
  y = 0.15,
  width = 0.42,
  height = 0.18,
  glassOpacity = 0,
  glassBlur = 5,
  chartGlassTone = "dark",
  glassSourceRef,
  paintRegisterRef,
}) => {
  const glassCanvasRef = useRef<HTMLCanvasElement>(null);
  const { width: compW, height: compH } = useVideoConfig();

  const tint = CHART_GLASS_TINT[chartGlassTone] ?? CHART_GLASS_TINT.dark;
  const isLight = chartGlassTone === "light";
  const textColor = isLight ? "#111118" : "#f4f4f5";
  const strokeColor = isLight
    ? "rgba(20, 120, 90, 0.95)"
    : "rgba(120, 220, 180, 0.95)";

  const series = angles[joint] ?? [];
  const reveal = Math.max(
    1,
    Math.floor(
      interpolate(localFrame, [0, Math.max(1, durationInFrames - 1)], [1, series.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    )
  );

  const path = useMemo(() => {
    const slice = series.slice(0, reveal);
    const valid = slice
      .map((v, i) => ({ v, i }))
      .filter((p) => p.v != null && Number.isFinite(p.v)) as {
      v: number;
      i: number;
    }[];
    if (valid.length < 2) return "";

    // Fixed 0–180° domain (matches Studio joint-angle overlay) so small ROM
    // swings aren't amplified to fill the panel.
    const min = 0;
    const max = 180;
    const span = max - min;
    const n = Math.max(1, series.length - 1);
    const inner = 100 - PAD * 2;

    return valid
      .map((p, idx) => {
        const px = PAD + (p.i / n) * inner;
        const clamped = Math.max(min, Math.min(max, p.v));
        const py = PAD + inner - ((clamped - min) / span) * inner;
        return `${idx === 0 ? "M" : "L"} ${px.toFixed(2)} ${py.toFixed(2)}`;
      })
      .join(" ");
  }, [series, reveal]);

  const paintGlass = useCallback(() => {
    const canvas = glassCanvasRef.current;
    if (!canvas) return;
    canvas.width = compW;
    canvas.height = compH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, compW, compH);

    const boxX = x * compW;
    const boxY = y * compH;
    const boxW = width * compW;
    const boxH = height * compH;

    // Composite is composition-sized — sample in identity space.
    drawGlassBackground(
      ctx,
      glassSourceRef?.current ?? null,
      boxX,
      boxY,
      boxW,
      boxH,
      RADIUS,
      glassBlur,
      tint,
      Math.min(0.85, Math.max(0.12, glassOpacity * 2.2)),
      1
    );
  }, [
    compW,
    compH,
    x,
    y,
    width,
    height,
    glassSourceRef,
    glassBlur,
    tint,
    glassOpacity,
  ]);

  useLayoutEffect(() => {
    paintGlass();
  }, [paintGlass, localFrame]);

  useLayoutEffect(() => {
    const set = paintRegisterRef?.current;
    if (!set) return;
    set.add(paintGlass);
    return () => {
      set.delete(paintGlass);
    };
  }, [paintGlass, paintRegisterRef]);

  const label = JOINT_LABELS[joint] ?? joint.replace("Angles", "");
  const latest = series[Math.min(reveal - 1, series.length - 1)];
  const latestLabel =
    latest != null && Number.isFinite(latest) ? `${Math.round(latest)}°` : "—";

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <canvas
        ref={glassCanvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          borderRadius: RADIUS,
          padding: 14,
          background: "transparent",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: textColor,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0.2,
            flexShrink: 0,
          }}
        >
          <span>{label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.9 }}>
            {latestLabel}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ width: "100%", height: "100%", display: "block", overflow: "hidden" }}
          >
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.2}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const AngleSeriesChartFromFrame: React.FC<
  Omit<Props, "localFrame"> & { localFrame?: number }
> = (props) => {
  const frame = useCurrentFrame();
  return <AngleSeriesChart {...props} localFrame={props.localFrame ?? frame} />;
};
