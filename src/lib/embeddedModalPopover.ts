import type { CSSProperties } from "react";

/** Cap long select menus; inline so it wins over Radix available-height styles. */
export const MOVA_POPOVER_MENU_STYLE: CSSProperties = {
  maxHeight: "min(240px, 50vh)",
  overflowX: "hidden",
  overflowY: "auto",
  overscrollBehavior: "contain",
};

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
  // Height/overflow live on MovaPopoverMotionInner (scrollable) — Content only needs stacking.
  return embeddedInModal ? { zIndex: EMBEDDED_MODAL_POPOVER_Z } : undefined;
}

/**
 * Inside Open Move Dialog, modal=true wraps the menu in its own RemoveScroll so wheel
 * scrolling works on body-portaled content (Dialog lock otherwise preventDefaults it).
 */
export function getEmbeddedPopoverModalProp(embeddedInModal: boolean): boolean | undefined {
  return embeddedInModal ? true : undefined;
}
