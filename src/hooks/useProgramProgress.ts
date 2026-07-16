"use client";

import { useCallback, useEffect, useState } from "react";
import type { Program, ProgramProgressState } from "../types/programs";
import { useEntitlements } from "../contexts/MockEntitlementsContext";
import { canUnlockNextWeek, isSessionComplete } from "../lib/programAccess";

const STORAGE_PREFIX = "mova-program-progress:";

function storageKey(programSlug: string): string {
  return `${STORAGE_PREFIX}${programSlug}`;
}

function emptyProgress(programSlug: string, enrolled: boolean): ProgramProgressState {
  return {
    programSlug,
    completedExerciseIds: [],
    unlockedThroughWeek: 1,
    weekHasRecording: {},
    weekFilmingSkipped: {},
    enrolled,
    updatedAt: new Date().toISOString(),
  };
}

function loadProgress(programSlug: string, defaultEnrolled: boolean): ProgramProgressState {
  if (typeof window === "undefined") {
    return emptyProgress(programSlug, defaultEnrolled);
  }
  try {
    const raw = localStorage.getItem(storageKey(programSlug));
    if (!raw) return emptyProgress(programSlug, defaultEnrolled);
    const parsed = JSON.parse(raw) as ProgramProgressState;
    return {
      ...emptyProgress(programSlug, defaultEnrolled),
      ...parsed,
      programSlug,
    };
  } catch {
    return emptyProgress(programSlug, defaultEnrolled);
  }
}

function saveProgress(state: ProgramProgressState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(state.programSlug), JSON.stringify(state));
}

function recomputeUnlock(program: Program, state: ProgramProgressState): ProgramProgressState {
  let unlocked = state.unlockedThroughWeek;
  for (let w = 1; w < program.durationWeeks; w += 1) {
    if (unlocked > w) continue;
    if (canUnlockNextWeek(program, w, state)) {
      unlocked = w + 1;
    } else {
      break;
    }
  }

  if (program.accessLevel === "paid" && !state.enrolled) {
    unlocked = Math.min(unlocked, program.previewWeekCount);
  }

  return { ...state, unlockedThroughWeek: unlocked, updatedAt: new Date().toISOString() };
}

export function useProgramProgress(program: Program | undefined) {
  const { hasActiveEntitlement } = useEntitlements();
  const defaultEnrolled =
    program?.accessLevel === "free" ||
    (program ? hasActiveEntitlement(program.slug) : false);

  const [progress, setProgress] = useState<ProgramProgressState | null>(() =>
    program ? loadProgress(program.slug, defaultEnrolled) : null
  );

  useEffect(() => {
    if (!program) {
      setProgress(null);
      return;
    }
    const enrolledDefault =
      program.accessLevel === "free" || hasActiveEntitlement(program.slug);
    setProgress(loadProgress(program.slug, enrolledDefault));
  }, [program?.slug, program?.accessLevel, hasActiveEntitlement]);

  const persist = useCallback(
    (updater: (prev: ProgramProgressState) => ProgramProgressState) => {
      if (!program) return;
      setProgress((prev) => {
        const base = prev ?? loadProgress(program.slug, program.accessLevel === "free");
        const next = recomputeUnlock(program, updater(base));
        saveProgress(next);
        return next;
      });
    },
    [program]
  );

  const toggleExercise = useCallback(
    (exerciseId: string, completed: boolean) => {
      persist((prev) => {
        const set = new Set(prev.completedExerciseIds);
        if (completed) set.add(exerciseId);
        else set.delete(exerciseId);
        return { ...prev, completedExerciseIds: [...set] };
      });
    },
    [persist]
  );

  const markRecorded = useCallback(
    (weekNumber: number) => {
      persist((prev) => ({
        ...prev,
        weekHasRecording: { ...prev.weekHasRecording, [String(weekNumber)]: true },
      }));
    },
    [persist]
  );

  const skipFilming = useCallback(
    (weekNumber: number) => {
      persist((prev) => ({
        ...prev,
        weekFilmingSkipped: { ...prev.weekFilmingSkipped, [String(weekNumber)]: true },
      }));
    },
    [persist]
  );

  const enroll = useCallback(() => {
    persist((prev) => ({ ...prev, enrolled: true }));
  }, [persist]);

  const resetProgress = useCallback(() => {
    if (!program) return;
    const fresh = emptyProgress(program.slug, program.accessLevel === "free");
    saveProgress(fresh);
    setProgress(fresh);
  }, [program]);

  const weekProgress = useCallback(
    (weekNumber: number) => {
      if (!program || !progress) return { completed: 0, total: 0, sessionsComplete: 0, sessionCount: 0 };
      const week = program.weeks.find((w) => w.weekNumber === weekNumber);
      if (!week) return { completed: 0, total: 0, sessionsComplete: 0, sessionCount: 0 };
      const ids = week.sessions.flatMap((s) => s.exercises.map((e) => e.id));
      const completed = ids.filter((id) => progress.completedExerciseIds.includes(id)).length;
      let sessionDone = 0;
      for (const sess of week.sessions) {
        if (isSessionComplete(sess, progress)) sessionDone += 1;
      }
      return {
        completed,
        total: ids.length,
        sessionsComplete: sessionDone,
        sessionCount: week.sessions.length,
      };
    },
    [program, progress]
  );

  return {
    progress,
    toggleExercise,
    markRecorded,
    skipFilming,
    enroll,
    resetProgress,
    weekProgress,
  };
}
