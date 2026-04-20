"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigCheckboxInline,
  ConfigColorHexRow,
  ConfigOptionsRow,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
  configFieldStyles,
} from "./fields";

export function MotionTrailsEffectConfig(props: EffectConfigFormProps) {
  const { config, updateConfig } = props;
  const trailOpacity = (config.trailOpacity as number) || 0.6;
  const showBones = config.showBones === true;
  const boneColor = (config.boneColor as string) || "#ffffff";
  const boneColorText = (config.boneColor as string) || "#ff0000";

  return (
    <ConfigRoot>
      <ConfigSection title="Trail Properties">
        <ConfigSliderRow
          label="Length"
          min={5}
          max={30}
          step={1}
          value={(config.trailLength as number) || 10}
          onChange={(n) => updateConfig({ trailLength: Math.round(n) })}
          displayValue={String((config.trailLength as number) || 10)}
          mutedValue
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Opacity"
          min={0}
          max={100}
          step={1}
          value={trailOpacity * 100}
          onChange={(n) => updateConfig({ trailOpacity: Math.round(n) / 100 })}
          displayValue={`${Math.round(trailOpacity * 100)}%`}
        />
      </ConfigSection>

      <ConfigSection title="Style">
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
          <select
            value={(config.trailStyle as string) || "simple"}
            onChange={(e) => updateConfig({ trailStyle: e.target.value })}
            style={configFieldStyles.select}
          >
            <option value="simple">Simple</option>
            <option value="gradient">Gradient</option>
          </select>
          <input
            type="color"
            value={(config.color as string) || "#ffffff"}
            onChange={(e) => updateConfig({ color: e.target.value })}
            style={configFieldStyles.colorInput}
          />
        </div>
        <ConfigSliderRow
          label="Thickness"
          min={1}
          max={8}
          step={1}
          value={(config.thickness as number) || 2}
          onChange={(n) => updateConfig({ thickness: Math.round(n) })}
          displayValue={`${(config.thickness as number) || 2}px`}
        />
      </ConfigSection>

      <ConfigSection title="Options">
        <ConfigOptionsRow>
          <ConfigCheckboxInline
            checked={config.fadeOut !== false}
            onChange={(checked) => updateConfig({ fadeOut: checked })}
          >
            Fade out
          </ConfigCheckboxInline>
          <ConfigCheckboxInline
            checked={showBones}
            onChange={(checked) => updateConfig({ showBones: checked })}
          >
            Show bones
          </ConfigCheckboxInline>
        </ConfigOptionsRow>
      </ConfigSection>

      {showBones ? (
        <ConfigSection title="Bone Settings">
          <ConfigColorHexRow
            colorInputValue={boneColor}
            textInputValue={boneColorText}
            onColorChange={(hex) => updateConfig({ boneColor: hex })}
            onTextChange={(hex) => updateConfig({ boneColor: hex })}
          />
          <ConfigSliderRow
            label="Thickness"
            min={1}
            max={5}
            step={1}
            value={(config.boneThickness as number) || 1}
            onChange={(n) => updateConfig({ boneThickness: Math.round(n) })}
            displayValue={`${(config.boneThickness as number) || 1}px`}
          />
        </ConfigSection>
      ) : null}
    </ConfigRoot>
  );
}
