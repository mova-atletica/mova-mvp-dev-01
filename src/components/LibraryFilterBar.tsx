"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, X } from "lucide-react";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelFieldLabelClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../app/motion-explore/AssetVideoPlayerExportPanel";
import type { HomeFilterState } from "../lib/homeFilters";
import {
  CONTENT_FILTER_OPTIONS,
  EMPTY_HOME_FILTERS,
  LEVEL_FILTER_OPTIONS,
  TYPE_FILTER_OPTIONS,
  buildActiveFilterChips,
  formatFilterLabel,
  hasActiveFilters,
  removeFilterChip,
  toggleFilterValue,
  type ActiveFilterChip,
  type ContentFilter,
} from "../lib/homeFilters";

export type LibraryFilterLayout = "default" | "rail" | "mobile-collapsible";

const filterTriggerClassHorizontal = `${exportPanelSelectTriggerClass} w-auto min-w-[9.5rem] max-w-[13rem]`;
const filterTriggerClassRail = `${exportPanelSelectTriggerClass} w-full`;

interface LibraryFilterBarProps {
  filters: HomeFilterState;
  onFiltersChange: (filters: HomeFilterState) => void;
  muscleGroupOptions: string[];
  equipmentOptions: string[];
  layout?: LibraryFilterLayout;
}

function FilterSingleSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Any",
  layout,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  layout: LibraryFilterLayout;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? placeholder;
  const isRail = layout === "rail";
  const triggerClass = isRail ? filterTriggerClassRail : filterTriggerClassHorizontal;

  return (
    <div
      className={isRail ? "min-w-0 w-full" : "min-w-0 flex-1"}
      style={isRail ? undefined : { minWidth: "9.5rem", maxWidth: "13rem" }}
    >
      <div className={exportPanelFieldLabelClass}>{label}</div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button type="button" className={triggerClass}>
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
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
            {options.map((opt, index) => (
              <div
                key={opt.value}
                role="menuitem"
                className={`${exportPanelDropdownMenuItemClass} ${index === options.length - 1 ? "border-b-0" : ""} ${value === opt.value ? "bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)]" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function FilterMultiSelect({
  label,
  selected,
  options,
  onToggle,
  emptyLabel = "Any",
  layout,
}: {
  label: string;
  selected: string[];
  options: readonly string[] | string[];
  onToggle: (value: string) => void;
  emptyLabel?: string;
  layout: LibraryFilterLayout;
}) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  const triggerLabel =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? formatFilterLabel(selected[0])
        : `${selected.length} selected`;

  const isRail = layout === "rail";
  const triggerClass = isRail ? filterTriggerClassRail : filterTriggerClassHorizontal;

  return (
    <div
      className={isRail ? "min-w-0 w-full" : "min-w-0 flex-1"}
      style={isRail ? undefined : { minWidth: "9.5rem", maxWidth: "13rem" }}
    >
      <div className={exportPanelFieldLabelClass}>{label}</div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button type="button" className={triggerClass}>
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className={`${exportPanelPopoverContentClass} max-h-56 overflow-y-auto`}
          >
            {options.map((option, index) => {
              const isSelected = selected.some(
                (s) => s.toLowerCase() === option.toLowerCase()
              );
              return (
                <div
                  key={option}
                  role="menuitemcheckbox"
                  aria-checked={isSelected}
                  className={`${exportPanelDropdownMenuItemClass} ${index === options.length - 1 ? "border-b-0" : ""} flex items-center justify-between gap-2 ${isSelected ? "bg-[color:color-mix(in_srgb,var(--foreground)_12%,transparent)]" : ""}`}
                  onClick={() => onToggle(option)}
                >
                  <span>{formatFilterLabel(option)}</span>
                  {isSelected ? (
                    <span className="text-[10px] text-[color:var(--muted)]">✓</span>
                  ) : null}
                </div>
              );
            })}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function SelectedFilterChip({
  chip,
  onRemove,
}: {
  chip: ActiveFilterChip;
  onRemove: (chip: ActiveFilterChip) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRemove(chip)}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
      style={{
        backgroundColor: "var(--primary-button-bg)",
        color: "var(--primary-button-text)",
        border: "1px solid var(--primary-button-border)",
      }}
      aria-label={`Remove filter ${chip.label}`}
    >
      <span>{chip.label}</span>
      <X className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
    </button>
  );
}

function FilterFields({
  filters,
  onFiltersChange,
  muscleGroupOptions,
  equipmentOptions,
  layout,
}: LibraryFilterBarProps & { layout: LibraryFilterLayout }) {
  const update = (patch: Partial<HomeFilterState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  const activeChips = buildActiveFilterChips(filters);
  const hasFilters = activeChips.length > 0;

  return (
    <>
      <div
        className={
          layout === "rail"
            ? "flex flex-col gap-y-4"
            : "flex flex-wrap gap-x-3 gap-y-4"
        }
      >
        <FilterSingleSelect<ContentFilter>
          label="Content"
          value={filters.content}
          options={CONTENT_FILTER_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(content) => update({ content })}
          layout={layout}
        />

        <FilterMultiSelect
          label="Level"
          selected={filters.levels}
          options={LEVEL_FILTER_OPTIONS}
          onToggle={(value) => update({ levels: toggleFilterValue(filters.levels, value) })}
          layout={layout}
        />

        <FilterMultiSelect
          label="Type"
          selected={filters.types}
          options={TYPE_FILTER_OPTIONS}
          onToggle={(value) => update({ types: toggleFilterValue(filters.types, value) })}
          layout={layout}
        />

        <FilterMultiSelect
          label="Muscle group"
          selected={filters.muscleGroups}
          options={muscleGroupOptions}
          onToggle={(value) =>
            update({ muscleGroups: toggleFilterValue(filters.muscleGroups, value) })
          }
          layout={layout}
        />

        <FilterMultiSelect
          label="Equipment"
          selected={filters.equipment}
          options={equipmentOptions}
          onToggle={(value) =>
            update({ equipment: toggleFilterValue(filters.equipment, value) })
          }
          layout={layout}
        />
      </div>

      {hasFilters ? (
        <div
          className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            Active filters
          </span>
          {activeChips.map((chip) => (
            <SelectedFilterChip
              key={chip.id}
              chip={chip}
              onRemove={(c) => onFiltersChange(removeFilterChip(filters, c))}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function LibraryFilterBar({
  filters,
  onFiltersChange,
  muscleGroupOptions,
  equipmentOptions,
  layout = "default",
}: LibraryFilterBarProps) {
  const activeChips = buildActiveFilterChips(filters);
  const hasFilters = activeChips.length > 0;
  const filtersActive = hasActiveFilters(filters);

  const [mobileOpen, setMobileOpen] = useState(filtersActive);

  useEffect(() => {
    if (filtersActive) setMobileOpen(true);
  }, [filtersActive]);

  if (layout === "rail") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
            Filter by:
          </h3>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => onFiltersChange(EMPTY_HOME_FILTERS)}
              className="text-xs underline"
              style={{ color: "var(--muted)" }}
            >
              Clear all
            </button>
          ) : null}
        </div>
        <FilterFields
          filters={filters}
          onFiltersChange={onFiltersChange}
          muscleGroupOptions={muscleGroupOptions}
          equipmentOptions={equipmentOptions}
          layout="rail"
        />
      </div>
    );
  }

  if (layout === "mobile-collapsible") {
    return (
      <div
        className="mx-auto rounded-lg"
        style={{
          maxWidth: "2560px",
          marginLeft: "3%",
          marginRight: "3%",
          marginTop: "12px",
          marginBottom: "12px",
          width: "94%",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={mobileOpen}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
              Filter by:
            </span>
            {hasFilters ? (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--primary-button-bg)",
                  color: "var(--primary-button-text)",
                }}
              >
                {activeChips.length}
              </span>
            ) : null}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[color:var(--muted)] transition-transform ${mobileOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {mobileOpen ? (
          <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--border)" }}>
            {hasFilters ? (
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => onFiltersChange(EMPTY_HOME_FILTERS)}
                  className="text-xs underline"
                  style={{ color: "var(--muted)" }}
                >
                  Clear all
                </button>
              </div>
            ) : null}
            <FilterFields
              filters={filters}
              onFiltersChange={onFiltersChange}
              muscleGroupOptions={muscleGroupOptions}
              equipmentOptions={equipmentOptions}
              layout="default"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="mx-auto rounded-lg"
      style={{
        maxWidth: "2560px",
        marginLeft: "3%",
        marginRight: "3%",
        marginTop: "18px",
        marginBottom: "18px",
        width: "94%",
        padding: "15px",
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium" style={{ color: "var(--section-title)" }}>
          Filter by:
        </h3>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => onFiltersChange(EMPTY_HOME_FILTERS)}
            className="text-xs underline"
            style={{ color: "var(--muted)" }}
          >
            Clear all
          </button>
        ) : null}
      </div>

      <FilterFields
        filters={filters}
        onFiltersChange={onFiltersChange}
        muscleGroupOptions={muscleGroupOptions}
        equipmentOptions={equipmentOptions}
        layout="default"
      />
    </div>
  );
}
