import type { Exercise } from "../data/exercises";

/** Normalize a raw Prisma exercise row into client Exercise shape. */
export function parseExerciseRecord(exerciseData: Record<string, unknown>): Exercise {
  const splitCsv = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === "string" && value.trim()) return value.split(",").filter(Boolean);
    return [];
  };

  let instructions: string[] = [];
  if (Array.isArray(exerciseData.instructions)) {
    instructions = exerciseData.instructions.map(String);
  } else if (typeof exerciseData.instructions === "string" && exerciseData.instructions.trim()) {
    try {
      const parsed = JSON.parse(exerciseData.instructions);
      instructions = Array.isArray(parsed) ? parsed.map(String) : [exerciseData.instructions];
    } catch {
      instructions = [exerciseData.instructions];
    }
  }

  return {
    id: String(exerciseData.id ?? ""),
    title: String(exerciseData.title ?? ""),
    description: String(exerciseData.description ?? ""),
    image: String(exerciseData.image ?? ""),
    referenceVideoUrl: String(exerciseData.referenceVideoUrl ?? ""),
    referenceKeypointsUrl: String(exerciseData.referenceKeypointsUrl ?? ""),
    tags: splitCsv(exerciseData.tags),
    equipment: splitCsv(exerciseData.equipment),
    level: String(exerciseData.level ?? "beginner"),
    muscleGroups: splitCsv(exerciseData.muscleGroups),
    jointsOfInterest: splitCsv(exerciseData.jointsOfInterest),
    createdBy: String(exerciseData.createdBy ?? ""),
    dateAdded: String(exerciseData.dateAdded ?? ""),
    instructions,
    author: {
      name: String(exerciseData.authorName ?? "Unknown"),
      profileUrl: exerciseData.authorProfileUrl ? String(exerciseData.authorProfileUrl) : undefined,
    },
    relatedExercises: splitCsv(exerciseData.relatedExercises),
    exerciseType: (exerciseData.exerciseType as Exercise["exerciseType"]) ?? "repetition",
    exerciseSubtype: exerciseData.exerciseSubtype ? String(exerciseData.exerciseSubtype) : undefined,
    classificationConfidence:
      typeof exerciseData.classificationConfidence === "number"
        ? exerciseData.classificationConfidence
        : undefined,
  };
}
