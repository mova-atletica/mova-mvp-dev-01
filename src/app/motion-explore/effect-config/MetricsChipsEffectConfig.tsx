"use client";

import { useEffect, useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import type { EffectConfigFormProps } from "./types";
import { ConfigColorHexRow, ConfigRoot, ConfigSection, configFieldStyles } from "./fields";
import { EFFECT_CONFIG_JOINT_OPTIONS } from "./jointOptions";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../AssetVideoPlayerExportPanel";

type MetricChipKind =
  | "rom_joint"
  | "cycling_cadence"
  | "cycling_stroke_repeatability"
  | "pullups_reps"
  | "pullups_elbow_symmetry"
  | "plank_hold_sec"
  | "plank_correction_count"
  | "plank_avg_hip_dev";

type MetricChipRow = { id: string; kind: MetricChipKind; jointName?: string };

function TraceSelect({
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
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={exportPanelSelectTriggerClass}>
          <span className="truncate">{selected?.label ?? value}</span>
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

const ALL_METRIC_CHIP_OPTIONS: Array<{ value: MetricChipKind; label: string }> = [
  { value: "rom_joint", label: "ROM (joint)" },
  { value: "cycling_cadence", label: "Cycling cadence" },
  { value: "cycling_stroke_repeatability", label: "Cycling stroke repeatability" },
  { value: "pullups_reps", label: "Pull-up reps" },
  { value: "pullups_elbow_symmetry", label: "Pull-up elbow symmetry" },
  { value: "plank_hold_sec", label: "Plank hold" },
  { value: "plank_correction_count", label: "Plank corrections" },
  { value: "plank_avg_hip_dev", label: "Plank hip line" },
];

export function MetricsChipsEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const metricChipLayout =
    (config.metricChipLayout as
      | "bottom_center_row"
      | "bottom_center_stack"
      | "top_center_row"
      | "top_center_stack") || "bottom_center_row";
  const metricChipTextColor = (config.metricChipTextColor as string) || "#ffffff";
  const metricChips = ((config.metricChips as MetricChipRow[]) || []).slice(0, 3);
  const sportMetricsSnapshot =
    (config.sportMetricsSnapshot as
      | {
          cyclingCadenceRpm?: number | null;
          cyclingStrokeRepeatability?: number | null;
          pullupsRepCount?: number | null;
          pullupsElbowSymmetry?: number | null;
          plankHoldDurationSec?: number | null;
          plankCorrectionCount?: number | null;
          plankAvgHipDeviation?: number | null;
          plankAvgHipAngleDeg?: number | null;
          squatRepCount?: number | null;
        }
      | null) || null;
  const sportAnalysisKind =
    (config.sportAnalysisKind as "cycling" | "pullups" | "plank" | "squat" | undefined) || "cycling";

  const chipLayoutOptions = [
    { value: "bottom_center_row", label: "Bottom center row" },
    { value: "bottom_center_stack", label: "Bottom center stack" },
    { value: "top_center_row", label: "Top center row" },
    { value: "top_center_stack", label: "Top center stack" },
  ];
  const jointOptions = EFFECT_CONFIG_JOINT_OPTIONS.map((o) => ({ value: o.key, label: o.label }));

  const hasAnyAnalysis = useMemo(() => {
    if (!sportMetricsSnapshot) return false;
    const vals = [
      sportMetricsSnapshot.cyclingCadenceRpm,
      sportMetricsSnapshot.cyclingStrokeRepeatability,
      sportMetricsSnapshot.pullupsRepCount,
      sportMetricsSnapshot.pullupsElbowSymmetry,
      sportMetricsSnapshot.plankHoldDurationSec,
      sportMetricsSnapshot.plankCorrectionCount,
      sportMetricsSnapshot.plankAvgHipDeviation,
      sportMetricsSnapshot.plankAvgHipAngleDeg,
    ];
    return vals.some((v) => typeof v === "number" && Number.isFinite(v));
  }, [sportMetricsSnapshot]);

  const availableMetricOptions = useMemo(() => {
    if (!hasAnyAnalysis) {
      return ALL_METRIC_CHIP_OPTIONS.filter((opt) => opt.value === "rom_joint");
    }

    return ALL_METRIC_CHIP_OPTIONS.filter((opt) => {
      if (opt.value === "rom_joint") return true;
      if (sportAnalysisKind === "cycling") {
        if (opt.value === "cycling_cadence") return Number.isFinite(sportMetricsSnapshot?.cyclingCadenceRpm ?? NaN);
        if (opt.value === "cycling_stroke_repeatability") {
          return Number.isFinite(sportMetricsSnapshot?.cyclingStrokeRepeatability ?? NaN);
        }
        return false;
      }

      if (sportAnalysisKind === "plank") {
        if (opt.value === "plank_hold_sec") return Number.isFinite(sportMetricsSnapshot?.plankHoldDurationSec ?? NaN);
        if (opt.value === "plank_correction_count") {
          return Number.isFinite(sportMetricsSnapshot?.plankCorrectionCount ?? NaN);
        }
        if (opt.value === "plank_avg_hip_dev") {
          return (
            Number.isFinite(sportMetricsSnapshot?.plankAvgHipAngleDeg ?? NaN) ||
            Number.isFinite(sportMetricsSnapshot?.plankAvgHipDeviation ?? NaN)
          );
        }
        return false;
      }

      if (opt.value === "pullups_reps") return Number.isFinite(sportMetricsSnapshot?.pullupsRepCount ?? NaN);
      if (opt.value === "pullups_elbow_symmetry") return Number.isFinite(sportMetricsSnapshot?.pullupsElbowSymmetry ?? NaN);
      return false;
    });
  }, [hasAnyAnalysis, sportAnalysisKind, sportMetricsSnapshot]);

  useEffect(() => {
    const allowedKinds = new Set<MetricChipKind>(availableMetricOptions.map((opt) => opt.value));
    const normalized = metricChips.map((chip) => {
      if (allowedKinds.has(chip.kind)) return chip;
      return { ...chip, kind: "rom_joint" as const, jointName: chip.jointName || "left_knee" };
    });

    const changed = normalized.some(
      (chip, idx) => chip.kind !== metricChips[idx]?.kind || chip.jointName !== metricChips[idx]?.jointName
    );
    if (changed) {
      updateConfig({ metricChips: normalized });
    }
  }, [availableMetricOptions, metricChips, updateConfig]);

  const addMetricChip = () => {
    if (metricChips.length >= 3) return;
    const defaultKind = (availableMetricOptions[0]?.value ?? "rom_joint") as MetricChipKind;
    const next: MetricChipRow[] = [
      ...metricChips,
      { id: `chip_${Date.now()}`, kind: defaultKind, jointName: defaultKind === "rom_joint" ? "left_knee" : undefined },
    ];
    updateConfig({ metricChips: next });
  };
  const updateMetricChip = (id: string, patch: Partial<MetricChipRow>) => {
    updateConfig({ metricChips: metricChips.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  };
  const removeMetricChip = (id: string) => {
    updateConfig({ metricChips: metricChips.filter((c) => c.id !== id) });
  };

  return (
    <ConfigRoot>
      <ConfigSection title="Metrics Chips Overlay">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={configFieldStyles.rowMb6}>
            <span style={configFieldStyles.labelWide}>Layout</span>
            <div style={{ flex: 1 }}>
              <TraceSelect
                value={metricChipLayout}
                options={chipLayoutOptions}
                onSelect={(value) => updateConfig({ metricChipLayout: value })}
              />
            </div>
          </div>
          <ConfigColorHexRow
            label="Text"
            labelWidth="50px"
            colorInputValue={metricChipTextColor}
            textInputValue={metricChipTextColor}
            onColorChange={(hex) => updateConfig({ metricChipTextColor: hex })}
            onTextChange={(hex) => updateConfig({ metricChipTextColor: hex })}
            marginBottom="6px"
          />
          <button
            type="button"
            onClick={addMetricChip}
            disabled={metricChips.length >= 3}
            style={{
              ...configFieldStyles.select,
              textAlign: "center",
              cursor: metricChips.length >= 3 ? "not-allowed" : "pointer",
              opacity: metricChips.length >= 3 ? 0.6 : 1,
              minHeight: "28px",
            }}
          >
            Add metric chip
          </button>
          {metricChips.length >= 3 ? (
            <div style={configFieldStyles.caption}>Maximum 3 chips reached.</div>
          ) : null}
          {metricChips.map((chip, idx) => (
            <div
              key={chip.id}
              style={{
                border: "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 50%)",
                borderRadius: "6px",
                padding: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={configFieldStyles.row}>
                <span style={configFieldStyles.labelWide}>Chip {idx + 1}</span>
                <div style={{ flex: 1 }}>
                  <TraceSelect
                    value={chip.kind}
                    options={availableMetricOptions}
                    onSelect={(v) =>
                      updateMetricChip(chip.id, {
                        kind: v as MetricChipKind,
                        jointName: v === "rom_joint" ? chip.jointName || "left_knee" : undefined,
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMetricChip(chip.id)}
                  style={{
                    ...configFieldStyles.select,
                    flex: "0 0 auto",
                    width: "56px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
              {chip.kind === "rom_joint" ? (
                <div style={configFieldStyles.row}>
                  <span style={configFieldStyles.labelWide}>Joint</span>
                  <div style={{ flex: 1 }}>
                    <TraceSelect
                      value={chip.jointName || "left_knee"}
                      options={jointOptions}
                      onSelect={(v) => updateMetricChip(chip.id, { jointName: v })}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ConfigSection>
    </ConfigRoot>
  );
}
