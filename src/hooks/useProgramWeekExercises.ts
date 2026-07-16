"use client";

import { useEffect, useMemo, useState } from "react";
import type { Exercise } from "../data/exercises";
import type { Program, ProgramWeek } from "../types/programs";

function collectExerciseIds(week: ProgramWeek | undefined): string[] {
  if (!week) return [];
  const ids = new Set<string>();
  for (const session of week.sessions) {
    for (const item of session.exercises) {
      if (item.exerciseId) ids.add(item.exerciseId);
    }
  }
  return [...ids];
}

export function useProgramWeekExercises(program: Program | undefined, weekNumber: number) {
  const week = program?.weeks.find((w) => w.weekNumber === weekNumber);
  const exerciseIds = useMemo(() => collectExerciseIds(week), [week]);

  const [exercisesById, setExercisesById] = useState<Record<string, Exercise>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (exerciseIds.length === 0) {
      setExercisesById({});
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const entries = await Promise.all(
        exerciseIds.map(async (id) => {
          try {
            const res = await fetch(`/api/exercises/${id}`);
            if (!res.ok) return [id, null] as const;
            const data = await res.json();
            const raw = data.exercise ?? data;
            const exercise: Exercise = {
              ...raw,
              tags: Array.isArray(raw.tags) ? raw.tags : [],
              equipment: Array.isArray(raw.equipment) ? raw.equipment : [],
              muscleGroups: Array.isArray(raw.muscleGroups) ? raw.muscleGroups : [],
              jointsOfInterest: Array.isArray(raw.jointsOfInterest) ? raw.jointsOfInterest : [],
              instructions: Array.isArray(raw.instructions) ? raw.instructions : [],
              relatedExercises: Array.isArray(raw.relatedExercises) ? raw.relatedExercises : [],
              author: { name: raw.authorName ?? "Unknown", profileUrl: raw.authorProfileUrl },
            };
            return [id, exercise] as const;
          } catch {
            return [id, null] as const;
          }
        })
      );

      if (cancelled) return;
      const map: Record<string, Exercise> = {};
      for (const [id, ex] of entries) {
        if (ex) map[id] = ex;
      }
      setExercisesById(map);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [exerciseIds.join(",")]);

  return { exercisesById, loading };
}
