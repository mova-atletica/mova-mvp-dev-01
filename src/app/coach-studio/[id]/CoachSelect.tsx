"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { MovaPopoverMotionInner } from "../../../components/MovaPopoverMotionInner";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../../motion-explore/AssetVideoPlayerExportPanel";

/** Studio-matching single select (same Popover pattern as TraceSelect). */
export function CoachSelect({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <Popover.Root modal={false} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={exportPanelSelectTriggerClass}>
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className={exportPanelPopoverContentClass}
        >
          <MovaPopoverMotionInner scrollable>
            {options.map((opt, index) => (
              <div
                key={opt.value}
                role="menuitem"
                className={`${exportPanelDropdownMenuItemClass} ${index === options.length - 1 ? "border-b-0" : ""}`}
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </MovaPopoverMotionInner>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
