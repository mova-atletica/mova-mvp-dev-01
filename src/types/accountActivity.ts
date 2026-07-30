export type AccountActivityKind = "studio" | "mini-app" | "program" | "coach";

/** Joints derivable from `OpenMoveAngleSeries` — no ankle series exists. */
export type MovementJoint = "knee" | "hip" | "shoulder" | "spine" | "elbow";

/** Measured from a session's tracked joint angles — see `deriveSessionMovementMetrics`. */
export interface SessionMovementMetrics {
  /** Mean ROM across tracked joints (degrees) */
  avgRomDegrees: number;
  /** Largest single-joint ROM in the session (degrees) */
  peakRomDegrees: number;
  /** 0–100 left/right balance; null when no paired joint was tracked */
  symmetryScore: number | null;
  /** Peak ROM per joint; omits joints without usable tracking */
  jointRom: Partial<Record<MovementJoint, number>>;
}

export interface AccountActivityItem {
  id: string;
  kind: AccountActivityKind;
  title: string;
  subtitle: string;
  /** ISO date */
  occurredAt: string;
  tags?: string[];
  metricLabel?: string;
  metricValue?: string;
  metrics?: SessionMovementMetrics;
  sportSlug?: string | null;
  sportAnalysisKind?: string | null;
  frameIntervalSec?: number | null;
  /** True when angles + (sport analysis or studio angles) exist for replay modal */
  hasReplayPayload?: boolean;
  videoPath?: string | null;
  posesPath?: string | null;
  coachSessionId?: string | null;
  isSeed?: boolean;
  /** Inline angles when loaded for detail modal (optional on list) */
  angles?: import("../lib/openMoveAngleSeries").OpenMoveAngleSeries | null;
  sportAnalysis?: unknown | null;
  /** Open Move overlay preset when loaded */
  visualConfig?: import("../lib/visualOverlayPreset").VisualOverlayPreset | null;
}
