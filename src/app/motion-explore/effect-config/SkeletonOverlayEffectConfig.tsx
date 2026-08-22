"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigCheckboxInline,
  ConfigColorHexRow,
  ConfigMultiSelect,
  ConfigOptionsRow,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
} from "./fields";
import {
  SKELETON_BONE_OPTIONS,
  SKELETON_JOINT_OPTIONS,
  skeletonIndicesFromKeys,
  skeletonJointKeysFromIndices,
} from "./jointOptions";
import { TraceSelect } from "./TraceSelect";
import type { BoneLineStyle } from "../../../lib/effects/skeletonOverlay";
import { normalizeBoneLineStyle } from "../../../lib/effects/skeletonOverlay";

const BONE_LINE_STYLE_OPTIONS = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

export function SkeletonOverlayEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const boneColor = (config.boneColor as string) || "#00ff00";
  const jointColor = (config.jointColor as string) || "#00ff00";
  const boneLineStyle = normalizeBoneLineStyle(config.boneLineStyle);
  const selectedJoints = skeletonJointKeysFromIndices((config.selectedJoints as number[]) || []);
  const selectedBones = (config.selectedBones as string[]) || [];

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
        <div style={{ marginBottom: "6px" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--foreground)",
              display: "block",
              marginBottom: "4px",
            }}
          >
            Line style
          </span>
          <TraceSelect
            value={boneLineStyle}
            options={BONE_LINE_STYLE_OPTIONS}
            onSelect={(v) => updateConfig({ boneLineStyle: v as BoneLineStyle })}
          />
        </div>
      </ConfigSection>

      <ConfigSection title="Bones">
        <ConfigMultiSelect
          options={SKELETON_BONE_OPTIONS}
          selectedKeys={selectedBones}
          onChange={(next) => updateConfig({ selectedBones: next })}
          placeholder="No bones"
          showSelectAllNone
          showSideQuickSelect
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

      <ConfigSection title="Joints">
        <ConfigMultiSelect
          options={SKELETON_JOINT_OPTIONS}
          selectedKeys={selectedJoints}
          onChange={(next) => updateConfig({ selectedJoints: skeletonIndicesFromKeys(next) })}
          placeholder="No joints"
          showSelectAllNone
          showSideQuickSelect
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
