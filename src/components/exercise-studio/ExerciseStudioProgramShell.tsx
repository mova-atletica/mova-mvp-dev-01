"use client";

import { BarChart3, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ProgramStudioChromeConfig } from "./ExerciseStudioProgramChrome";
import { ProgramModalCloseButton, ProgramSessionNavButtons } from "./ExerciseStudioProgramControls";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const iconBtnClass =
  "inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]";

interface ProgramModalTopBarProps {
  programStudio: ProgramStudioChromeConfig;
  detailsOpen: boolean;
  analyticsOpen: boolean;
  onToggleDetails: () => void;
  onToggleAnalysis?: () => void;
  hasAnalysis: boolean;
}

export function ProgramModalTopBar({
  programStudio,
  detailsOpen,
  analyticsOpen,
  onToggleDetails,
  onToggleAnalysis,
  hasAnalysis,
}: ProgramModalTopBarProps) {
  return (
    <div
      style={{ borderBottom: "1px solid var(--border)" }}
      className="relative z-40 flex shrink-0 items-center gap-2 px-3 py-2"
    >
      <ProgramModalCloseButton onClose={programStudio.onClose} />
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-xs font-medium" style={{ color: "var(--foreground)" }}>
          {programStudio.programTitle}
        </p>
        <p className="truncate text-[10px]" style={{ color: "var(--muted)" }}>
          Week {programStudio.weekNumber} · {programStudio.index + 1}/{programStudio.total}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hasAnalysis && onToggleAnalysis ? (
          <button
            type="button"
            onClick={onToggleAnalysis}
            style={{
              ...borderAllTheme,
              ...(analyticsOpen
                ? {
                    backgroundColor: "color-mix(in srgb, var(--accent, #3b82f6) 15%, transparent)",
                    color: "var(--accent, #3b82f6)",
                  }
                : {}),
            }}
            className={iconBtnClass}
            aria-label={analyticsOpen ? "Close analysis" : "Open analysis"}
          >
            <BarChart3 size={18} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleDetails}
          style={{
            ...borderAllTheme,
            ...(detailsOpen
              ? {
                  backgroundColor: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                }
              : {}),
          }}
          className={iconBtnClass}
          aria-label={detailsOpen ? "Close exercise details" : "Open exercise details"}
        >
          {detailsOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
    </div>
  );
}

interface ProgramModalBottomNavProps {
  programStudio: ProgramStudioChromeConfig;
}

export function ProgramModalBottomNav({ programStudio }: ProgramModalBottomNavProps) {
  return (
    <div
      className="relative z-40 shrink-0 px-4 py-2"
      style={{
        borderTop: "1px solid var(--border)",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <ProgramSessionNavButtons
        index={programStudio.index}
        total={programStudio.total}
        hasPrev={programStudio.hasPrev}
        hasNext={programStudio.hasNext}
        onPrev={programStudio.onPrev}
        onNext={programStudio.onNext}
      />
    </div>
  );
}
