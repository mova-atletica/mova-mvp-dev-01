// Stats effects for displaying joint angles, ROM, and global overlays
// Includes safe zone calculations for Instagram Stories/Reels compliance

// Logo loading utility
let logoImage: HTMLImageElement | null = null;
let logoLoaded = false;

function loadLogo(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (logoLoaded && logoImage) {
      resolve();
      return;
    }
    
    logoImage = new Image();
    logoImage.onload = () => {
      logoLoaded = true;
      resolve();
    };
    logoImage.onerror = reject;
    logoImage.src = '/images/brand/logo/Logo_Plain.svg';
  });
}

// Pre-load the logo when the module is imported
loadLogo().catch(console.warn);

// PoseNet keypoint name to index mapping (COCO-17 format)
const KEYPOINT_NAME_TO_INDEX: { [key: string]: number } = {
  'nose': 0,
  'left_eye': 1, 'right_eye': 2,
  'left_ear': 3, 'right_ear': 4,
  'left_shoulder': 5, 'right_shoulder': 6,
  'left_elbow': 7, 'right_elbow': 8,
  'left_wrist': 9, 'right_wrist': 10,
  'left_hip': 11, 'right_hip': 12,
  'left_knee': 13, 'right_knee': 14,
  'left_ankle': 15, 'right_ankle': 16
};

// Helper function to get keypoint by name (supports both named and indexed formats)
function getKeypointByName(keypoints: any[], name: string): any {
  // First try to find by name property (AssetGenerationModal format)
  const namedKeypoint = keypoints.find((kp: any) => kp.name === name);
  if (namedKeypoint) return namedKeypoint;
  
  // Fallback to index-based lookup (motion-explore localStorage format)
  const keypointIndex = KEYPOINT_NAME_TO_INDEX[name];
  if (keypointIndex !== undefined && keypoints[keypointIndex]) {
    return keypoints[keypointIndex];
  }
  
  return null;
}

export interface StatsConfig {
  // Joint Angle Display
  showJointAngles: boolean;
  enabledJoints: string[];
  angleColor: string;
  angleSize: number;
  
  // ROM Tracking
  showROM: boolean;
  romJoints: string[];
  romDisplayStyle: 'min_max' | 'range_bar' | 'both';
  romColor: string;
  
  // Global/Branding Overlays
  showGlobalStats: boolean;
  exerciseTitle: string;
  muscleGroups: string[];
  showLogo: boolean;
  logoPosition: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  
  // Exercise Info Styling
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontSize: number;
  
  // Safe Zone Settings
  safeZoneEnabled: boolean;
  canvasAspectRatio: '9:16' | '16:9' | 'custom';

  /** Centered time-series overlay: one or two joints, shared 0–180° Y domain, no grid */
  showJointAngleChart?: boolean;
  jointAngleChartJointA?: string;
  jointAngleChartJointB?: string;
  jointAngleChartColorA?: string;
  jointAngleChartColorB?: string;
  /** When false, only series A is drawn */
  jointAngleChartSecondSeries?: boolean;
  jointAngleChartLineStyleA?: 'solid' | 'dashed';
  jointAngleChartLineStyleB?: 'solid' | 'dashed';
  /** Base stroke width; multiplied by preview/export scale (matches prior default ~2) */
  jointAngleChartLineThickness?: number;
  /** Linearly interpolate short NaN runs between valid samples */
  jointAngleChartInterpolateGaps?: boolean;
  /** Max consecutive missing frames to interpolate; larger gaps stay broken */
  jointAngleChartMaxInterpGapFrames?: number;

  /** Text-only metrics chips overlay (preview/export parity; max 3 rendered). */
  showMetricChips?: boolean;
  metricChipLayout?: 'bottom_center_row' | 'bottom_center_stack' | 'top_center_row' | 'top_center_stack';
  metricChipTextColor?: string;
  metricChips?: MetricChipConfig[];
  sportAnalysisKind?: 'cycling' | 'pullups' | 'plank' | 'squat';
  sportMetricsSnapshot?: SportMetricsSnapshot | null;
  
  // Export mode flag
  isExport?: boolean;
}

export type MetricChipKind =
  | 'rom_joint'
  | 'cycling_cadence'
  | 'cycling_stroke_repeatability'
  | 'pullups_reps'
  | 'pullups_elbow_symmetry'
  | 'plank_hold_sec'
  | 'plank_correction_count'
  | 'plank_avg_hip_dev';

export interface MetricChipConfig {
  id: string;
  kind: MetricChipKind;
  jointName?: string;
}

export interface SportMetricsSnapshot {
  cyclingCadenceRpm?: number | null;
  cyclingStrokeRepeatability?: number | null;
  pullupsRepCount?: number | null;
  pullupsElbowSymmetry?: number | null;
  /** Plank hold duration from analyzed clip (seconds). */
  plankHoldDurationSec?: number | null;
  /** Voice-style correction events counted from sustained bad form segments. */
  plankCorrectionCount?: number | null;
  /** @deprecated Angle-based plank uses {@link plankAvgHipAngleDeg}. */
  plankAvgHipDeviation?: number | null;
  /** Mean hip angle (shoulder–hip–knee, °) while in detected plank. */
  plankAvgHipAngleDeg?: number | null;
  /** Squat reps counted by side-view knee-angle state machine. */
  squatRepCount?: number | null;
}

export interface SafeZone {
  top: number;
  bottom: number;
  left: number;
  right: number;
  centerX: number;
  centerY: number;
  safeWidth: number;
  safeHeight: number;
}

export interface JointAngle {
  jointName: string;
  angle: number;
  position: { x: number; y: number };
  isVisible: boolean;
}

export interface ROMData {
  jointName: string;
  currentAngle: number;
  minAngle: number;
  maxAngle: number;
  range: number;
  position: { x: number; y: number };
}

const JOINT_LABELS: Record<string, string> = {
  left_knee: 'L Knee',
  right_knee: 'R Knee',
  left_hip: 'L Hip',
  right_hip: 'R Hip',
  left_elbow: 'L Elbow',
  right_elbow: 'R Elbow',
};

interface ResolvedMetricChip {
  id: string;
  label: string;
  value: string;
}

interface FixedROMSnapshot {
  min: number;
  max: number;
  range: number;
}

const fixedRomSnapshotCache = new WeakMap<any[], Map<string, FixedROMSnapshot>>();

// ROM tracking storage (persistent across frames)
const romStorage = new Map<string, { min: number; max: number; history: number[] }>();

/** Per-poses-array cache of precomputed angle series per joint (avoids O(n) work each frame). */
const angleSeriesCache = new WeakMap<any[], Map<string, number[]>>();

function getAngleSeriesForJoint(poses: any[], jointName: string): number[] {
  let byJoint = angleSeriesCache.get(poses);
  if (!byJoint) {
    byJoint = new Map();
    angleSeriesCache.set(poses, byJoint);
  }
  const hit = byJoint.get(jointName);
  if (hit) return hit;
  const arr = new Array(poses.length);
  for (let i = 0; i < poses.length; i++) {
    const angles = extractJointAngles(poses, i);
    const j = angles.find((a) => a.jointName === jointName);
    arr[i] = j ? j.angle : NaN;
  }
  byJoint.set(jointName, arr);
  return arr;
}

/** User-space width/height (undo ctx.scale so layout matches video drawImage coords). */
function getLogicalCanvasDimensions(ctx: CanvasRenderingContext2D): { width: number; height: number } {
  const t = ctx.getTransform();
  const a = t.a || 1;
  const d = t.d || 1;
  return {
    width: ctx.canvas.width / a,
    height: ctx.canvas.height / d,
  };
}

/**
 * Fill NaN runs strictly between two valid angles (gap length ≤ maxGap), then hold first/last valid at edges.
 */
function interpolateAngleGaps(series: number[], maxGap: number): number[] {
  const n = series.length;
  const out = series.slice();
  let i = 0;
  while (i < n) {
    if (!Number.isNaN(out[i])) {
      i++;
      continue;
    }
    const start = i;
    while (i < n && Number.isNaN(out[i])) i++;
    const end = i - 1;
    const gapLen = end - start + 1;
    const leftVal = start > 0 ? out[start - 1] : NaN;
    const rightVal = i < n ? out[i] : NaN;
    if (!Number.isNaN(leftVal) && !Number.isNaN(rightVal) && gapLen <= maxGap) {
      const leftIdx = start - 1;
      const rightIdx = i;
      const denom = rightIdx - leftIdx;
      for (let k = start; k <= end; k++) {
        const t = (k - leftIdx) / denom;
        out[k] = leftVal + (rightVal - leftVal) * t;
      }
    }
  }
  let firstValid = -1;
  for (let j = 0; j < n; j++) {
    if (!Number.isNaN(out[j])) {
      firstValid = j;
      break;
    }
  }
  if (firstValid === -1) return out;
  for (let j = 0; j < firstValid; j++) out[j] = out[firstValid];
  let lastValid = -1;
  for (let j = n - 1; j >= 0; j--) {
    if (!Number.isNaN(out[j])) {
      lastValid = j;
      break;
    }
  }
  for (let j = lastValid + 1; j < n; j++) out[j] = out[lastValid];
  return out;
}

function getSafeZoneForStats(
  canvasWidth: number,
  canvasHeight: number,
  config: Partial<StatsConfig>
): SafeZone {
  return config.safeZoneEnabled
    ? calculateSafeZone(canvasWidth, canvasHeight)
    : {
        top: 20,
        bottom: canvasHeight - 20,
        left: 20,
        right: canvasWidth - 20,
        centerX: canvasWidth / 2,
        centerY: canvasHeight / 2,
        safeWidth: canvasWidth - 40,
        safeHeight: canvasHeight - 40,
      };
}

/** Indices 0,2,4,… up to `upto`, plus `upto` if odd so the polyline reaches the playhead. */
function decimatedFrameIndices(upto: number): number[] {
  const indices: number[] = [];
  for (let i = 0; i <= upto; i += 2) indices.push(i);
  if (upto >= 0 && (indices.length === 0 || indices[indices.length - 1] !== upto)) {
    indices.push(upto);
  }
  return indices;
}

function statsCanvasScaleFactor(ctx: CanvasRenderingContext2D): number {
  const { width, height } = getLogicalCanvasDimensions(ctx);
  const referenceWidth = 400;
  const referenceHeight = 711;
  return Math.min(width / referenceWidth, height / referenceHeight);
}

/**
 * Joint angle time-series overlay (preview + export): one or two series, 0–180°, decimated polyline + endpoint markers.
 */
export function renderJointAngleChart(
  ctx: CanvasRenderingContext2D,
  poses: any[],
  config: Partial<StatsConfig>,
  currentFrameIndex: number
): void {
  if (!config.showJointAngleChart) return;
  const jointA = config.jointAngleChartJointA;
  if (!jointA) return;

  const secondOn = config.jointAngleChartSecondSeries !== false;
  const jointB = config.jointAngleChartJointB;
  if (secondOn && (!jointB || jointB === jointA)) return;

  const rawA = getAngleSeriesForJoint(poses, jointA);
  const rawB = secondOn && jointB ? getAngleSeriesForJoint(poses, jointB) : null;

  const maxGap = Math.max(0, Math.round(config.jointAngleChartMaxInterpGapFrames ?? 20));
  const doInterp = config.jointAngleChartInterpolateGaps !== false;
  const seriesA = doInterp ? interpolateAngleGaps(rawA, maxGap) : rawA;
  const seriesB = rawB && doInterp ? interpolateAngleGaps(rawB, maxGap) : rawB;

  const { width: logicalW, height: logicalH } = getLogicalCanvasDimensions(ctx);
  const scaleFactor = statsCanvasScaleFactor(ctx);
  const safeZone = getSafeZoneForStats(logicalW, logicalH, config);

  const plotW = safeZone.safeWidth * 0.72;
  const plotH = safeZone.safeHeight * 0.25;
  const plotLeft = safeZone.centerX - plotW / 2;
  const plotTop = safeZone.centerY - plotH / 2;

  const n = poses.length;
  const xDenom = Math.max(1, n - 1);

  const colorA = config.jointAngleChartColorA || '#000000';
  const colorB = config.jointAngleChartColorB || '#ffffff';
  const styleA = config.jointAngleChartLineStyleA || 'solid';
  const styleB = config.jointAngleChartLineStyleB || 'solid';
  const baseThick = config.jointAngleChartLineThickness ?? 2;

  const frameToX = (frameIdx: number) => plotLeft + (frameIdx / xDenom) * plotW;
  const degToY = (deg: number) => {
    const clamped = Math.max(0, Math.min(180, deg));
    return plotTop + plotH - (clamped / 180) * plotH;
  };

  const lineW = Math.max(1, baseThick * scaleFactor);
  const markerR = Math.max(2, (baseThick * 1.75) * scaleFactor);
  const dashUnit = Math.max(2, 3 * scaleFactor);

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const strokeSeries = (series: number[], stroke: string, lineStyle: 'solid' | 'dashed') => {
    const idx = decimatedFrameIndices(currentFrameIndex);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineW;
    ctx.setLineDash(lineStyle === 'dashed' ? [dashUnit, dashUnit * 0.75] : []);
    ctx.beginPath();
    let started = false;
    for (const i of idx) {
      const v = series[i];
      if (Number.isNaN(v)) {
        started = false;
        continue;
      }
      const x = frameToX(i);
      const y = degToY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  strokeSeries(seriesA, colorA, styleA);
  if (seriesB && jointB) strokeSeries(seriesB, colorB, styleB);

  ctx.setLineDash([]);

  const drawMarker = (series: number[], fill: string) => {
    const v = series[currentFrameIndex];
    if (Number.isNaN(v)) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(frameToX(currentFrameIndex), degToY(v), markerR, 0, Math.PI * 2);
    ctx.fill();
  };

  drawMarker(seriesA, colorA);
  if (seriesB && jointB) drawMarker(seriesB, colorB);

  ctx.restore();
}

function resolveMetricChip(
  chip: MetricChipConfig,
  romData: ROMData[],
  sport: SportMetricsSnapshot | null | undefined,
  sportKind: 'cycling' | 'pullups' | 'plank' | 'squat',
  poses: any[]
): ResolvedMetricChip | null {
  if (chip.kind === 'rom_joint') {
    if (!chip.jointName) return null;
    const byJoint = fixedRomSnapshotCache.get(poses) ?? new Map<string, FixedROMSnapshot>();
    if (!fixedRomSnapshotCache.has(poses)) fixedRomSnapshotCache.set(poses, byJoint);
    let snap = byJoint.get(chip.jointName);
    if (!snap) {
      const series = getAngleSeriesForJoint(poses, chip.jointName);
      const valid = series.filter((v) => !Number.isNaN(v));
      if (valid.length === 0) return null;
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      snap = { min, max, range: max - min };
      byJoint.set(chip.jointName, snap);
    }
    const jointLabel = JOINT_LABELS[chip.jointName] || chip.jointName;
    return { id: chip.id, label: `ROM ${jointLabel}`, value: `${Math.round(snap.range)}°` };
  }

  if (chip.kind === 'cycling_cadence') {
    if (sportKind !== 'cycling') return null;
    const v = sport?.cyclingCadenceRpm;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Cadence`, value: `${Math.round(v)}rpm` };
  }

  if (chip.kind === 'cycling_stroke_repeatability') {
    if (sportKind !== 'cycling') return null;
    const v = sport?.cyclingStrokeRepeatability;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Stroke`, value: `${Math.round(v)}%` };
  }

  if (chip.kind === 'pullups_reps') {
    if (sportKind !== 'pullups') return null;
    const v = sport?.pullupsRepCount;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Pull-up reps`, value: `${Math.round(v)}` };
  }

  if (chip.kind === 'pullups_elbow_symmetry') {
    if (sportKind !== 'pullups') return null;
    const v = sport?.pullupsElbowSymmetry;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Elbow symmetry`, value: `${Math.round(v)}%` };
  }

  if (chip.kind === 'plank_hold_sec') {
    if (sportKind !== 'plank') return null;
    const v = sport?.plankHoldDurationSec;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Plank hold`, value: `${v < 60 ? `${Math.round(v)}s` : `${Math.floor(v / 60)}m ${Math.round(v % 60)}s`}` };
  }

  if (chip.kind === 'plank_correction_count') {
    if (sportKind !== 'plank') return null;
    const v = sport?.plankCorrectionCount;
    if (v == null || !Number.isFinite(v)) return null;
    return { id: chip.id, label: `Corrections`, value: `${Math.round(v)}` };
  }

  if (chip.kind === 'plank_avg_hip_dev') {
    if (sportKind !== 'plank') return null;
    const deg = sport?.plankAvgHipAngleDeg;
    if (deg != null && Number.isFinite(deg)) {
      return { id: chip.id, label: `Avg hip`, value: `${deg.toFixed(0)}°` };
    }
    const legacy = sport?.plankAvgHipDeviation;
    if (legacy == null || !Number.isFinite(legacy)) return null;
    return { id: chip.id, label: `Hip line`, value: `${(legacy * 1000).toFixed(0)}` };
  }

  return null;
}

export function renderMetricChips(
  ctx: CanvasRenderingContext2D,
  poses: any[],
  romData: ROMData[],
  config: Partial<StatsConfig>
): void {
  if (!config.showMetricChips) return;
  const chipsCfg = config.metricChips || [];
  if (chipsCfg.length === 0) return;

  const sportKind = config.sportAnalysisKind || 'cycling';
  const resolved = chipsCfg
    .map((c) => resolveMetricChip(c, romData, config.sportMetricsSnapshot, sportKind, poses))
    .filter((c): c is ResolvedMetricChip => Boolean(c))
    .slice(0, 3);
  if (resolved.length === 0) return;

  const { width: logicalW, height: logicalH } = getLogicalCanvasDimensions(ctx);
  const safe = getSafeZoneForStats(logicalW, logicalH, config);
  const scale = statsCanvasScaleFactor(ctx);

  const textColor = config.metricChipTextColor || '#ffffff';
  const labelPx = Math.max(9, Math.round(12 * scale));
  const valuePx = Math.max(18, Math.round(21 * scale));
  const gap = Math.max(8, Math.round(10 * scale));
  const lanePad = Math.max(10, Math.round(16 * scale));
  const chipH = Math.round(labelPx * 1.1 + valuePx * 1.25);
  const layout = config.metricChipLayout || 'bottom_center_row';
  const isTop = layout.startsWith('top_');
  const isStack = layout.endsWith('_stack');

  ctx.save();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isStack) {
    const totalH = resolved.length * chipH + (resolved.length - 1) * gap;
    let y = isTop ? safe.top + lanePad + chipH / 2 : safe.bottom - lanePad - totalH + chipH / 2;
    for (const chip of resolved) {
      ctx.font = `100 ${labelPx}px 'Roboto Mono', monospace`;
      ctx.fillText(chip.label, safe.centerX, y - valuePx * 0.6);
      ctx.font = `500 ${valuePx}px 'Roboto Mono', monospace`;
      ctx.fillText(chip.value, safe.centerX, y + labelPx * 0.9);
      y += chipH + gap;
    }
  } else {
    const widths = resolved.map((chip) => {
      ctx.font = `100 ${labelPx}px 'Roboto Mono', monospace`;
      const labelW = ctx.measureText(chip.label).width;
      ctx.font = `700 ${valuePx}px 'Roboto Mono', monospace`;
      const valueW = ctx.measureText(chip.value).width;
      return Math.max(labelW, valueW);
    });
    const totalW = widths.reduce((sum, w) => sum + w, 0) + (resolved.length - 1) * gap;
    let x = safe.centerX - totalW / 2;
    const y = isTop ? safe.top + lanePad + chipH / 2 : safe.bottom - lanePad - chipH / 2;
    for (let i = 0; i < resolved.length; i++) {
      const w = widths[i];
      const center = x + w / 2;
      ctx.font = `100 ${labelPx}px 'Roboto Mono', monospace`;
      ctx.fillText(resolved[i].label, center, y - valuePx * 0.6);
      ctx.font = `500 ${valuePx}px 'Roboto Mono', monospace`;
      ctx.fillText(resolved[i].value, center, y + labelPx * 0.9);
      x += w + gap;
    }
  }

  ctx.restore();
}

/**
 * Calculate safe zones for Instagram Stories/Reels compliance
 * Based on 1080x1920 guidelines, scaled to actual canvas dimensions
 */
export function calculateSafeZone(canvasWidth: number, canvasHeight: number): SafeZone {
  // Base Instagram Stories dimensions: 1080x1920
  const baseWidth = 1080;
  const baseHeight = 1920;
  
  // Safe zone offsets (pixels from edges)
  const safeTop = 108;      // 5.6% from top
  const safeBottom = 320;   // 16.7% from bottom  
  const safeLeft = 60;      // 5.6% from left
  const safeRight = 120;    // 11.1% from right
  
  // Scale to actual canvas dimensions
  const scaleX = canvasWidth / baseWidth;
  const scaleY = canvasHeight / baseHeight;
  
  const top = safeTop * scaleY;
  const bottom = canvasHeight - (safeBottom * scaleY);
  const left = safeLeft * scaleX;
  const right = canvasWidth - (safeRight * scaleX);
  
  return {
    top,
    bottom,
    left,
    right,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    safeWidth: right - left,
    safeHeight: bottom - top
  };
}

/**
 * Calculate angle between three points (joint angle)
 * Returns angle in degrees
 */
export function calculateJointAngle(
  point1: { x: number; y: number },
  joint: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  const vector1 = {
    x: point1.x - joint.x,
    y: point1.y - joint.y
  };
  
  const vector2 = {
    x: point3.x - joint.x,
    y: point3.y - joint.y
  };
  
  const dot = vector1.x * vector2.x + vector1.y * vector2.y;
  const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
  const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = dot / (mag1 * mag2);
  const clampedCos = Math.max(-1, Math.min(1, cosAngle));
  const radians = Math.acos(clampedCos);
  
  return radians * (180 / Math.PI);
}

/**
 * Get joint angles from pose data
 */
export function extractJointAngles(poses: any[], frameIndex: number): JointAngle[] {
  if (!poses || poses.length === 0 || frameIndex >= poses.length) return [];
  
  const pose = poses[frameIndex];
  if (!pose || !pose.keypoints) return [];
  
  const keypoints = pose.keypoints;
  const angles: JointAngle[] = [];
  
  // Scale factors for canvas positioning
  const scaleX = 1; // Will be set by caller
  const scaleY = 1; // Will be set by caller
  
  // Define joint angle calculations
  const jointDefinitions = [
    {
      name: 'left_knee',
      points: ['left_hip', 'left_knee', 'left_ankle'],
      displayName: 'Left Knee'
    },
    {
      name: 'right_knee', 
      points: ['right_hip', 'right_knee', 'right_ankle'],
      displayName: 'Right Knee'
    },
    {
      name: 'left_hip',
      points: ['left_shoulder', 'left_hip', 'left_knee'],
      displayName: 'Left Hip'
    },
    {
      name: 'right_hip',
      points: ['right_shoulder', 'right_hip', 'right_knee'],
      displayName: 'Right Hip'
    },
    {
      name: 'left_elbow',
      points: ['left_shoulder', 'left_elbow', 'left_wrist'],
      displayName: 'Left Elbow'
    },
    {
      name: 'right_elbow',
      points: ['right_shoulder', 'right_elbow', 'right_wrist'],
      displayName: 'Right Elbow'
    }
  ];
  
  for (const joint of jointDefinitions) {
    const [point1Name, jointName, point3Name] = joint.points;
    
    const point1 = getKeypointByName(keypoints, point1Name);
    const jointPoint = getKeypointByName(keypoints, jointName);
    const point3 = getKeypointByName(keypoints, point3Name);
    
    if (point1 && jointPoint && point3 && 
        point1.score > 0.3 && jointPoint.score > 0.3 && point3.score > 0.3) {
      
      const angle = calculateJointAngle(
        { x: point1.x * scaleX, y: point1.y * scaleY },
        { x: jointPoint.x * scaleX, y: jointPoint.y * scaleY },
        { x: point3.x * scaleX, y: point3.y * scaleY }
      );
      
      angles.push({
        jointName: joint.name,
        angle: Math.round(angle),
        position: {
          x: jointPoint.x * scaleX,
          y: jointPoint.y * scaleY
        },
        isVisible: true
      });
    }
  }
  
  return angles;
}

/**
 * Update ROM tracking data
 */
export function updateROMTracking(jointAngles: JointAngle[]): ROMData[] {
  const romData: ROMData[] = [];
  
  for (const joint of jointAngles) {
    const key = joint.jointName;
    
    if (!romStorage.has(key)) {
      romStorage.set(key, {
        min: joint.angle,
        max: joint.angle,
        history: [joint.angle]
      });
    }
    
    const stored = romStorage.get(key)!;
    stored.min = Math.min(stored.min, joint.angle);
    stored.max = Math.max(stored.max, joint.angle);
    stored.history.push(joint.angle);
    
    // Keep only last 100 measurements for performance
    if (stored.history.length > 100) {
      stored.history = stored.history.slice(-100);
    }
    
    romData.push({
      jointName: joint.jointName,
      currentAngle: joint.angle,
      minAngle: stored.min,
      maxAngle: stored.max,
      range: stored.max - stored.min,
      position: joint.position
    });
  }
  
  return romData;
}

/**
 * Clear ROM tracking data (call when starting new exercise)
 */
export function clearROMTracking(): void {
  romStorage.clear();
}

/**
 * Render joint angle display
 */
export function renderJointAngles(
  ctx: CanvasRenderingContext2D,
  jointAngles: JointAngle[],
  config: Partial<StatsConfig>
): void {
  if (!config.showJointAngles) return;
  
  ctx.save();
  ctx.fillStyle = config.angleColor || '#00ff00';
  ctx.strokeStyle = config.angleColor || '#00ff00';
  ctx.lineWidth = 2;
  
  // Scale text size based on canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to account for this to prevent double-scaling
  let scaleFactor = 1;
  if (config.isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we don't need additional scaling
      scaleFactor = 1;
    } else {
      // Use a reference size that matches typical video display dimensions
      const referenceWidth = 400;
      const referenceHeight = 711;
      scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
    }
  } else {
    // Use a reference size that matches typical video display dimensions
    const referenceWidth = 400;
    const referenceHeight = 711;
    scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
  }
  
  const scaledAngleSize = Math.round((config.angleSize || 18) * scaleFactor);
  
  ctx.font = `bold ${scaledAngleSize}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';
  
  for (const joint of jointAngles) {
    if (!config.enabledJoints?.includes(joint.jointName)) continue;
    
    const { x, y } = joint.position;
    
    // Draw rounded background for text with proportional padding
    const text = `${joint.angle}°`;
    const textWidth = ctx.measureText(text).width;
    const fontSize = scaledAngleSize;
    const padding = Math.max(8, fontSize * 0.5); // Increased padding for larger text
    const backgroundHeight = fontSize + padding * 2; // Full padding top and bottom
    const borderRadius = Math.round(fontSize * 0.2);
    
    // Center the background properly - ensure text fits within container
    const bgWidth = textWidth + padding * 2;
    const bgX = x - bgWidth/2; // Center the entire container
    const bgY = y - backgroundHeight/2; // Center vertically around the text baseline
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, backgroundHeight, borderRadius);
    ctx.fill();
    
    // Draw angle text - center within the background container
    ctx.fillStyle = config.angleColor || '#00ff00';
    ctx.fillText(text, x, bgY + backgroundHeight/2 + fontSize/3); // Center text within background container
  }
  
  ctx.restore();
}

/**
 * Render ROM statistics
 */
export function renderROMStats(
  ctx: CanvasRenderingContext2D,
  romData: ROMData[],
  config: Partial<StatsConfig>
): void {
  if (!config.showROM) return;
  
  ctx.save();
  ctx.fillStyle = config.romColor || '#ff6b35';
  
  // Scale text size based on canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to account for this to prevent double-scaling
  let scaleFactor = 1;
  if (config.isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we don't need additional scaling
      scaleFactor = 1;
    } else {
      // Use a reference size that matches typical video display dimensions
      const referenceWidth = 400;
      const referenceHeight = 711;
      scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
    }
  } else {
    // Use a reference size that matches typical video display dimensions
    const referenceWidth = 400;
    const referenceHeight = 711;
    scaleFactor = Math.min(canvasWidth / referenceWidth, canvasHeight / referenceHeight);
  }
  
  const scaledAngleSize = Math.round((config.angleSize || 16) * scaleFactor);
  
  ctx.font = `bold ${scaledAngleSize}px 'Roboto', sans-serif`;
  ctx.textAlign = 'center';
  
  for (const rom of romData) {
    if (!config.romJoints?.includes(rom.jointName)) continue;
    
    const { x, y } = rom.position;
    
    if (config.romDisplayStyle === 'min_max' || config.romDisplayStyle === 'both') {
      const text = `ROM: ${rom.minAngle}° - ${rom.maxAngle}°`;
      const textWidth = ctx.measureText(text).width;
      const fontSize = scaledAngleSize;
      const padding = Math.max(8, fontSize * 0.5); // Increased padding for larger text
      const backgroundHeight = fontSize + padding * 2; // Full padding top and bottom
      const borderRadius = Math.round(fontSize * 0.2);
      
      // Center the background properly - ensure text fits within container
      const bgWidth = textWidth + padding * 2;
      const bgX = x - bgWidth/2; // Center the entire container
      const bgY = y + fontSize - backgroundHeight/2; // Position below joint, centered vertically
      
      // Draw rounded background with proportional padding
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, backgroundHeight, borderRadius);
      ctx.fill();
      
              // Draw ROM text - center within the background container
        ctx.fillStyle = config.romColor || '#ff6b35';
        ctx.fillText(text, x, y + fontSize + padding/2);
    }
    
    if (config.romDisplayStyle === 'range_bar' || config.romDisplayStyle === 'both') {
      // Draw range bar
      const barWidth = 60 * scaleFactor;
      const barHeight = 4 * scaleFactor;
      const barX = x - barWidth/2;
      const barY = y + 25 * scaleFactor;
      
      // Background bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress bar
      if (rom.range > 0) {
        const progress = (rom.currentAngle - rom.minAngle) / rom.range;
        ctx.fillStyle = config.romColor || '#ff6b35';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
      }
    }
  }
  
  ctx.restore();
}

/**
 * Render global overlays (exercise title, muscle groups, logo)
 */
export function renderGlobalOverlays(
  ctx: CanvasRenderingContext2D,
  config: Partial<StatsConfig>
): void {
  if (!config.showGlobalStats) return;
  
  // Get the actual canvas dimensions
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Replace lines 506-514 with:
  // Use canvas dimensions directly - they should always match video natural size
  // The scaling logic will handle the display size differences
  const effectiveWidth = canvasWidth;
  const effectiveHeight = canvasHeight;
  
  const safeZone = config.safeZoneEnabled 
    ? calculateSafeZone(effectiveWidth, effectiveHeight)
    : {
        top: 20,
        bottom: effectiveHeight - 20,
        left: 20,
        right: effectiveWidth - 20,
        centerX: effectiveWidth / 2,
        centerY: effectiveHeight / 2,
        safeWidth: effectiveWidth - 40,
        safeHeight: effectiveHeight - 40
      };
  
  // Calculate scale factor for consistent sizing across all elements
  const referenceWidth = 400;
  const referenceHeight = 711;
  const scaleFactor = Math.min(effectiveWidth / referenceWidth, effectiveHeight / referenceHeight);
  
  ctx.save();
  
  // Combined exercise info with customizable styling
  if (config.exerciseTitle || (config.muscleGroups && config.muscleGroups.length > 0)) {
    const titleText = config.exerciseTitle || '';
    const muscleText = (config.muscleGroups && config.muscleGroups.length > 0) 
      ? `Target: ${config.muscleGroups.join(', ')}` 
      : '';
    
    // Use the scale factor calculated at the top of the function
    
    // Get styling from config and apply scaling
    const baseFontSize = config.fontSize || 48;
    const scaledFontSize = Math.round(baseFontSize * scaleFactor);
    const titleFontSize = scaledFontSize;
    const muscleFontSize = Math.round(scaledFontSize * 0.6); // Muscle groups 60% of title size
    const textColor = config.textColor || '#ffffff';
    const backgroundColor = config.backgroundColor || '#000000';
    const backgroundOpacity = config.backgroundOpacity || 0.8;
    const padding = Math.round(scaledFontSize * 0.8); // Even more padding
    const borderRadius = Math.round(scaledFontSize * 0.25);
    const lineSpacing = Math.round(scaledFontSize * 0.6); // Even more spacing between title and muscle groups
    
    ctx.textAlign = 'center';
    
    // Measure text dimensions
    ctx.font = `100 ${titleFontSize}px 'Roboto', sans-serif`; // Thin Roboto font
    const titleMetrics = titleText ? ctx.measureText(titleText) : { width: 0 };
    
    ctx.font = `${muscleFontSize}px 'Roboto', sans-serif`;
    const muscleMetrics = muscleText ? ctx.measureText(muscleText) : { width: 0 };
    
    // Calculate container dimensions with bounds checking
    const maxWidth = Math.max(titleMetrics.width, muscleMetrics.width);
    const containerWidth = Math.min(maxWidth + padding * 2, effectiveWidth - 40); // Ensure it fits within canvas
    const totalTextHeight = (titleText ? titleFontSize : 0) + 
                           (muscleText ? muscleFontSize : 0) + 
                           (titleText && muscleText ? lineSpacing : 0);
    const containerHeight = totalTextHeight + padding * 2.5;
    
    // Position container - ensure it stays within canvas bounds
    const containerX = Math.max(20, Math.min(effectiveWidth - containerWidth - 20, effectiveWidth / 2 - containerWidth / 2));
    const containerY = Math.max(20, Math.min(effectiveHeight - containerHeight - 20, safeZone.top + 20));
    
    // Draw rounded background with custom color and opacity
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundOpacity})`;
    
    ctx.beginPath();
    ctx.roundRect(containerX, containerY, containerWidth, containerHeight, borderRadius);
    ctx.fill();
    
    // Draw text content
    ctx.fillStyle = textColor;
    let currentY = containerY + padding;
    
    // Draw title
    if (titleText) {
      ctx.font = `100 ${titleFontSize}px 'Roboto', sans-serif`; // Thin Roboto font
      currentY += titleFontSize;
      ctx.fillText(titleText, effectiveWidth / 2, currentY);
      currentY += lineSpacing;
    }
    
    // Draw muscle groups
    if (muscleText) {
      ctx.font = `${muscleFontSize}px 'Roboto', sans-serif`;
      currentY += muscleFontSize;
      ctx.fillText(muscleText, effectiveWidth / 2, currentY);
    }
  }
  
  // App logo - always bottom right with white container
  if (config.showLogo && logoLoaded && logoImage) {
    // Scale logo size using the same scale factor as text for consistency
    const baseLogoSize = 32;
    const basePadding = 12;
    const scaledLogoSize = Math.round(baseLogoSize * scaleFactor);
    const scaledPadding = Math.round(basePadding * scaleFactor);
    const containerSize = scaledLogoSize + scaledPadding * 2;
    const edgePadding = Math.round(16 * scaleFactor);
    const logoX = safeZone.right - containerSize - edgePadding; // Add some padding from edge
    const logoY = safeZone.bottom - containerSize - edgePadding; // Add some padding from edge
    
    // Draw white container with rounded corners
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    const borderRadius = Math.round(12 * scaleFactor);
    ctx.beginPath();
    ctx.roundRect(logoX, logoY, containerSize, containerSize, borderRadius);
    ctx.fill();
    
    // Draw the logo image centered in the container
    const logoOffsetX = logoX + scaledPadding;
    const logoOffsetY = logoY + scaledPadding;
    ctx.drawImage(logoImage, logoOffsetX, logoOffsetY, scaledLogoSize, scaledLogoSize);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Main stats effect renderer
 */
export function renderStats(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: Partial<StatsConfig> = {},
  frameTime: number = 0,
  isExport: boolean = false
): void {
  if (!poses || poses.length === 0) return;
  
  // Calculate current frame index
  const totalDuration = video.duration || 1;
  const totalFrames = poses.length;
  const framesPerSecond = totalFrames / totalDuration;
  const currentFrameIndex = Math.floor(frameTime * framesPerSecond);
  
  if (currentFrameIndex >= poses.length) return;
  
  // Extract joint angles
  const jointAngles = extractJointAngles(poses, currentFrameIndex);
  
  // Update ROM tracking
  const romData = updateROMTracking(jointAngles);
  
  // Render joint angles
  renderJointAngles(ctx, jointAngles, config);
  
  // Render ROM stats
  renderROMStats(ctx, romData, config);

  renderJointAngleChart(ctx, poses, config, currentFrameIndex);
  renderMetricChips(ctx, poses, romData, config);
  
  // Render global overlays
  renderGlobalOverlays(ctx, config);
} 