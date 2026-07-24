"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  getEmbeddedPopoverContentStyle,
  getEmbeddedPopoverModalProp,
  getEmbeddedPopoverPortalContainer,
} from "../lib/embeddedModalPopover";

const EmbeddedModalPopoverContext = createContext(false);

export function EmbeddedModalPopoverProvider({
  embeddedInModal,
  children,
}: {
  embeddedInModal: boolean;
  children: ReactNode;
}) {
  return (
    <EmbeddedModalPopoverContext.Provider value={embeddedInModal}>
      {children}
    </EmbeddedModalPopoverContext.Provider>
  );
}

export function useEmbeddedModalPopover(): boolean {
  return useContext(EmbeddedModalPopoverContext);
}

/** Popover portal + content layering for export panel / effect config selects. */
export function useExportPanelPopoverLayers(extraClassName = "") {
  const embeddedInModal = useEmbeddedModalPopover();
  const trimmedExtra = extraClassName.trim();

  return {
    embeddedInModal,
    portalContainer: getEmbeddedPopoverPortalContainer(embeddedInModal),
    contentStyle: getEmbeddedPopoverContentStyle(embeddedInModal),
    modal: getEmbeddedPopoverModalProp(embeddedInModal),
    contentClassName: embeddedInModal
      ? `mova-popover-motion mova-popover-menu pointer-events-auto w-[var(--radix-popover-trigger-width)] min-w-[8rem] rounded-lg border border-border-theme bg-[var(--card-bg)] p-0 shadow-2xl backdrop-blur-xl outline-none${trimmedExtra ? ` ${trimmedExtra}` : ""}`
      : `mova-popover-motion mova-popover-menu z-[220] w-[var(--radix-popover-trigger-width)] min-w-[8rem] rounded-lg border border-border-theme bg-[var(--card-bg)] p-0 shadow-2xl backdrop-blur-xl outline-none${trimmedExtra ? ` ${trimmedExtra}` : ""}`,
  };
}
