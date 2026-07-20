/**
 * Shared caption / chip text wrapping for preview, export, and panel input limits.
 * Keep measure rules identical so the textarea never allows more than the video can show.
 */

import {
  COACH_CAPTION_MAX_CHARS,
  COACH_CAPTION_MAX_LINES,
} from "../../types/coachSession";

export { COACH_CAPTION_MAX_LINES };
/** Absolute safety ceiling — visual line fit is the primary constraint. */
export const COACH_CAPTION_HARD_MAX_CHARS = COACH_CAPTION_MAX_CHARS;

export type CaptionFontSpec = {
  fontPx: number;
  /** CSS font shorthand weight + family matching the renderer. */
  font: string;
};

export function captionFontSpec(fontPx: number, weight = 600): CaptionFontSpec {
  return {
    fontPx,
    font: `${weight} ${fontPx}px system-ui, -apple-system, Segoe UI, sans-serif`,
  };
}

/** Match renderCoachOverlay caption sizing. */
export function captionFontPxForFrame(
  frameHeight: number,
  fontScale = 1,
  scale = 1
): number {
  const base = Math.max(16, frameHeight * 0.045);
  return Math.round(base * fontScale * scale);
}

export function captionMaxTextWidth(frameWidth: number, fontPx: number): number {
  const padX = fontPx * 0.65;
  return Math.max(40, frameWidth * 0.7 - padX * 2);
}

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!measureCtx) {
    const c = document.createElement("canvas");
    measureCtx = c.getContext("2d");
  }
  return measureCtx;
}

export function wrapTextLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string
): string[] {
  const ctx = getMeasureCtx();
  if (!ctx || !text) return text ? [text] : [];
  ctx.font = font;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";

  const pushOverflowChar = (s: string) => {
    let chunk = "";
    for (const ch of s) {
      const next = chunk + ch;
      if (ctx.measureText(next).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = ch;
        if (lines.length >= maxLines) return;
      } else {
        chunk = next;
      }
    }
    if (chunk && lines.length < maxLines) lines.push(chunk);
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
      if (lines.length >= maxLines) break;
    }
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      pushOverflowChar(word);
      current = "";
      if (lines.length >= maxLines) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/** True if `text` wraps to more than maxLines at the given measure. */
export function captionExceedsMaxLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string
): boolean {
  const ctx = getMeasureCtx();
  if (!ctx || !text) return false;
  ctx.font = font;
  // Probe with a large line budget — if we need more than maxLines, reject.
  const probe = wrapTextLines(text, maxWidth, maxLines + 1, font);
  if (probe.length > maxLines) return true;
  // Also reject if content was force-broken past maxLines via char splitting
  // (wrapTextLines already capped). Rebuild without cap to detect overflow.
  const unlimited = wrapTextLines(text, maxWidth, 50, font);
  return unlimited.length > maxLines;
}

/**
 * Longest prefix of `text` that fits in maxLines (no ellipsis).
 * Used to block typing past what the chip can display.
 */
export function fitCaptionToMaxLines(
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string
): string {
  const hard = text.slice(0, COACH_CAPTION_HARD_MAX_CHARS);
  if (!hard) return "";
  if (!captionExceedsMaxLines(hard, maxWidth, maxLines, font)) return hard;

  let lo = 0;
  let hi = hard.length;
  let best = "";
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const candidate = hard.slice(0, mid);
    if (!candidate || !captionExceedsMaxLines(candidate, maxWidth, maxLines, font)) {
      best = candidate;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

export function measureWrappedBlock(
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string
): { lines: string[]; textWidth: number } {
  const ctx = getMeasureCtx();
  const lines = wrapTextLines(text, maxWidth, maxLines, font);
  if (!ctx || lines.length === 0) return { lines, textWidth: 0 };
  ctx.font = font;
  const textWidth = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
  return { lines, textWidth };
}
