"use client";

import { PanelLeftClose } from "lucide-react";
import { ProgramModalCloseButton } from "./ExerciseStudioProgramControls";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const iconBtnClass =
  "inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] disabled:opacity-40";

export interface ProgramStudioChromeConfig {
  programTitle: string;
  weekNumber: number;
  sessionTitle: string;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  completed: boolean;
  onToggleComplete: (completed: boolean) => void;
  onClose: () => void;
}

/** Props passed into exercise details for program-modal session controls. */
export type ProgramSessionDetailsChrome = Pick<
  ProgramStudioChromeConfig,
  | "completed"
  | "onToggleComplete"
  | "hasPrev"
  | "hasNext"
  | "onPrev"
  | "onNext"
  | "index"
  | "total"
>;

interface ExerciseStudioProgramChromeProps extends ProgramStudioChromeConfig {
  onCollapsePanel?: () => void;
  showClose?: boolean;
}

export default function ExerciseStudioProgramChrome({
  programTitle,
  weekNumber,
  sessionTitle,
  onClose,
  onCollapsePanel,
  showClose = true,
}: ExerciseStudioProgramChromeProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" style={{ color: "var(--foreground)" }}>
          {programTitle}
        </p>
        <p className="truncate text-[10px]" style={{ color: "var(--muted)" }}>
          Week {weekNumber} · {sessionTitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {showClose ? <ProgramModalCloseButton onClose={onClose} /> : null}
        {onCollapsePanel ? (
          <button
            type="button"
            onClick={onCollapsePanel}
            style={borderAllTheme}
            className={iconBtnClass}
            aria-label="Collapse panel"
            title="Collapse panel"
          >
            <PanelLeftClose size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
