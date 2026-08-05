import type { Dispatch, SetStateAction } from "react";
import type { ActiveEffect } from "../assetVideoTypes";

/** Presentational effect forms receive config + a shallow merge updater. */
export type EffectConfigFormProps = {
  config: Record<string, unknown>;
  updateConfig: (patch: Record<string, unknown>) => void;
};

export type EffectConfigPanelProps = {
  activeEffect: ActiveEffect;
  setActiveEffects: Dispatch<SetStateAction<ActiveEffect[]>>;
  sportAnalysisKind?: "cycling" | "pullups" | "pushups" | "plank" | "squat" | "poseFlexibility";
  sportMetricsSnapshot?: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
    plankHoldDurationSec?: number | null;
    plankCorrectionCount?: number | null;
    plankAvgHipDeviation?: number | null;
    plankAvgHipAngleDeg?: number | null;
    squatRepCount?: number | null;
    pushupsRepCount?: number | null;
    poseFlexibilityLegsDeg?: number | null;
    poseFlexibilityHipsDeg?: number | null;
    poseFlexibilityTorsoDeg?: number | null;
    poseFlexibilityShouldersDeg?: number | null;
  } | null;
  /** When false, omit the "{name} Settings" heading (inline-under-toggle UX). Default true. */
  showTitle?: boolean;
};
