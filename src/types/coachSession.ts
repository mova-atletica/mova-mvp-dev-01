/** MoveNet / COCO-17 joint ids used across Studio overlays */
export type CoachJointId =
  | "nose"
  | "left_eye"
  | "right_eye"
  | "left_ear"
  | "right_ear"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle";

export type CoachSessionStatus = "draft" | "archived";

/** Normalized 0–1 coords relative to the video frame (survives resize) */
export interface CoachPoint {
  x: number;
  y: number;
}

export type CoachCaptionBg = "none" | "solid" | "glass";

/** Visual style for a caption chip (preview + export share this). */
export interface CoachCaptionStyle {
  textColor?: string;
  /** Relative to frame-height base size. Default 1. */
  fontScale?: number;
  bg?: CoachCaptionBg;
  /** Fill / glass tint (hex). */
  bgColor?: string;
  /** 0–1 opacity for solid fill or glass tint. */
  bgOpacity?: number;
  /** Frost blur radius in CSS px (glass only). */
  blurPx?: number;
  /** Corner radius in CSS px. */
  radius?: number;
}

export interface CoachCaption {
  id: string;
  text: string;
  anchor: CoachPoint;
  style?: CoachCaptionStyle;
}

export function defaultCoachCaptionStyle(): Required<
  Pick<
    CoachCaptionStyle,
    "textColor" | "fontScale" | "bg" | "bgColor" | "bgOpacity" | "blurPx" | "radius"
  >
> {
  return {
    textColor: "#ffffff",
    fontScale: 1,
    bg: "glass",
    bgColor: "#ffffff",
    bgOpacity: 0.22,
    blurPx: 14,
    radius: 12,
  };
}

export const COACH_CONNECTOR_MIN_JOINTS = 2;
export const COACH_CONNECTOR_MAX_JOINTS = 4;
/** Max connector overlays per freeze/phase bundle. */
export const COACH_CONNECTOR_MAX_COUNT = 6;

/**
 * Absolute safety ceiling for caption text.
 * Primary constraint is visual lines (see captionWrap) — not this char count.
 */
export const COACH_CAPTION_MAX_CHARS = 120;
/** Max wrapped lines when drawing / editing captions. */
export const COACH_CAPTION_MAX_LINES = 2;

export type CoachConnectorStroke = "solid" | "dotted";
/** @deprecated Line-cap style; ignored in favor of joint dots. Kept for legacy drafts. */
export type CoachConnectorCap = "round" | "butt" | "square";

/** Open polyline through 2–4 joints (never closed). */
export interface CoachConnector {
  id: string;
  joints: CoachJointId[];
  stroke?: CoachConnectorStroke;
  /** @deprecated Ignored — stroke always uses round caps. */
  cap?: CoachConnectorCap;
  color?: string;
  thickness?: number;
  /** Draw dots at each joint in the path. Default true. */
  showJoints?: boolean;
  /** Joint dot fill color (independent of line color). */
  jointColor?: string;
  /** Joint dot radius in CSS px (independent of line thickness). */
  jointRadius?: number;
}

export function defaultCoachConnectorStyle(): Required<
  Pick<
    CoachConnector,
    "stroke" | "color" | "thickness" | "showJoints" | "jointColor" | "jointRadius"
  >
> {
  return {
    stroke: "solid",
    color: "#38bdf8",
    thickness: 3,
    showJoints: true,
    jointColor: "#ffffff",
    jointRadius: 6,
  };
}

/**
 * Normalize stored connector JSON (incl. legacy from/to/style) into v2 polyline.
 * Returns null if the connector is invalid.
 */
export function normalizeCoachConnector(raw: unknown): CoachConnector | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as {
    id?: unknown;
    joints?: unknown;
    from?: unknown;
    to?: unknown;
    stroke?: unknown;
    cap?: unknown;
    color?: unknown;
    thickness?: unknown;
    showJoints?: unknown;
    jointColor?: unknown;
    jointRadius?: unknown;
  };
  if (typeof c.id !== "string") return null;

  let joints: CoachJointId[] = [];
  if (Array.isArray(c.joints)) {
    joints = c.joints
      .filter((j): j is CoachJointId => typeof j === "string")
      .slice(0, COACH_CONNECTOR_MAX_JOINTS);
  } else if (typeof c.from === "string" && typeof c.to === "string") {
    joints = [c.from as CoachJointId, c.to as CoachJointId];
  }

  const collapsed: CoachJointId[] = [];
  for (const j of joints) {
    if (collapsed[collapsed.length - 1] !== j) collapsed.push(j);
  }
  if (collapsed.length < COACH_CONNECTOR_MIN_JOINTS) return null;

  const stroke: CoachConnectorStroke = c.stroke === "dotted" ? "dotted" : "solid";
  const cap: CoachConnectorCap =
    c.cap === "butt" || c.cap === "square" || c.cap === "round" ? c.cap : "round";

  return {
    id: c.id,
    joints: collapsed,
    stroke,
    cap,
    color: typeof c.color === "string" ? c.color : undefined,
    thickness: typeof c.thickness === "number" && Number.isFinite(c.thickness) ? c.thickness : undefined,
    showJoints: typeof c.showJoints === "boolean" ? c.showJoints : undefined,
    jointColor: typeof c.jointColor === "string" ? c.jointColor : undefined,
    jointRadius:
      typeof c.jointRadius === "number" && Number.isFinite(c.jointRadius) ? c.jointRadius : undefined,
  };
}

export type CoachArrowStroke = "solid" | "dotted";

export interface CoachJointArrow {
  id: string;
  joint: CoachJointId;
  mode: "motion" | "segment";
  toJoint?: CoachJointId;
  stroke?: CoachArrowStroke;
  color?: string;
  thickness?: number;
}

export function defaultCoachArrowStyle(): Required<
  Pick<CoachJointArrow, "stroke" | "color" | "thickness">
> {
  return {
    stroke: "solid",
    color: "#f97316",
    thickness: 3,
  };
}

/** Soft keypoint glow — focus / "body part of interest" (not segmentation). */
export interface CoachFocusHighlight {
  id: string;
  joint: CoachJointId;
  color?: string;
  opacity?: number;
  /** Glow radius in CSS px. */
  radius?: number;
}

/** Joints that can host a live angle-degree chip (no torso for now). */
export type CoachAngleChipJoint =
  | "left_knee"
  | "right_knee"
  | "left_hip"
  | "right_hip"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow";

/** Visual style for a live angle-degree chip (preview + export). */
export interface CoachAngleChipStyle {
  textColor?: string;
  /** Relative to base chip size. Default 1. */
  fontScale?: number;
  bg?: CoachCaptionBg;
  bgColor?: string;
  /** 0–1 opacity for solid fill or glass tint. */
  bgOpacity?: number;
}

export function defaultCoachAngleChipStyle(): Required<
  Pick<CoachAngleChipStyle, "textColor" | "fontScale" | "bg" | "bgColor" | "bgOpacity">
> {
  return {
    textColor: "#ffffff",
    fontScale: 1,
    bg: "glass",
    bgColor: "#ffffff",
    bgOpacity: 0.22,
  };
}

export interface CoachAngleChip {
  id: string;
  joint: CoachAngleChipJoint;
  style?: CoachAngleChipStyle;
}

/** Anchor for vertical/horizontal reference axes (joint or derived midpoint). */
export type CoachMobilityAxisTarget =
  | CoachJointId
  | "shoulder_mid"
  | "hip_mid"
  | "body_center";

/** Vertex joint for an angle arc (defines the A–B–C triple). */
export type CoachMobilityAngleJoint =
  | "left_knee"
  | "right_knee"
  | "left_hip"
  | "right_hip"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow";

export type CoachMobilityLineStyle = "solid" | "dashed" | "dotted";
export type CoachMobilityCapStyle = "none" | "tick" | "dot" | "bracket";

/** One reference axis with its own style. */
export interface CoachMobilityAxis {
  id: string;
  target: CoachMobilityAxisTarget;
  orient: "vertical" | "horizontal";
  color?: string;
  lineWidth?: number;
  lineLength?: number;
  lineStyle?: CoachMobilityLineStyle;
  capStyle?: CoachMobilityCapStyle;
  opacity?: number;
}

/** One joint angle arc with its own style. */
export interface CoachMobilityArc {
  id: string;
  joint: CoachMobilityAngleJoint;
  color?: string;
  lineWidth?: number;
  lineStyle?: CoachMobilityLineStyle;
  arcRadius?: number;
  opacity?: number;
}

/**
 * Reference axes + joint angle arcs for a freeze hold or phase.
 * Empty arrays = nothing drawn. Styles live on each axis/arc (no bundle defaults).
 */
export interface CoachMobilityGeometry {
  axes: CoachMobilityAxis[];
  arcs: CoachMobilityArc[];
}

export function emptyCoachMobilityGeometry(): CoachMobilityGeometry {
  return { axes: [], arcs: [] };
}

/** Fallback values when an axis/arc omits a style field. */
export function defaultCoachMobilityGeometryStyle(): Required<
  Pick<
    CoachMobilityAxis,
    "color" | "lineWidth" | "lineLength" | "lineStyle" | "capStyle" | "opacity"
  > & { arcRadius: number }
> {
  return {
    color: "#ffffff",
    lineWidth: 2,
    lineLength: 220,
    lineStyle: "solid",
    capStyle: "tick",
    opacity: 0.9,
    arcRadius: 40,
  };
}

const MOBILITY_AXIS_TARGETS = new Set<string>([
  "shoulder_mid",
  "hip_mid",
  "body_center",
  "nose",
  "left_eye",
  "right_eye",
  "left_ear",
  "right_ear",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
]);

const MOBILITY_ANGLE_JOINTS = new Set<CoachMobilityAngleJoint>([
  "left_knee",
  "right_knee",
  "left_hip",
  "right_hip",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
]);

function mobilityItemId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseLineStyle(v: unknown): CoachMobilityLineStyle | undefined {
  return v === "dashed" || v === "dotted" || v === "solid" ? v : undefined;
}

function parseCapStyle(v: unknown): CoachMobilityCapStyle | undefined {
  return v === "none" || v === "tick" || v === "dot" || v === "bracket" ? v : undefined;
}

function normalizeMobilityAxis(raw: unknown): CoachMobilityAxis | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.id !== "string" || typeof a.target !== "string") return null;
  if (!MOBILITY_AXIS_TARGETS.has(a.target)) return null;
  const orient = a.orient === "horizontal" ? "horizontal" : a.orient === "vertical" ? "vertical" : null;
  if (!orient) return null;
  return {
    id: a.id,
    target: a.target as CoachMobilityAxisTarget,
    orient,
    color: typeof a.color === "string" ? a.color : undefined,
    lineWidth:
      typeof a.lineWidth === "number" && Number.isFinite(a.lineWidth) ? a.lineWidth : undefined,
    lineLength:
      typeof a.lineLength === "number" && Number.isFinite(a.lineLength) ? a.lineLength : undefined,
    lineStyle: parseLineStyle(a.lineStyle),
    capStyle: parseCapStyle(a.capStyle),
    opacity: typeof a.opacity === "number" && Number.isFinite(a.opacity) ? a.opacity : undefined,
  };
}

function normalizeMobilityArc(raw: unknown): CoachMobilityArc | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.id !== "string" || typeof a.joint !== "string") return null;
  if (!MOBILITY_ANGLE_JOINTS.has(a.joint as CoachMobilityAngleJoint)) return null;
  return {
    id: a.id,
    joint: a.joint as CoachMobilityAngleJoint,
    color: typeof a.color === "string" ? a.color : undefined,
    lineWidth:
      typeof a.lineWidth === "number" && Number.isFinite(a.lineWidth) ? a.lineWidth : undefined,
    lineStyle: parseLineStyle(a.lineStyle),
    arcRadius:
      typeof a.arcRadius === "number" && Number.isFinite(a.arcRadius) ? a.arcRadius : undefined,
    opacity: typeof a.opacity === "number" && Number.isFinite(a.opacity) ? a.opacity : undefined,
  };
}

/**
 * Normalize stored mobility JSON. Migrates legacy global-style + target arrays
 * into per-item axes/arcs.
 */
export function normalizeCoachMobilityGeometry(raw: unknown): CoachMobilityGeometry {
  const empty = emptyCoachMobilityGeometry();
  if (!raw || typeof raw !== "object") return empty;
  const m = raw as Record<string, unknown>;

  if (Array.isArray(m.axes) || Array.isArray(m.arcs)) {
    return {
      axes: Array.isArray(m.axes)
        ? m.axes.map(normalizeMobilityAxis).filter((a): a is CoachMobilityAxis => a != null)
        : [],
      arcs: Array.isArray(m.arcs)
        ? m.arcs.map(normalizeMobilityArc).filter((a): a is CoachMobilityArc => a != null)
        : [],
    };
  }

  // Legacy: global style + string target lists
  const color = typeof m.color === "string" ? m.color : undefined;
  const lineWidth =
    typeof m.lineWidth === "number" && Number.isFinite(m.lineWidth) ? m.lineWidth : undefined;
  const lineLength =
    typeof m.lineLength === "number" && Number.isFinite(m.lineLength) ? m.lineLength : undefined;
  const lineStyle = parseLineStyle(m.lineStyle);
  const capStyle = parseCapStyle(m.capStyle);
  const opacity = typeof m.opacity === "number" && Number.isFinite(m.opacity) ? m.opacity : undefined;
  const arcRadius =
    typeof m.arcRadius === "number" && Number.isFinite(m.arcRadius) ? m.arcRadius : undefined;

  const axes: CoachMobilityAxis[] = [];
  if (Array.isArray(m.verticalTargets)) {
    for (const t of m.verticalTargets) {
      if (typeof t !== "string" || !MOBILITY_AXIS_TARGETS.has(t)) continue;
      axes.push({
        id: mobilityItemId("max"),
        target: t as CoachMobilityAxisTarget,
        orient: "vertical",
        color,
        lineWidth,
        lineLength,
        lineStyle,
        capStyle,
        opacity,
      });
    }
  }
  if (Array.isArray(m.horizontalTargets)) {
    for (const t of m.horizontalTargets) {
      if (typeof t !== "string" || !MOBILITY_AXIS_TARGETS.has(t)) continue;
      axes.push({
        id: mobilityItemId("max"),
        target: t as CoachMobilityAxisTarget,
        orient: "horizontal",
        color,
        lineWidth,
        lineLength,
        lineStyle,
        capStyle,
        opacity,
      });
    }
  }

  const arcs: CoachMobilityArc[] = [];
  if (Array.isArray(m.angleJoints)) {
    for (const j of m.angleJoints) {
      if (typeof j !== "string" || !MOBILITY_ANGLE_JOINTS.has(j as CoachMobilityAngleJoint)) continue;
      arcs.push({
        id: mobilityItemId("marc"),
        joint: j as CoachMobilityAngleJoint,
        color,
        lineWidth,
        lineStyle,
        arcRadius,
        opacity,
      });
    }
  }

  return { axes, arcs };
}

/** Lines / arrows / focus / geometry shared by a phase or a freeze hold. */
export interface CoachOverlayBundle {
  connectors: CoachConnector[];
  jointArrows: CoachJointArrow[];
  focusJoints: CoachFocusHighlight[];
  mobility: CoachMobilityGeometry;
  angleChips: CoachAngleChip[];
}

export function emptyCoachOverlayBundle(): CoachOverlayBundle {
  return {
    connectors: [],
    jointArrows: [],
    focusJoints: [],
    mobility: emptyCoachMobilityGeometry(),
    angleChips: [],
  };
}

function freshOverlayId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deep-clone an overlay bundle with new ids so paste/apply does not share
 * connector/arrow/focus/chip identity with the source.
 */
export function cloneOverlayBundleWithFreshIds(
  source: CoachOverlayBundle
): CoachOverlayBundle {
  const mobility = source.mobility
    ? {
        axes: (source.mobility.axes ?? []).map((a) => ({
          ...a,
          id: freshOverlayId("max"),
        })),
        arcs: (source.mobility.arcs ?? []).map((a) => ({
          ...a,
          id: freshOverlayId("marc"),
        })),
      }
    : emptyCoachMobilityGeometry();

  return {
    connectors: (source.connectors ?? []).map((c) => ({
      ...c,
      id: freshOverlayId("con"),
      joints: [...c.joints],
    })),
    jointArrows: (source.jointArrows ?? []).map((a) => ({
      ...a,
      id: freshOverlayId("arr"),
    })),
    focusJoints: (source.focusJoints ?? []).map((f) => ({
      ...f,
      id: freshOverlayId("foc"),
    })),
    mobility,
    angleChips: (source.angleChips ?? []).map((chip) => ({
      ...chip,
      id: freshOverlayId("ang"),
      style: chip.style ? { ...chip.style } : chip.style,
    })),
  };
}

export interface CoachFreeze {
  id: string;
  tMs: number;
  holdMs: number;
  /** Primary + optional second (max 2). */
  captions: CoachCaption[];
  overlays: CoachOverlayBundle;
}

/**
 * Motion segment between freezes (or start→first / last→end).
 * Bounds are defined by adjacent freeze ids so they survive time edits.
 */
export interface CoachPhase {
  id: string;
  /** null = from start of clip */
  afterFreezeId: string | null;
  /** null = to end of clip */
  beforeFreezeId: string | null;
  /** Primary + optional second (max 2); visible for the whole phase. */
  captions: CoachCaption[];
  overlays: CoachOverlayBundle;
}

export interface CoachEditorState {
  version: 2;
  freezes: CoachFreeze[];
  phases: CoachPhase[];
}

/** @deprecated v1 shape — only used by migrateCoachEditorState */
export interface CoachEditorStateV1 {
  version: 1;
  selectedJoints?: CoachJointId[];
  connectors?: unknown[];
  jointArrows?: CoachJointArrow[];
  freezes?: Array<{ id: string; tMs: number; holdMs: number }>;
  captions?: Array<{
    id: string;
    freezeId: string;
    text: string;
    anchor: CoachPoint;
    style?: CoachCaptionStyle;
  }>;
  annotations?: unknown[];
}

export interface CoachSessionMetadata {
  title: string;
  instructions: string;
  equipment: string[];
  jointsOfInterest: CoachJointId[];
  movementLabel?: string | null;
  tags: string[];
}

export interface CoachSession {
  id: string;
  userId: string;
  title: string;
  status: CoachSessionStatus;
  sourceVideoPath: string | null;
  sourceDurationMs: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  sourceFps: number | null;
  keypointsPath: string | null;
  editor: CoachEditorState;
  metadata: CoachSessionMetadata;
  createdAt: string;
  updatedAt: string;
}

/** Max source duration for Coach Studio uploads (ms). */
export const COACH_STUDIO_MAX_DURATION_MS = 30_000;

export const COACH_SESSIONS_BUCKET = "coach-sessions";

export function emptyCoachEditorState(): CoachEditorState {
  return {
    version: 2,
    freezes: [],
    phases: [
      {
        id: phaseId(null, null),
        afterFreezeId: null,
        beforeFreezeId: null,
        captions: [],
        overlays: emptyCoachOverlayBundle(),
      },
    ],
  };
}

export function phaseId(
  afterFreezeId: string | null,
  beforeFreezeId: string | null
): string {
  return `phase:${afterFreezeId ?? "_start"}:${beforeFreezeId ?? "_end"}`;
}

export function emptyCoachSessionMetadata(title = ""): CoachSessionMetadata {
  return {
    title,
    instructions: "",
    equipment: [],
    jointsOfInterest: [],
    movementLabel: null,
    tags: [],
  };
}
