"use client";

import type React from "react";

export interface AssetVideoPlayerProps {
  videoUrl: string;
  poses: any[];
  exerciseTitle?: string;
  exercise?: any;
  sportAnalysisKind?: "cycling" | "pullups";
  sportMetricsSnapshot?: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
  } | null;
}

export interface Effect {
  id: string;
  name: string;
  description: string;
  icon?: string;
  preview: string;
  category: string;
  videoConfig: {
    shouldRenderVideo: boolean;
    videoOpacity: number;
    blendMode: "normal" | "multiply" | "screen" | "overlay";
    renderOrder: "before" | "after" | "replace";
  };
}

export interface ActiveEffect {
  id: string;
  effect: Effect;
  config: any;
  enabled: boolean;
  order: number;
}

export const availableEffects: Effect[] = [
  {
    id: "muybridge",
    name: "Muybridge",
    description: "Grid of key frames",
    preview: "Grid layout",
    category: "Motion",
    videoConfig: {
      shouldRenderVideo: false,
      videoOpacity: 0,
      blendMode: "normal",
      renderOrder: "replace",
    },
  },
  {
    id: "motion-trails",
    name: "Motion Trails",
    description: "Ghost trail effect",
    preview: "Trailing animation",
    category: "Motion",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.3,
      blendMode: "multiply",
      renderOrder: "before",
    },
  },
  {
    id: "joint-angles",
    name: "Joint Angles",
    description: "Display joint angle measurements",
    preview: "Angle display",
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: "normal",
      renderOrder: "after",
    },
  },
  {
    id: "range-of-motion",
    name: "Range of Motion",
    description: "Track joint ROM statistics",
    preview: "ROM tracking",
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: "normal",
      renderOrder: "after",
    },
  },
  {
    id: "metrics-chips",
    name: "Metrics Chips",
    description: "Overlay up to 3 metric chips",
    preview: "Metric chips",
    category: "Stats",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: "normal",
      renderOrder: "after",
    },
  },
  {
    id: "skeleton-overlay",
    name: "Skeleton Overlay",
    description: "Display skeletal structure with customizable colors and sizes",
    preview: "Skeleton display",
    category: "Motion",
    videoConfig: {
      shouldRenderVideo: true,
      videoOpacity: 0.9,
      blendMode: "normal",
      renderOrder: "after",
    },
  },
];

const MotionIcon = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline", verticalAlign: "middle" }}
  >
    <path d="M3 10c2-4 6-4 8 0s6 4 8 0" />
  </svg>
);

const StatsIcon = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline", verticalAlign: "middle" }}
  >
    <rect x="3" y="10" width="3" height="7" />
    <rect x="8.5" y="6" width="3" height="11" />
    <rect x="14" y="13" width="3" height="4" />
  </svg>
);

export type EffectType = "Motion" | "Stats";

export const effectTypeIcon: Record<EffectType, React.ReactElement> = {
  Motion: <MotionIcon />,
  Stats: <StatsIcon />,
};
