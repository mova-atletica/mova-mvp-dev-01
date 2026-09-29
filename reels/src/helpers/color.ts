/** Hex (#rgb / #rrggbb / #rrggbbaa) → rgba with override alpha. */
export function parseColorAlpha(hexOrCss: string, alpha: number): string {
  const raw = hexOrCss.trim();
  if (raw.startsWith("#")) {
    let h = raw.slice(1);
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      if ([r, g, b].every((n) => Number.isFinite(n))) {
        return `rgba(${r},${g},${b},${Math.min(1, Math.max(0, alpha))})`;
      }
    }
  }
  return hexOrCss;
}
