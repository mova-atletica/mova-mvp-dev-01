import type { Program } from "../types/programs";
import { PROGRAMS } from "../data/programs";

export interface ProgramExerciseAppearance {
  program: Program;
  weekNumbers: number[];
}

/** Programs that reference this archive exercise id in any session. */
export function getProgramsContainingExercise(exerciseId: string): ProgramExerciseAppearance[] {
  const bySlug = new Map<string, ProgramExerciseAppearance>();

  for (const program of PROGRAMS) {
    const weekNumbers = new Set<number>();
    for (const week of program.weeks) {
      for (const session of week.sessions) {
        if (session.exercises.some((item) => item.exerciseId === exerciseId)) {
          weekNumbers.add(week.weekNumber);
        }
      }
    }
    if (weekNumbers.size > 0) {
      bySlug.set(program.slug, {
        program,
        weekNumbers: [...weekNumbers].sort((a, b) => a - b),
      });
    }
  }

  return [...bySlug.values()];
}
