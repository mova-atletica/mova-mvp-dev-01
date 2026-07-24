"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { MOVA_POPOVER_MENU_STYLE } from "../lib/embeddedModalPopover";

/**
 * Inner shell for Radix Popover menus — animates without fighting placement `transform`.
 * When `scrollable`, a nested scrollport owns the height cap. Wheel is applied
 * programmatically because Dialog RemoveScroll preventDefaults wheel on body-portaled menus.
 */
export function MovaPopoverMotionInner({
  children,
  className = "",
  scrollable = false,
}: {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollable) return;
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight) return;
      el.scrollTop += event.deltaY;
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollable]);

  return (
    <div className={`mova-popover-motion-inner${className ? ` ${className}` : ""}`}>
      {scrollable ? (
        <div ref={scrollRef} className="mova-popover-menu-scroll" style={MOVA_POPOVER_MENU_STYLE}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
