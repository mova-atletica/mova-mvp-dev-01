import type { Program, ProgramProgressState, ProgramSession, ProgramWeek } from "../types/programs";
import type { UserProgramEntitlement } from "../types/entitlements";
import { isEntitlementActive } from "./entitlementAccess";

export function isProgramEnrolled(
  program: Program,
  progress: ProgramProgressState | null,
  entitlement?: UserProgramEntitlement | null
): boolean {
  if (program.accessLevel === "free") return true;
  if (isEntitlementActive(entitlement ?? null)) return true;
  return progress?.enrolled === true;
}

/** Week visible in UI (preview or unlocked progression) */
export function isWeekVisible(
  program: Program,
  weekNumber: number,
  progress: ProgramProgressState | null,
  entitlement?: UserProgramEntitlement | null
): boolean {
  if (weekNumber < 1 || weekNumber > program.durationWeeks) return false;
  const enrolled = isProgramEnrolled(program, progress, entitlement);

  if (!enrolled) {
    return weekNumber <= program.previewWeekCount;
  }

  const unlockedThrough = progress?.unlockedThroughWeek ?? 1;
  return weekNumber <= unlockedThrough;
}

/** Week content interactive (check-offs) — same as visible for now */
export function isWeekInteractive(
  program: Program,
  weekNumber: number,
  progress: ProgramProgressState | null,
  entitlement?: UserProgramEntitlement | null
): boolean {
  return isWeekVisible(program, weekNumber, progress, entitlement);
}

export function isWeekLocked(
  program: Program,
  weekNumber: number,
  progress: ProgramProgressState | null,
  entitlement?: UserProgramEntitlement | null
): boolean {
  return !isWeekVisible(program, weekNumber, progress, entitlement);
}

export function getAllSessionExerciseIds(week: ProgramWeek): string[] {
  return week.sessions.flatMap((s) => s.exercises.map((e) => e.id));
}

export function isSessionComplete(
  session: ProgramSession,
  progress: ProgramProgressState
): boolean {
  const completed = new Set(progress.completedExerciseIds);
  return session.exercises.every((e) => completed.has(e.id));
}

export function isWeekSessionsComplete(week: ProgramWeek, progress: ProgramProgressState): boolean {
  return week.sessions.every((session) => isSessionComplete(session, progress));
}

export function weekFilmingGateSatisfied(
  weekNumber: number,
  progress: ProgramProgressState
): boolean {
  const key = String(weekNumber);
  return (
    progress.weekHasRecording[key] === true || progress.weekFilmingSkipped[key] === true
  );
}

export function canUnlockNextWeek(
  program: Program,
  weekNumber: number,
  progress: ProgramProgressState
): boolean {
  if (weekNumber >= program.durationWeeks) return false;
  const week = program.weeks.find((w) => w.weekNumber === weekNumber);
  if (!week) return false;
  return (
    isWeekSessionsComplete(week, progress) && weekFilmingGateSatisfied(weekNumber, progress)
  );
}

export function formatProgramPrice(priceCents?: number): string | null {
  if (priceCents == null) return null;
  return `$${(priceCents / 100).toFixed(priceCents % 100 === 0 ? 0 : 2)}`;
}

export function exercisePrescriptionLabel(exercise: {
  exerciseType: string;
  sets?: number;
  reps?: number;
  durationSec?: number;
  restSec?: number;
}): string {
  const parts: string[] = [];
  if (exercise.sets != null) parts.push(`${exercise.sets} sets`);
  if (exercise.reps != null) parts.push(`${exercise.reps} reps`);
  if (exercise.durationSec != null) parts.push(`${exercise.durationSec}s hold`);
  if (exercise.restSec != null) parts.push(`${exercise.restSec}s rest`);
  return parts.join(" · ") || exercise.exerciseType;
}

export function recordingHintForType(exerciseType: string): string {
  if (exerciseType === "pose") return "Record your hold to track alignment over weeks.";
  if (exerciseType === "flow") return "Record a pass through the flow to compare over time.";
  return "Record a set to track reps and form over time.";
}
