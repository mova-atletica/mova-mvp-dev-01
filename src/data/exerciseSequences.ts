/**
 * Legacy adapter — browse/filter code uses ProgramBrowseSummary shape.
 * Full program structure (weeks, sessions) lives in data/programs.
 */
import { getCreatorBySlug } from "./creators";
import {
  PROGRAM_BROWSE_LIST,
  getProgramBrowseBySlug,
  type ProgramBrowseSummary,
} from "./programs";

export type SequenceLevel = "beginner" | "intermediate" | "advanced";

/** @deprecated Use ProgramBrowseSummary from data/programs */
export interface ExerciseSequence {
  slug: string;
  title: string;
  description: string;
  author: { name: string; profileUrl?: string };
  level: SequenceLevel;
  muscleGroups: string[];
  equipment: string[];
  tags: string[];
  exerciseIds: string[];
  exerciseCount: number;
  estimatedMinutes: number;
  heroImage: string;
  isFeatured?: boolean;
  ctaLabel?: string;
}

function toExerciseSequence(summary: ProgramBrowseSummary): ExerciseSequence {
  const creator = getCreatorBySlug(summary.creatorSlug);
  return {
    slug: summary.slug,
    title: summary.title,
    description: summary.description,
    author: { name: creator?.name ?? summary.creatorSlug },
    level: summary.level,
    muscleGroups: summary.muscleGroups,
    equipment: summary.equipment,
    tags: summary.tags,
    exerciseIds: [],
    exerciseCount: summary.exerciseCount,
    estimatedMinutes: summary.estimatedMinutes,
    heroImage: summary.heroImage,
    isFeatured: summary.isFeatured,
    ctaLabel: summary.ctaLabel,
  };
}

export const EXERCISE_SEQUENCES: ExerciseSequence[] = PROGRAM_BROWSE_LIST.map(toExerciseSequence);

export function getSequenceBySlug(slug: string): ExerciseSequence | undefined {
  const summary = getProgramBrowseBySlug(slug);
  return summary ? toExerciseSequence(summary) : undefined;
}
