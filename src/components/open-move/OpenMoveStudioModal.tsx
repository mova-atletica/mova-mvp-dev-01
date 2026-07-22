"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2 } from "lucide-react";
import type { OpenMoveStudioModalTarget } from "../../types/openMoveStudioModal";
import { openMoveModalTitle } from "../../types/openMoveStudioModal";

const OpenMoveStudio = dynamic(() => import("../../app/open-move-v2/OpenMoveStudio"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[color:var(--muted-foreground)]" aria-hidden />
      <span className="sr-only">Loading studio…</span>
    </div>
  ),
});

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

function isEmbeddedModalPortaledLayer(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("[data-embedded-modal-popover-root]") ||
      target.closest("[data-radix-popper-content-wrapper]") ||
      target.closest("[data-radix-popover-content]") ||
      target.closest('[role="menu"]')
  );
}

import type { QuickAnalysisCompleteHandler, StudioSessionPersistHandler } from "../../types/openMoveStudio";

interface OpenMoveStudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: OpenMoveStudioModalTarget | null;
  onQuickAnalysisComplete?: QuickAnalysisCompleteHandler;
  onStudioSessionPersist?: StudioSessionPersistHandler;
}

export default function OpenMoveStudioModal({
  open,
  onOpenChange,
  target,
  onQuickAnalysisComplete,
  onStudioSessionPersist,
}: OpenMoveStudioModalProps) {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setHasActiveSession(false);
      setCloseConfirmOpen(false);
    }
  }, [open, target]);

  const requestClose = useCallback(() => {
    if (hasActiveSession) {
      setCloseConfirmOpen(true);
      return;
    }
    onOpenChange(false);
  }, [hasActiveSession, onOpenChange]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true);
        return;
      }
      requestClose();
    },
    [onOpenChange, requestClose]
  );

  const dismissCloseConfirm = useCallback(() => {
    setCloseConfirmOpen(false);
  }, []);

  const confirmClose = useCallback(() => {
    setCloseConfirmOpen(false);
    setHasActiveSession(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleActiveSessionChange = useCallback((active: boolean) => {
    setHasActiveSession(active);
  }, []);

  useEffect(() => {
    if (!closeConfirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setCloseConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [closeConfirmOpen]);

  const blockDialogOutsideDismiss = useCallback(
    (event: Event) => {
      if (closeConfirmOpen || isEmbeddedModalPortaledLayer(event.target)) {
        event.preventDefault();
      }
    },
    [closeConfirmOpen]
  );

  const modalTitle = openMoveModalTitle(target);
  const isAnalysis = target?.type === "analysis";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[280] bg-black/70" />
        <Dialog.Content
          style={borderAllTheme}
          className="fixed inset-0 z-[290] flex flex-col overflow-hidden bg-[var(--background)] shadow-2xl md:inset-[4vh_4vw] md:rounded-xl"
          onEscapeKeyDown={(event) => {
            if (closeConfirmOpen) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            requestClose();
          }}
          onPointerDownOutside={blockDialogOutsideDismiss}
          onInteractOutside={blockDialogOutsideDismiss}
          onFocusOutside={blockDialogOutsideDismiss}
        >
          <Dialog.Title className="sr-only">{modalTitle}</Dialog.Title>

          {open && target ? (
            <OpenMoveStudio
              embedded
              embeddedCloseConfirmOpen={closeConfirmOpen}
              onClose={requestClose}
              onActiveSessionChange={handleActiveSessionChange}
              mode={isAnalysis ? "quickAnalysis" : "default"}
              initialSport={isAnalysis ? target.kind : undefined}
              analysisTitle={isAnalysis ? target.analysisTitle : undefined}
              setupHint={isAnalysis ? target.setupHint : undefined}
              analysisSlug={isAnalysis ? target.slug : undefined}
              onQuickAnalysisComplete={isAnalysis ? onQuickAnalysisComplete : undefined}
              onStudioSessionPersist={!isAnalysis ? onStudioSessionPersist : undefined}
            />
          ) : null}

          {closeConfirmOpen ? (
            <div className="absolute inset-0 z-[100]">
              <button
                type="button"
                className="absolute inset-0 bg-black/55"
                aria-label="Dismiss close confirmation"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dismissCloseConfirm();
                }}
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 md:p-10">
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="open-move-close-confirm-title"
                  aria-describedby="open-move-close-confirm-desc"
                  style={borderAllTheme}
                  className="pointer-events-auto w-[min(92vw,22rem)] rounded-xl bg-[var(--card-bg)] p-6 shadow-2xl outline-none"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <h2
                    id="open-move-close-confirm-title"
                    className="text-sm font-medium text-[color:var(--foreground)]"
                  >
                    Close {isAnalysis ? "analysis" : "studio"}?
                  </h2>
                  <p
                    id="open-move-close-confirm-desc"
                    className="mt-2 text-xs leading-relaxed text-[color:var(--muted-foreground)]"
                  >
                    Your current clip and progress will be discarded.
                  </p>
                  <div className="mt-8 flex justify-end gap-3">
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        dismissCloseConfirm();
                      }}
                      style={borderAllTheme}
                      className="rounded-lg px-4 py-2 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]"
                    >
                      Keep working
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        confirmClose();
                      }}
                      className="rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)] px-4 py-2 text-xs font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)]"
                    >
                      Close anyway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
