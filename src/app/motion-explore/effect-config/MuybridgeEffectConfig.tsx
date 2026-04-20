"use client";

import type { EffectConfigFormProps } from "./types";
import {
  ConfigCheckboxInline,
  ConfigJointCheckboxGrid,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
  ConfigSwatchHexRow,
  configFieldStyles,
} from "./fields";

export function MuybridgeEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const borderColor = (config.borderColor as string) || "#666666";

  return (
    <ConfigRoot>
      <ConfigSection title="Grid Size">
        <div style={configFieldStyles.row}>
          <input
            type="number"
            min={2}
            max={6}
            step={1}
            value={(config.gridSize as number) || 3}
            onChange={(e) => {
              const gridSize = parseInt(e.target.value, 10);
              updateConfig({ gridSize, gridRows: gridSize, gridCols: gridSize });
            }}
            style={configFieldStyles.numberInputSm}
          />
          <span style={configFieldStyles.caption}>
            {(config.gridSize as number) || 3}x{(config.gridSize as number) || 3}
          </span>
        </div>
      </ConfigSection>

      <ConfigSection title="Frame Timing">
        <ConfigSliderRow
          label=""
          omitLabel
          min={0.1}
          max={2.0}
          step={0.1}
          value={(config.frameStagger as number) || 0.5}
          onChange={(n) => updateConfig({ frameStagger: n })}
          displayValue={`${(config.frameStagger as number) || 0.5}s`}
          valueSuffixWidth="30px"
        />
      </ConfigSection>

      <ConfigSection title="Styling">
        <div style={configFieldStyles.rowMb8}>
          <ConfigCheckboxInline
            checked={config.showBorders !== false}
            onChange={(checked) => updateConfig({ showBorders: checked })}
            size="md"
            gap="8px"
          >
            Borders
          </ConfigCheckboxInline>
        </div>
        <ConfigSliderRow
          label="Padding"
          labelWidth="50px"
          min={0}
          max={20}
          step={1}
          value={(config.padding as number) ?? 8}
          onChange={(n) => updateConfig({ padding: Math.round(n) })}
          displayValue={`${(config.padding as number) ?? 8}px`}
          valueSuffixWidth="30px"
          marginBottom="8px"
        />
        <ConfigSliderRow
          label="Border"
          labelWidth="50px"
          min={1}
          max={8}
          step={1}
          value={(config.borderWidth as number) || 2}
          onChange={(n) => updateConfig({ borderWidth: Math.round(n) })}
          displayValue={`${(config.borderWidth as number) || 2}px`}
          valueSuffixWidth="30px"
          marginBottom="8px"
        />
        <ConfigSwatchHexRow
          backgroundColor={borderColor}
          textValue={borderColor}
          onHexChange={(hex) => updateConfig({ borderColor: hex })}
        />
      </ConfigSection>
    </ConfigRoot>
  );
}
