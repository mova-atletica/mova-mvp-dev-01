import type { ExerciseType } from "./index";

export type ProgramLevel = "beginner" | "intermediate" | "advanced";

export type ProgramAccessLevel = "free" | "paid";

export interface SessionExercise {
  id: string;
  /** Links to archive exercise when available */
  exerciseId?: string;
  title: string;
  exerciseType: ExerciseType;
  sets?: number;
  reps?: number;
  durationSec?: number;
  restSec?: number;
  notes?: string;
}

export interface ProgramSession {
  id: string;
  title: string;
  dayLabel: string;
  description?: string;
  exercises: SessionExercise[];
}

export interface ProgramWeek {
  weekNumber: number;
  title?: string;
  sessions: ProgramSession[];
}

export interface Program {
  slug: string;
  title: string;
  description: string;
  creatorSlug: string;
  level: ProgramLevel;
  muscleGroups: string[];
  equipment: string[];
  tags: string[];
  durationWeeks: number;
  sessionsPerWeek: number;
  /** Sum of session exercise counts (for cards) */
  exerciseCount: number;
  estimatedMinutes: number;
  heroImage: string;
  accessLevel: ProgramAccessLevel;
  /** Paid programs: number of weeks browsable without purchase */
  previewWeekCount: number;
  priceCents?: number;
  /** Time-boxed access after purchase (days). Defaults to durationWeeks × 7. */
  durationDays?: number;
  isFeatured?: boolean;
  ctaLabel?: string;
  weeks: ProgramWeek[];
}

export interface ProgramProgressState {
  programSlug: string;
  /** SessionExercise ids marked complete */
  completedExerciseIds: string[];
  /** Highest week number unlocked (1-based, always >= 1) */
  unlockedThroughWeek: number;
  /** Per week: user recorded at least one attempt */
  weekHasRecording: Record<string, boolean>;
  /** Per week: honor-system skip for filming gate */
  weekFilmingSkipped: Record<string, boolean>;
  /** Local-only until accounts: user purchased / enrolled in paid program */
  enrolled: boolean;
  updatedAt: string;
}
