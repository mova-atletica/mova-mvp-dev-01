"use client";

import {
  ConfigCheckboxInline,
  ConfigColorHexRow,
  ConfigMultiSelect,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
  configFieldStyles,
} from "./fields";
import type { EffectConfigFormProps } from "./types";
import { MOBILITY_ARC_JOINT_OPTIONS, MOBILITY_AXIS_POINT_OPTIONS } from "./jointOptions";

const CAP_OPTIONS = [
  { key: "none", label: "None" },
  { key: "tick", label: "Tick" },
  { key: "dot", label: "Dot" },
  { key: "bracket", label: "Bracket" },
];

const LINE_STYLE_OPTIONS = [
  { key: "solid", label: "Solid" },
  { key: "dashed", label: "Dashed" },
  { key: "dotted", label: "Dotted" },
];

export function MobilityGeometryEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const color = (config.mobilityGeometryColor as string) || "#ffffff";
  const lineWidth = (config.mobilityGeometryLineWidth as number) ?? 1;
  const lineLength = (config.mobilityGeometryLineLength as number) || 220;
  const opacity = (config.mobilityGeometryOpacity as number) ?? 0.9;
  const verticalTargets = (config.mobilityGeometryVerticalTargets as string[]) || ["body_center"];
  const horizontalTargets = (config.mobilityGeometryHorizontalTargets as string[]) || ["hip_mid"];
  const angleJoints = (config.mobilityGeometryAngleJoints as string[]) || ["left_hip"];
  const capStyle = (config.mobilityGeometryCapStyle as string) || "tick";
  const lineStyle = (config.mobilityGeometryLineStyle as string) || "solid";
  const arcRadius = (config.mobilityGeometryArcRadius as number) ?? 40;

  return (
    <ConfigRoot>
      <ConfigSection title="Mobility Geometry">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <ConfigColorHexRow
            label="Line"
            labelWidth="50px"
            colorInputValue={color}
            textInputValue={color}
            onColorChange={(hex) => updateConfig({ mobilityGeometryColor: hex })}
            onTextChange={(hex) => updateConfig({ mobilityGeometryColor: hex })}
            marginBottom="6px"
          />
          <ConfigSliderRow
            label="Width"
            labelWidth="50px"
            min={1}
            max={10}
            step={1}
            value={lineWidth}
            displayValue={`${lineWidth}px`}
            valueSuffixWidth="30px"
            onChange={(next) => updateConfig({ mobilityGeometryLineWidth: next })}
          />
          <ConfigSliderRow
            label="Length"
            labelWidth="50px"
            min={80}
            max={900}
            step={10}
            value={lineLength}
            displayValue={`${lineLength}px`}
            valueSuffixWidth="30px"
            onChange={(next) => updateConfig({ mobilityGeometryLineLength: next })}
          />
          <ConfigSliderRow
            label="Opacity"
            labelWidth="50px"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            displayValue={`${Math.round(opacity * 100)}%`}
            valueSuffixWidth="30px"
            onChange={(next) => updateConfig({ mobilityGeometryOpacity: next })}
          />
          <ConfigSliderRow
            label="Arc R"
            labelWidth="50px"
            min={12}
            max={140}
            step={2}
            value={arcRadius}
            displayValue={`${arcRadius}px`}
            valueSuffixWidth="30px"
            onChange={(next) => updateConfig({ mobilityGeometryArcRadius: next })}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Line Style">
        <div style={configFieldStyles.jointGrid}>
          {LINE_STYLE_OPTIONS.map((option) => (
            <ConfigCheckboxInline
              key={option.key}
              checked={lineStyle === option.key}
              onChange={() => updateConfig({ mobilityGeometryLineStyle: option.key })}
            >
              {option.label}
            </ConfigCheckboxInline>
          ))}
        </div>
      </ConfigSection>

      <ConfigSection title="End Caps">
        <div style={configFieldStyles.jointGrid}>
          {CAP_OPTIONS.map((option) => (
            <ConfigCheckboxInline
              key={option.key}
              checked={capStyle === option.key}
              onChange={() => updateConfig({ mobilityGeometryCapStyle: option.key })}
            >
              {option.label}
            </ConfigCheckboxInline>
          ))}
        </div>
      </ConfigSection>

      <ConfigSection title="Vertical Axes">
        <ConfigMultiSelect
          options={MOBILITY_AXIS_POINT_OPTIONS}
          selectedKeys={verticalTargets}
          onChange={(next) => updateConfig({ mobilityGeometryVerticalTargets: next })}
          placeholder="None"
          showSideQuickSelect
        />
      </ConfigSection>

      <ConfigSection title="Horizontal Axes">
        <ConfigMultiSelect
          options={MOBILITY_AXIS_POINT_OPTIONS}
          selectedKeys={horizontalTargets}
          onChange={(next) => updateConfig({ mobilityGeometryHorizontalTargets: next })}
          placeholder="None"
          showSideQuickSelect
        />
      </ConfigSection>

      <ConfigSection title="Angle Arcs">
        <ConfigMultiSelect
          options={MOBILITY_ARC_JOINT_OPTIONS}
          selectedKeys={angleJoints}
          onChange={(next) => updateConfig({ mobilityGeometryAngleJoints: next })}
          placeholder="No arcs"
          showSideQuickSelect
        />
      </ConfigSection>
    </ConfigRoot>
  );
}
