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
  sportAnalysisKind?: "cycling" | "pullups";
  sportMetricsSnapshot?: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
  } | null;
  /** When false, omit the "{name} Settings" heading (inline-under-toggle UX). Default true. */
  showTitle?: boolean;
};
