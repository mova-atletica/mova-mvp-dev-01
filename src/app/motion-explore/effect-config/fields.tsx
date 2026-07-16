"use client";

import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { useExportPanelPopoverLayers } from "../../../contexts/EmbeddedModalPopoverContext";
import {
  EFFECT_CONFIG_JOINT_OPTIONS,
  hasSideSpecificOptions,
  mergeSelectedWithSideKeys,
  optionKeysForSide,
} from "./jointOptions";
import {
  exportPanelSelectTriggerClass,
} from "../AssetVideoPlayerExportPanel";

/** Inline styles — theme via :root vars from ThemeContext (light/dark). */
const borderSubtle = "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 50%)";

export const configFieldStyles = {
  rootColumn: { display: "flex", flexDirection: "column" as const, gap: "12px" },
  sectionLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--foreground)",
    display: "block" as const,
    marginBottom: "6px",
  },
  row: { display: "flex", alignItems: "center" as const, gap: "8px" },
  rowMb6: { display: "flex", alignItems: "center" as const, gap: "8px", marginBottom: "6px" },
  rowMb8: { display: "flex", alignItems: "center" as const, gap: "8px", marginBottom: "8px" },
  labelNarrow: { fontSize: "10px", width: "40px", color: "var(--foreground)" },
  labelWide: { fontSize: "10px", width: "50px", color: "var(--foreground)" },
  valueSuffix: { fontSize: "10px", width: "20px", color: "var(--foreground)" },
  valueSuffixMuted: { fontSize: "10px", width: "20px", color: "var(--muted-foreground)" },
  valueSuffix30: { fontSize: "10px", width: "30px", color: "var(--foreground)" },
  /** Do not set a small fixed height — it clips WebKit range paint. Styling: `effect-config-range.css`. */
  range: { flex: 1, minHeight: "24px", alignSelf: "center" },
  colorInput: { width: "24px", height: "20px", border: borderSubtle, borderRadius: "4px" },
  textMono: {
    flex: 1,
    padding: "4px 6px",
    fontSize: "10px",
    border: borderSubtle,
    borderRadius: "4px",
    fontFamily: "monospace",
    color: "var(--foreground)",
    backgroundColor: "transparent",
  },
  numberInputSm: {
    width: "40px",
    padding: "4px 6px",
    fontSize: "10px",
    border: borderSubtle,
    borderRadius: "4px",
    color: "var(--foreground)",
    backgroundColor: "transparent",
  },
  select: {
    flex: 1,
    padding: "4px 6px",
    fontSize: "10px",
    border: borderSubtle,
    borderRadius: "4px",
    color: "var(--foreground)",
    backgroundColor: "transparent",
  },
  optionsRow: { display: "flex", flexWrap: "wrap" as const, gap: "12px" },
  jointGrid: { display: "flex", flexWrap: "wrap" as const, gap: "8px" },
  inlineCheckLabel: { display: "flex", alignItems: "center" as const, gap: "4px" },
  checkbox12: { width: "12px", height: "12px", accentColor: "var(--accent)" },
  checkbox16: { width: "16px", height: "16px", accentColor: "var(--accent)" },
  caption: { fontSize: "10px", color: "var(--foreground)" },
} as const;

export function ConfigRoot({ children }: { children: ReactNode }) {
  return <div style={configFieldStyles.rootColumn}>{children}</div>;
}

export function ConfigSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <label style={configFieldStyles.sectionLabel}>{title}</label>
      {children}
    </div>
  );
}

type LabelW = "40px" | "50px";

export function ConfigSliderRow({
  label,
  labelWidth = "40px",
  omitLabel,
  min,
  max,
  step,
  value,
  onChange,
  displayValue,
  valueSuffixWidth = "20px",
  mutedValue = false,
  marginBottom,
}: {
  label: string;
  labelWidth?: LabelW;
  /** When true, only the range + value suffix render (e.g. under a section title). */
  omitLabel?: boolean;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (next: number) => void;
  displayValue: string;
  valueSuffixWidth?: "20px" | "30px";
  mutedValue?: boolean;
  marginBottom?: "6px" | "8px";
}) {
  const labelStyle =
    labelWidth === "50px" ? configFieldStyles.labelWide : configFieldStyles.labelNarrow;
  const suffixStyle =
    valueSuffixWidth === "30px"
      ? configFieldStyles.valueSuffix30
      : mutedValue
        ? configFieldStyles.valueSuffixMuted
        : configFieldStyles.valueSuffix;
  const rowStyle =
    marginBottom === "6px"
      ? configFieldStyles.rowMb6
      : marginBottom === "8px"
        ? configFieldStyles.rowMb8
        : configFieldStyles.row;

  return (
    <div style={rowStyle}>
      {omitLabel ? null : <span style={labelStyle}>{label}</span>}
      <input
        type="range"
        className="effect-config-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={configFieldStyles.range}
      />
      <span style={suffixStyle}>{displayValue}</span>
    </div>
  );
}

/** Color picker + hex text (24×20 swatch) — joint angles, ROM, skeleton, motion-trails bone. */
export function ConfigColorHexRow({
  label = "Color",
  labelWidth = "40px",
  colorInputValue,
  textInputValue,
  onColorChange,
  onTextChange,
  marginBottom,
}: {
  label?: string;
  labelWidth?: LabelW;
  colorInputValue: string;
  textInputValue: string;
  onColorChange: (hex: string) => void;
  onTextChange: (hex: string) => void;
  marginBottom?: "6px";
}) {
  const labelStyle =
    labelWidth === "50px" ? configFieldStyles.labelWide : configFieldStyles.labelNarrow;
  const rowStyle =
    marginBottom === "6px" ? configFieldStyles.rowMb6 : configFieldStyles.row;

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <input
        type="color"
        value={colorInputValue}
        onChange={(e) => onColorChange(e.target.value)}
        style={configFieldStyles.colorInput}
      />
      <input
        type="text"
        value={textInputValue}
        onChange={(e) => onTextChange(e.target.value)}
        style={configFieldStyles.textMono}
      />
    </div>
  );
}

/** Muybridge-style: small square opens native color picker; hex text alongside. */
export function ConfigSwatchHexRow({
  label = "Color",
  labelWidth = "50px",
  backgroundColor,
  textValue,
  onHexChange,
}: {
  label?: string;
  labelWidth?: LabelW;
  backgroundColor: string;
  textValue: string;
  onHexChange: (hex: string) => void;
}) {
  const labelStyle =
    labelWidth === "50px" ? configFieldStyles.labelWide : configFieldStyles.labelNarrow;

  const openPicker = () => {
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = backgroundColor || "#666666";
    colorInput.onchange = (e) => {
      onHexChange((e.target as HTMLInputElement).value);
    };
    colorInput.click();
  };

  return (
    <div style={configFieldStyles.row}>
      <span style={labelStyle}>{label}</span>
      <div
        style={{
          width: "20px",
          height: "20px",
          backgroundColor,
          border: borderSubtle,
          borderRadius: "4px",
          cursor: "pointer",
        }}
        onClick={openPicker}
      />
      <input
        type="text"
        value={textValue}
        onChange={(e) => onHexChange(e.target.value)}
        style={configFieldStyles.textMono}
      />
    </div>
  );
}

export function ConfigOptionsRow({ children }: { children: ReactNode }) {
  return <div style={configFieldStyles.optionsRow}>{children}</div>;
}

export function ConfigCheckboxInline({
  checked,
  onChange,
  children,
  size = "sm",
  gap = "4px",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  size?: "sm" | "md";
  gap?: "4px" | "8px";
}) {
  return (
    <label style={{ ...configFieldStyles.inlineCheckLabel, gap }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={size === "md" ? configFieldStyles.checkbox16 : configFieldStyles.checkbox12}
      />
      <span style={configFieldStyles.caption}>{children}</span>
    </label>
  );
}

export function ConfigJointCheckboxGrid({
  options = EFFECT_CONFIG_JOINT_OPTIONS,
  selectedKeys,
  onToggleKey,
}: {
  options?: readonly { key: string; label: string }[];
  selectedKeys: string[];
  onToggleKey: (key: string, checked: boolean) => void;
}) {
  return (
    <div style={configFieldStyles.jointGrid}>
      {options.map((joint) => (
        <label key={joint.key} style={configFieldStyles.inlineCheckLabel}>
          <input
            type="checkbox"
            checked={selectedKeys.includes(joint.key)}
            onChange={(e) => onToggleKey(joint.key, e.target.checked)}
            style={configFieldStyles.checkbox12}
          />
          <span style={configFieldStyles.caption}>{joint.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Compact multi-select with Radix popover (shared by motion/stats effect rails). */
function QuickSelectBar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 border-b border-border-theme px-2 py-1.5">
      {children}
    </div>
  );
}

function QuickSelectButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="text-[10px] font-light text-[color:var(--foreground)] underline underline-offset-2 hover:opacity-90"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function ConfigMultiSelect({
  options,
  selectedKeys,
  onChange,
  placeholder = "Select…",
  showSelectAllNone = false,
  showSideQuickSelect = false,
}: {
  options: readonly { key: string; label: string }[];
  selectedKeys: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  showSelectAllNone?: boolean;
  /** Adds Left / Right quick-select when options include L/R pairs. */
  showSideQuickSelect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const popoverLayers = useExportPanelPopoverLayers("max-h-[min(260px,55vh)] overflow-y-auto p-0");
  const selectedSet = new Set(selectedKeys);
  const sideQuickSelect = showSideQuickSelect && hasSideSpecificOptions(options);
  const leftKeys = sideQuickSelect ? optionKeysForSide(options, "left") : [];
  const rightKeys = sideQuickSelect ? optionKeysForSide(options, "right") : [];
  const summary =
    selectedKeys.length === 0
      ? placeholder
      : selectedKeys.length <= 2
        ? selectedKeys
            .map((k) => options.find((o) => o.key === k)?.label ?? k)
            .join(", ")
        : `${selectedKeys.length} selected`;

  return (
    <Popover.Root modal={popoverLayers.modal} open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className={exportPanelSelectTriggerClass}>
          <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
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
          {showSelectAllNone || sideQuickSelect ? (
            <QuickSelectBar>
              {showSelectAllNone ? (
                <>
                  <QuickSelectButton label="All" onClick={() => onChange(options.map((o) => o.key))} />
                  <QuickSelectButton label="None" onClick={() => onChange([])} />
                </>
              ) : null}
              {sideQuickSelect ? (
                <>
                  <QuickSelectButton
                    label="Left"
                    onClick={() => onChange(mergeSelectedWithSideKeys(selectedKeys, leftKeys))}
                  />
                  <QuickSelectButton
                    label="Right"
                    onClick={() => onChange(mergeSelectedWithSideKeys(selectedKeys, rightKeys))}
                  />
                </>
              ) : null}
            </QuickSelectBar>
          ) : null}
          {options.map((opt) => {
            const checked = selectedSet.has(opt.key);
            return (
              <label
                key={opt.key}
                className="flex cursor-pointer items-center gap-2 border-b border-border-theme px-2 py-1.5 text-[11px] text-[color:var(--foreground)] transition-colors last:border-b-0 hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedKeys, opt.key]
                      : selectedKeys.filter((k) => k !== opt.key);
                    onChange(next);
                  }}
                  style={configFieldStyles.checkbox12}
                />
                <span className="text-[11px] text-[color:var(--foreground)]">{opt.label}</span>
              </label>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
