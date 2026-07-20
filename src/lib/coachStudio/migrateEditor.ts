import {
  emptyCoachOverlayBundle,
  emptyCoachEditorState,
  cloneOverlayBundleWithFreshIds,
  normalizeCoachConnector,
  normalizeCoachMobilityGeometry,
  phaseId,
  type CoachAngleChip,
  type CoachAngleChipJoint,
  type CoachCaption,
  type CoachEditorState,
  type CoachEditorStateV1,
  type CoachFreeze,
  type CoachOverlayBundle,
  type CoachPhase,
} from "../../types/coachSession";

const ANGLE_CHIP_JOINTS = new Set<string>([
  "left_knee",
  "right_knee",
  "left_hip",
  "right_hip",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
]);

function cloneAngleChips(raw: unknown): CoachAngleChip[] {
  if (!Array.isArray(raw)) return [];
  const out: CoachAngleChip[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const c = item as { id?: unknown; joint?: unknown; style?: CoachAngleChip["style"] };
    if (typeof c.id !== "string" || typeof c.joint !== "string") continue;
    if (!ANGLE_CHIP_JOINTS.has(c.joint)) continue;
    out.push({
      id: c.id,
      joint: c.joint as CoachAngleChipJoint,
      style: c.style ? { ...c.style } : undefined,
    });
  }
  return out;
}

function cloneBundle(b?: {
  connectors?: unknown;
  jointArrows?: CoachOverlayBundle["jointArrows"];
  focusJoints?: CoachOverlayBundle["focusJoints"];
  mobility?: unknown;
  angleChips?: unknown;
} | null): CoachOverlayBundle {
  if (!b) return emptyCoachOverlayBundle();
  return {
    connectors: Array.isArray(b.connectors)
      ? b.connectors
          .map((c) => normalizeCoachConnector(c))
          .filter((c): c is NonNullable<typeof c> => c != null)
      : [],
    jointArrows: Array.isArray(b.jointArrows) ? [...b.jointArrows] : [],
    focusJoints: Array.isArray(b.focusJoints) ? [...b.focusJoints] : [],
    mobility: normalizeCoachMobilityGeometry(b.mobility),
    angleChips: cloneAngleChips(b.angleChips),
  };
}

function cloneCaptions(captions?: CoachCaption[] | null): CoachCaption[] {
  if (!Array.isArray(captions)) return [];
  return captions.slice(0, 2).map((c) => ({ ...c, style: c.style ? { ...c.style } : c.style }));
}

/**
 * When a freeze is inserted/removed, phase ids change. Prefer exact id match;
 * otherwise inherit overlays from the phase that was split or merged into.
 */
function resolvePrevPhase(
  after: string | null,
  before: string | null,
  prevPhases: CoachPhase[],
  prevById: Map<string, CoachPhase>
): { phase: CoachPhase | undefined; exact: boolean } {
  const exact = prevById.get(phaseId(after, before));
  if (exact) return { phase: exact, exact: true };

  const sameAfter = prevPhases.find((p) => p.afterFreezeId === after);
  if (sameAfter) return { phase: sameAfter, exact: false };

  const sameBefore = prevPhases.find((p) => p.beforeFreezeId === before);
  if (sameBefore) return { phase: sameBefore, exact: false };

  if (prevPhases.length === 1) return { phase: prevPhases[0], exact: false };
  return { phase: undefined, exact: false };
}

function phaseFromPrev(
  after: string | null,
  before: string | null,
  prevPhases: CoachPhase[],
  prevById: Map<string, CoachPhase>
): CoachPhase {
  const id = phaseId(after, before);
  const { phase: prev, exact } = resolvePrevPhase(after, before, prevPhases, prevById);
  return {
    id,
    afterFreezeId: after,
    beforeFreezeId: before,
    // Captions only follow exact phase identity — splits don't duplicate copy.
    captions: exact ? cloneCaptions(prev?.captions) : [],
    overlays: prev?.overlays
      ? exact
        ? cloneBundle(prev.overlays)
        : cloneOverlayBundleWithFreshIds(cloneBundle(prev.overlays))
      : emptyCoachOverlayBundle(),
  };
}

/**
 * Rebuild phases from sorted freezes.
 * Exact id match keeps captions + overlays; new/split phases inherit overlays
 * (fresh ids) from the phase they replaced, with empty captions.
 */
export function syncPhasesFromFreezes(
  freezes: CoachFreeze[],
  prevPhases: CoachPhase[] = []
): CoachPhase[] {
  const sorted = [...freezes].sort((a, b) => a.tMs - b.tMs);
  const prevById = new Map(prevPhases.map((p) => [p.id, p]));
  const next: CoachPhase[] = [];

  if (sorted.length === 0) {
    next.push(phaseFromPrev(null, null, prevPhases, prevById));
    return next;
  }

  next.push(phaseFromPrev(null, sorted[0]!.id, prevPhases, prevById));

  for (let i = 0; i < sorted.length - 1; i++) {
    next.push(phaseFromPrev(sorted[i]!.id, sorted[i + 1]!.id, prevPhases, prevById));
  }

  next.push(phaseFromPrev(sorted[sorted.length - 1]!.id, null, prevPhases, prevById));

  return next;
}

/** Source-time bounds for a phase (ms), given sorted freezes + clip duration. */
export function phaseBoundsMs(
  phase: CoachPhase,
  freezes: CoachFreeze[],
  durationMs: number
): { startMs: number; endMs: number } {
  const byId = new Map(freezes.map((f) => [f.id, f]));
  const startMs = phase.afterFreezeId
    ? (byId.get(phase.afterFreezeId)?.tMs ?? 0)
    : 0;
  const endMs = phase.beforeFreezeId
    ? (byId.get(phase.beforeFreezeId)?.tMs ?? durationMs)
    : durationMs;
  return { startMs, endMs: Math.max(startMs, endMs) };
}

export function phaseAtSourceMs(
  editor: CoachEditorState,
  sourceMs: number,
  durationMs: number
): CoachPhase | null {
  for (const phase of editor.phases) {
    const { startMs, endMs } = phaseBoundsMs(phase, editor.freezes, durationMs);
    // [start, end) except last phase includes end
    const isLast = phase.beforeFreezeId === null;
    if (sourceMs >= startMs && (isLast ? sourceMs <= endMs : sourceMs < endMs)) {
      return phase;
    }
  }
  return editor.phases[0] ?? null;
}

export function phaseLabel(editor: CoachEditorState, phaseIdValue: string): string {
  const idx = editor.phases.findIndex((p) => p.id === phaseIdValue);
  return idx >= 0 ? `Phase ${idx + 1}` : "Phase";
}

/**
 * Normalize any stored editor JSON to v2.
 * Safe for fresh empties and legacy v1 drafts.
 */
export function migrateCoachEditorState(raw: unknown): CoachEditorState {
  if (!raw || typeof raw !== "object") {
    return emptyCoachEditorState();
  }

  const obj = raw as { version?: number };

  if (obj.version === 2) {
    const v2 = raw as CoachEditorState;
    const freezes = Array.isArray(v2.freezes)
      ? v2.freezes.map((f) => ({
          id: f.id,
          tMs: f.tMs,
          holdMs: f.holdMs,
          captions: cloneCaptions(f.captions),
          overlays: cloneBundle(f.overlays),
        }))
      : [];
    const prevPhases = Array.isArray(v2.phases)
      ? v2.phases.map((p) => ({
          ...p,
          captions: cloneCaptions(p.captions),
          overlays: cloneBundle(p.overlays),
        }))
      : [];
    return {
      version: 2,
      freezes,
      phases: syncPhasesFromFreezes(freezes, prevPhases),
    };
  }

  // Treat missing / version 1 as v1
  const v1 = raw as CoachEditorStateV1;
  const globalBundle = cloneBundle({
    connectors: v1.connectors,
    jointArrows: v1.jointArrows,
    focusJoints: [],
  });

  const captionsByFreeze = new Map<string, CoachCaption[]>();
  for (const c of v1.captions ?? []) {
    if (!c?.freezeId) continue;
    const list = captionsByFreeze.get(c.freezeId) ?? [];
    if (list.length >= 2) continue;
    list.push({
      id: c.id,
      text: c.text ?? "",
      anchor: c.anchor ?? { x: 0.5, y: 0.15 },
      style: c.style,
    });
    captionsByFreeze.set(c.freezeId, list);
  }

  const freezes: CoachFreeze[] = (v1.freezes ?? []).map((f) => ({
    id: f.id,
    tMs: f.tMs,
    holdMs: f.holdMs,
    captions: captionsByFreeze.get(f.id) ?? [],
    overlays: emptyCoachOverlayBundle(),
  }));

  const phases = syncPhasesFromFreezes(freezes, []);
  // Preserve old global lines on every phase so nothing disappears
  for (const phase of phases) {
    phase.overlays = cloneBundle(globalBundle);
  }

  return { version: 2, freezes, phases };
}
