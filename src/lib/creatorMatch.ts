import type { Exercise } from "../types";
import type { Creator } from "../data/creators";
import { CREATORS, getCreatorBySlug } from "../data/creators";

/** Normalize author/creator names for stable matching (DB authorName → creator slug). */
export function normalizeAuthorKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function creatorMatchKeys(creator: Creator): string[] {
  const keys = new Set<string>();
  keys.add(normalizeAuthorKey(creator.name));
  keys.add(normalizeAuthorKey(creator.slug));
  for (const alias of creator.authorMatchKeys ?? []) {
    keys.add(normalizeAuthorKey(alias));
  }
  return [...keys];
}

const CREATOR_BY_AUTHOR_KEY = (() => {
  const map = new Map<string, Creator>();
  for (const creator of CREATORS) {
    for (const key of creatorMatchKeys(creator)) {
      if (!map.has(key)) {
        map.set(key, creator);
      }
    }
  }
  return map;
})();

/** Resolve a creator profile from an exercise author name (or alias). */
export function getCreatorForAuthor(authorName: string | undefined | null): Creator | undefined {
  if (!authorName?.trim()) return undefined;
  return CREATOR_BY_AUTHOR_KEY.get(normalizeAuthorKey(authorName));
}

export function getCreatorForExercise(exercise: Pick<Exercise, "author">): Creator | undefined {
  return getCreatorForAuthor(exercise.author?.name);
}

/** Filter exercises attributed to a creator (by slug). */
export function getExercisesForCreator(slug: string, exercises: Exercise[]): Exercise[] {
  const creator = getCreatorBySlug(slug);
  if (!creator) return [];

  const keys = new Set(creatorMatchKeys(creator));
  return exercises.filter((ex) => keys.has(normalizeAuthorKey(ex.author?.name ?? "")));
}

/** Canonical authorName to set on new uploads for a creator. */
export function canonicalAuthorNameForCreator(slug: string): string | undefined {
  return getCreatorBySlug(slug)?.name;
}
