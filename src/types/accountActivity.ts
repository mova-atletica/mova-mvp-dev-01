export type AccountActivityKind = "studio" | "mini-app" | "program";

export type BodyRegion = "lower" | "upper" | "core";

export type MovementJoint = "knee" | "hip" | "shoulder" | "spine" | "ankle" | "elbow";

export interface SessionMovementMetrics {
  /** 0–100 overall form / pattern match */
  formScore: number;
  /** Average ROM across primary joints (degrees) */
  avgRomDegrees: number;
  /** Peak ROM in session (degrees) */
  peakRomDegrees: number;
  /** 0–100 left/right balance */
  symmetryScore: number;
  /** Relative emphasis per body region (should sum ~1) */
  bodyFocus: Record<BodyRegion, number>;
  /** Peak or avg ROM per joint when tracked */
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
}
