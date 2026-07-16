"use client";

import type { SessionExercise } from "../types/programs";
import { exercisePrescriptionLabel } from "../lib/programAccess";

const PLACEHOLDER_GRADIENT =
  "linear-gradient(145deg, #353839 0%, #181a1a 55%, #555950 100%)";

interface CreatorProgramExerciseCardProps {
  item: SessionExercise;
}

/** Program session exercise not yet linked to an archive video */
export default function CreatorProgramExerciseCard({ item }: CreatorProgramExerciseCardProps) {
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
      <div className="absolute left-2 top-2 z-10">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
        >
          In program
        </span>
      </div>
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <p className="text-sm font-medium leading-tight text-white">{item.title}</p>
        <p className="mt-1 text-xs capitalize text-white/70">
          {exercisePrescriptionLabel(item)} · {item.exerciseType}
        </p>
        {item.notes ? (
          <p className="mt-1 line-clamp-2 text-[11px] text-white/60">{item.notes}</p>
        ) : null}
      </div>
    </div>
  );
}
