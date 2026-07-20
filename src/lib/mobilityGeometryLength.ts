/** Shared mobility geometry line-length slider bounds (video pixel space). */

export const MOBILITY_LINE_LENGTH_MIN = 80;
/** Used when video width/height are not yet known. */
export const MOBILITY_LINE_LENGTH_FALLBACK_MAX = 2000;

/**
 * Max total axis length so a centered line can span the longer frame side.
 * Falls back when dimensions are missing or invalid.
 */
export function mobilityGeometryLineLengthMax(
  width?: number | null,
  height?: number | null
): number {
  const w = typeof width === "number" && Number.isFinite(width) && width > 0 ? width : 0;
  const h = typeof height === "number" && Number.isFinite(height) && height > 0 ? height : 0;
  const longer = Math.max(w, h);
  return longer > 0 ? Math.round(longer) : MOBILITY_LINE_LENGTH_FALLBACK_MAX;
}
