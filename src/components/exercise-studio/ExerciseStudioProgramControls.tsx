"use client";

import { ChevronLeft, ChevronRight, Circle, CircleCheck, X } from "lucide-react";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const iconBtnClass =
  "inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] disabled:opacity-40";

export function ProgramModalCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      style={{
        border: "1px solid var(--border-secondary)",
        backgroundColor: "var(--card-bg)",
      }}
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center self-center rounded-md text-[color:var(--foreground)] shadow-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
      aria-label="Close"
    >
      <X size={18} />
    </button>
  );
}

interface ProgramSessionNavButtonsProps {
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  variant?: "inline" | "floating";
}

export function ProgramSessionNavButtons({
  index,
  total,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  variant = "inline",
}: ProgramSessionNavButtonsProps) {
  const counter = (
    <span className="min-w-[2.5rem] text-center text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
      {index + 1}/{total}
    </span>
  );

  const buttons = (
    <>
      <button
        type="button"
        disabled={!hasPrev}
        onClick={onPrev}
        style={borderAllTheme}
        className={iconBtnClass}
        aria-label="Previous exercise"
      >
        <ChevronLeft size={18} />
      </button>
      {counter}
      <button
        type="button"
        disabled={!hasNext}
        onClick={onNext}
        style={borderAllTheme}
        className={iconBtnClass}
        aria-label="Next exercise"
      >
        <ChevronRight size={18} />
      </button>
    </>
  );

  if (variant === "floating") {
    return (
      <div
        style={borderAllTheme}
        className="inline-flex items-center gap-0.5 rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] p-0.5 shadow-lg backdrop-blur-md"
      >
        {buttons}
      </div>
    );
  }

  return <div className="flex items-center justify-center gap-0.5">{buttons}</div>;
}

interface ProgramSessionCompleteBadgeProps {
  completed: boolean;
  onToggleComplete: (completed: boolean) => void;
}

export function ProgramSessionCompleteBadge({
  completed,
  onToggleComplete,
}: ProgramSessionCompleteBadgeProps) {
  return (
    <button
      type="button"
      onClick={() => onToggleComplete(!completed)}
      style={{
        border: "1px solid var(--border-secondary)",
        backgroundColor: completed ? "var(--complete-badge-bg)" : "var(--tag-bg)",
        color: completed ? "var(--complete-badge-text)" : "var(--tag-text)",
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors hover:opacity-90"
      aria-label={completed ? "Mark incomplete" : "Mark complete"}
      title={completed ? "Mark incomplete" : "Mark complete"}
    >
      {completed ? (
        <>
          <CircleCheck size={14} />
          <span>Done</span>
        </>
      ) : (
        <>
          <Circle size={14} />
          <span>Mark done</span>
        </>
      )}
    </button>
  );
}
