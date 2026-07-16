import type { Program, ProgramSession } from "./programs";

/** Context for opening the exercise studio from a program session. */
export interface ProgramStudioContext {
  programSlug: string;
  programTitle: string;
  weekNumber: number;
  sessionId: string;
  sessionTitle: string;
  /** Linked session exercise ids in session order (must have archive exerciseId). */
  linkedSessionExerciseIds: string[];
  /** Session exercise id → archive exercise id */
  exerciseIdBySessionExerciseId: Record<string, string>;
  activeSessionExerciseId: string;
  activeExerciseId: string;
  index: number;
}

export function getLinkedSessionExercises(session: ProgramSession) {
  return session.exercises.filter((item) => !!item.exerciseId);
}

export function buildProgramStudioContext(
  program: Program,
  weekNumber: number,
  session: ProgramSession,
  sessionExerciseId: string
): ProgramStudioContext | null {
  const linked = getLinkedSessionExercises(session);
  const index = linked.findIndex((item) => item.id === sessionExerciseId);
  if (index < 0) return null;

  const active = linked[index];
  if (!active.exerciseId) return null;

  const exerciseIdBySessionExerciseId: Record<string, string> = {};
  const linkedSessionExerciseIds: string[] = [];
  for (const item of linked) {
    if (!item.exerciseId) continue;
    linkedSessionExerciseIds.push(item.id);
    exerciseIdBySessionExerciseId[item.id] = item.exerciseId;
  }

  return {
    programSlug: program.slug,
    programTitle: program.title,
    weekNumber,
    sessionId: session.id,
    sessionTitle: session.title,
    linkedSessionExerciseIds,
    exerciseIdBySessionExerciseId,
    activeSessionExerciseId: active.id,
    activeExerciseId: active.exerciseId,
    index,
  };
}

export function programStudioFullPageHref(context: ProgramStudioContext): string {
  const params = new URLSearchParams({
    program: context.programSlug,
    week: String(context.weekNumber),
    session: context.sessionId,
    sessionExercise: context.activeSessionExerciseId,
  });
  return `/archive/exercises/${encodeURIComponent(context.activeExerciseId)}?${params.toString()}`;
}
