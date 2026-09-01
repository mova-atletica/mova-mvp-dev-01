/**
 * Sport/session default visual overlay presets — parity with iOS SportCaptureDefaults.
 */
import type { SportAnalysisKind } from "./sportAnalysis/pullUpsTypes";
import { getDefaultConfigForEffect } from "../app/motion-explore/effectDefaultConfig";
import { availableEffects } from "../app/motion-explore/assetVideoTypes";
import {
  serializeVisualOverlayPreset,
  type VisualOverlayPreset,
} from "./visualOverlayPreset";
import { normalizeSportAnalysis } from "./normalizeSportAnalysis";

export type SportCaptureSessionKind = "mini-app" | "studio";

export type SportCaptureContext = {
  sessionKind: SportCaptureSessionKind;
  sportAnalysisKind?: SportAnalysisKind | string | null;
  sportAnalysis?: unknown | null;
  /** Explicit facing side override (e.g. live setup before analysis is saved). */
  facingSide?: "left" | "right" | null;
};

const FULL_BODY_JOINTS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const FULL_BODY_BONES = [
  "5-7",
  "7-9",
  "6-8",
  "8-10",
  "11-13",
  "13-15",
  "12-14",
  "14-16",
  "5-6",
  "11-12",
  "5-11",
  "6-12",
];

const LEFT_SIDE_JOINTS = [5, 7, 9, 11, 13, 15];
const LEFT_SIDE_BONES = ["5-7", "7-9", "11-13", "13-15", "5-11"];
const RIGHT_SIDE_JOINTS = [6, 8, 10, 12, 14, 16];
const RIGHT_SIDE_BONES = ["6-8", "8-10", "12-14", "14-16", "6-12"];

/** Resolve which side faces the camera for side-filtered sports. */
export function facingSideFromAnalysis(ctx: SportCaptureContext): "left" | "right" | null {
  if (ctx.facingSide === "left" || ctx.facingSide === "right") return ctx.facingSide;
  const kind = ctx.sportAnalysisKind;
  const analysis = normalizeSportAnalysis(ctx.sportAnalysis, kind);
  if (kind === "pushups" || kind === "squat") {
    return analysis?.sideUsed ?? "left";
  }
  if (kind === "plank") {
    return analysis?.sideUsed ?? "left";
  }
  return null;
}

function skeletonConfigForSession(ctx: SportCaptureContext): Record<string, unknown> {
  const skeletonEffect = availableEffects.find((e) => e.id === "skeleton-overlay");
  const base = skeletonEffect
    ? { ...getDefaultConfigForEffect(skeletonEffect) }
    : {
        showSkeleton: true,
        boneColor: "#00ff00",
        jointColor: "#00ff00",
        boneWeight: 2,
        boneLineStyle: "solid",
        jointSize: 4,
        showJoints: true,
        showBones: true,
      };

  const side = facingSideFromAnalysis(ctx);
  const kind = ctx.sportAnalysisKind;
  if (side && (kind === "pushups" || kind === "squat" || kind === "plank")) {
    return {
      ...base,
      selectedJoints: side === "left" ? LEFT_SIDE_JOINTS : RIGHT_SIDE_JOINTS,
      selectedBones: side === "left" ? LEFT_SIDE_BONES : RIGHT_SIDE_BONES,
    };
  }

  return {
    ...base,
    selectedJoints: FULL_BODY_JOINTS,
    selectedBones: FULL_BODY_BONES,
  };
}

function jointAnglesConfigForSession(ctx: SportCaptureContext): Record<string, unknown> {
  const jointEffect = availableEffects.find((e) => e.id === "joint-angles");
  const base = jointEffect ? { ...getDefaultConfigForEffect(jointEffect) } : {};

  const kind = ctx.sportAnalysisKind;
  const side = facingSideFromAnalysis(ctx);
  let enabledJoints: string[] = ["left_elbow", "right_elbow"];

  if (kind === "pushups") {
    enabledJoints = [side === "right" ? "right_elbow" : "left_elbow"];
  } else if (kind === "squat") {
    enabledJoints =
      side === "right" ? ["right_knee", "right_hip"] : ["left_knee", "left_hip"];
  } else if (kind === "plank") {
    enabledJoints =
      side === "right"
        ? ["right_elbow", "right_hip", "right_knee"]
        : ["left_elbow", "left_hip", "left_knee"];
  }

  return {
    ...base,
    showJointAngles: true,
    enabledJoints,
    showROM: false,
    romJoints: [],
    safeZoneEnabled: true,
  };
}

/** Default preset for capture finish, hydrate fallback, and free-tier joint seeding. */
export function sportCaptureDefaults(ctx: SportCaptureContext): VisualOverlayPreset {
  const skeletonEffect = availableEffects.find((e) => e.id === "skeleton-overlay");
  if (!skeletonEffect) {
    return serializeVisualOverlayPreset([]);
  }

  const effects = [
    {
      id: skeletonEffect.id,
      effect: skeletonEffect,
      config: skeletonConfigForSession(ctx),
      enabled: true,
      order: 0,
    },
  ];

  if (ctx.sessionKind === "mini-app") {
    const jointEffect = availableEffects.find((e) => e.id === "joint-angles");
    if (jointEffect) {
      effects.push({
        id: jointEffect.id,
        effect: jointEffect,
        config: jointAnglesConfigForSession(ctx),
        enabled: true,
        order: 1,
      });
    }
  }

  return serializeVisualOverlayPreset(effects);
}

export function sportCaptureContextFromStudio(opts: {
  isQuickAnalysis: boolean;
  sportAnalysisKind: SportAnalysisKind | string;
  sportAnalysis?: unknown | null;
  facingSide?: "left" | "right" | null;
}): SportCaptureContext {
  return {
    sessionKind: opts.isQuickAnalysis ? "mini-app" : "studio",
    sportAnalysisKind: opts.sportAnalysisKind,
    sportAnalysis: opts.sportAnalysis ?? null,
    facingSide: opts.facingSide ?? null,
  };
}
