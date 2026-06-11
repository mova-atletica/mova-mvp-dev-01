"use client";

import type { EffectConfigFormProps } from "./types";
import { ConfigRoot, ConfigSection, ConfigSliderRow, configFieldStyles } from "./fields";
import { EFFECT_CONFIG_JOINT_OPTIONS, type EffectConfigJointKey } from "./jointOptions";
import { TraceSelect } from "./TraceSelect";

export function JointAngleTraceEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const chartJointA = ((config.jointAngleChartJointA as string) || "left_knee") as EffectConfigJointKey;
  const chartJointB = ((config.jointAngleChartJointB as string) || "right_knee") as EffectConfigJointKey;
  const chartColorA = (config.jointAngleChartColorA as string) || "#000000";
  const chartColorB = (config.jointAngleChartColorB as string) || "#ffffff";
  const secondSeries = config.jointAngleChartSecondSeries !== false;
  const lineStyleA = (config.jointAngleChartLineStyleA as "solid" | "dashed") || "solid";
  const lineStyleB = (config.jointAngleChartLineStyleB as "solid" | "dashed") || "solid";
  const lineThickness =
    typeof config.jointAngleChartLineThickness === "number" ? config.jointAngleChartLineThickness : 2;
  const jointOptions = EFFECT_CONFIG_JOINT_OPTIONS.map((o) => ({ value: o.key, label: o.label }));
  const lineStyleOptions = [
    { value: "solid", label: "Solid" },
    { value: "dashed", label: "Dashed" },
  ];

  const pickOtherJoint = (avoid: string): EffectConfigJointKey => {
    const opt = EFFECT_CONFIG_JOINT_OPTIONS.find((o) => o.key !== avoid);
    return (opt ?? EFFECT_CONFIG_JOINT_OPTIONS[0]).key;
  };

  return (
    <ConfigRoot>
      <ConfigSection title="Joint Angle Trace">
        <label
          style={{
            ...configFieldStyles.inlineCheckLabel,
            marginBottom: "8px",
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <input
            type="checkbox"
            checked={secondSeries}
            onChange={(e) => updateConfig({ jointAngleChartSecondSeries: e.target.checked })}
            style={{ ...configFieldStyles.checkbox16, marginTop: "1px", flexShrink: 0 }}
          />
          <span style={configFieldStyles.caption}>Show a second joint</span>
        </label>

        <div style={{ marginBottom: "8px" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--foreground)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Series 1
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
            <div style={{ flex: "1 1 88px", minWidth: "72px" }}>
              <TraceSelect
                value={chartJointA}
                options={jointOptions}
                onSelect={(v) => {
                  const nextA = v as EffectConfigJointKey;
                  if (secondSeries && nextA === chartJointB) {
                    updateConfig({
                      jointAngleChartJointA: nextA,
                      jointAngleChartJointB: pickOtherJoint(nextA),
                    });
                  } else {
                    updateConfig({ jointAngleChartJointA: nextA });
                  }
                }}
              />
            </div>
            <input
              type="color"
              value={chartColorA}
              onChange={(e) => updateConfig({ jointAngleChartColorA: e.target.value })}
              style={configFieldStyles.colorInput}
              aria-label="Series 1 color"
            />
            <input
              type="text"
              value={chartColorA}
              onChange={(e) => updateConfig({ jointAngleChartColorA: e.target.value })}
              style={{ ...configFieldStyles.textMono, flex: "0 1 72px", width: "72px", minWidth: "56px" }}
              aria-label="Series 1 color hex"
            />
            <div style={{ flex: "0 0 76px", minWidth: "76px" }}>
              <TraceSelect
                value={lineStyleA}
                options={lineStyleOptions}
                onSelect={(v) => updateConfig({ jointAngleChartLineStyleA: v as "solid" | "dashed" })}
              />
            </div>
          </div>
        </div>

        {secondSeries ? (
          <div style={{ marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--foreground)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Series 2
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
              <div style={{ flex: "1 1 88px", minWidth: "72px" }}>
                <TraceSelect
                  value={chartJointB}
                  options={jointOptions}
                  onSelect={(v) => {
                    const nextB = v as EffectConfigJointKey;
                    if (nextB === chartJointA) {
                      updateConfig({
                        jointAngleChartJointB: nextB,
                        jointAngleChartJointA: pickOtherJoint(nextB),
                      });
                    } else {
                      updateConfig({ jointAngleChartJointB: nextB });
                    }
                  }}
                />
              </div>
              <input
                type="color"
                value={chartColorB}
                onChange={(e) => updateConfig({ jointAngleChartColorB: e.target.value })}
                style={configFieldStyles.colorInput}
                aria-label="Series 2 color"
              />
              <input
                type="text"
                value={chartColorB}
                onChange={(e) => updateConfig({ jointAngleChartColorB: e.target.value })}
                style={{ ...configFieldStyles.textMono, flex: "0 1 72px", width: "72px", minWidth: "56px" }}
                aria-label="Series 2 color hex"
              />
              <div style={{ flex: "0 0 76px", minWidth: "76px" }}>
                <TraceSelect
                  value={lineStyleB}
                  options={lineStyleOptions}
                  onSelect={(v) => updateConfig({ jointAngleChartLineStyleB: v as "solid" | "dashed" })}
                />
              </div>
            </div>
          </div>
        ) : null}

        <ConfigSliderRow
          label="Thick"
          labelWidth="50px"
          min={1}
          max={8}
          step={0.5}
          value={lineThickness}
          onChange={(n) => updateConfig({ jointAngleChartLineThickness: n })}
          displayValue={`${lineThickness}`}
          marginBottom="6px"
        />
      </ConfigSection>
    </ConfigRoot>
  );
}
