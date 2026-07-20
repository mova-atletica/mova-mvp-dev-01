import type {
  CoachMobilityAngleJoint,
  CoachMobilityAxis,
  CoachMobilityArc,
  CoachMobilityAxisTarget,
  CoachMobilityCapStyle,
  CoachMobilityGeometry,
  CoachMobilityLineStyle,
  CoachJointId,
} from "../../types/coachSession";
import { defaultCoachMobilityGeometryStyle } from "../../types/coachSession";
import { getKeypoint, type Pose } from "./joints";

type Point = { x: number; y: number };

const ANGLE_TRIPLES: Record<CoachMobilityAngleJoint, [CoachJointId, CoachJointId, CoachJointId]> = {
  left_knee: ["left_hip", "left_knee", "left_ankle"],
  right_knee: ["right_hip", "right_knee", "right_ankle"],
  left_hip: ["left_shoulder", "left_hip", "left_knee"],
  right_hip: ["right_shoulder", "right_hip", "right_knee"],
  left_shoulder: ["left_hip", "left_shoulder", "left_elbow"],
  right_shoulder: ["right_hip", "right_shoulder", "right_elbow"],
  left_elbow: ["left_shoulder", "left_elbow", "left_wrist"],
  right_elbow: ["right_shoulder", "right_elbow", "right_wrist"],
};

const GEOMETRY_MIN_SCORE = 0.25;

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function jointPoint(pose: Pose | null, joint: CoachJointId): Point | null {
  const kp = getKeypoint(pose, joint, GEOMETRY_MIN_SCORE);
  return kp ? { x: kp.x, y: kp.y } : null;
}

export function resolveCoachMobilityPoint(
  pose: Pose | null,
  key: CoachMobilityAxisTarget | string
): Point | null {
  if (key === "shoulder_mid") {
    const left = jointPoint(pose, "left_shoulder");
    const right = jointPoint(pose, "right_shoulder");
    return left && right ? midpoint(left, right) : null;
  }
  if (key === "hip_mid") {
    const left = jointPoint(pose, "left_hip");
    const right = jointPoint(pose, "right_hip");
    return left && right ? midpoint(left, right) : null;
  }
  if (key === "body_center") {
    const shoulders = resolveCoachMobilityPoint(pose, "shoulder_mid");
    const hips = resolveCoachMobilityPoint(pose, "hip_mid");
    return shoulders && hips ? midpoint(shoulders, hips) : hips ?? shoulders;
  }
  return jointPoint(pose, key as CoachJointId);
}

function applyLineStyle(ctx: CanvasRenderingContext2D, style: CoachMobilityLineStyle) {
  if (style === "dashed") ctx.setLineDash([14, 10]);
  else if (style === "dotted") ctx.setLineDash([2, 10]);
  else ctx.setLineDash([]);
}

function drawCap(
  ctx: CanvasRenderingContext2D,
  point: Point,
  orientation: "vertical" | "horizontal",
  style: CoachMobilityCapStyle,
  size: number
) {
  if (!style || style === "none") return;
  if (style === "dot") {
    ctx.beginPath();
    ctx.arc(point.x, point.y, size * 0.38, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const tick = size * 0.55;
  const bracket = size * 0.42;
  if (orientation === "vertical") {
    ctx.beginPath();
    ctx.moveTo(point.x - tick, point.y);
    ctx.lineTo(point.x + tick, point.y);
    if (style === "bracket") {
      ctx.moveTo(point.x - tick, point.y);
      ctx.lineTo(point.x - tick, point.y + bracket);
      ctx.moveTo(point.x + tick, point.y);
      ctx.lineTo(point.x + tick, point.y + bracket);
    }
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(point.x, point.y - tick);
  ctx.lineTo(point.x, point.y + tick);
  if (style === "bracket") {
    ctx.moveTo(point.x, point.y - tick);
    ctx.lineTo(point.x + bracket, point.y - tick);
    ctx.moveTo(point.x, point.y + tick);
    ctx.lineTo(point.x + bracket, point.y + tick);
  }
  ctx.stroke();
}

function drawAxis(
  ctx: CanvasRenderingContext2D,
  center: Point,
  orientation: "vertical" | "horizontal",
  lineLength: number,
  lineWidth: number,
  capStyle: CoachMobilityCapStyle,
  scale: number
) {
  const length = lineLength * scale;
  const half = length / 2;
  const start =
    orientation === "vertical"
      ? { x: center.x, y: center.y - half }
      : { x: center.x - half, y: center.y };
  const end =
    orientation === "vertical"
      ? { x: center.x, y: center.y + half }
      : { x: center.x + half, y: center.y };

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  const capSize = Math.max(8, lineWidth * 5 * scale);
  drawCap(ctx, start, orientation, capStyle, capSize);
  drawCap(ctx, end, orientation, capStyle, capSize);
}

function drawAngleArc(ctx: CanvasRenderingContext2D, a: Point, b: Point, c: Point, radiusPx: number) {
  const r = Math.max(8, radiusPx);
  const start = Math.atan2(a.y - b.y, a.x - b.x);
  let end = Math.atan2(c.y - b.y, c.x - b.x);
  while (end < start) end += Math.PI * 2;
  if (end - start > Math.PI) {
    const tmp = end;
    end = start + Math.PI * 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, tmp, end);
  } else {
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, start, end);
  }
  ctx.stroke();
}

function drawOneAxis(
  ctx: CanvasRenderingContext2D,
  axis: CoachMobilityAxis,
  pose: Pose,
  scale: number,
  defaults: ReturnType<typeof defaultCoachMobilityGeometryStyle>
) {
  const point = resolveCoachMobilityPoint(pose, axis.target);
  if (!point) return;

  const color = axis.color || defaults.color;
  const lineWidth = axis.lineWidth ?? defaults.lineWidth;
  const lineLength = axis.lineLength ?? defaults.lineLength;
  const lineStyle = axis.lineStyle ?? defaults.lineStyle;
  const capStyle = axis.capStyle ?? defaults.capStyle;
  const opacity = axis.opacity ?? defaults.opacity;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, lineWidth * scale);
  ctx.lineCap = lineStyle === "dotted" ? "round" : "butt";
  applyLineStyle(ctx, lineStyle);
  drawAxis(ctx, point, axis.orient, lineLength, lineWidth, capStyle, scale);
  ctx.restore();
}

function drawOneArc(
  ctx: CanvasRenderingContext2D,
  arc: CoachMobilityArc,
  pose: Pose,
  scale: number,
  defaults: ReturnType<typeof defaultCoachMobilityGeometryStyle>
) {
  const triple = ANGLE_TRIPLES[arc.joint];
  if (!triple) return;
  const a = resolveCoachMobilityPoint(pose, triple[0]);
  const b = resolveCoachMobilityPoint(pose, triple[1]);
  const c = resolveCoachMobilityPoint(pose, triple[2]);
  if (!a || !b || !c) return;

  const color = arc.color || defaults.color;
  const lineWidth = arc.lineWidth ?? defaults.lineWidth;
  const lineStyle = arc.lineStyle ?? defaults.lineStyle;
  const opacity = arc.opacity ?? defaults.opacity;
  const arcRadius = Math.max(8, (arc.arcRadius ?? defaults.arcRadius) * scale);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, lineWidth * scale);
  ctx.lineCap = lineStyle === "dotted" ? "round" : "butt";
  applyLineStyle(ctx, lineStyle);
  drawAngleArc(ctx, a, b, c, arcRadius);
  ctx.restore();
}

/**
 * Draw mobility reference axes + angle arcs for one pose.
 * Each axis/arc carries its own style.
 */
export function drawCoachMobilityGeometry(
  ctx: CanvasRenderingContext2D,
  mobility: CoachMobilityGeometry,
  pose: Pose | null,
  scale = 1
): void {
  const axes = mobility.axes ?? [];
  const arcs = mobility.arcs ?? [];
  if ((!axes.length && !arcs.length) || !pose) return;

  const defaults = defaultCoachMobilityGeometryStyle();
  for (const axis of axes) drawOneAxis(ctx, axis, pose, scale, defaults);
  for (const arc of arcs) drawOneArc(ctx, arc, pose, scale, defaults);
}
