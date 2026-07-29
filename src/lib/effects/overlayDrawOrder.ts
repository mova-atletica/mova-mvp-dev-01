/**
 * Fixed paint order for Open Move overlay effects (back → front).
 * Joint angles / ROM stay on top for legibility in preview and export.
 */
const OVERLAY_DRAW_Z: Record<string, number> = {
  "mobility-geometry": 10,
  "joint-angle-trace": 20,
  "metrics-chips": 30,
  "joint-angles": 40,
  "range-of-motion": 50,
};

export function overlayDrawZIndex(effectId: string): number {
  return OVERLAY_DRAW_Z[effectId] ?? 0;
}

/** Stable sort: lower z draws first; ties keep relative `order` then original index. */
export function sortEffectsByOverlayDrawOrder<
  T extends { effect: { id: string }; order?: number },
>(effects: T[]): T[] {
  return effects
    .map((effect, index) => ({ effect, index }))
    .sort((a, b) => {
      const zDiff = overlayDrawZIndex(a.effect.effect.id) - overlayDrawZIndex(b.effect.effect.id);
      if (zDiff !== 0) return zDiff;
      const orderDiff = (a.effect.order ?? 0) - (b.effect.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.index - b.index;
    })
    .map(({ effect }) => effect);
}
