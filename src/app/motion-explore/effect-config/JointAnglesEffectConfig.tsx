"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigColorHexRow,
  ConfigMultiSelect,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
} from "./fields";
import { EFFECT_CONFIG_JOINT_OPTIONS } from "./jointOptions";
import { LabelChipBgControls } from "./LabelChipBgControls";

export function JointAnglesEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const enabledJoints = (config.enabledJoints as string[]) || [];
  const angleColor = (config.angleColor as string) || "#00ff00";

  return (
    <ConfigRoot>
      <ConfigSection title="Joint Selection">
        <ConfigMultiSelect
          options={EFFECT_CONFIG_JOINT_OPTIONS}
          selectedKeys={enabledJoints}
          onChange={(next) => updateConfig({ enabledJoints: next })}
          placeholder="No joints selected"
          showSideQuickSelect
        />
      </ConfigSection>

      <ConfigSection title="Appearance">
        <ConfigColorHexRow
          colorInputValue={angleColor}
          textInputValue={angleColor}
          onColorChange={(hex) => updateConfig({ angleColor: hex })}
          onTextChange={(hex) => updateConfig({ angleColor: hex })}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Size"
          min={8}
          max={32}
          step={1}
          value={(config.angleSize as number) || 18}
          onChange={(n) => updateConfig({ angleSize: Math.round(n) })}
          displayValue={`${(config.angleSize as number) || 18}px`}
        />
      </ConfigSection>

      <LabelChipBgControls config={config} updateConfig={updateConfig} />
    </ConfigRoot>
  );
}
