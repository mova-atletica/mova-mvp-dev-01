import type { Exercise } from "../types";
import type { SessionExercise } from "../types/programs";
import { getCreatorBySlug } from "../data/creators";
import { getProgramsByCreator } from "../data/programs";
import { getExercisesForCreator, normalizeAuthorKey } from "./creatorMatch";

export interface CreatorCatalog {
  /** Archive exercises: by author attribution or linked from programs */
  exercises: Exercise[];
  /** Program session items not yet linked to the library */
  programOnly: SessionExercise[];
}

function collectSessionExercisesForCreator(creatorSlug: string): SessionExercise[] {
  return getProgramsByCreator(creatorSlug).flatMap((program) =>
    program.weeks.flatMap((week) => week.sessions.flatMap((session) => session.exercises))
  );
}

function dedupeExercisesById(exercises: Exercise[]): Exercise[] {
  const seen = new Set<string>();
  return exercises.filter((ex) => {
    if (seen.has(ex.id)) return false;
    seen.add(ex.id);
    return true;
  });
}

function dedupeProgramExercisesByTitle(items: SessionExercise[]): SessionExercise[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeAuthorKey(item.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Program-defined session exercises for a creator (no GCS / library browse).
 */
export function getCreatorProgramCatalog(creatorSlug: string): CreatorCatalog {
  if (!getCreatorBySlug(creatorSlug)) {
    return { exercises: [], programOnly: [] };
  }

  const sessionExercises = collectSessionExercisesForCreator(creatorSlug);
  return {
    exercises: [],
    programOnly: dedupeProgramExercisesByTitle(sessionExercises),
  };
}

/**
 * @deprecated Library browse exercises removed — use getCreatorProgramCatalog.
 */
export function getCreatorCatalog(creatorSlug: string, browseExercises: Exercise[]): CreatorCatalog {
  if (!getCreatorBySlug(creatorSlug)) {
    return { exercises: [], programOnly: [] };
  }

  const sessionExercises = collectSessionExercisesForCreator(creatorSlug);
  const programExerciseIds = new Set(
    sessionExercises.map((item) => item.exerciseId).filter((id): id is string => Boolean(id))
  );

  const browseById = new Map(browseExercises.map((ex) => [ex.id, ex]));

  const byAuthor = getExercisesForCreator(creatorSlug, browseExercises);
  const byProgramLink = [...programExerciseIds]
    .map((id) => browseById.get(id))
    .filter((ex): ex is Exercise => ex != null);

  const exercises = dedupeExercisesById([...byAuthor, ...byProgramLink]);

  const linkedIds = new Set(exercises.map((ex) => ex.id));

  const programOnly = dedupeProgramExercisesByTitle(
    sessionExercises.filter((item) => !item.exerciseId || !linkedIds.has(item.exerciseId))
  );

  return { exercises, programOnly };
}

export function creatorCatalogHasContent(catalog: CreatorCatalog): boolean {
  return catalog.exercises.length > 0 || catalog.programOnly.length > 0;
}
