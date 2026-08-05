"use client";

import type { ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { POSE_FLEXIBILITY_FOCUS_OPTIONS } from "../../lib/sportAnalysis";
import type {
  CyclingLeg,
  PlankFacingSide,
  PoseFlexibilityFocusArea,
  PoseFlexibilitySide,
  PushUpSide,
  SportAnalysisKind,
  SquatSide,
} from "../../lib/sportAnalysis";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelFieldLabelClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../motion-explore/AssetVideoPlayerExportPanel";
import { MovaPopoverMotionInner } from "../../components/MovaPopoverMotionInner";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

const embeddedNativeSelectClass =
  "w-full min-w-0 appearance-none rounded-lg border border-border-theme bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-2 text-xs font-light text-[color:var(--foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:border-border-theme transition-colors";

function EmbeddedNativeSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="min-w-0">
      <label className={exportPanelFieldLabelClass}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className={embeddedNativeSelectClass}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--muted)]"
          aria-hidden
        />
      </div>
    </div>
  );
}

function PopoverSideSelect({
  label,
  valueLabel,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  valueLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className={exportPanelFieldLabelClass}>{label}</div>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          <button type="button" className={exportPanelSelectTriggerClass}>
            <span className="truncate">{valueLabel}</span>
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
            <MovaPopoverMotionInner scrollable>{children}</MovaPopoverMotionInner>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function PopoverMenuItem({
  onSelect,
  isLast = false,
  children,
}: {
  onSelect: () => void;
  isLast?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      role="menuitem"
      className={isLast ? `${exportPanelDropdownMenuItemClass} border-b-0` : exportPanelDropdownMenuItemClass}
      onClick={onSelect}
    >
      {children}
    </div>
  );
}

const tipClass = "text-[10px] leading-snug text-[color:var(--muted)]";

/** Exercise filming tip — shown under Upload in the embedded mini-app rail. */
export function OpenMoveSportSetupTip({
  sportAnalysisKind,
}: {
  sportAnalysisKind: SportAnalysisKind;
}) {
  if (sportAnalysisKind === "cycling") {
    return (
      <p className={tipClass}>
        Film from the side. We analyze <strong className="text-[color:var(--foreground)]">both</strong>{" "}
        bottom-of-stroke (trough) and top-of-stroke (peak) from the selected knee.
      </p>
    );
  }
  if (sportAnalysisKind === "pullups") {
    return (
      <p className={tipClass}>
        Keep arms fully visible. We combine{" "}
        <strong className="text-[color:var(--foreground)]">left and right</strong> elbow angles to count
        reps.
      </p>
    );
  }
  if (sportAnalysisKind === "plank") {
    return (
      <p className={tipClass}>
        Pick the side of your body that is{" "}
        <strong className="text-[color:var(--foreground)]">nearer the camera</strong> in your clip —
        your own left or right, not the screen&apos;s. We measure hip, knee, and shoulder on that side
        only, and the far side is hidden from the camera.
      </p>
    );
  }
  if (sportAnalysisKind === "squat") {
    return (
      <p className={tipClass}>
        Side-view squat: the selected knee drives rep count and depth. Pick the leg{" "}
        <strong className="text-[color:var(--foreground)]">nearer the camera</strong> — your own left
        or right, not the screen&apos;s.
      </p>
    );
  }
  if (sportAnalysisKind === "pushups") {
    return (
      <p className={tipClass}>
        Side-view push-up: the selected elbow drives rep count and depth. Pick the side{" "}
        <strong className="text-[color:var(--foreground)]">nearer the camera</strong> — your own left
        or right, not the screen&apos;s.
      </p>
    );
  }
  return (
    <p className={tipClass}>
      Side-view clip. Flexibility metrics use the selected focus areas.
    </p>
  );
}

/** True when the sport needs side/leg/focus controls before Analyze. */
export function sportHasSetupControls(sportAnalysisKind: SportAnalysisKind): boolean {
  return sportAnalysisKind !== "pullups";
}

export interface OpenMoveSportSetupFieldsProps {
  sportAnalysisKind: SportAnalysisKind;
  /** Native selects in modal — avoids Radix Dialog + portaled Popover conflicts. */
  embedded?: boolean;
  /** Skip tip copy (tip is rendered separately under Upload in embedded mini-apps). */
  hideTip?: boolean;
  cyclingLeg: CyclingLeg;
  cyclingKneeMenuOpen: boolean;
  onCyclingKneeMenuOpenChange: (open: boolean) => void;
  onCyclingLegChange: (leg: CyclingLeg) => void;
  plankFacingSide: PlankFacingSide;
  plankSideMenuOpen: boolean;
  onPlankSideMenuOpenChange: (open: boolean) => void;
  onPlankFacingSideChange: (side: PlankFacingSide) => void;
  squatSide: SquatSide;
  squatSideMenuOpen: boolean;
  onSquatSideMenuOpenChange: (open: boolean) => void;
  onSquatSideChange: (side: SquatSide) => void;
  pushUpSide: PushUpSide;
  pushUpSideMenuOpen: boolean;
  onPushUpSideMenuOpenChange: (open: boolean) => void;
  onPushUpSideChange: (side: PushUpSide) => void;
  poseFlexibilitySide: PoseFlexibilitySide;
  poseFlexibilitySideMenuOpen: boolean;
  onPoseFlexibilitySideMenuOpenChange: (open: boolean) => void;
  onPoseFlexibilitySideChange: (side: PoseFlexibilitySide) => void;
  poseFlexibilityFocusAreas: PoseFlexibilityFocusArea[];
  onTogglePoseFlexibilityFocusArea: (area: PoseFlexibilityFocusArea) => void;
}

export default function OpenMoveSportSetupFields({
  sportAnalysisKind,
  embedded = false,
  hideTip = false,
  cyclingLeg,
  cyclingKneeMenuOpen,
  onCyclingKneeMenuOpenChange,
  onCyclingLegChange,
  plankFacingSide,
  plankSideMenuOpen,
  onPlankSideMenuOpenChange,
  onPlankFacingSideChange,
  squatSide,
  squatSideMenuOpen,
  onSquatSideMenuOpenChange,
  onSquatSideChange,
  pushUpSide,
  pushUpSideMenuOpen,
  onPushUpSideMenuOpenChange,
  onPushUpSideChange,
  poseFlexibilitySide,
  poseFlexibilitySideMenuOpen,
  onPoseFlexibilitySideMenuOpenChange,
  onPoseFlexibilitySideChange,
  poseFlexibilityFocusAreas,
  onTogglePoseFlexibilityFocusArea,
}: OpenMoveSportSetupFieldsProps) {
  const tip = hideTip ? null : <OpenMoveSportSetupTip sportAnalysisKind={sportAnalysisKind} />;

  if (sportAnalysisKind === "cycling") {
    return (
      <>
        {embedded ? (
          <EmbeddedNativeSelect
            label="Knee"
            value={cyclingLeg}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={onCyclingLegChange}
          />
        ) : (
          <PopoverSideSelect
            label="Knee"
            valueLabel={cyclingLeg === "left" ? "Left" : "Right"}
            open={cyclingKneeMenuOpen}
            onOpenChange={onCyclingKneeMenuOpenChange}
          >
            <PopoverMenuItem
              onSelect={() => {
                onCyclingLegChange("left");
                onCyclingKneeMenuOpenChange(false);
              }}
            >
              Left
            </PopoverMenuItem>
            <PopoverMenuItem
              isLast
              onSelect={() => {
                onCyclingLegChange("right");
                onCyclingKneeMenuOpenChange(false);
              }}
            >
              Right
            </PopoverMenuItem>
          </PopoverSideSelect>
        )}
        {tip}
      </>
    );
  }

  if (sportAnalysisKind === "pullups") {
    return tip;
  }

  if (sportAnalysisKind === "plank") {
    return (
      <>
        {embedded ? (
          <EmbeddedNativeSelect
            label="Side toward camera"
            value={plankFacingSide}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={onPlankFacingSideChange}
          />
        ) : (
          <PopoverSideSelect
            label="Side toward camera"
            valueLabel={plankFacingSide === "left" ? "Left" : "Right"}
            open={plankSideMenuOpen}
            onOpenChange={onPlankSideMenuOpenChange}
          >
            <PopoverMenuItem
              onSelect={() => {
                onPlankFacingSideChange("left");
                onPlankSideMenuOpenChange(false);
              }}
            >
              Left
            </PopoverMenuItem>
            <PopoverMenuItem
              isLast
              onSelect={() => {
                onPlankFacingSideChange("right");
                onPlankSideMenuOpenChange(false);
              }}
            >
              Right
            </PopoverMenuItem>
          </PopoverSideSelect>
        )}
        {tip}
      </>
    );
  }

  if (sportAnalysisKind === "squat") {
    return (
      <>
        {embedded ? (
          <EmbeddedNativeSelect
            label="Side toward camera"
            value={squatSide}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={onSquatSideChange}
          />
        ) : (
          <PopoverSideSelect
            label="Side toward camera"
            valueLabel={squatSide === "left" ? "Left" : "Right"}
            open={squatSideMenuOpen}
            onOpenChange={onSquatSideMenuOpenChange}
          >
            <PopoverMenuItem
              onSelect={() => {
                onSquatSideChange("left");
                onSquatSideMenuOpenChange(false);
              }}
            >
              Left
            </PopoverMenuItem>
            <PopoverMenuItem
              isLast
              onSelect={() => {
                onSquatSideChange("right");
                onSquatSideMenuOpenChange(false);
              }}
            >
              Right
            </PopoverMenuItem>
          </PopoverSideSelect>
        )}
        {tip}
      </>
    );
  }

  if (sportAnalysisKind === "pushups") {
    return (
      <>
        {embedded ? (
          <EmbeddedNativeSelect
            label="Side toward camera"
            value={pushUpSide}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
            onChange={onPushUpSideChange}
          />
        ) : (
          <PopoverSideSelect
            label="Side toward camera"
            valueLabel={pushUpSide === "left" ? "Left" : "Right"}
            open={pushUpSideMenuOpen}
            onOpenChange={onPushUpSideMenuOpenChange}
          >
            <PopoverMenuItem
              onSelect={() => {
                onPushUpSideChange("left");
                onPushUpSideMenuOpenChange(false);
              }}
            >
              Left
            </PopoverMenuItem>
            <PopoverMenuItem
              isLast
              onSelect={() => {
                onPushUpSideChange("right");
                onPushUpSideMenuOpenChange(false);
              }}
            >
              Right
            </PopoverMenuItem>
          </PopoverSideSelect>
        )}
        {tip}
      </>
    );
  }

  return (
    <>
      {embedded ? (
        <EmbeddedNativeSelect
          label="Side toward camera"
          value={poseFlexibilitySide}
          options={[
            { value: "left", label: "Left side toward camera" },
            { value: "right", label: "Right side toward camera" },
          ]}
          onChange={onPoseFlexibilitySideChange}
        />
      ) : (
        <PopoverSideSelect
          label="Side toward camera"
          valueLabel={
            poseFlexibilitySide === "left" ? "Left side toward camera" : "Right side toward camera"
          }
          open={poseFlexibilitySideMenuOpen}
          onOpenChange={onPoseFlexibilitySideMenuOpenChange}
        >
          <PopoverMenuItem
            onSelect={() => {
              onPoseFlexibilitySideChange("left");
              onPoseFlexibilitySideMenuOpenChange(false);
            }}
          >
            Left side toward camera
          </PopoverMenuItem>
          <PopoverMenuItem
            isLast
            onSelect={() => {
              onPoseFlexibilitySideChange("right");
              onPoseFlexibilitySideMenuOpenChange(false);
            }}
          >
            Right side toward camera
          </PopoverMenuItem>
        </PopoverSideSelect>
      )}
      <div className="min-w-0">
        <div className={exportPanelFieldLabelClass}>Focus areas (1-3)</div>
        <div className="flex flex-wrap gap-1.5">
          {POSE_FLEXIBILITY_FOCUS_OPTIONS.map((option) => {
            const selected = poseFlexibilityFocusAreas.includes(option.key);
            const disableRemove = selected && poseFlexibilityFocusAreas.length <= 1;
            const disableAdd = !selected && poseFlexibilityFocusAreas.length >= 3;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onTogglePoseFlexibilityFocusArea(option.key)}
                disabled={disableRemove || disableAdd}
                style={selected ? { border: "1px solid var(--accent, #3b82f6)" } : borderAllTheme}
                className={`rounded-full px-3 py-1 text-[11px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "bg-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] text-[color:var(--foreground)]"
                    : "bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {tip}
    </>
  );
}
