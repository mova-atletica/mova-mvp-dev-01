/**
 * Portable visual overlay preset for Open Move / sports Studio.
 * Copy/import across videos; persist on activity_sessions.visual_config.
 */
import type { ActiveEffect, Effect } from "../app/motion-explore/assetVideoTypes";
import { availableEffects } from "../app/motion-explore/assetVideoTypes";
import { getDefaultConfigForEffect } from "../app/motion-explore/effectDefaultConfig";

export const VISUAL_OVERLAY_PRESET_VERSION = 1 as const;

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
    effects: activeEffects.map((e, index) => ({
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

/** Matches engine default-on joint-angles when no live overlay state is available yet. */
export function defaultOpenMoveVisualOverlayPreset(): VisualOverlayPreset {
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
