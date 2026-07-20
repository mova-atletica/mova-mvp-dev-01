"use client";

import { useEffect, useState } from "react";
import {
  ConfigColorHexRow,
  ConfigRoot,
  ConfigSection,
  ConfigSliderRow,
  configFieldStyles,
} from "./fields";
import type { EffectConfigFormProps } from "./types";
import { MOBILITY_ARC_JOINT_OPTIONS, MOBILITY_AXIS_POINT_OPTIONS } from "./jointOptions";
import { useOptionalAssetVideoEngine } from "../assetVideoEngineContext";
import {
  MOBILITY_LINE_LENGTH_MIN,
  mobilityGeometryLineLengthMax,
} from "../../../lib/mobilityGeometryLength";
import {
  resolveMobilityGeometryItems,
  type MobilityGeometryArc,
  type MobilityGeometryAxis,
  type MobilityGeometryCapStyle,
  type MobilityGeometryLineStyle,
} from "../../../lib/effects/stats";

const CAP_OPTIONS: Array<{ value: MobilityGeometryCapStyle; label: string }> = [
  { value: "none", label: "None" },
  { value: "tick", label: "Tick" },
  { value: "dot", label: "Dot" },
  { value: "bracket", label: "Bracket" },
];

const LINE_STYLE_OPTIONS: Array<{ value: MobilityGeometryLineStyle; label: string }> = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

const DEFAULTS = {
  color: "#ffffff",
  lineWidth: 1,
  lineLength: 220,
  lineStyle: "solid" as MobilityGeometryLineStyle,
  capStyle: "tick" as MobilityGeometryCapStyle,
  opacity: 0.9,
  arcRadius: 40,
};

const addBtnStyle = {
  padding: "6px 10px",
  fontSize: "10px",
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 40%)",
  background: "color-mix(in srgb, var(--foreground) 8%, transparent)",
  color: "var(--foreground)",
  cursor: "pointer",
} as const;

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function labelForTarget(target: string): string {
  return MOBILITY_AXIS_POINT_OPTIONS.find((o) => o.key === target)?.label ?? target;
}

function labelForJoint(joint: string): string {
  return MOBILITY_ARC_JOINT_OPTIONS.find((o) => o.key === joint)?.label ?? joint;
}

function NativeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <div style={configFieldStyles.row}>
      {label ? <span style={configFieldStyles.labelNarrow}>{label}</span> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={configFieldStyles.select}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MobilityGeometryEffectConfig({ config, updateConfig }: EffectConfigFormProps) {
  const engine = useOptionalAssetVideoEngine();
  const [videoSize, setVideoSize] = useState<{ width: number; height: number } | null>(null);
  const [addTarget, setAddTarget] = useState("body_center");
  const [addOrient, setAddOrient] = useState<"vertical" | "horizontal">("vertical");
  const [addArcJoint, setAddArcJoint] = useState("left_hip");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const video = engine?.videoRef?.current;
    if (!video) {
      setVideoSize(null);
      return;
    }

    const sync = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoSize({ width: video.videoWidth, height: video.videoHeight });
      }
    };

    sync();
    video.addEventListener("loadedmetadata", sync);
    return () => video.removeEventListener("loadedmetadata", sync);
  }, [engine?.videoRef, engine?.videoUrl]);

  const lengthMax = mobilityGeometryLineLengthMax(videoSize?.width, videoSize?.height);
  const { axes, arcs } = resolveMobilityGeometryItems(config);

  const commit = (nextAxes: MobilityGeometryAxis[], nextArcs: MobilityGeometryArc[]) => {
    updateConfig({
      mobilityGeometryAxes: nextAxes,
      mobilityGeometryArcs: nextArcs,
      mobilityGeometryVerticalTargets: undefined,
      mobilityGeometryHorizontalTargets: undefined,
      mobilityGeometryAngleJoints: undefined,
    });
  };

  const updateAxis = (id: string, patch: Partial<MobilityGeometryAxis>) => {
    commit(
      axes.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      arcs
    );
  };

  const updateArc = (id: string, patch: Partial<MobilityGeometryArc>) => {
    commit(
      axes,
      arcs.map((a) => (a.id === id ? { ...a, ...patch } : a))
    );
  };

  return (
    <ConfigRoot>
      <ConfigSection title="Axes">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <NativeSelect
            label="Point"
            value={addTarget}
            options={MOBILITY_AXIS_POINT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            onChange={setAddTarget}
          />
          <NativeSelect
            label="Orient"
            value={addOrient}
            options={[
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
            ]}
            onChange={(v) => setAddOrient(v as "vertical" | "horizontal")}
          />
          <button
            type="button"
            style={addBtnStyle}
            onClick={() => {
              if (axes.some((a) => a.target === addTarget && a.orient === addOrient)) return;
              const id = newId("max");
              commit(
                [
                  ...axes,
                  {
                    id,
                    target: addTarget,
                    orient: addOrient,
                    color: DEFAULTS.color,
                    lineWidth: DEFAULTS.lineWidth,
                    lineLength: DEFAULTS.lineLength,
                    lineStyle: DEFAULTS.lineStyle,
                    capStyle: DEFAULTS.capStyle,
                    opacity: DEFAULTS.opacity,
                  },
                ],
                arcs
              );
              setExpandedId(id);
            }}
          >
            Add axis
          </button>

          {axes.map((axis) => {
            const open = expandedId === axis.id;
            const length = Math.min(
              Math.max(MOBILITY_LINE_LENGTH_MIN, axis.lineLength ?? DEFAULTS.lineLength),
              lengthMax
            );
            return (
              <div
                key={axis.id}
                style={{
                  border: "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 40%)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : axis.id)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {axis.orient === "vertical" ? "V" : "H"}: {labelForTarget(axis.target)}
                  </button>
                  <button
                    type="button"
                    onClick={() => commit(
                      axes.filter((a) => a.id !== axis.id),
                      arcs
                    )}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f87171",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
                {open ? (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <NativeSelect
                      label="Style"
                      value={axis.lineStyle ?? DEFAULTS.lineStyle}
                      options={LINE_STYLE_OPTIONS}
                      onChange={(v) =>
                        updateAxis(axis.id, { lineStyle: v as MobilityGeometryLineStyle })
                      }
                    />
                    <NativeSelect
                      label="Caps"
                      value={axis.capStyle ?? DEFAULTS.capStyle}
                      options={CAP_OPTIONS}
                      onChange={(v) =>
                        updateAxis(axis.id, { capStyle: v as MobilityGeometryCapStyle })
                      }
                    />
                    <ConfigColorHexRow
                      label="Color"
                      labelWidth="50px"
                      colorInputValue={axis.color || DEFAULTS.color}
                      textInputValue={axis.color || DEFAULTS.color}
                      onColorChange={(hex) => updateAxis(axis.id, { color: hex })}
                      onTextChange={(hex) => updateAxis(axis.id, { color: hex })}
                    />
                    <ConfigSliderRow
                      label="Width"
                      labelWidth="50px"
                      min={1}
                      max={10}
                      step={1}
                      value={axis.lineWidth ?? DEFAULTS.lineWidth}
                      displayValue={`${axis.lineWidth ?? DEFAULTS.lineWidth}px`}
                      valueSuffixWidth="30px"
                      onChange={(next) => updateAxis(axis.id, { lineWidth: next })}
                    />
                    <ConfigSliderRow
                      label="Length"
                      labelWidth="50px"
                      min={MOBILITY_LINE_LENGTH_MIN}
                      max={lengthMax}
                      step={10}
                      value={length}
                      displayValue={`${length}px`}
                      valueSuffixWidth="30px"
                      onChange={(next) =>
                        updateAxis(axis.id, {
                          lineLength: Math.min(
                            Math.max(MOBILITY_LINE_LENGTH_MIN, Math.round(next)),
                            lengthMax
                          ),
                        })
                      }
                    />
                    <ConfigSliderRow
                      label="Opacity"
                      labelWidth="50px"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={axis.opacity ?? DEFAULTS.opacity}
                      displayValue={`${Math.round((axis.opacity ?? DEFAULTS.opacity) * 100)}%`}
                      valueSuffixWidth="30px"
                      onChange={(next) => updateAxis(axis.id, { opacity: next })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ConfigSection>

      <ConfigSection title="Angle arcs">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <NativeSelect
            label="Joint"
            value={addArcJoint}
            options={MOBILITY_ARC_JOINT_OPTIONS.map((o) => ({
              value: o.key,
              label: o.label,
            }))}
            onChange={setAddArcJoint}
          />
          <button
            type="button"
            style={addBtnStyle}
            onClick={() => {
              if (arcs.some((a) => a.joint === addArcJoint)) return;
              const id = newId("marc");
                commit(axes, [
                  ...arcs,
                  {
                    id,
                    joint: addArcJoint,
                    color: DEFAULTS.color,
                    lineWidth: DEFAULTS.lineWidth,
                    lineStyle: DEFAULTS.lineStyle,
                    arcRadius: DEFAULTS.arcRadius,
                    opacity: DEFAULTS.opacity,
                  },
                ]);
                setExpandedId(id);
              }}
            >
              Add arc
            </button>

          {arcs.map((arc) => {
            const open = expandedId === arc.id;
            return (
              <div
                key={arc.id}
                style={{
                  border: "1px solid color-mix(in srgb, var(--border) 100%, var(--foreground) 40%)",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : arc.id)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {labelForJoint(arc.joint)}
                  </button>
                  <button
                    type="button"
                    onClick={() => commit(
                      axes,
                      arcs.filter((a) => a.id !== arc.id)
                    )}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#f87171",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
                {open ? (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    <NativeSelect
                      label="Style"
                      value={arc.lineStyle ?? DEFAULTS.lineStyle}
                      options={LINE_STYLE_OPTIONS}
                      onChange={(v) =>
                        updateArc(arc.id, { lineStyle: v as MobilityGeometryLineStyle })
                      }
                    />
                    <ConfigColorHexRow
                      label="Color"
                      labelWidth="50px"
                      colorInputValue={arc.color || DEFAULTS.color}
                      textInputValue={arc.color || DEFAULTS.color}
                      onColorChange={(hex) => updateArc(arc.id, { color: hex })}
                      onTextChange={(hex) => updateArc(arc.id, { color: hex })}
                    />
                    <ConfigSliderRow
                      label="Width"
                      labelWidth="50px"
                      min={1}
                      max={10}
                      step={1}
                      value={arc.lineWidth ?? DEFAULTS.lineWidth}
                      displayValue={`${arc.lineWidth ?? DEFAULTS.lineWidth}px`}
                      valueSuffixWidth="30px"
                      onChange={(next) => updateArc(arc.id, { lineWidth: next })}
                    />
                    <ConfigSliderRow
                      label="Arc R"
                      labelWidth="50px"
                      min={12}
                      max={140}
                      step={2}
                      value={arc.arcRadius ?? DEFAULTS.arcRadius}
                      displayValue={`${arc.arcRadius ?? DEFAULTS.arcRadius}px`}
                      valueSuffixWidth="30px"
                      onChange={(next) => updateArc(arc.id, { arcRadius: next })}
                    />
                    <ConfigSliderRow
                      label="Opacity"
                      labelWidth="50px"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={arc.opacity ?? DEFAULTS.opacity}
                      displayValue={`${Math.round((arc.opacity ?? DEFAULTS.opacity) * 100)}%`}
                      valueSuffixWidth="30px"
                      onChange={(next) => updateArc(arc.id, { opacity: next })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </ConfigSection>
    </ConfigRoot>
  );
}
