import type { Program } from "../../types/programs";
import { buildAllPrograms } from "./builders";

export type { Program, ProgramWeek, ProgramSession, SessionExercise } from "../../types/programs";
export type { ProgramLevel, ProgramAccessLevel, ProgramProgressState } from "../../types/programs";

export const PROGRAMS: Program[] = buildAllPrograms();

export function getProgramBySlug(slug: string): Program | undefined {
  return PROGRAMS.find((p) => p.slug === slug);
}

export function getProgramsByCreator(creatorSlug: string): Program[] {
  return PROGRAMS.filter((p) => p.creatorSlug === creatorSlug);
}

export function getFeaturedPrograms(): Program[] {
  return PROGRAMS.filter((p) => p.isFeatured);
}

/** Card/list summary fields compatible with legacy sequence filters */
export function programToBrowseSummary(program: Program) {
  return {
    slug: program.slug,
    title: program.title,
    description: program.description,
    level: program.level,
    muscleGroups: program.muscleGroups,
    equipment: program.equipment,
    tags: program.tags,
    exerciseCount: program.exerciseCount,
    estimatedMinutes: program.estimatedMinutes,
    heroImage: program.heroImage,
    isFeatured: program.isFeatured,
    ctaLabel: program.ctaLabel,
    creatorSlug: program.creatorSlug,
    accessLevel: program.accessLevel,
    priceCents: program.priceCents,
  };
}

export type ProgramBrowseSummary = ReturnType<typeof programToBrowseSummary>;

export const PROGRAM_BROWSE_LIST: ProgramBrowseSummary[] = PROGRAMS.map(programToBrowseSummary);

export function getProgramBrowseBySlug(slug: string): ProgramBrowseSummary | undefined {
  return PROGRAM_BROWSE_LIST.find((p) => p.slug === slug);
}
