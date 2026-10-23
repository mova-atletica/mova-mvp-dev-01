/** Glass tooltip — matches mega-menu / account bar chart hover. */
export const chartGlassTooltipStyle = {
  background: "var(--mega-menu-bg, color-mix(in srgb, var(--surface) 55%, transparent))",
  border: "1px solid var(--mega-menu-border, var(--border-secondary))",
  color: "var(--mega-menu-text, var(--foreground))",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 400 as const,
  backdropFilter: "blur(16px) saturate(1.35)",
  WebkitBackdropFilter: "blur(16px) saturate(1.35)",
  boxShadow: "0 8px 28px rgba(0, 0, 0, 0.18)",
} as const;

/** Recharts Tooltip contentStyle / labelStyle / itemStyle for glass popovers. */
export const chartGlassTooltipContentStyle = {
  ...chartGlassTooltipStyle,
  border: "1px solid var(--mega-menu-border, var(--border-secondary))",
} as const;

export const chartGlassTooltipLabelStyle = {
  color: "var(--mega-menu-text, var(--foreground))",
  fontSize: "11px",
  fontWeight: 700 as const,
} as const;

export const chartGlassTooltipItemStyle = {
  color: "var(--mega-menu-text, var(--foreground))",
  fontSize: "13px",
  fontWeight: 400 as const,
} as const;

/** Bar / Cartesian hover band — translucent wash instead of Recharts’ light gray. */
export const chartGlassCursor = {
  fill: "color-mix(in srgb, var(--foreground) 10%, transparent)",
  stroke: "color-mix(in srgb, var(--foreground) 18%, transparent)",
  strokeWidth: 1,
} as const;
