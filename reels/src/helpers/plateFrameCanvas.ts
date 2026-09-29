/** Persist a Remotion `@remotion/media` video frame for later canvas sampling. */

export function frameSourceSize(frame: CanvasImageSource): { w: number; h: number } {
  if (typeof VideoFrame !== "undefined" && frame instanceof VideoFrame) {
    return { w: frame.displayWidth, h: frame.displayHeight };
  }
  if (typeof ImageBitmap !== "undefined" && frame instanceof ImageBitmap) {
    return { w: frame.width, h: frame.height };
  }
  if (typeof HTMLVideoElement !== "undefined" && frame instanceof HTMLVideoElement) {
    return { w: frame.videoWidth, h: frame.videoHeight };
  }
  if (typeof HTMLCanvasElement !== "undefined" && frame instanceof HTMLCanvasElement) {
    return { w: frame.width, h: frame.height };
  }
  if (typeof HTMLImageElement !== "undefined" && frame instanceof HTMLImageElement) {
    return { w: frame.naturalWidth, h: frame.naturalHeight };
  }
  const anyFrame = frame as { width?: number; height?: number };
  return { w: anyFrame.width ?? 0, h: anyFrame.height ?? 0 };
}

/**
 * Copy `frame` into a reusable canvas. Required for web-renderer export:
 * VideoFrame from onVideoFrame is closed after the callback returns.
 */
export function copyFrameToCanvas(
  canvasRef: { current: HTMLCanvasElement | null },
  frame: CanvasImageSource
): HTMLCanvasElement | null {
  const { w, h } = frameSourceSize(frame);
  if (w < 1 || h < 1) return canvasRef.current;

  let canvas = canvasRef.current;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvasRef.current = canvas;
  }
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  try {
    ctx.drawImage(frame, 0, 0, w, h);
  } catch {
    return canvas;
  }
  return canvas;
}

/** object-fit:cover plate into composition-sized canvas. */
export function drawCoverInto(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  destW: number,
  destH: number
) {
  const { w: sw, h: sh } = frameSourceSize(source);
  if (sw < 1 || sh < 1) return;
  const scale = Math.max(destW / sw, destH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const ox = (destW - dw) / 2;
  const oy = (destH - dh) / 2;
  ctx.drawImage(source, ox, oy, dw, dh);
}

/**
 * Build a composition-sized plate + overlay composite for chart HUD glass sampling.
 */
export function buildGlassComposite(
  compositeRef: { current: HTMLCanvasElement | null },
  plate: HTMLCanvasElement | null,
  overlay: HTMLCanvasElement | null,
  compW: number,
  compH: number
): HTMLCanvasElement | null {
  if (compW < 1 || compH < 1) return null;

  let canvas = compositeRef.current;
  if (!canvas) {
    canvas = document.createElement("canvas");
    compositeRef.current = canvas;
  }
  if (canvas.width !== compW) canvas.width = compW;
  if (canvas.height !== compH) canvas.height = compH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, compW, compH);

  if (plate) {
    try {
      drawCoverInto(ctx, plate, compW, compH);
    } catch {
      /* ignore */
    }
  }
  if (overlay && overlay.width > 0 && overlay.height > 0) {
    try {
      ctx.drawImage(overlay, 0, 0, compW, compH);
    } catch {
      /* ignore */
    }
  }
  return canvas;
}
