"use client";

import { useCallback, useRef } from "react";
import { Pause, Play, Plus } from "lucide-react";
import { phaseBoundsMs, phaseLabel } from "../../../lib/coachStudio/migrateEditor";
import type { CoachEditorState, CoachFreeze, CoachPhase } from "../../../types/coachSession";
import { useTranslations } from "../../../i18n/LocaleProvider";

interface CoachStudioTimelineProps {
  durationMs: number;
  currentMs: number;
  isPlaying: boolean;
  editorState: CoachEditorState;
  selectedFreezeId: string | null;
  selectedPhaseId: string | null;
  playbackFreezeId?: string | null;
  playbackPhaseId?: string | null;
  onSeek: (ms: number) => void;
  onSelectFreeze: (id: string) => void;
  onSelectPhase: (id: string) => void;
  onTogglePlay: () => void;
  onAddFreeze: () => void;
}

function fmt(ms: number): string {
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}

const PHASE_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#fb7185"];
const MARKER_BAR_H = 30;
const SCRUBBER_H = 18;

export default function CoachStudioTimeline({
  durationMs,
  currentMs,
  isPlaying,
  editorState,
  selectedFreezeId,
  selectedPhaseId,
  playbackFreezeId = null,
  playbackPhaseId = null,
  onSeek,
  onSelectFreeze,
  onSelectPhase,
  onTogglePlay,
  onAddFreeze,
}: CoachStudioTimelineProps) {
  const t = useTranslations();
  const scrubRef = useRef<HTMLDivElement>(null);
  const pct = durationMs > 0 ? Math.min(100, (currentMs / durationMs) * 100) : 0;
  const freezes = editorState.freezes;
  const phases = editorState.phases;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = scrubRef.current;
      if (!track || durationMs <= 0) return;
      const bounds = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
      onSeek(Math.round(ratio * durationMs));
    },
    [durationMs, onSeek]
  );

  return (
    <div
      className="flex flex-shrink-0 items-center gap-2 px-6 py-2"
      style={{ borderTop: "1px solid var(--border-secondary)" }}
    >
      <div className="flex flex-shrink-0 items-center gap-2 pb-[1px]">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "var(--accent, #3b82f6)" }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={onAddFreeze}
          title={t("coachStudio.addFreezeAtPlayhead")}
          aria-label={t("coachStudio.addFreezeAtPlayhead")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
          style={{
            border: "1px solid var(--border-secondary)",
            backgroundColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          }}
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[color:var(--muted-foreground)]">
          <span>{fmt(currentMs)}</span>
          <span>{fmt(durationMs)}</span>
        </div>

        <div className="space-y-2 mb-2">
        {/* Phase + freeze marker bar (45px) — select only */}
        <div
          className="relative overflow-visible rounded-md"
          style={{
            height: MARKER_BAR_H,
            backgroundColor: "color-mix(in srgb, var(--foreground) 6%, transparent)",
          }}
          aria-label={t("coachStudio.phaseLane")}
        >
          {durationMs > 0
            ? phases.map((phase, i) => (
                <PhaseBand
                  key={phase.id}
                  phase={phase}
                  freezes={freezes}
                  durationMs={durationMs}
                  index={i}
                  label={phaseLabel(editorState, phase.id)}
                  color={PHASE_COLORS[i % PHASE_COLORS.length]!}
                  selected={
                    phase.id === selectedPhaseId || phase.id === playbackPhaseId
                  }
                  onSelect={() => onSelectPhase(phase.id)}
                />
              ))
            : null}

          {freezes.map((f) => {
            const left = durationMs > 0 ? (f.tMs / durationMs) * 100 : 0;
            const selected =
              f.id === selectedFreezeId || f.id === playbackFreezeId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFreeze(f.id);
                  onSeek(f.tMs);
                }}
                title={`${t("coachStudio.freeze")} @ ${fmt(f.tMs)} · hold ${fmt(f.holdMs)}`}
                className="group absolute top-0 z-20 flex h-full w-6 -translate-x-1/2 items-stretch justify-center"
                style={{ left: `${left}%` }}
              >
                <span
                  className="relative w-[3px] flex-shrink-0 rounded-full transition-[filter,transform] group-hover:brightness-110"
                  style={{
                    backgroundColor: selected ? "#38bdf8" : "#f59e0b",
                    boxShadow: selected
                      ? "0 0 0 2px color-mix(in srgb, #38bdf8 50%, transparent)"
                      : "0 0 0 1px color-mix(in srgb, #f59e0b 55%, transparent)",
                  }}
                >
                  <span
                    className="absolute left-1/2 top-1 h-5 w-5 -translate-x-1/2 rounded-sm transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: selected ? "#38bdf8" : "#f59e0b",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.45)",
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrubber (24px) — seek only, playhead vertically centered */}
        <div
          ref={scrubRef}
          className="relative cursor-pointer rounded-md"
          style={{
            height: SCRUBBER_H,
            backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)",
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) seekFromClientX(e.clientX);
          }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-[1] rounded-l-md"
            style={{
              width: `${pct}%`,
              backgroundColor: "color-mix(in srgb, var(--accent, #3b82f6) 22%, transparent)",
            }}
          />

          <div
            className="pointer-events-none absolute top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct}%`, height: SCRUBBER_H }}
          >
            <div
              className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: "#fff",
                boxShadow: "0 0 0 2px var(--accent, #3b82f6), 0 1px 3px rgba(0,0,0,0.35)",
              }}
            />
            <div
              className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
              style={{ backgroundColor: "var(--accent, #3b82f6)" }}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function PhaseBand({
  phase,
  freezes,
  durationMs,
  index,
  label,
  color,
  selected,
  onSelect,
}: {
  phase: CoachPhase;
  freezes: CoachFreeze[];
  durationMs: number;
  index: number;
  label: string;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { startMs, endMs } = phaseBoundsMs(phase, freezes, durationMs);
  const left = (startMs / durationMs) * 100;
  const width = Math.max(0.5, ((endMs - startMs) / durationMs) * 100);
  const shortLabel = `P${index + 1}`;

  return (
    <button
      type="button"
      onClick={() => onSelect()}
      title={label}
      className="absolute z-0 flex items-center overflow-hidden transition-[filter,background-color] hover:brightness-125"
      style={{
        left: `${left}%`,
        width: `${width}%`,
        top: 0,
        bottom: 0,
        height: "100%",
        backgroundColor: selected
          ? `color-mix(in srgb, ${color} 62%, transparent)`
          : `color-mix(in srgb, ${color} 42%, transparent)`,
        boxShadow: selected
          ? `inset 0 0 0 2px ${color}`
          : `inset -1px 0 0 color-mix(in srgb, ${color} 75%, transparent)`,
      }}
    >
      <span className="pointer-events-none w-full truncate px-2 text-[10px] font-semibold text-[color:var(--foreground)]">
        {width > 10 ? label : shortLabel}
      </span>
    </button>
  );
}
