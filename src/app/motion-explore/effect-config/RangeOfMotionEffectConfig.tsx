"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigColorHexRow,
  ConfigJointCheckboxGrid,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
} from "./fields";

export function RangeOfMotionEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const romJoints = (config.romJoints as string[]) || [];
  const romColor = (config.romColor as string) || "#00ff00";

  return (
    <ConfigRoot>
      <ConfigSection title="Joint Selection">
        <ConfigJointCheckboxGrid
          selectedKeys={romJoints}
          onToggleKey={(key, checked) => {
            const next = checked
              ? [...romJoints, key]
              : romJoints.filter((j) => j !== key);
            updateConfig({ romJoints: next });
          }}
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
    </ConfigRoot>
  );
}
