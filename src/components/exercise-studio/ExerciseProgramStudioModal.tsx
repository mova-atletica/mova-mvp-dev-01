"use client";

import { useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ProgramStudioContext } from "../../types/programStudio";
import ExerciseStudioPage from "./ExerciseStudioPage";
import type { ProgramStudioChromeConfig } from "./ExerciseStudioProgramChrome";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

interface ExerciseProgramStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ProgramStudioContext | null;
  completed: boolean;
  onToggleComplete: (completed: boolean) => void;
  onNavigate: (sessionExerciseId: string) => void;
  onOpened?: () => void;
}

export default function ExerciseProgramStudioModal({
  open,
  onOpenChange,
  context,
  completed,
  onToggleComplete,
  onNavigate,
  onOpened,
}: ExerciseProgramStudioModalProps) {
  useEffect(() => {
    if (open && context) onOpened?.();
  }, [open, context, onOpened]);

  const programStudio = useMemo((): ProgramStudioChromeConfig | undefined => {
    if (!context) return undefined;

    const hasPrev = context.index > 0;
    const hasNext = context.index < context.linkedSessionExerciseIds.length - 1;
    const prevId = hasPrev ? context.linkedSessionExerciseIds[context.index - 1] : null;
    const nextId = hasNext ? context.linkedSessionExerciseIds[context.index + 1] : null;

    return {
      programTitle: context.programTitle,
      weekNumber: context.weekNumber,
      sessionTitle: context.sessionTitle,
      index: context.index,
      total: context.linkedSessionExerciseIds.length,
      hasPrev,
      hasNext,
      onPrev: () => {
        if (prevId) onNavigate(prevId);
      },
      onNext: () => {
        if (nextId) onNavigate(nextId);
      },
      completed,
      onToggleComplete,
      onClose: () => onOpenChange(false),
    };
  }, [context, completed, onNavigate, onToggleComplete, onOpenChange]);

  if (!context) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[280] bg-black/70" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed inset-0 z-[290] flex flex-col overflow-hidden bg-[var(--background)] shadow-2xl md:inset-[4vh_4vw] md:rounded-xl"
        >
          <Dialog.Title className="sr-only">
            {context.programTitle} — {context.sessionTitle}
          </Dialog.Title>

          <ExerciseStudioPage
            exerciseId={context.activeExerciseId}
            embedded
            programStudio={programStudio}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
