"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import type { CoachStudioEditor } from "../../../lib/coachStudio/useCoachStudioEditor";
import { phaseLabel } from "../../../lib/coachStudio/migrateEditor";
import {
  captionFontPxForFrame,
  captionFontSpec,
  captionMaxTextWidth,
  fitCaptionToMaxLines,
} from "../../../lib/coachStudio/captionWrap";
import {
  COACH_CAPTION_MAX_CHARS,
  COACH_CAPTION_MAX_LINES,
  defaultCoachCaptionStyle,
  type CoachCaption,
  type CoachCaptionBg,
  type CoachFreeze,
  type CoachPhase,
} from "../../../types/coachSession";
import { useTranslations } from "../../../i18n/LocaleProvider";
import type { MessageKey } from "../../../i18n";
import { OverlayBundleEditor } from "./OverlayBundleEditor";

const fieldClass =
  "box-border w-full min-w-0 max-w-full resize-none break-words rounded-lg px-2 py-1.5 text-xs text-[color:var(--foreground)]";
const fieldStyle = {
  border: "1px solid var(--border-secondary)",
  backgroundColor: "var(--background)",
} as const;
const primaryBtnStyle = {
  background: "var(--primary-button-bg)",
  color: "var(--primary-button-text)",
  border: "2px solid var(--primary-button-border)",
} as const;

const TEXT_SWATCHES = ["#ffffff", "#f8fafc", "#facc15", "#38bdf8", "#fb7185", "#000000"];
const BG_SWATCHES = ["#ffffff", "#000000", "#0f172a", "#1e3a8a", "#14532d"];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[color:var(--muted-foreground)]">
      {children}
    </p>
  );
}

function CaptionStyleEditor({
  caption,
  target,
  editor,
}: {
  caption: CoachCaption;
  target: { kind: "freeze" | "phase"; id: string };
  editor: CoachStudioEditor;
}) {
  const t = useTranslations();
  const style = { ...defaultCoachCaptionStyle(), ...caption.style };
  const frameW = editor.session?.sourceWidth ?? 1280;
  const frameH = editor.session?.sourceHeight ?? 720;
  const patchStyle = (partial: Partial<typeof style>) => {
    const nextStyle = { ...style, ...partial };
    const fontPx = captionFontPxForFrame(frameH, nextStyle.fontScale);
    const maxW = captionMaxTextWidth(frameW, fontPx);
    const { font } = captionFontSpec(fontPx);
    const fitted = fitCaptionToMaxLines(
      caption.text,
      maxW,
      COACH_CAPTION_MAX_LINES,
      font
    );
    editor.updateCaption(target, caption.id, {
      style: partial,
      ...(fitted !== caption.text ? { text: fitted } : null),
    });
  };

  return (
    <div className="space-y-2.5 border-t pt-2" style={{ borderColor: "var(--border-secondary)" }}>
      <SectionTitle>{t("coachStudio.captionStyle")}</SectionTitle>

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

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-[color:var(--muted-foreground)]">
          <span>{t("coachStudio.captionTextSize")}</span>
          <span>{Math.round(style.fontScale * 100)}%</span>
        </div>
        <input
          type="range"
          min={70}
          max={180}
          step={5}
          value={Math.round(style.fontScale * 100)}
          onChange={(e) => patchStyle({ fontScale: parseInt(e.target.value, 10) / 100 })}
          className="h-1 w-full cursor-pointer accent-[var(--accent,#3b82f6)]"
        />
      </div>

      <div>
        <p className="mb-1 text-[10px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.captionBg")}
        </p>
        <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid var(--border-secondary)" }}>
          {(
            [
              ["none", "coachStudio.captionBgNone"],
              ["solid", "coachStudio.captionBgSolid"],
              ["glass", "coachStudio.captionBgGlass"],
            ] as const satisfies ReadonlyArray<readonly [CoachCaptionBg, MessageKey]>
          ).map(([bg, key]) => (
            <button
              key={bg}
              type="button"
              onClick={() => {
                const next: Partial<typeof style> = { bg: bg as CoachCaptionBg };
                if (bg === "solid" && style.bg === "glass") {
                  next.bgColor = "#000000";
                  next.bgOpacity = 0.62;
                }
                if (bg === "glass" && style.bg !== "glass") {
                  next.bgColor = "#ffffff";
                  next.bgOpacity = 0.22;
                  next.blurPx = 14;
                }
                patchStyle(next);
              }}
              className="flex-1 px-2 py-1.5 text-[11px]"
              style={{
                backgroundColor:
                  style.bg === bg
                    ? "color-mix(in srgb, var(--accent, #3b82f6) 22%, transparent)"
                    : "transparent",
                color: style.bg === bg ? "var(--foreground)" : "var(--muted-foreground)",
                fontWeight: style.bg === bg ? 600 : 500,
              }}
            >
              {t(key)}
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

          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-[color:var(--muted-foreground)]">
              <span>{t("coachStudio.captionBgOpacity")}</span>
              <span>{Math.round(style.bgOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={90}
              step={5}
              value={Math.round(style.bgOpacity * 100)}
              onChange={(e) => patchStyle({ bgOpacity: parseInt(e.target.value, 10) / 100 })}
              className="h-1 w-full cursor-pointer accent-[var(--accent,#3b82f6)]"
            />
          </div>
        </>
      ) : null}

      {style.bg === "glass" ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-[color:var(--muted-foreground)]">
            <span>{t("coachStudio.captionFrost")}</span>
            <span>{style.blurPx}px</span>
          </div>
          <input
            type="range"
            min={4}
            max={28}
            step={2}
            value={style.blurPx}
            onChange={(e) => patchStyle({ blurPx: parseInt(e.target.value, 10) })}
            className="h-1 w-full cursor-pointer accent-[var(--accent,#3b82f6)]"
          />
        </div>
      ) : null}
    </div>
  );
}

function CaptionList({
  editor,
  target,
  captions,
}: {
  editor: CoachStudioEditor;
  target: { kind: "freeze" | "phase"; id: string };
  captions: CoachCaption[];
}) {
  const t = useTranslations();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canAdd = captions.length < 2;
  const frameW = editor.session?.sourceWidth ?? 1280;
  const frameH = editor.session?.sourceHeight ?? 720;

  const fitText = (text: string, caption: CoachCaption) => {
    const style = { ...defaultCoachCaptionStyle(), ...caption.style };
    const fontPx = captionFontPxForFrame(frameH, style.fontScale);
    const maxW = captionMaxTextWidth(frameW, fontPx);
    const { font } = captionFontSpec(fontPx);
    return fitCaptionToMaxLines(text, maxW, COACH_CAPTION_MAX_LINES, font);
  };

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <button
        type="button"
        disabled={!canAdd}
        onClick={() => {
          const id = editor.addCaption(target);
          if (id) setExpandedId(id);
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium disabled:opacity-50"
        style={primaryBtnStyle}
      >
        <Plus size={14} /> {t("coachStudio.addCaption")}
      </button>
      <p className="text-[11px] text-[color:var(--muted-foreground)]">
        {canAdd ? t("coachStudio.captionDragHint") : t("coachStudio.captionMaxTwo")}
      </p>
      <p className="text-[10px] text-[color:var(--muted-foreground)]">
        {t("coachStudio.captionLineLimit")}
      </p>

      {captions.length === 0 ? (
        <p className="text-xs text-[color:var(--muted-foreground)]">{t("coachStudio.noCaptions")}</p>
      ) : (
        captions.map((c, i) => (
          <CaptionRow
            key={c.id}
            caption={c}
            index={i}
            open={expandedId === c.id}
            onToggle={() => setExpandedId((cur) => (cur === c.id ? null : c.id))}
            onRemove={() => editor.removeCaption(target, c.id)}
            onTextChange={(text) =>
              editor.updateCaption(target, c.id, { text: fitText(text, c) })
            }
            target={target}
            editor={editor}
          />
        ))
      )}
    </div>
  );
}

function CaptionRow({
  caption,
  index,
  open,
  onToggle,
  onRemove,
  onTextChange,
  target,
  editor,
}: {
  caption: CoachCaption;
  index: number;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onTextChange: (text: string) => void;
  target: { kind: "freeze" | "phase"; id: string };
  editor: CoachStudioEditor;
}) {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  const label = `${t("coachStudio.captionUntitled")} ${index + 1}`;

  useEffect(() => {
    if (!open) return;
    rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div ref={rootRef} className="min-w-0 max-w-full overflow-hidden rounded-lg" style={fieldStyle}>
      <div className="flex min-w-0 items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1 text-left text-[11px] font-medium text-[color:var(--foreground)]"
        >
          {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
          <span className="truncate">{label}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 text-red-500"
          aria-label={t("coachStudio.delete")}
        >
          <Trash2 size={12} />
        </button>
      </div>
      {open ? (
        <div
          className="min-w-0 space-y-1.5 border-t p-2"
          style={{ borderColor: "var(--border-secondary)" }}
        >
          <textarea
            value={caption.text}
            onChange={(e) => onTextChange(e.target.value)}
            rows={2}
            maxLength={COACH_CAPTION_MAX_CHARS}
            placeholder={t("coachStudio.captionPlaceholder")}
            className={fieldClass}
            style={fieldStyle}
          />
          <p className="text-right text-[10px] text-[color:var(--muted-foreground)]">
            {caption.text.length}/{COACH_CAPTION_MAX_CHARS} · {COACH_CAPTION_MAX_LINES}{" "}
            {t("coachStudio.captionLinesUnit")}
          </p>
          <CaptionStyleEditor caption={caption} target={target} editor={editor} />
        </div>
      ) : null}
    </div>
  );
}

export function FreezeDrawer({
  editor,
  freeze,
  freezeIndex,
  onClose,
}: {
  editor: CoachStudioEditor;
  freeze: CoachFreeze;
  freezeIndex: number;
  onClose: () => void;
}) {
  const t = useTranslations();
  const trackBusy = editor.trackStatus === "loading" || editor.trackStatus === "tracking";

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {t("coachStudio.freeze")} {freezeIndex + 1}
          </p>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            {(freeze.tMs / 1000).toFixed(1)}s · {t("coachStudio.holdDuration")}{" "}
            {(freeze.holdMs / 1000).toFixed(1)}s
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--muted-foreground)]"
          aria-label={t("coachStudio.closeDrawer")}
        >
          <X size={16} />
        </button>
      </div>

      {editor.trackStatus === "ready" ? (
        <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--muted-foreground)]">
          <span>
            {editor.posesFromCache
              ? t("coachStudio.posesFromCache")
              : t("coachStudio.posesTracked")}
          </span>
          <button
            type="button"
            disabled={trackBusy}
            onClick={() => editor.retrack()}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            {t("coachStudio.retrack")}
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        <SectionTitle>{t("coachStudio.holdDuration")}</SectionTitle>
        <input
          type="range"
          min={500}
          max={6000}
          step={250}
          value={freeze.holdMs}
          onChange={(e) =>
            editor.updateFreeze(freeze.id, { holdMs: parseInt(e.target.value, 10) })
          }
          className="h-1 w-full cursor-pointer accent-[var(--accent,#3b82f6)]"
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (!window.confirm(t("coachStudio.deleteFreezeConfirm"))) return;
          editor.removeFreeze(freeze.id);
          onClose();
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
        style={{ border: "1px solid color-mix(in srgb, #f87171 45%, transparent)" }}
      >
        <Trash2 size={14} />
        {t("coachStudio.deleteFreeze")}
      </button>

      <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--border-secondary)" }}>
        <SectionTitle>{t("coachStudio.toolCaption")}</SectionTitle>
        <CaptionList
          editor={editor}
          target={{ kind: "freeze", id: freeze.id }}
          captions={freeze.captions}
        />
      </div>

      <div className="min-w-0 border-t pt-3" style={{ borderColor: "var(--border-secondary)" }}>
        <SectionTitle>{t("coachStudio.holdOverlays")}</SectionTitle>
        <p className="mb-3 text-[11px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.holdOverlaysHint")}
        </p>
        <OverlayBundleEditor
          key={`freeze-overlays-${freeze.id}`}
          editor={editor}
          target={{ kind: "freeze", id: freeze.id }}
          overlays={freeze.overlays}
        />
      </div>
    </div>
  );
}

export function PhaseDrawer({
  editor,
  phase,
  onClose,
}: {
  editor: CoachStudioEditor;
  phase: CoachPhase;
  onClose: () => void;
}) {
  const t = useTranslations();
  const target = { kind: "phase" as const, id: phase.id };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            {phaseLabel(editor.editor, phase.id)}
          </p>
          <p className="text-[11px] text-[color:var(--muted-foreground)]">
            {t("coachStudio.phaseDrawerHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[color:var(--muted-foreground)]"
          aria-label={t("coachStudio.closeDrawer")}
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-w-0 space-y-2 border-t pt-3" style={{ borderColor: "var(--border-secondary)" }}>
        <SectionTitle>{t("coachStudio.toolCaption")}</SectionTitle>
        <CaptionList editor={editor} target={target} captions={phase.captions} />
      </div>

      <div className="min-w-0 border-t pt-3" style={{ borderColor: "var(--border-secondary)" }}>
        <SectionTitle>{t("coachStudio.phaseOverlays")}</SectionTitle>
        <p className="mb-3 text-[11px] text-[color:var(--muted-foreground)]">
          {t("coachStudio.phaseOverlaysHint")}
        </p>
        <OverlayBundleEditor
          key={`phase-overlays-${phase.id}`}
          editor={editor}
          target={target}
          overlays={phase.overlays}
        />
      </div>
    </div>
  );
}
