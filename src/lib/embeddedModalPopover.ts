import type { CSSProperties } from "react";

/** Above embedded Open Move modal shell (290) and portaled overlays (331). */
export const EMBEDDED_MODAL_POPOVER_Z = 400;

let embeddedModalPopoverRoot: HTMLDivElement | null = null;

/** Shared portal mount for popovers inside the Open Move embedded modal. */
export function getEmbeddedModalPopoverRoot(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (!embeddedModalPopoverRoot) {
    const root = document.createElement("div");
    root.id = "embedded-modal-popover-root";
    root.setAttribute("data-embedded-modal-popover-root", "");
    root.style.cssText =
      "position:fixed;inset:0;z-index:400;pointer-events:none;isolation:isolate;";
    document.body.appendChild(root);
    embeddedModalPopoverRoot = root;
  }
  return embeddedModalPopoverRoot;
}

export function getEmbeddedPopoverPortalContainer(
  embeddedInModal: boolean
): HTMLElement | undefined {
  return embeddedInModal ? getEmbeddedModalPopoverRoot() ?? undefined : undefined;
}

export function getEmbeddedPopoverContentStyle(embeddedInModal: boolean): CSSProperties | undefined {
  return embeddedInModal ? { zIndex: EMBEDDED_MODAL_POPOVER_Z } : undefined;
}

export function getEmbeddedPopoverModalProp(embeddedInModal: boolean): boolean | undefined {
  return embeddedInModal ? false : undefined;
}
