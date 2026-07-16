"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { useExportPanelPopoverLayers } from "../../../contexts/EmbeddedModalPopoverContext";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelSelectTriggerClass,
} from "../AssetVideoPlayerExportPanel";

export function TraceSelect({
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
  const popoverLayers = useExportPanelPopoverLayers();

  return (
    <Popover.Root modal={popoverLayers.modal} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={exportPanelSelectTriggerClass}>
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={popoverLayers.portalContainer}>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          style={popoverLayers.contentStyle}
          className={popoverLayers.contentClassName}
        >
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
