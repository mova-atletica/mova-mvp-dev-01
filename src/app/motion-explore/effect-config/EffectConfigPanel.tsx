"use client";

import { useCallback, useMemo, type ReactNode } from "react";
import { JointAnglesEffectConfig } from "./JointAnglesEffectConfig";
import { JointAngleTraceEffectConfig } from "./JointAngleTraceEffectConfig";
import { MotionTrailsEffectConfig } from "./MotionTrailsEffectConfig";
import { MetricsChipsEffectConfig } from "./MetricsChipsEffectConfig";
import { MobilityGeometryEffectConfig } from "./MobilityGeometryEffectConfig";
import { MuybridgeEffectConfig } from "./MuybridgeEffectConfig";
import { SkeletonOverlayEffectConfig } from "./SkeletonOverlayEffectConfig";
import type { EffectConfigPanelProps } from "./types";

export function EffectConfigPanel({
  activeEffect,
  setActiveEffects,
  sportAnalysisKind = "cycling",
  sportMetricsSnapshot = null,
  showTitle = true,
}: EffectConfigPanelProps) {
  const targetId = activeEffect.effect.id;

  const updateConfig = useCallback(
    (patch: Record<string, unknown>) => {
      setActiveEffects((prev) =>
        prev.map((e) =>
          e.effect.id === targetId ? { ...e, config: { ...e.config, ...patch } } : e
        )
      );
    },
    [setActiveEffects, targetId]
  );

  const config = useMemo(
    () =>
      ({
        ...(activeEffect.config as Record<string, unknown>),
        sportAnalysisKind,
        sportMetricsSnapshot,
      }) as Record<string, unknown>,
    [activeEffect.config, sportAnalysisKind, sportMetricsSnapshot]
  );

  const formProps = { config, updateConfig };

  let body: ReactNode = (
    <p style={{ fontSize: "10px", color: "var(--muted-foreground)", margin: 0 }}>
      No settings for this effect.
    </p>
  );

  switch (activeEffect.effect.id) {
    case "muybridge":
      body = <MuybridgeEffectConfig {...formProps} />;
      break;
    case "motion-trails":
      body = <MotionTrailsEffectConfig {...formProps} />;
      break;
    case "joint-angles":
      body = <JointAnglesEffectConfig {...formProps} />;
      break;
    case "metrics-chips":
      body = <MetricsChipsEffectConfig {...formProps} />;
      break;
    case "mobility-geometry":
      body = <MobilityGeometryEffectConfig {...formProps} />;
      break;
    case "skeleton-overlay":
      body = <SkeletonOverlayEffectConfig {...formProps} />;
      break;
    case "joint-angle-trace":
      body = <JointAngleTraceEffectConfig {...formProps} />;
      break;
    default:
      break;
  }

  return (
    <div>
      {showTitle ? (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--foreground)",
            marginBottom: "8px",
          }}
        >
          {activeEffect.effect.name} Settings
        </div>
      ) : null}
      {body}
    </div>
  );
}
