/** Shared frosted-glass chip background (Coach captions + Open Move angle/ROM labels). */

export type LabelChipBg = "none" | "solid" | "glass";

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

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

let glassSampleCanvas: HTMLCanvasElement | null = null;
let glassBlurCanvas: HTMLCanvasElement | null = null;

function ensureScratch(
  current: HTMLCanvasElement | null,
  w: number,
  h: number
): HTMLCanvasElement {
  const canvas = current ?? document.createElement("canvas");
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  return canvas;
}

export function drawGlassBackground(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource | null | undefined,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  radius: number,
  blurPx: number,
  tintColor: string,
  tintOpacity: number,
  scale: number
) {
  const blur = Math.max(0, blurPx * scale);
  const pad = Math.ceil(blur * 2) + 2;
  const sx = Math.floor(x - pad);
  const sy = Math.floor(y - pad);
  const sw = Math.ceil(boxW + pad * 2);
  const sh = Math.ceil(boxH + pad * 2);

  if (source && sw > 0 && sh > 0) {
    try {
      // Chip x/y are in user space. Canvas sources (esp. image-export with
      // ctx.scale(resolutionMultiplier)) store pixels in bitmap space — convert.
      // Video sources are already in native/user-space pixels.
      const sampleScale =
        typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement
          ? Math.abs(ctx.getTransform().a) || 1
          : 1;
      const srcSx = sx * sampleScale;
      const srcSy = sy * sampleScale;
      const srcSw = sw * sampleScale;
      const srcSh = sh * sampleScale;

      glassSampleCanvas = ensureScratch(glassSampleCanvas, sw, sh);
      const sctx = glassSampleCanvas.getContext("2d");
      if (sctx) {
        sctx.clearRect(0, 0, sw, sh);
        sctx.drawImage(source, srcSx, srcSy, srcSw, srcSh, 0, 0, sw, sh);

        glassBlurCanvas = ensureScratch(glassBlurCanvas, sw, sh);
        const fctx = glassBlurCanvas.getContext("2d");
        if (fctx) {
          fctx.clearRect(0, 0, sw, sh);
          if (blur > 0) fctx.filter = `blur(${blur}px)`;
          fctx.drawImage(glassSampleCanvas, 0, 0);
          fctx.filter = "none";

          ctx.save();
          roundRectPath(ctx, x, y, boxW, boxH, radius);
          ctx.clip();
          ctx.drawImage(glassBlurCanvas, sx, sy);
          ctx.restore();
        }
      }
    } catch {
      /* tint-only fallback */
    }
  }

  ctx.save();
  roundRectPath(ctx, x, y, boxW, boxH, radius);
  ctx.fillStyle = parseColorAlpha(tintColor, tintOpacity);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = Math.max(1, 1.25 * scale);
  ctx.stroke();
  const grad = ctx.createLinearGradient(x, y, x, y + boxH * 0.55);
  grad.addColorStop(0, "rgba(255,255,255,0.28)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

export function drawLabelChipBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  radius: number,
  opts: {
    bg?: LabelChipBg;
    bgColor?: string;
    bgOpacity?: number;
    blurPx?: number;
    glassSource?: CanvasImageSource | null;
    scale?: number;
  }
) {
  const bg = opts.bg ?? "glass";
  if (bg === "none") return;

  const scale = opts.scale ?? 1;
  if (bg === "glass") {
    drawGlassBackground(
      ctx,
      opts.glassSource,
      x,
      y,
      boxW,
      boxH,
      radius,
      opts.blurPx ?? 14,
      opts.bgColor ?? "#ffffff",
      opts.bgOpacity ?? 0.22,
      scale
    );
    return;
  }

  ctx.save();
  roundRectPath(ctx, x, y, boxW, boxH, radius);
  ctx.fillStyle = parseColorAlpha(
    opts.bgColor ?? "#000000",
    opts.bgOpacity ?? 0.8
  );
  ctx.fill();
  ctx.restore();
}
