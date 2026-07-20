"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { COACH_ANGLE_CHIP_JOINTS } from "../../../lib/coachStudio/angles";
import { COACH_PRIMARY_JOINTS, jointLabel } from "../../../lib/coachStudio/joints";
import type { CoachStudioEditor } from "../../../lib/coachStudio/useCoachStudioEditor";
import {
  COACH_CONNECTOR_MAX_COUNT,
  COACH_CONNECTOR_MAX_JOINTS,
  COACH_CONNECTOR_MIN_JOINTS,
  defaultCoachAngleChipStyle,
  defaultCoachConnectorStyle,
  defaultCoachMobilityGeometryStyle,
  emptyCoachMobilityGeometry,
  type CoachAngleChip,
  type CoachAngleChipJoint,
  type CoachCaptionBg,
  type CoachConnector,
  type CoachConnectorStroke,
  type CoachFocusHighlight,
  type CoachJointId,
  type CoachMobilityAngleJoint,
  type CoachMobilityArc,
  type CoachMobilityAxis,
  type CoachMobilityAxisTarget,
  type CoachMobilityCapStyle,
  type CoachMobilityGeometry,
  type CoachMobilityLineStyle,
  type CoachOverlayBundle,
} from "../../../types/coachSession";
import { useTranslations } from "../../../i18n/LocaleProvider";
import { CoachSelect } from "./CoachSelect";
import {
  MOBILITY_LINE_LENGTH_MIN,
  mobilityGeometryLineLengthMax,
} from "../../../lib/mobilityGeometryLength";

const primaryBtnStyle = {
  background: "var(--primary-button-bg)",
  color: "var(--primary-button-text)",
  border: "2px solid var(--primary-button-border)",
} as const;

const fieldStyle = {
  border: "1px solid var(--border-secondary)",
  backgroundColor: "var(--background)",
} as const;

const FOCUS_SWATCHES = ["#f472b6", "#38bdf8", "#f97316", "#facc15", "#34d399", "#ffffff"];
const LINE_SWATCHES = ["#38bdf8", "#f97316", "#facc15", "#34d399", "#f472b6", "#ffffff"];
const GEO_SWATCHES = ["#ffffff", "#38bdf8", "#facc15", "#f97316", "#34d399", "#f472b6"];
const TEXT_SWATCHES = ["#ffffff", "#f8fafc", "#facc15", "#38bdf8", "#fb7185", "#000000"];
const BG_SWATCHES = ["#ffffff", "#000000", "#0f172a", "#1e3a8a", "#14532d"];
const DEFAULT_FOCUS_COLOR = "#f472b6";
const DEFAULT_FOCUS_OPACITY = 0.45;
const DEFAULT_FOCUS_RADIUS = 40;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
      {children}
    </p>
  );
}

const jointOptions = COACH_PRIMARY_JOINTS.map((j) => ({
  value: j,
  label: jointLabel(j),
}));

/** Next joint for polyline growth — must differ from the tail or collapse strips it. */
function nextConnectorJoint(joints: CoachJointId[]): CoachJointId {
  const last = joints[joints.length - 1];
  const preferred = COACH_PRIMARY_JOINTS.find((j) => j !== last);
  return preferred ?? "left_ankle";
}

const AXIS_OPTIONS: Array<{ value: CoachMobilityAxisTarget; label: string }> = [
  { value: "body_center", label: "Body center" },
  { value: "shoulder_mid", label: "Shoulder mid" },
  { value: "hip_mid", label: "Hip mid" },
  ...COACH_PRIMARY_JOINTS.map((j) => ({ value: j as CoachMobilityAxisTarget, label: jointLabel(j) })),
];

const ANGLE_ARC_OPTIONS: Array<{ value: CoachMobilityAngleJoint; label: string }> =
  COACH_ANGLE_CHIP_JOINTS.map((j) => ({ value: j, label: jointLabel(j) }));

function axisLabel(target: CoachMobilityAxisTarget): string {
  return AXIS_OPTIONS.find((o) => o.value === target)?.label ?? String(target);
}

function InstanceShell({
  id,
  label,
  expandedId,
  onToggle,
  onDelete,
  hideDelete,
  children,
}: {
  id: string;
  label: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  onDelete?: () => void;
  hideDelete?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations();
  const open = expandedId === id;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div ref={rootRef} className="min-w-0 max-w-full overflow-hidden rounded-lg" style={fieldStyle}>
      <div className="flex min-w-0 items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-[11px] font-medium text-[color:var(--foreground)]"
        >
          {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </button>
        {!hideDelete && onDelete ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="shrink-0 text-red-500"
            aria-label={t("coachStudio.delete")}
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div
          className="min-w-0 space-y-2 border-t p-2"
          style={{ borderColor: "var(--border-secondary)" }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ColorRow({
  color,
  swatches,
  fallback,
  onChange,
}: {
  color: string;
  swatches: string[];
  fallback: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {swatches.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full"
          style={{
            backgroundColor: c,
            border:
              color.toLowerCase() === c
                ? "2px solid var(--accent, #3b82f6)"
                : "1px solid var(--border-secondary)",
          }}
        />
      ))}
      <input
        type="color"
        value={color.startsWith("#") ? color.slice(0, 7) : fallback}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-[color:var(--muted-foreground)]">
        <span>{label}</span>
        <span>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="h-1 w-full cursor-pointer accent-[var(--accent,#3b82f6)]"
      />
    </div>
  );
}

export function OverlayBundleEditor({
  editor,
  target,
  overlays,
}: {
  editor: CoachStudioEditor;
  target: { kind: "freeze" | "phase"; id: string };
  overlays: CoachOverlayBundle;
}) {
  const t = useTranslations();
  const connectorDefaults = defaultCoachConnectorStyle();
  const mobility = overlays.mobility ?? emptyCoachMobilityGeometry();
  const axes = mobility.axes ?? [];
  const arcs = mobility.arcs ?? [];
  const angleChips = overlays.angleChips ?? [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));
  const expand = (id: string) => setExpandedId(id);

  const [focusJoint, setFocusJoint] = useState<CoachJointId>("left_knee");
  const [conFrom, setConFrom] = useState<CoachJointId>("left_hip");
  const [conTo, setConTo] = useState<CoachJointId>("left_knee");
  const [angleJoint, setAngleJoint] = useState<CoachAngleChipJoint>("left_knee");
  const [axisTarget, setAxisTarget] = useState<CoachMobilityAxisTarget>("body_center");
  const [axisOrient, setAxisOrient] = useState<"vertical" | "horizontal">("vertical");
  const [arcJoint, setArcJoint] = useState<CoachMobilityAngleJoint>("left_knee");

  const canAddConnector = overlays.connectors.length < COACH_CONNECTOR_MAX_COUNT && conFrom !== conTo;
  const geoDefaults = defaultCoachMobilityGeometryStyle();
  const geoLengthMax = mobilityGeometryLineLengthMax(
    editor.session?.sourceWidth,
    editor.session?.sourceHeight
  );

  const patchMobility = (partial: Partial<CoachMobilityGeometry>) =>
    editor.updateMobilityGeometry(target, partial);

  const updateAxis = (id: string, patch: Partial<CoachMobilityAxis>) =>
    patchMobility({
      axes: axes.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });

  const updateArc = (id: string, patch: Partial<CoachMobilityArc>) =>
    patchMobility({
      arcs: arcs.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {/* Focus */}
      <div className="min-w-0 space-y-2">
        <SectionTitle>{t("coachStudio.focusBodyPart")}</SectionTitle>
        <div className="flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <CoachSelect
              value={focusJoint}
              options={jointOptions}
              onSelect={(v) => setFocusJoint(v as CoachJointId)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const id = editor.addFocusJoint(target, focusJoint);
              if (id) expand(`foc-${id}`);
            }}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium"
            style={primaryBtnStyle}
          >
            <Plus size={12} /> {t("coachStudio.add")}
          </button>
        </div>
        {overlays.focusJoints.map((f) => (
          <InstanceShell
            key={f.id}
            id={`foc-${f.id}`}
            label={jointLabel(f.joint)}
            expandedId={expandedId}
            onToggle={toggle}
            onDelete={() => editor.removeFocusJoint(target, f.id)}
          >
            <FocusStyle focus={f} editor={editor} target={target} />
          </InstanceShell>
        ))}
      </div>

      {/* Connectors */}
      <div
        className="min-w-0 space-y-2 border-t pt-3"
        style={{ borderColor: "var(--border-secondary)" }}
      >
        <SectionTitle>{t("coachStudio.connectors")}</SectionTitle>
        <p className="text-[11px] text-[color:var(--muted-foreground)]">
          {overlays.connectors.length >= COACH_CONNECTOR_MAX_COUNT
            ? t("coachStudio.connectorMaxCount")
            : t("coachStudio.connectorHint")}
        </p>
        <div className="grid min-w-0 grid-cols-2 gap-1.5">
          <CoachSelect value={conFrom} options={jointOptions} onSelect={(v) => setConFrom(v as CoachJointId)} />
          <CoachSelect value={conTo} options={jointOptions} onSelect={(v) => setConTo(v as CoachJointId)} />
        </div>
        <button
          type="button"
          disabled={!canAddConnector}
          onClick={() => {
            const id = editor.addConnector(target, [conFrom, conTo]);
            if (id) expand(`con-${id}`);
          }}
          className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium disabled:opacity-50"
          style={primaryBtnStyle}
        >
          <Plus size={12} /> {t("coachStudio.add")}
        </button>
        {overlays.connectors.map((c) => (
          <InstanceShell
            key={c.id}
            id={`con-${c.id}`}
            label={c.joints.map((j) => jointLabel(j)).join(" → ")}
            expandedId={expandedId}
            onToggle={toggle}
            onDelete={() => editor.removeConnector(target, c.id)}
          >
            <ConnectorStyle connector={c} editor={editor} target={target} />
          </InstanceShell>
        ))}
      </div>

      {/* Angle chips */}
      <div
        className="min-w-0 space-y-2 border-t pt-3"
        style={{ borderColor: "var(--border-secondary)" }}
      >
        <SectionTitle>{t("coachStudio.angleChips")}</SectionTitle>
        <p className="text-[11px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.angleChipsHint")}
        </p>
        <div className="flex min-w-0 gap-2">
          <div className="min-w-0 flex-1">
            <CoachSelect
              value={angleJoint}
              options={COACH_ANGLE_CHIP_JOINTS.map((j) => ({ value: j, label: jointLabel(j) }))}
              onSelect={(v) => setAngleJoint(v as CoachAngleChipJoint)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const id = editor.addAngleChip(target, angleJoint);
              if (id) expand(`ang-${id}`);
            }}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium"
            style={primaryBtnStyle}
          >
            <Plus size={12} /> {t("coachStudio.add")}
          </button>
        </div>
        {angleChips.map((chip) => (
          <InstanceShell
            key={chip.id}
            id={`ang-${chip.id}`}
            label={jointLabel(chip.joint)}
            expandedId={expandedId}
            onToggle={toggle}
            onDelete={() => editor.removeAngleChip(target, chip.id)}
          >
            <AngleChipStyle chip={chip} editor={editor} target={target} />
          </InstanceShell>
        ))}
      </div>

      {/* Mobility geometry */}
      <div
        className="min-w-0 space-y-2 border-t pt-3"
        style={{ borderColor: "var(--border-secondary)" }}
      >
        <SectionTitle>{t("coachStudio.mobilityGeometry")}</SectionTitle>
        <p className="text-[11px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.mobilityGeometryHint")}
        </p>

        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <CoachSelect
              value={axisTarget}
              options={AXIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onSelect={(v) => setAxisTarget(v as CoachMobilityAxisTarget)}
            />
          </div>
          <div className="w-[6.5rem] shrink-0">
            <CoachSelect
              value={axisOrient}
              options={[
                { value: "vertical", label: t("coachStudio.mobilityVertical") },
                { value: "horizontal", label: t("coachStudio.mobilityHorizontal") },
              ]}
              onSelect={(v) => setAxisOrient(v as "vertical" | "horizontal")}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (axes.some((a) => a.target === axisTarget && a.orient === axisOrient)) return;
            const id = `max-${Math.random().toString(36).slice(2, 10)}`;
            const axis: CoachMobilityAxis = {
              id,
              target: axisTarget,
              orient: axisOrient,
              color: geoDefaults.color,
              lineWidth: geoDefaults.lineWidth,
              lineLength: geoDefaults.lineLength,
              lineStyle: geoDefaults.lineStyle,
              capStyle: geoDefaults.capStyle,
              opacity: geoDefaults.opacity,
            };
            patchMobility({ axes: [...axes, axis] });
            expand(`geo-${id}`);
          }}
          className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium"
          style={primaryBtnStyle}
        >
          <Plus size={12} /> {t("coachStudio.mobilityAddAxis")}
        </button>

        {axes.map((axis) => {
          const length = Math.min(
            Math.max(MOBILITY_LINE_LENGTH_MIN, axis.lineLength ?? geoDefaults.lineLength),
            geoLengthMax
          );
          return (
            <InstanceShell
              key={axis.id}
              id={`geo-${axis.id}`}
              label={`${axis.orient === "vertical" ? t("coachStudio.mobilityVertical") : t("coachStudio.mobilityHorizontal")}: ${axisLabel(axis.target)}`}
              expandedId={expandedId}
              onToggle={toggle}
              onDelete={() => patchMobility({ axes: axes.filter((a) => a.id !== axis.id) })}
            >
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <CoachSelect
                    value={axis.lineStyle ?? geoDefaults.lineStyle}
                    options={[
                      { value: "solid", label: t("coachStudio.connectorStrokeSolid") },
                      { value: "dashed", label: t("coachStudio.mobilityDashed") },
                      { value: "dotted", label: t("coachStudio.connectorStrokeDotted") },
                    ]}
                    onSelect={(v) => updateAxis(axis.id, { lineStyle: v as CoachMobilityLineStyle })}
                  />
                  <CoachSelect
                    value={axis.capStyle ?? geoDefaults.capStyle}
                    options={[
                      { value: "tick", label: t("coachStudio.mobilityCapTick") },
                      { value: "dot", label: t("coachStudio.mobilityCapDot") },
                      { value: "bracket", label: t("coachStudio.mobilityCapBracket") },
                      { value: "none", label: t("coachStudio.mobilityCapNone") },
                    ]}
                    onSelect={(v) => updateAxis(axis.id, { capStyle: v as CoachMobilityCapStyle })}
                  />
                </div>
                <ColorRow
                  color={axis.color || geoDefaults.color}
                  swatches={GEO_SWATCHES}
                  fallback="#ffffff"
                  onChange={(c) => updateAxis(axis.id, { color: c })}
                />
                <SliderRow
                  label={t("coachStudio.connectorThickness")}
                  value={axis.lineWidth ?? geoDefaults.lineWidth}
                  display={`${axis.lineWidth ?? geoDefaults.lineWidth}px`}
                  min={1}
                  max={8}
                  step={1}
                  onChange={(n) => updateAxis(axis.id, { lineWidth: n })}
                />
                <SliderRow
                  label={t("coachStudio.mobilityLineLength")}
                  value={length}
                  display={`${length}px`}
                  min={MOBILITY_LINE_LENGTH_MIN}
                  max={geoLengthMax}
                  step={10}
                  onChange={(n) =>
                    updateAxis(axis.id, {
                      lineLength: Math.min(
                        Math.max(MOBILITY_LINE_LENGTH_MIN, Math.round(n)),
                        geoLengthMax
                      ),
                    })
                  }
                />
                <SliderRow
                  label={t("coachStudio.focusIntensity")}
                  value={Math.round((axis.opacity ?? geoDefaults.opacity) * 100)}
                  display={`${Math.round((axis.opacity ?? geoDefaults.opacity) * 100)}%`}
                  min={20}
                  max={100}
                  step={5}
                  onChange={(n) => updateAxis(axis.id, { opacity: n / 100 })}
                />
              </div>
            </InstanceShell>
          );
        })}

        <div className="flex gap-2 pt-1">
          <div className="min-w-0 flex-1">
            <CoachSelect
              value={arcJoint}
              options={ANGLE_ARC_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onSelect={(v) => setArcJoint(v as CoachMobilityAngleJoint)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (arcs.some((a) => a.joint === arcJoint)) return;
              const id = `marc-${Math.random().toString(36).slice(2, 10)}`;
              const arc: CoachMobilityArc = {
                id,
                joint: arcJoint,
                color: geoDefaults.color,
                lineWidth: geoDefaults.lineWidth,
                lineStyle: geoDefaults.lineStyle,
                arcRadius: geoDefaults.arcRadius,
                opacity: geoDefaults.opacity,
              };
              patchMobility({ arcs: [...arcs, arc] });
              expand(`geo-${id}`);
            }}
            className="flex shrink-0 items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium"
            style={primaryBtnStyle}
          >
            <Plus size={12} /> {t("coachStudio.mobilityAddArc")}
          </button>
        </div>
        {arcs.map((arc) => (
          <InstanceShell
            key={arc.id}
            id={`geo-${arc.id}`}
            label={jointLabel(arc.joint)}
            expandedId={expandedId}
            onToggle={toggle}
            onDelete={() => patchMobility({ arcs: arcs.filter((a) => a.id !== arc.id) })}
          >
            <div className="space-y-2">
              <CoachSelect
                value={arc.lineStyle ?? geoDefaults.lineStyle}
                options={[
                  { value: "solid", label: t("coachStudio.connectorStrokeSolid") },
                  { value: "dashed", label: t("coachStudio.mobilityDashed") },
                  { value: "dotted", label: t("coachStudio.connectorStrokeDotted") },
                ]}
                onSelect={(v) => updateArc(arc.id, { lineStyle: v as CoachMobilityLineStyle })}
              />
              <ColorRow
                color={arc.color || geoDefaults.color}
                swatches={GEO_SWATCHES}
                fallback="#ffffff"
                onChange={(c) => updateArc(arc.id, { color: c })}
              />
              <SliderRow
                label={t("coachStudio.connectorThickness")}
                value={arc.lineWidth ?? geoDefaults.lineWidth}
                display={`${arc.lineWidth ?? geoDefaults.lineWidth}px`}
                min={1}
                max={8}
                step={1}
                onChange={(n) => updateArc(arc.id, { lineWidth: n })}
              />
              <SliderRow
                label={t("coachStudio.mobilityArcRadius")}
                value={arc.arcRadius ?? geoDefaults.arcRadius}
                display={`${arc.arcRadius ?? geoDefaults.arcRadius}px`}
                min={12}
                max={120}
                step={2}
                onChange={(n) => updateArc(arc.id, { arcRadius: n })}
              />
              <SliderRow
                label={t("coachStudio.focusIntensity")}
                value={Math.round((arc.opacity ?? geoDefaults.opacity) * 100)}
                display={`${Math.round((arc.opacity ?? geoDefaults.opacity) * 100)}%`}
                min={20}
                max={100}
                step={5}
                onChange={(n) => updateArc(arc.id, { opacity: n / 100 })}
              />
            </div>
          </InstanceShell>
        ))}
      </div>
    </div>
  );
}

function AngleChipStyle({
  chip,
  editor,
  target,
}: {
  chip: CoachAngleChip;
  editor: CoachStudioEditor;
  target: { kind: "freeze" | "phase"; id: string };
}) {
  const t = useTranslations();
  const style = { ...defaultCoachAngleChipStyle(), ...chip.style };
  const patchStyle = (partial: Partial<typeof style>) => {
    editor.updateAngleChip(target, chip.id, { style: partial });
  };

  return (
    <div className="min-w-0 space-y-2.5">
      <div>
        <p className="mb-1 text-[10px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.captionTextColor")}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TEXT_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => patchStyle({ textColor: c })}
              className="h-6 w-6 rounded-full"
              style={{
                backgroundColor: c,
                border:
                  style.textColor === c
                    ? "2px solid var(--accent, #3b82f6)"
                    : "1px solid var(--border-secondary)",
              }}
            />
          ))}
          <input
            type="color"
            value={style.textColor.startsWith("#") ? style.textColor.slice(0, 7) : "#ffffff"}
            onChange={(e) => patchStyle({ textColor: e.target.value })}
            className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </div>
      </div>

      <SliderRow
        label={t("coachStudio.captionTextSize")}
        value={Math.round(style.fontScale * 100)}
        display={`${Math.round(style.fontScale * 100)}%`}
        min={70}
        max={180}
        step={5}
        onChange={(n) => patchStyle({ fontScale: n / 100 })}
      />

      <div>
        <p className="mb-1 text-[10px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.captionBg")}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ["glass", "coachStudio.captionBgGlass"],
              ["solid", "coachStudio.captionBgSolid"],
              ["none", "coachStudio.captionBgNone"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              onClick={() => patchStyle({ bg: value as CoachCaptionBg })}
              className="rounded-lg py-1.5 text-[10px] font-medium"
              style={{
                border: "1px solid var(--border-secondary)",
                backgroundColor:
                  style.bg === value
                    ? "color-mix(in srgb, var(--accent, #3b82f6) 22%, transparent)"
                    : "transparent",
                color: style.bg === value ? "var(--foreground)" : "var(--muted-foreground)",
                fontWeight: style.bg === value ? 600 : 500,
              }}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
      </div>

      {style.bg !== "none" ? (
        <>
          <div>
            <p className="mb-1 text-[10px] text-[color:var(--muted-foreground)]">
              {t("coachStudio.captionBgTint")}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {BG_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => patchStyle({ bgColor: c })}
                  className="h-6 w-6 rounded-full"
                  style={{
                    backgroundColor: c,
                    border:
                      style.bgColor === c
                        ? "2px solid var(--accent, #3b82f6)"
                        : "1px solid var(--border-secondary)",
                  }}
                />
              ))}
              <input
                type="color"
                value={style.bgColor.startsWith("#") ? style.bgColor.slice(0, 7) : "#ffffff"}
                onChange={(e) => patchStyle({ bgColor: e.target.value })}
                className="h-6 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </div>
          </div>
          <SliderRow
            label={t("coachStudio.captionBgOpacity")}
            value={Math.round(style.bgOpacity * 100)}
            display={`${Math.round(style.bgOpacity * 100)}%`}
            min={10}
            max={90}
            step={5}
            onChange={(n) => patchStyle({ bgOpacity: n / 100 })}
          />
        </>
      ) : null}
    </div>
  );
}

function FocusStyle({
  focus,
  editor,
  target,
}: {
  focus: CoachFocusHighlight;
  editor: CoachStudioEditor;
  target: { kind: "freeze" | "phase"; id: string };
}) {
  const t = useTranslations();
  const color = focus.color || DEFAULT_FOCUS_COLOR;
  const opacity = focus.opacity ?? DEFAULT_FOCUS_OPACITY;
  const radius = focus.radius ?? DEFAULT_FOCUS_RADIUS;
  return (
    <div className="min-w-0 space-y-2">
      <ColorRow
        color={color}
        swatches={FOCUS_SWATCHES}
        fallback={DEFAULT_FOCUS_COLOR}
        onChange={(c) => editor.updateFocusJoint(target, focus.id, { color: c })}
      />
      <SliderRow
        label={t("coachStudio.focusIntensity")}
        value={Math.round(opacity * 100)}
        display={`${Math.round(opacity * 100)}%`}
        min={10}
        max={90}
        step={5}
        onChange={(n) => editor.updateFocusJoint(target, focus.id, { opacity: n / 100 })}
      />
      <SliderRow
        label={t("coachStudio.focusSize")}
        value={radius}
        display={`${radius}px`}
        min={16}
        max={90}
        step={2}
        onChange={(n) => editor.updateFocusJoint(target, focus.id, { radius: n })}
      />
    </div>
  );
}

function ConnectorStyle({
  connector,
  editor,
  target,
}: {
  connector: CoachConnector;
  editor: CoachStudioEditor;
  target: { kind: "freeze" | "phase"; id: string };
}) {
  const t = useTranslations();
  const defaults = defaultCoachConnectorStyle();
  const stroke = connector.stroke ?? defaults.stroke;
  const color = connector.color || defaults.color;
  const thickness = connector.thickness ?? defaults.thickness;
  const showJoints = connector.showJoints ?? defaults.showJoints;
  const jointColor = connector.jointColor || defaults.jointColor;
  const jointRadius = connector.jointRadius ?? defaults.jointRadius;
  const joints = [...connector.joints];

  const setJointAt = (index: number, joint: CoachJointId) => {
    const next = [...joints];
    next[index] = joint;
    editor.updateConnector(target, connector.id, { joints: next });
  };

  return (
    <div className="min-w-0 space-y-2">
      {joints.map((j, i) => (
        <div key={`${connector.id}-${i}`} className="min-w-0">
          <CoachSelect
            value={j}
            options={jointOptions}
            onSelect={(v) => setJointAt(i, v as CoachJointId)}
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={joints.length >= COACH_CONNECTOR_MAX_JOINTS}
          onClick={() =>
            editor.updateConnector(target, connector.id, {
              joints: [...joints, nextConnectorJoint(joints)],
            })
          }
          className="flex-1 rounded-lg py-1 text-[10px] disabled:opacity-40"
          style={{ border: "1px solid var(--border-secondary)" }}
        >
          {t("coachStudio.connectorAddJoint")}
        </button>
        <button
          type="button"
          disabled={joints.length <= COACH_CONNECTOR_MIN_JOINTS}
          onClick={() =>
            editor.updateConnector(target, connector.id, { joints: joints.slice(0, -1) })
          }
          className="flex-1 rounded-lg py-1 text-[10px] disabled:opacity-40"
          style={{ border: "1px solid var(--border-secondary)" }}
        >
          {t("coachStudio.connectorRemoveJoint")}
        </button>
      </div>
      <div className="min-w-0">
        <CoachSelect
          value={stroke}
          options={[
            { value: "solid", label: t("coachStudio.connectorStrokeSolid") },
            { value: "dotted", label: t("coachStudio.connectorStrokeDotted") },
          ]}
          onSelect={(v) =>
            editor.updateConnector(target, connector.id, { stroke: v as CoachConnectorStroke })
          }
        />
      </div>
      <ColorRow
        color={color}
        swatches={LINE_SWATCHES}
        fallback="#38bdf8"
        onChange={(c) => editor.updateConnector(target, connector.id, { color: c })}
      />
      <SliderRow
        label={t("coachStudio.connectorThickness")}
        value={thickness}
        display={`${thickness}px`}
        min={1}
        max={10}
        step={1}
        onChange={(n) => editor.updateConnector(target, connector.id, { thickness: n })}
      />
      <label className="flex items-center gap-2 text-[11px] text-[color:var(--foreground)]">
        <input
          type="checkbox"
          checked={showJoints}
          onChange={(e) =>
            editor.updateConnector(target, connector.id, { showJoints: e.target.checked })
          }
          className="h-3.5 w-3.5 accent-[var(--accent,#3b82f6)]"
        />
        {t("coachStudio.connectorShowJoints")}
      </label>
      {showJoints ? (
        <>
          <ColorRow
            color={jointColor}
            swatches={LINE_SWATCHES}
            fallback="#ffffff"
            onChange={(c) => editor.updateConnector(target, connector.id, { jointColor: c })}
          />
          <SliderRow
            label={t("coachStudio.connectorJointSize")}
            value={jointRadius}
            display={`${jointRadius}px`}
            min={3}
            max={16}
            step={1}
            onChange={(n) => editor.updateConnector(target, connector.id, { jointRadius: n })}
          />
        </>
      ) : null}
    </div>
  );
}
