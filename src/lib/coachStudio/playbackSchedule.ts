import type { CoachEditorState, CoachFreeze } from "../../types/coachSession";
import { phaseAtSourceMs } from "./migrateEditor";

export interface ScheduledFrame {
  /** Source video time for this output frame. */
  sourceTimeSec: number;
  /** Freeze whose hold is active (null during normal motion). */
  activeFreezeId: string | null;
  /** Phase active during motion frames (null during holds). */
  activePhaseId: string | null;
}

/**
 * Build the coached timeline: normal frames + inserted hold frames at each freeze.
 * Shared by preview playback and export so they stay in sync.
 */
export function buildFrameSchedule(
  editor: CoachEditorState | { freezes: CoachFreeze[]; phases?: CoachEditorState["phases"] },
  durationSec: number,
  fps: number
): ScheduledFrame[] {
  const safeFps = Math.min(60, Math.max(10, Math.round(fps || 30)));
  const dt = 1 / safeFps;
  const frames: ScheduledFrame[] = [];
  const freezes = [...editor.freezes].sort((a, b) => a.tMs - b.tMs);
  let freezeIdx = 0;
  const durationMs = durationSec * 1000;
  const fullEditor = editor as CoachEditorState;

  if (durationSec <= 0) return frames;

  for (let t = 0; t < durationSec; t += dt) {
    let insertedHold = false;
    while (
      freezeIdx < freezes.length &&
      freezes[freezeIdx]!.tMs / 1000 >= t &&
      freezes[freezeIdx]!.tMs / 1000 < t + dt
    ) {
      const freeze = freezes[freezeIdx]!;
      const holdFrames = Math.max(1, Math.round((freeze.holdMs / 1000) * safeFps));
      for (let h = 0; h < holdFrames; h++) {
        frames.push({
          sourceTimeSec: freeze.tMs / 1000,
          activeFreezeId: freeze.id,
          activePhaseId: null,
        });
      }
      freezeIdx++;
      insertedHold = true;
    }
    // Skip motion at this bucket when a hold was inserted — otherwise sourceTime
    // can still be before the freeze and flash the previous phase's caption.
    if (insertedHold) continue;
    const phase =
      Array.isArray(fullEditor.phases)
        ? phaseAtSourceMs(fullEditor, t * 1000, durationMs)
        : null;
    frames.push({
      sourceTimeSec: t,
      activeFreezeId: null,
      activePhaseId: phase?.id ?? null,
    });
  }
  return frames;
}

/** First schedule index at or after the given source time (scrub / resume). */
export function scheduleIndexForSourceTime(
  schedule: ScheduledFrame[],
  sourceTimeSec: number
): number {
  if (schedule.length === 0) return 0;
  const eps = 1 / 120;
  for (let i = 0; i < schedule.length; i++) {
    if (schedule[i]!.sourceTimeSec + eps >= sourceTimeSec) return i;
  }
  return schedule.length - 1;
}

export function safeCoachFps(fps: number | null | undefined): number {
  return Math.min(60, Math.max(10, Math.round(fps || 30)));
}
