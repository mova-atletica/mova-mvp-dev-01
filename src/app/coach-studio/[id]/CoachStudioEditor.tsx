"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Loader2, X } from "lucide-react";
import { useCoachStudioEditor } from "../../../lib/coachStudio/useCoachStudioEditor";
import { useCoachPreviewPlayback } from "../../../lib/coachStudio/useCoachPreviewPlayback";
import { phaseBoundsMs } from "../../../lib/coachStudio/migrateEditor";
import { exportCoachVideo } from "../../../lib/coachStudio/exportCoachVideo";
import { downloadBlob } from "../../../lib/exportService";
import { useTranslations } from "../../../i18n/LocaleProvider";
import CoachStudioStage from "./CoachStudioStage";
import CoachStudioTimeline from "./CoachStudioTimeline";
import { FreezeDrawer, PhaseDrawer } from "./CoachStudioTools";

/** Matches Tailwind `md` — below this, panel is height-capped above the video. */
const MOBILE_MQ = "(max-width: 767px)";

export default function CoachStudioEditor({ sessionId }: { sessionId: string }) {
  const t = useTranslations();
  const router = useRouter();
  const editor = useCoachStudioEditor(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const playback = useCoachPreviewPlayback({
    videoRef,
    editor: editor.editor,
    sourceDurationSec: durationMs / 1000,
    fps: editor.session?.sourceFps ?? 30,
    onSourceTimeMs: setCurrentMs,
  });

  // Overlay resolution (scrub-safe):
  // playing → held freeze; else selected freeze; else the freeze the playhead
  // is parked on (so freeze overlays don't vanish when you deselect / scrub onto it).
  const freezeNearPlayhead = editor.editor.freezes.find(
    (f) => Math.abs(f.tMs - currentMs) <= 60
  );
  const overlayFreezeId = playback.isPlaying
    ? playback.playbackFreezeId
    : editor.selectedFreezeId ?? freezeNearPlayhead?.id ?? null;

  const openSelection = (kind: "freeze" | "phase", id: string) => {
    editor.setSelection({ kind, id });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    editor.setSelection(null);
  };

  const selectFreeze = (id: string) => {
    openSelection("freeze", id);
    const freeze = editor.editor.freezes.find((f) => f.id === id);
    if (freeze) playback.seekToSourceMs(freeze.tMs);
  };

  const selectPhase = (id: string) => {
    openSelection("phase", id);
    const phase = editor.editor.phases.find((p) => p.id === id);
    if (phase && durationMs > 0) {
      const { startMs, endMs } = phaseBoundsMs(phase, editor.editor.freezes, durationMs);
      const mid = Math.round((startMs + endMs) / 2);
      playback.seekToSourceMs(mid);
    }
  };

  const addFreezeAtPlayhead = () => {
    const id = editor.addFreezeAt(currentMs);
    openSelection("freeze", id);
  };

  const runExport = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (editor.trackStatus !== "ready") return;
    if (playback.isPlaying) playback.togglePlay();
    setExporting(true);
    setExportError(null);
    setExportProgress(0);
    try {
      const { blob, filename } = await exportCoachVideo({
        video,
        editor: editor.editor,
        poses: editor.displayPoses,
        frameIntervalSec: editor.frameIntervalSec,
        fps: editor.session?.sourceFps ?? 30,
        onProgress: setExportProgress,
      });
      downloadBlob(blob, filename);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t("coachStudio.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  if (editor.loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--background)] text-sm text-[color:var(--muted-foreground)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("coachStudio.loadingEditor")}
      </div>
    );
  }

  if (editor.loadError || !editor.videoUrl) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[var(--background)] px-4 text-center">
        <p className="text-sm text-red-500">{editor.loadError ?? t("coachStudio.previewError")}</p>
        <button
          type="button"
          onClick={() => router.push("/coach-studio")}
          className="rounded-lg px-4 py-2 text-sm"
          style={{ border: "1px solid var(--border-secondary)", color: "var(--foreground)" }}
        >
          {t("coachStudio.backToProjects")}
        </button>
      </div>
    );
  }

  const trackBusy = editor.trackStatus === "loading" || editor.trackStatus === "tracking";
  const trackReady = editor.trackStatus === "ready";

  const selectedFreeze =
    editor.selectedFreezeId != null
      ? editor.editor.freezes.find((f) => f.id === editor.selectedFreezeId) ?? null
      : null;
  const selectedFreezeIndex = selectedFreeze
    ? editor.editor.freezes.findIndex((f) => f.id === selectedFreeze.id)
    : -1;
  const selectedPhase =
    editor.selectedPhaseId != null
      ? editor.editor.phases.find((p) => p.id === editor.selectedPhaseId) ?? null
      : null;

  const showDrawer = drawerOpen && (selectedFreeze != null || selectedPhase != null);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--background)]">
      <div
        className="flex flex-shrink-0 items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-secondary)" }}
      >
        <button
          type="button"
          onClick={() => router.push("/coach-studio")}
          aria-label={t("coachStudio.backToProjects")}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_8%,transparent)]"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2">
          {editor.dirty ? (
            <span className="text-[11px] text-[color:var(--muted-foreground)]">
              {t("coachStudio.unsaved")}
            </span>
          ) : null}
          <button
            type="button"
            disabled={exporting || !trackReady}
            onClick={() => void runExport()}
            title={
              !trackReady ? t("coachStudio.exportWaitTrack") : t("coachStudio.exportCta")
            }
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{
              border: "1px solid var(--border-secondary)",
              color: "var(--foreground)",
              backgroundColor: "transparent",
            }}
          >
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> {exportProgress}%
              </>
            ) : (
              <>
                <Download size={13} /> {t("coachStudio.toolExport")}
              </>
            )}
          </button>
          <button
            type="button"
            disabled={editor.saving || !editor.dirty}
            onClick={() => void editor.save()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
            style={{
              background: "var(--primary-button-bg)",
              color: "var(--primary-button-text)",
              border: "2px solid var(--primary-button-border)",
            }}
          >
            {editor.saving ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Check size={13} />
            )}
            {t("coachStudio.save")}
          </button>
        </div>
      </div>

      {editor.saveError || exportError ? (
        <p className="flex-shrink-0 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-500">
          {exportError ?? editor.saveError}
        </p>
      ) : null}

      {/*
        Wireframe (mobile): panel (capped, scroll) → video (flex-1) → timeline.
        Desktop: panel 320px | video, timeline full-width under.
        Mobile height is inline so it cannot be overridden by Tailwind md: classes.
      */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {showDrawer ? (
            <aside
              className="flex min-w-0 shrink-0 flex-col border-b p-4 md:h-full md:w-[320px] md:min-w-[320px] md:max-w-[320px] md:basis-[320px] md:border-b-0 md:border-r"
              style={{
                backgroundColor: "var(--card-bg)",
                borderColor: "var(--border-secondary)",
                ...(isMobile
                  ? {
                      height: "30dvh",
                      maxHeight: "30dvh",
                      minHeight: 0,
                      overflowX: "hidden",
                      overflowY: "auto",
                    }
                  : {
                      minHeight: 0,
                      overflowX: "hidden",
                      overflowY: "auto",
                    }),
              }}
            >
              {selectedFreeze ? (
                <FreezeDrawer
                  key={`freeze-${selectedFreeze.id}`}
                  editor={editor}
                  freeze={selectedFreeze}
                  freezeIndex={Math.max(0, selectedFreezeIndex)}
                  onClose={closeDrawer}
                />
              ) : selectedPhase ? (
                <PhaseDrawer
                  key={`phase-${selectedPhase.id}`}
                  editor={editor}
                  phase={selectedPhase}
                  onClose={closeDrawer}
                />
              ) : null}
            </aside>
          ) : null}

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <CoachStudioStage
              videoUrl={editor.videoUrl}
              videoRef={videoRef}
              editor={editor.editor}
              poses={editor.displayPoses}
              frameIntervalSec={editor.frameIntervalSec}
              activeFreezeId={overlayFreezeId}
              sourceTimeMs={currentMs}
              durationMs={durationMs}
              showSkeleton={false}
              playbackControlled={playback.isPlaying}
              onTimeChange={setCurrentMs}
              onDurationChange={setDurationMs}
              onMoveCaption={editor.moveCaption}
            />
            {trackBusy ? (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] text-white backdrop-blur">
                {editor.trackStatus === "loading"
                  ? t("coachStudio.loadingPoses")
                  : `${t("coachStudio.tracking")} ${editor.trackProgress}%`}
              </div>
            ) : null}
            {editor.trackStatus === "error" ? (
              <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600/90 px-3 py-1.5 text-[11px] text-white">
                <span>{t("coachStudio.trackError")}</span>
                <button
                  type="button"
                  onClick={() => editor.retrack()}
                  className="rounded-full bg-white/20 px-2 py-0.5 font-medium hover:bg-white/30"
                >
                  {t("coachStudio.retrack")}
                </button>
              </div>
            ) : null}
            {playback.isPlaying && playback.playbackFreezeId ? (
              <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-500/85 px-3 py-1 text-[10px] font-medium text-black backdrop-blur">
                {t("coachStudio.holdingFreeze")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          <CoachStudioTimeline
            durationMs={durationMs}
            currentMs={currentMs}
            isPlaying={playback.isPlaying}
            editorState={editor.editor}
            selectedFreezeId={editor.selectedFreezeId}
            selectedPhaseId={editor.selectedPhaseId}
            playbackFreezeId={playback.playbackFreezeId}
            playbackPhaseId={playback.playbackPhaseId}
            onSeek={playback.seekToSourceMs}
            onSelectFreeze={selectFreeze}
            onSelectPhase={selectPhase}
            onTogglePlay={playback.togglePlay}
            onAddFreeze={addFreezeAtPlayhead}
          />
        </div>
      </div>
    </div>
  );
}
