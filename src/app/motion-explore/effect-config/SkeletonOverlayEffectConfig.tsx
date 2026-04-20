"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigCheckboxInline,
  ConfigColorHexRow,
  ConfigOptionsRow,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
} from "./fields";

export function SkeletonOverlayEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const boneColor = (config.boneColor as string) || "#00ff00";
  const jointColor = (config.jointColor as string) || "#00ff00";

  return (
    <ConfigRoot>
      <ConfigSection title="Bone Settings">
        <ConfigColorHexRow
          colorInputValue={boneColor}
          textInputValue={boneColor}
          onColorChange={(hex) => updateConfig({ boneColor: hex })}
          onTextChange={(hex) => updateConfig({ boneColor: hex })}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Weight"
          min={1}
          max={8}
          step={1}
          value={(config.boneWeight as number) || 2}
          onChange={(n) => updateConfig({ boneWeight: Math.round(n) })}
          displayValue={`${(config.boneWeight as number) || 2}px`}
        />
      </ConfigSection>

      <ConfigSection title="Joint Settings">
        <ConfigColorHexRow
          colorInputValue={jointColor}
          textInputValue={jointColor}
          onColorChange={(hex) => updateConfig({ jointColor: hex })}
          onTextChange={(hex) => updateConfig({ jointColor: hex })}
          marginBottom="6px"
        />
        <ConfigSliderRow
          label="Size"
          min={2}
          max={16}
          step={1}
          value={(config.jointSize as number) || 4}
          onChange={(n) => updateConfig({ jointSize: Math.round(n) })}
          displayValue={`${(config.jointSize as number) || 4}px`}
        />
      </ConfigSection>

      <ConfigSection title="Options">
        <ConfigOptionsRow>
          <ConfigCheckboxInline
            checked={config.showBones !== false}
            onChange={(checked) => updateConfig({ showBones: checked })}
          >
            Show bones
          </ConfigCheckboxInline>
          <ConfigCheckboxInline
            checked={config.showJoints !== false}
            onChange={(checked) => updateConfig({ showJoints: checked })}
          >
            Show joints
          </ConfigCheckboxInline>
        </ConfigOptionsRow>
      </ConfigSection>
    </ConfigRoot>
  );
}
