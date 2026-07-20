import type {
  CoachAngleChip,
  CoachAngleChipStyle,
  CoachCaption,
  CoachCaptionStyle,
  CoachConnector,
  CoachEditorState,
  CoachFocusHighlight,
  CoachJointArrow,
  CoachOverlayBundle,
} from "../../types/coachSession";
import {
  COACH_CAPTION_MAX_LINES,
  defaultCoachAngleChipStyle,
  defaultCoachCaptionStyle,
} from "../../types/coachSession";
import { phaseAtSourceMs } from "./migrateEditor";
import {
  COACH_SKELETON_BONES,
  getKeypoint,
  type Pose,
} from "./joints";
import { drawCoachMobilityGeometry } from "./renderMobilityGeometry";
import { computeCoachJointAngle } from "./angles";
import {
  COACH_CAPTION_HARD_MAX_CHARS,
  captionFontPxForFrame,
  captionFontSpec,
  captionMaxTextWidth,
  wrapTextLines,
} from "./captionWrap";

export const COACH_DEFAULT_LINE_COLOR = "#38bdf8";
export const COACH_DEFAULT_ARROW_COLOR = "#f97316";
export const COACH_DEFAULT_FOCUS_COLOR = "#f472b6";
const SKELETON_COLOR = "rgba(56, 189, 248, 0.55)";

export interface RenderCoachOverlayOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  editor: CoachEditorState;
  pose: Pose | null;
  prevPose?: Pose | null;
  /** Freeze hold currently active (preview/export). */
  activeFreezeId?: string | null;
  /** Source time in ms — used to resolve the active phase when not holding. */
  sourceTimeMs?: number;
  durationMs?: number;
  showSkeleton?: boolean;
  scale?: number;
  glassSource?: CanvasImageSource | null;
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  size: number
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const a = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - a), toY - size * Math.sin(angle - a));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle + a), toY - size * Math.sin(angle + a));
  ctx.stroke();
}

function drawConnector(
  ctx: CanvasRenderingContext2D,
  connector: CoachConnector,
  pose: Pose | null,
  scale: number
) {
  const joints = connector.joints;
  if (!joints || joints.length < 2) return;

  const points: Array<{ x: number; y: number } | null> = joints.map((id) =>
    getKeypoint(pose, id)
  );

  // Build contiguous runs so a missing middle joint does not invent a chord.
  const runs: Array<Array<{ x: number; y: number }>> = [];
  let run: Array<{ x: number; y: number }> = [];
  for (const p of points) {
    if (p) {
      run.push(p);
    } else if (run.length) {
      if (run.length >= 2) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);
  if (runs.length === 0) return;

  const defaults = {
    stroke: "solid" as const,
    color: COACH_DEFAULT_LINE_COLOR,
    thickness: 3,
    showJoints: true,
    jointColor: "#ffffff",
    jointRadius: 6,
  };
  const color = connector.color || defaults.color;
  const width = (connector.thickness ?? defaults.thickness) * scale;
  const stroke = connector.stroke ?? defaults.stroke;
  const dash = stroke === "dotted" ? [Math.max(2, width * 1.4), Math.max(3, width * 2.2)] : [];
  const showJoints = connector.showJoints ?? defaults.showJoints;
  const jointColor = connector.jointColor || defaults.jointColor;
  const jointRadius = Math.max(2, (connector.jointRadius ?? defaults.jointRadius) * scale);

  const strokeRun = (pts: Array<{ x: number; y: number }>) => {
    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
    }
    ctx.stroke();
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (const pts of runs) strokeRun(pts);

  if (showJoints) {
    ctx.setLineDash([]);
    ctx.fillStyle = jointColor;
    for (const p of points) {
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, jointRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawJointArrow(
  ctx: CanvasRenderingContext2D,
  arrow: CoachJointArrow,
  pose: Pose | null,
  prevPose: Pose | null | undefined,
  scale: number
) {
  const origin = getKeypoint(pose, arrow.joint);
  if (!origin) return;

  const color = arrow.color || COACH_DEFAULT_ARROW_COLOR;
  const width = (arrow.thickness ?? 3) * scale;
  const stroke = arrow.stroke ?? "solid";
  const dash = stroke === "dotted" ? [Math.max(2, width * 1.4), Math.max(3, width * 2.2)] : [];

  let toX: number;
  let toY: number;

  if (arrow.mode === "segment" && arrow.toJoint) {
    const target = getKeypoint(pose, arrow.toJoint);
    if (!target) return;
    toX = target.x;
    toY = target.y;
  } else {
    const prev = getKeypoint(prevPose, arrow.joint);
    if (!prev) return;
    const dx = origin.x - prev.x;
    const dy = origin.y - prev.y;
    const mag = Math.hypot(dx, dy);
    if (mag < 1) return;
    const amp = Math.min(80 * scale, mag * 6);
    toX = origin.x + (dx / mag) * amp;
    toY = origin.y + (dy / mag) * amp;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  // Solid head so the tip stays readable on dotted shafts.
  ctx.setLineDash([]);
  drawArrowHead(ctx, origin.x, origin.y, toX, toY, Math.max(14 * scale, width * 4));
  ctx.restore();
}

function parseColorAlpha(hexOrCss: string, alpha: number): string {
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

function drawFocusHighlight(
  ctx: CanvasRenderingContext2D,
  focus: CoachFocusHighlight,
  pose: Pose | null,
  scale: number
) {
  const kp = getKeypoint(pose, focus.joint);
  if (!kp) return;
  const radius = (focus.radius ?? 36) * scale;
  const opacity = focus.opacity ?? 0.45;
  const color = focus.color || COACH_DEFAULT_FOCUS_COLOR;

  const grad = ctx.createRadialGradient(kp.x, kp.y, 0, kp.x, kp.y, radius);
  grad.addColorStop(0, parseColorAlpha(color, opacity));
  grad.addColorStop(0.55, parseColorAlpha(color, opacity * 0.35));
  grad.addColorStop(1, parseColorAlpha(color, 0));

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(kp.x, kp.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOverlayBundle(
  ctx: CanvasRenderingContext2D,
  bundle: CoachOverlayBundle,
  pose: Pose | null,
  prevPose: Pose | null | undefined,
  scale: number
) {
  for (const focus of bundle.focusJoints) {
    drawFocusHighlight(ctx, focus, pose, scale);
  }
  if (bundle.mobility) {
    drawCoachMobilityGeometry(ctx, bundle.mobility, pose, scale);
  }
  for (const connector of bundle.connectors) {
    drawConnector(ctx, connector, pose, scale);
  }
  // Motion arrows intentionally hidden from Coach Studio for now (data retained).
}

function roundRectPath(
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

function resolveCaptionStyle(style?: CoachCaptionStyle) {
  const d = defaultCoachCaptionStyle();
  return {
    textColor: style?.textColor ?? d.textColor,
    fontScale: style?.fontScale ?? d.fontScale,
    bg: style?.bg ?? d.bg,
    bgColor: style?.bgColor ?? d.bgColor,
    bgOpacity: style?.bgOpacity ?? d.bgOpacity,
    blurPx: style?.blurPx ?? d.blurPx,
    radius: style?.radius ?? d.radius,
  };
}

export function clampCoachCaptionText(text: string): string {
  return text.slice(0, COACH_CAPTION_HARD_MAX_CHARS);
}

/** Wrap for draw; ellipsis only if source text still overflows after line cap. */
function wrapCaptionLinesForDraw(
  text: string,
  maxWidth: number,
  maxLines: number,
  font: string,
  measureCtx: CanvasRenderingContext2D
): string[] {
  const lines = wrapTextLines(text, maxWidth, maxLines, font);
  if (lines.length === 0) return lines;
  measureCtx.font = font;
  const unlimited = wrapTextLines(text, maxWidth, 50, font);
  if (unlimited.length <= maxLines) return lines;
  const last = lines[lines.length - 1]!;
  let trimmed = last;
  while (trimmed.length > 1 && measureCtx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  lines[lines.length - 1] = `${trimmed}…`;
  return lines;
}

export function measureCaptionChip(
  ctx: CanvasRenderingContext2D,
  caption: CoachCaption,
  width: number,
  height: number,
  scale = 1
): {
  cx: number;
  cy: number;
  boxW: number;
  boxH: number;
  fontPx: number;
  radius: number;
  lines: string[];
  lineHeight: number;
} | null {
  const raw = clampCoachCaptionText(caption.text ?? "").trim();
  if (!raw) return null;
  const style = resolveCaptionStyle(caption.style);
  const fontPx = Math.round(captionFontPxForFrame(height, style.fontScale, scale));
  const { font } = captionFontSpec(fontPx);
  ctx.font = font;
  const padX = fontPx * 0.65;
  const padY = fontPx * 0.4;
  const maxTextW = captionMaxTextWidth(width, fontPx);
  const lines = wrapCaptionLinesForDraw(
    raw,
    maxTextW,
    COACH_CAPTION_MAX_LINES,
    font,
    ctx
  );
  if (lines.length === 0) return null;
  const lineHeight = fontPx * 1.2;
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = textW + padX * 2;
  const boxH = lines.length * lineHeight + padY * 2;
  return {
    cx: caption.anchor.x * width,
    cy: caption.anchor.y * height,
    boxW,
    boxH,
    fontPx,
    radius: Math.min(style.radius * scale, boxH / 2),
    lines,
    lineHeight,
  };
}

function drawGlassBackground(
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
      glassSampleCanvas = ensureScratch(glassSampleCanvas, sw, sh);
      const sctx = glassSampleCanvas.getContext("2d");
      if (sctx) {
        sctx.clearRect(0, 0, sw, sh);
        sctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

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

function drawCaption(
  ctx: CanvasRenderingContext2D,
  caption: CoachCaption,
  width: number,
  height: number,
  scale: number,
  glassSource?: CanvasImageSource | null
) {
  const measured = measureCaptionChip(ctx, caption, width, height, scale);
  if (!measured) return;
  const style = resolveCaptionStyle(caption.style);
  const { cx, cy, boxW, boxH, fontPx, radius, lines, lineHeight } = measured;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${fontPx}px system-ui, -apple-system, Segoe UI, sans-serif`;

  if (style.bg === "glass") {
    drawGlassBackground(
      ctx,
      glassSource,
      x,
      y,
      boxW,
      boxH,
      radius,
      style.blurPx,
      style.bgColor,
      style.bgOpacity,
      scale
    );
  } else if (style.bg === "solid") {
    ctx.save();
    roundRectPath(ctx, x, y, boxW, boxH, radius);
    ctx.fillStyle = parseColorAlpha(style.bgColor, style.bgOpacity);
    ctx.fill();
    ctx.restore();
  }

  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    const ly = startY + i * lineHeight;
    if (style.bg === "none" || style.bg === "glass") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillText(lines[i]!, cx + 1 * scale, ly + 1.5 * scale);
    }
    ctx.fillStyle = style.textColor;
    ctx.fillText(lines[i]!, cx, ly);
  }
}

function resolveAngleChipStyle(style?: CoachAngleChipStyle) {
  const d = defaultCoachAngleChipStyle();
  return {
    textColor: style?.textColor ?? d.textColor,
    fontScale: style?.fontScale ?? d.fontScale,
    bg: style?.bg ?? d.bg,
    bgColor: style?.bgColor ?? d.bgColor,
    bgOpacity: style?.bgOpacity ?? d.bgOpacity,
  };
}

function drawAngleChips(
  ctx: CanvasRenderingContext2D,
  chips: CoachAngleChip[],
  pose: Pose | null,
  scale: number,
  glassSource?: CanvasImageSource | null
) {
  if (!chips.length || !pose) return;
  for (const chip of chips) {
    const measured = computeCoachJointAngle(pose, chip.joint);
    if (!measured) continue;
    const style = resolveAngleChipStyle(chip.style);
    const label = `${measured.degrees}°`;
    const fontPx = Math.max(11, Math.round(14 * style.fontScale * scale));
    ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, sans-serif`;
    const padX = fontPx * 0.55;
    const padY = fontPx * 0.35;
    const tw = ctx.measureText(label).width;
    const boxW = tw + padX * 2;
    const boxH = fontPx + padY * 2;
    // Auto-offset up-right from joint so chips sit clear of limbs/connectors.
    const ox = 18 * scale;
    const oy = -22 * scale;
    const cx = measured.x + ox;
    const cy = measured.y + oy;
    const x = cx - boxW / 2;
    const y = cy - boxH / 2;
    const radius = Math.min(10 * scale, boxH / 2);

    if (style.bg === "glass") {
      drawGlassBackground(
        ctx,
        glassSource,
        x,
        y,
        boxW,
        boxH,
        radius,
        10,
        style.bgColor,
        style.bgOpacity,
        scale
      );
    } else if (style.bg === "solid") {
      ctx.save();
      roundRectPath(ctx, x, y, boxW, boxH, radius);
      ctx.fillStyle = parseColorAlpha(style.bgColor, style.bgOpacity);
      ctx.fill();
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${fontPx}px system-ui, -apple-system, Segoe UI, sans-serif`;
    if (style.bg === "none" || style.bg === "glass") {
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillText(label, cx + 1 * scale, cy + 1 * scale);
    }
    ctx.fillStyle = style.textColor;
    ctx.fillText(label, cx, cy);
  }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  pose: Pose | null,
  scale: number
) {
  if (!pose) return;
  ctx.strokeStyle = SKELETON_COLOR;
  ctx.lineWidth = 2 * scale;
  ctx.lineCap = "round";
  for (const [a, b] of COACH_SKELETON_BONES) {
    const ka = getKeypoint(pose, a);
    const kb = getKeypoint(pose, b);
    if (!ka || !kb) continue;
    ctx.beginPath();
    ctx.moveTo(ka.x, ka.y);
    ctx.lineTo(kb.x, kb.y);
    ctx.stroke();
  }
}

/**
 * Draw Coach Studio overlays for one frame.
 * Hold → freeze overlays + captions; motion → active phase overlays + captions.
 */
export function renderCoachOverlay({
  ctx,
  width,
  height,
  editor,
  pose,
  prevPose,
  activeFreezeId = null,
  sourceTimeMs = 0,
  durationMs = 0,
  showSkeleton = false,
  scale = 1,
  glassSource = null,
}: RenderCoachOverlayOptions): void {
  if (showSkeleton) {
    drawSkeleton(ctx, pose, scale);
  }

  if (activeFreezeId) {
    const freeze = editor.freezes.find((f) => f.id === activeFreezeId);
    if (freeze) {
      drawOverlayBundle(ctx, freeze.overlays, pose, prevPose, scale);
      for (const caption of freeze.captions) {
        drawCaption(ctx, caption, width, height, scale, glassSource);
      }
      drawAngleChips(ctx, freeze.overlays.angleChips ?? [], pose, scale, glassSource);
    }
    return;
  }

  const phase = phaseAtSourceMs(editor, sourceTimeMs, durationMs || sourceTimeMs + 1);
  if (phase) {
    drawOverlayBundle(ctx, phase.overlays, pose, prevPose, scale);
    for (const caption of phase.captions) {
      drawCaption(ctx, caption, width, height, scale, glassSource);
    }
    drawAngleChips(ctx, phase.overlays.angleChips ?? [], pose, scale, glassSource);
  }
}
