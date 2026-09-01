/**
 * Portable visual overlay preset for Open Move / sports Studio.
 * Copy/import across videos; persist on activity_sessions.visual_config.
 */
import type { ActiveEffect, Effect } from "../app/motion-explore/assetVideoTypes";
import { availableEffects } from "../app/motion-explore/assetVideoTypes";
import { getDefaultConfigForEffect } from "../app/motion-explore/effectDefaultConfig";
import { isEffectLocked } from "./proAccess";
import {
  sportCaptureDefaults,
  type SportCaptureContext,
} from "./sportCaptureDefaults";

export const VISUAL_OVERLAY_PRESET_VERSION = 1 as const;

/** Retired overlay effect — ROM on video is metrics-chips `rom_joint` only. */
const RETIRED_OVERLAY_EFFECT_IDS = new Set(["range-of-motion"]);

export type VisualOverlayPresetEffect = {
  id: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown>;
};

export type VisualOverlayPreset = {
  version: typeof VISUAL_OVERLAY_PRESET_VERSION;
  updatedAt: string;
  effects: VisualOverlayPresetEffect[];
};

export function serializeVisualOverlayPreset(
  activeEffects: ActiveEffect[]
): VisualOverlayPreset {
  return {
    version: VISUAL_OVERLAY_PRESET_VERSION,
    updatedAt: new Date().toISOString(),
    effects: activeEffects
      .filter((e) => !RETIRED_OVERLAY_EFFECT_IDS.has(e.effect.id))
      .map((e, index) => ({
        id: e.effect.id,
        enabled: e.enabled,
        order: typeof e.order === "number" ? e.order : index,
        config: { ...(e.config as Record<string, unknown>) },
      })),
  };
}

function isPresetEffect(value: unknown): value is VisualOverlayPresetEffect {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.enabled === "boolean" &&
    typeof e.order === "number" &&
    e.config != null &&
    typeof e.config === "object" &&
    !Array.isArray(e.config)
  );
}

/** Parse clipboard / DB JSON into a preset, or null if invalid. */
export function parseVisualOverlayPreset(raw: unknown): VisualOverlayPreset | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (obj.version !== VISUAL_OVERLAY_PRESET_VERSION) return null;
  if (!Array.isArray(obj.effects)) return null;

  const effects: VisualOverlayPresetEffect[] = [];
  for (const item of obj.effects) {
    if (!isPresetEffect(item)) continue;
    if (RETIRED_OVERLAY_EFFECT_IDS.has(item.id)) continue;
    effects.push({
      id: item.id,
      enabled: item.enabled,
      order: item.order,
      config: { ...item.config },
    });
  }
  if (effects.length === 0) return null;

  return {
    version: VISUAL_OVERLAY_PRESET_VERSION,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
    effects,
  };
}

/** Rebuild ActiveEffect[] from a preset using the live effect catalog. */
export function hydrateVisualOverlayPreset(
  preset: VisualOverlayPreset,
  catalog: Effect[] = availableEffects
): ActiveEffect[] {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const out: ActiveEffect[] = [];

  const sorted = [...preset.effects].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    const effect = byId.get(item.id);
    if (!effect) continue;
    const defaults = getDefaultConfigForEffect(effect);
    out.push({
      id: effect.id,
      effect,
      enabled: item.enabled,
      order: out.length,
      config: { ...defaults, ...item.config },
    });
  }
  return out;
}

function findEffectDef(effectId: string): Effect | undefined {
  return availableEffects.find((e) => e.id === effectId);
}

/**
 * Free mini-app enforcement: force skeleton + joint angles on; lock Pro effects off.
 * Preserves user config when effect rows already exist.
 */
export function applyFreeMiniAppDefaults(
  active: ActiveEffect[],
  session: SportCaptureContext
): ActiveEffect[] {
  const next = active.map((e) => ({ ...e, config: { ...e.config } }));

  for (const e of next) {
    if (isEffectLocked(e.effect.id, true)) {
      e.enabled = false;
    }
  }

  const sportPreset = sportCaptureDefaults(session);
  const sportHydrated = hydrateVisualOverlayPreset(sportPreset);

  let skel = next.find((e) => e.effect.id === "skeleton-overlay");
  if (skel) {
    skel.enabled = true;
  } else {
    const fromSport = sportHydrated.find((e) => e.effect.id === "skeleton-overlay");
    if (fromSport) {
      next.unshift({ ...fromSport, enabled: true, order: 0 });
    }
  }

  let joints = next.find((e) => e.effect.id === "joint-angles");
  if (joints) {
    joints.enabled = true;
  } else {
    const fromSport = sportHydrated.find((e) => e.effect.id === "joint-angles");
    if (fromSport) {
      next.push({ ...fromSport, enabled: true, order: next.length });
    }
  }

  return next.map((e, index) => ({ ...e, order: index }));
}

/** Full hydrate pipeline: saved preset → sport fallback → free-tier enforcement. */
export function resolveActiveOverlayEffects(opts: {
  rawVisualConfig?: unknown | null;
  restrictMiniAppOverlays: boolean;
  session: SportCaptureContext;
}): ActiveEffect[] {
  const preset =
    parseVisualOverlayPreset(opts.rawVisualConfig ?? null) ??
    sportCaptureDefaults(opts.session);

  let active = hydrateVisualOverlayPreset(preset);

  if (opts.restrictMiniAppOverlays) {
    active = applyFreeMiniAppDefaults(active, opts.session);
  }

  return active;
}

/** @deprecated Use sportCaptureDefaults + serialize for mini-apps; studio uses skeleton-only preset. */
export function defaultOpenMoveVisualOverlayPreset(
  session?: SportCaptureContext
): VisualOverlayPreset {
  if (session) {
    return sportCaptureDefaults(session);
  }
  const jointAnglesEffect = availableEffects.find((e) => e.id === "joint-angles");
  if (!jointAnglesEffect) {
    return serializeVisualOverlayPreset([]);
  }
  return serializeVisualOverlayPreset([
    {
      id: jointAnglesEffect.id,
      effect: jointAnglesEffect,
      config: getDefaultConfigForEffect(jointAnglesEffect),
      enabled: true,
      order: 0,
    },
  ]);
}
