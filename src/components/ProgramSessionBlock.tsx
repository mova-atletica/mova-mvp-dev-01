"use client";

import { Circle, CircleCheck } from "lucide-react";
import { lazy, Suspense } from "react";
import type { Exercise } from "../data/exercises";
import type { ProgramSession, SessionExercise } from "../types/programs";
import {
  exercisePrescriptionLabel,
  isSessionComplete,
} from "../lib/programAccess";
import type { ProgramProgressState } from "../types/programs";

const ExerciseCard = lazy(() => import("./ExerciseCard"));

const PLACEHOLDER_GRADIENT =
  "linear-gradient(145deg, #353839 0%, #181a1a 55%, #555950 100%)";

function SessionExercisePlaceholder({ title }: { title: string }) {
  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-lg"
      style={{
        width: "200px",
        height: "355px",
        background: PLACEHOLDER_GRADIENT,
        borderRadius: "8px",
      }}
    >
      <div className="absolute inset-0 flex items-end p-4">
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
    </div>
  );
}

interface ProgramSessionBlockProps {
  session: ProgramSession;
  activeWeek: number;
  progress: ProgramProgressState | null;
  exercisesById: Record<string, Exercise>;
  onToggleExercise: (id: string, completed: boolean) => void;
  onOpenStudio: (sessionExerciseId: string) => void;
}

export default function ProgramSessionBlock({
  session,
  progress,
  exercisesById,
  onToggleExercise,
  onOpenStudio,
}: ProgramSessionBlockProps) {
  const sessionDone = progress ? isSessionComplete(session, progress) : false;

  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            {session.dayLabel}
          </p>
          <h3 className="text-base font-medium" style={{ color: "var(--section-title)" }}>
            {session.title}
          </h3>
          {session.description ? (
            <p className="mt-1 text-sm" style={{ color: "var(--section-subtitle)" }}>
              {session.description}
            </p>
          ) : null}
        </div>
        {sessionDone ? (
          <CircleCheck size={22} style={{ color: "var(--success)" }} aria-label="Session complete" />
        ) : (
          <Circle size={22} style={{ color: "var(--border)" }} aria-hidden />
        )}
      </div>

      <div
        className="scrollbar-hide flex gap-4 overflow-x-auto px-4 py-5 sm:px-5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {session.exercises.map((item) => (
          <SessionExerciseCard
            key={item.id}
            item={item}
            checked={progress?.completedExerciseIds.includes(item.id) ?? false}
            exercise={item.exerciseId ? exercisesById[item.exerciseId] : undefined}
            onToggle={(completed) => onToggleExercise(item.id, completed)}
            onOpenStudio={item.exerciseId ? () => onOpenStudio(item.id) : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function SessionExerciseCard({
  item,
  checked,
  exercise,
  onToggle,
  onOpenStudio,
}: {
  item: SessionExercise;
  checked: boolean;
  exercise?: Exercise;
  onToggle: (completed: boolean) => void;
  onOpenStudio?: () => void;
}) {
  const canOpenStudio = !!onOpenStudio;

  return (
    <div className="flex w-[200px] flex-shrink-0 flex-col">
      <div className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!checked);
          }}
          className="absolute right-2 top-2 z-40 rounded-full bg-black/50 p-1 backdrop-blur-sm"
          aria-label={checked ? "Mark incomplete" : "Mark complete"}
        >
          {checked ? (
            <CircleCheck size={22} style={{ color: "var(--success)" }} />
          ) : (
            <Circle size={22} style={{ color: "#fff" }} />
          )}
        </button>

        {exercise ? (
          <Suspense
            fallback={
              <div
                className="animate-pulse rounded-lg"
                style={{ width: "200px", height: "355px", backgroundColor: "var(--surface-hover)" }}
              />
            }
          >
            <ExerciseCard exercise={exercise} onSelect={canOpenStudio ? () => onOpenStudio() : undefined} />
          </Suspense>
        ) : canOpenStudio ? (
          <button type="button" onClick={onOpenStudio} className="block w-full text-left">
            <SessionExercisePlaceholder title={item.title} />
          </button>
        ) : (
          <SessionExercisePlaceholder title={item.title} />
        )}
      </div>

      <div className="mt-3 space-y-2">
        {!exercise ? (
          canOpenStudio ? (
            <button
              type="button"
              onClick={onOpenStudio}
              className="text-left text-sm font-medium leading-tight hover:underline"
              style={{ color: "var(--foreground)" }}
            >
              {item.title}
            </button>
          ) : (
            <p className="text-sm font-medium leading-tight" style={{ color: "var(--foreground)" }}>
              {item.title}
            </p>
          )
        ) : null}
        <p className="text-xs capitalize" style={{ color: "var(--muted)" }}>
          {exercisePrescriptionLabel(item)} · {item.exerciseType}
        </p>
        {item.notes ? (
          <p className="text-xs leading-snug" style={{ color: "var(--section-subtitle)" }}>
            {item.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}
