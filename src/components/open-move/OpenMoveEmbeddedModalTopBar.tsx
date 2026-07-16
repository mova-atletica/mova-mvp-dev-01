"use client";

import Link from "next/link";
import Image from "next/image";
import { BarChart3, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AppMegaMenu from "../AppMegaMenu";
import { ProgramModalCloseButton } from "../exercise-studio/ExerciseStudioProgramControls";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const iconBtnClass =
  "inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]";

export interface OpenMoveEmbeddedModalTopBarProps {
  onClose: () => void;
  hasAnalysis: boolean;
  analyticsOpen: boolean;
  onToggleAnalysis: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
  /** Logo + mega menu cluster (embedded sport modal on mobile). */
  isMobile?: boolean;
}

/** Embedded sport analysis modal — close, analysis, and rail toggles above stage + tabs. */
export default function OpenMoveEmbeddedModalTopBar({
  onClose,
  hasAnalysis,
  analyticsOpen,
  onToggleAnalysis,
  panelOpen,
  onTogglePanel,
  isMobile = false,
}: OpenMoveEmbeddedModalTopBarProps) {
  return (
    <div
      style={{ borderBottom: "1px solid var(--border)" }}
      className="relative z-40 flex shrink-0 items-center justify-between gap-2 px-3 py-2"
    >
      {isMobile ? (
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/"
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]"
            aria-label="Mova Archive home"
            title="Mova Archive"
          >
            <Image
              src="/images/brand/logo/Logo_Contained.svg"
              alt=""
              width={24}
              height={24}
              className="h-6 w-6"
              style={{ filter: "var(--logo-color)" }}
            />
          </Link>
          <AppMegaMenu activeApp="archive" iconOnly embeddedInModal />
          <button
            type="button"
            onClick={onTogglePanel}
            style={{
              ...borderAllTheme,
              ...(panelOpen
                ? {
                    backgroundColor: "color-mix(in srgb, var(--foreground) 10%, transparent)",
                  }
                : {}),
            }}
            className={iconBtnClass}
            aria-label={panelOpen ? "Close controls panel" : "Open controls panel"}
            title={panelOpen ? "Close controls panel" : "Open controls panel"}
          >
            {panelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>
      ) : (
        <div aria-hidden className="shrink-0" />
      )}

      <div className="flex shrink-0 items-center gap-1">
        {isMobile && hasAnalysis ? (
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
            title={analyticsOpen ? "Close analysis" : "Open analysis"}
          >
            <BarChart3 size={18} />
          </button>
        ) : null}
        <ProgramModalCloseButton onClose={onClose} />
      </div>
    </div>
  );
}
