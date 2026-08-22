/** Skeleton bone stroke style — matches mobility Solid / Dashed / Dotted dash patterns. */
export type BoneLineStyle = "solid" | "dashed" | "dotted";

export function normalizeBoneLineStyle(value: unknown): BoneLineStyle {
  if (value === "dashed" || value === "dotted") return value;
  return "solid";
}

/** Apply dash + lineCap for a bone stroke (mobility parity). */
export function applyBoneLineStyle(ctx: CanvasRenderingContext2D, style: BoneLineStyle): void {
  if (style === "dashed") {
    ctx.setLineDash([14, 10]);
    ctx.lineCap = "butt";
  } else if (style === "dotted") {
    ctx.setLineDash([2, 10]);
    ctx.lineCap = "round";
  } else {
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
  }
}

/** Clear dash / lineCap after a bone stroke so other effects are unaffected. */
export function resetBoneLineStyle(ctx: CanvasRenderingContext2D): void {
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
}
