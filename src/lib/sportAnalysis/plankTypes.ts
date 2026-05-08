/** Which side of the body faces the camera for side-view plank (shoulder–hip–knee chain). */
export type PlankFacingSide = "left" | "right";

export interface PlankAnalysisInput {
  poses: any[];
  frameIntervalSec: number;
  /** Defaults to `"left"` when omitted. */
  facingSide?: PlankFacingSide;
}

export interface PlankAnalysisResult {
  schemaVersion: 2;
  holdDurationSec: number;
  /** % of in-plank frames where hip, knee, and shoulder were all in target bands. */
  timeInZonePct: number;
  /** % of in-plank frames with knee ≥ preset (extended). */
  timeKneeExtendedPct: number;
  /** % of in-plank frames with hip in neutral band (no pike/sag by angle). */
  timeHipNeutralPct: number;
  /** % of in-plank frames with shoulder angle in stack band. */
  timeShoulderStackPct: number;
  correctionCount: number;
  inPlankFrameCount: number;
  avgHipAngleDeg: number;
  avgKneeAngleDeg: number;
  avgShoulderAngleDeg: number;
  /** Smoothed series (3-frame median), same length as poses. */
  hipAngleSeries: (number | null)[];
  kneeAngleSeries: (number | null)[];
  shoulderAngleSeries: (number | null)[];
}

export type PlankAnalysisResponse = { ok: true; result: PlankAnalysisResult } | { ok: false; error: string };
