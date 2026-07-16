"use client";

import { useState, type CSSProperties } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../app/motion-explore/AssetVideoPlayerExportPanel";

interface ExportPanelSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
  /** Extra classes on the trigger (e.g. width). */
  triggerClassName?: string;
  /** Extra classes on the portaled menu (e.g. max-height). */
  contentClassName?: string;
  contentStyle?: CSSProperties;
  /** Portal target — use Dialog content node so menus stack above modal overlays. */
  portalContainer?: HTMLElement | null;
  /** When true, popover behaves as a modal layer (needed inside Dialogs). */
  modal?: boolean;
  "aria-label"?: string;
}

export default function ExportPanelSelect({
  value,
  options,
  onSelect,
  triggerClassName = "",
  contentClassName = "",
  contentStyle,
  portalContainer,
  modal = false,
  "aria-label": ariaLabel,
}: ExportPanelSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <Popover.Root modal={modal} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={`${exportPanelSelectTriggerClass} ${triggerClassName}`.trim()}
        >
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={portalContainer ?? undefined}>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          style={contentStyle}
          className={`${exportPanelPopoverContentClass} ${contentClassName}`.trim()}
        >
          {options.map((opt, index) => (
            <div
              key={opt.value}
              role="menuitem"
              className={`${exportPanelDropdownMenuItemClass} ${index === options.length - 1 ? "border-b-0" : ""} ${
                value === opt.value
                  ? "bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)]"
                  : ""
              }`}
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
