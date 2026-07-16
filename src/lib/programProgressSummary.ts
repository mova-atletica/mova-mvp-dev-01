import type { Program } from "../types/programs";
import type { ProgramProgressState } from "../types/programs";

const STORAGE_PREFIX = "mova-program-progress:";

export interface ProgramProgressSummary {
  completedExercises: number;
  totalExercises: number;
  unlockedWeek: number;
}

export function loadProgramProgressSummary(
  programSlug: string,
  program: Program | undefined
): ProgramProgressSummary {
  if (!program || typeof window === "undefined") {
    return { completedExercises: 0, totalExercises: 0, unlockedWeek: 1 };
  }

  let progress: ProgramProgressState | null = null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${programSlug}`);
    if (raw) progress = JSON.parse(raw) as ProgramProgressState;
  } catch {
    progress = null;
  }

  const allIds = program.weeks.flatMap((w) =>
    w.sessions.flatMap((s) => s.exercises.map((e) => e.id))
  );
  const completed = progress
    ? allIds.filter((id) => progress!.completedExerciseIds.includes(id)).length
    : 0;

  return {
    completedExercises: completed,
    totalExercises: allIds.length,
    unlockedWeek: progress?.unlockedThroughWeek ?? 1,
  };
}
