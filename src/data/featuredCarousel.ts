import type { Exercise } from "./exercises";
import { getProgramBySlug, PROGRAMS } from "./programs";
import type { Program } from "../types/programs";

export type FeaturedCarouselItem =
  | { kind: "program"; program: Program }
  | { kind: "exercise"; exercise: Exercise };

/** Program slugs shown in the home featured carousel (max 3 items total with exercises). */
export const FEATURED_CAROUSEL_PROGRAM_SLUGS = [
  "olivia-foundation",
  "calisthenics-power",
  "morning-mobility",
] as const;

export function buildFeaturedCarouselItems(exercises: Exercise[] = []): FeaturedCarouselItem[] {
  const items: FeaturedCarouselItem[] = [];

  for (const slug of FEATURED_CAROUSEL_PROGRAM_SLUGS) {
    const program = getProgramBySlug(slug);
    if (program) items.push({ kind: "program", program });
    if (items.length >= 3) return items;
  }

  for (const exercise of exercises) {
    if (items.length >= 3) break;
    if (items.some((item) => item.kind === "exercise" && item.exercise.id === exercise.id)) {
      continue;
    }
    items.push({ kind: "exercise", exercise });
  }

  return items.slice(0, 3);
}

/** All programs for the home programs carousel. */
export const BROWSE_PROGRAMS = PROGRAMS;

/** @deprecated Use BROWSE_PROGRAMS */
export const BROWSE_SEQUENCES = BROWSE_PROGRAMS;
