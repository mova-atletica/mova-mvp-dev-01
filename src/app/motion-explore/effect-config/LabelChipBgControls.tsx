"use client";

import type { LabelChipBg } from "../../../lib/canvasGlassChip";
import {
  ConfigSection,
  ConfigSliderRow,
  configFieldStyles,
} from "./fields";

const BG_SWATCHES = ["#ffffff", "#000000", "#0f172a", "#38bdf8", "#f97316"] as const;

export function LabelChipBgControls({
  config,
  updateConfig,
}: {
  config: Record<string, unknown>;
  updateConfig: (patch: Record<string, unknown>) => void;
}) {
  const bg = ((config.labelBg as LabelChipBg) || "glass") as LabelChipBg;
  const bgColor = (config.labelBgColor as string) || (bg === "glass" ? "#ffffff" : "#000000");
  const bgOpacity =
    typeof config.labelBgOpacity === "number"
      ? config.labelBgOpacity
      : bg === "glass"
        ? 0.22
        : 0.8;
  const blurPx = typeof config.labelBlurPx === "number" ? config.labelBlurPx : 14;

  return (
    <ConfigSection title="Label background">
      <div
        className="mb-2 flex overflow-hidden rounded-lg"
        style={{ border: "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 50%)" }}
      >
        {(
          [
            ["none", "None"],
            ["solid", "Solid"],
            ["glass", "Glass"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              const next: Record<string, unknown> = { labelBg: mode };
              if (mode === "solid" && bg === "glass") {
                next.labelBgColor = "#000000";
                next.labelBgOpacity = 0.62;
              }
              if (mode === "glass" && bg !== "glass") {
                next.labelBgColor = "#ffffff";
                next.labelBgOpacity = 0.22;
                next.labelBlurPx = 14;
              }
              updateConfig(next);
            }}
            className="flex-1 px-2 py-1.5 text-[11px]"
            style={{
              backgroundColor:
                bg === mode
                  ? "color-mix(in srgb, var(--accent, #3b82f6) 22%, transparent)"
                  : "transparent",
              color: bg === mode ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: bg === mode ? 600 : 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {bg !== "none" ? (
        <>
          <p style={{ ...configFieldStyles.sectionLabel, marginBottom: "6px" }}>Tint</p>
          <div style={{ ...configFieldStyles.row, marginBottom: "8px", flexWrap: "wrap" as const, gap: "6px" }}>
            {BG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => updateConfig({ labelBgColor: c })}
                className="h-6 w-6 rounded-full"
                style={{
                  backgroundColor: c,
                  border:
                    bgColor.slice(0, 7).toLowerCase() === c
                      ? "2px solid var(--accent, #3b82f6)"
                      : "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 50%)",
                }}
              />
            ))}
            <input
              type="color"
              value={bgColor.startsWith("#") ? bgColor.slice(0, 7) : "#ffffff"}
              onChange={(e) => updateConfig({ labelBgColor: e.target.value })}
              style={configFieldStyles.colorInput}
            />
          </div>
          <ConfigSliderRow
            label="Opacity"
            min={0}
            max={1}
            step={0.01}
            value={bgOpacity}
            onChange={(n) => updateConfig({ labelBgOpacity: n })}
            displayValue={`${Math.round(bgOpacity * 100)}%`}
            valueSuffixWidth="30px"
            marginBottom="6px"
          />
          {bg === "glass" ? (
            <ConfigSliderRow
              label="Blur"
              min={0}
              max={28}
              step={1}
              value={blurPx}
              onChange={(n) => updateConfig({ labelBlurPx: Math.round(n) })}
              displayValue={`${blurPx}px`}
              valueSuffixWidth="30px"
            />
          ) : null}
        </>
      ) : null}
    </ConfigSection>
  );
}
