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

export function RangeOfMotionEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const romJoints = (config.romJoints as string[]) || [];
  const romColor = (config.romColor as string) || "#00ff00";

  return (
    <ConfigRoot>
      <ConfigSection title="Joint Selection">
        <ConfigMultiSelect
          options={EFFECT_CONFIG_JOINT_OPTIONS}
          selectedKeys={romJoints}
          onChange={(next) => updateConfig({ romJoints: next })}
          placeholder="No joints selected"
          showSideQuickSelect
        />
      </ConfigSection>

      <ConfigSection title="Appearance">
        <ConfigColorHexRow
          colorInputValue={romColor}
          textInputValue={romColor}
          onColorChange={(hex) => updateConfig({ romColor: hex })}
          onTextChange={(hex) => updateConfig({ romColor: hex })}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Size"
          min={8}
          max={32}
          step={1}
          value={(config.angleSize as number) || 16}
          onChange={(n) => updateConfig({ angleSize: Math.round(n) })}
          displayValue={`${(config.angleSize as number) || 16}px`}
        />
      </ConfigSection>

      <LabelChipBgControls config={config} updateConfig={updateConfig} />
    </ConfigRoot>
  );
}
