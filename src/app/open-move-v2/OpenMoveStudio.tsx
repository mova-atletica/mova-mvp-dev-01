"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Upload,
  Video,
  BarChart3,
  Loader2,
  MoreVertical,
  LayoutDashboard,
  X,
  Play,
  Pause,
  ChevronDown,
} from "lucide-react";
import LiveVideoPlayer from "../../components/LiveVideoPlayer";
import { UsageGuideCarousel } from "../../components/UsageGuideCarousel";
import {
  fetchFeaturedContent,
  fetchExerciseById,
} from "../../lib/exerciseService";
import {
  computeAngleSeriesFromOpenMovePoses,
  optimizeOpenMovePosesForClient,
} from "../../lib/openMoveAngleSeries";
import {
  createMoveNetDetector,
  getPoseSamplingFrameIntervalSec,
  processVideoUrlForPoses,
} from "../../lib/tfjsProcessVideo";
import { analyzeCyclingDual, analyzePullUps } from "../../lib/sportAnalysis";
import type {
  CyclingDualAnalysisResult,
  CyclingLeg,
  PullUpsAnalysisResult,
  SportAnalysisKind,
} from "../../lib/sportAnalysis";

import AssetVideoPlayerStage from "../motion-explore/AssetVideoPlayerStage";
import MotionAnalysisPanel from "../motion-explore/MotionAnalysisPanel";
import {
  AssetVideoPlayerChromeExportFooter,
  AssetVideoPlayerChromeRailScroll,
} from "../motion-explore/AssetVideoPlayerChromeRail";
import {
  exportPanelDropdownMenuItemClass,
  exportPanelFieldLabelClass,
  exportPanelPopoverContentClass,
  exportPanelSelectTriggerClass,
} from "../motion-explore/AssetVideoPlayerExportPanel";
import { useAssetVideoEngine } from "../motion-explore/useAssetVideoEngine";
import {
  AssetVideoEngineProvider,
  useAssetVideoEngineContext,
  useOptionalAssetVideoEngine,
} from "../motion-explore/assetVideoEngineContext";
import { useTheme } from "../../contexts/ThemeContext";
import { EffectSelectedCheckIcon } from "../motion-explore/EffectSelectedCheckIcon";

/** Inline theme borders — `var(--border)` from ThemeContext; avoids Tailwind v4 not emitting `.border-border-theme`. */
const borderRightTheme = { borderRight: "1px solid var(--border)" } as const;
const borderBottomTheme = { borderBottom: "1px solid var(--border)" } as const;
const borderTopTheme = { borderTop: "1px solid var(--border)" } as const;
const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

/** Rail width — CSS transition only (no framer-motion). */
const openMoveRailWidthTransition = "width 0.35s ease-in-out";

/** Desktop analysis drawer: fixed cap so landscape video keeps room in the stage row. */
const DESKTOP_ANALYSIS_DRAWER_WIDTH = "min(34vw, 28rem)";

/** Play/pause in rail sticky header; only renders when engine exists (session ready). */
function StudioRailPlaybackButton() {
  const engine = useOptionalAssetVideoEngine();
  if (!engine) return null;
  const { isPlaying, toggleVideoPlayback } = engine;
  return (
    <button
      type="button"
      onClick={toggleVideoPlayback}
      style={borderAllTheme}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color:var(--foreground)] shadow-sm backdrop-blur-md transition hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:opacity-95"
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <Pause className="h-5 w-5" stroke="currentColor" /> : <Play className="h-5 w-5" stroke="currentColor" />}
    </button>
  );
}

/** Download & export — full-bleed rail footer; only when engine exists (session ready). */
function StudioRailExportFooter() {
  const engine = useOptionalAssetVideoEngine();
  if (!engine) return null;
  return (
    <AssetVideoPlayerChromeExportFooter engine={engine} accordionTitle="4. Download & export" />
  );
}

/** Effects rail — only valid inside AssetVideoEngineProvider */
function StudioPanelChrome({
  scrollContainer = "internal",
}: {
  scrollContainer?: "internal" | "passthrough";
}) {
  const engine = useAssetVideoEngineContext();
  return <AssetVideoPlayerChromeRailScroll engine={engine} scrollContainer={scrollContainer} />;
}

function AssetVideoSessionBridge({
  session,
  sportAnalysisKind,
  sportMetricsSnapshot,
  children,
}: {
  session: SessionState & { status: "ready"; videoUrl: string };
  sportAnalysisKind: SportAnalysisKind;
  sportMetricsSnapshot: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
  } | null;
  children: React.ReactNode;
}) {
  const engine = useAssetVideoEngine({
    videoUrl: session.videoUrl,
    poses: session.poses,
    exerciseTitle: session.sessionLabel,
    sportAnalysisKind,
    sportMetricsSnapshot,
  });
  return <AssetVideoEngineProvider engine={engine}>{children}</AssetVideoEngineProvider>;
}

/** Provides video engine context when session has poses + video (for panel chrome + stage). */
function ConditionalEngineBridge({
  session,
  sportAnalysisKind,
  sportMetricsSnapshot,
  children,
}: {
  session: SessionState;
  sportAnalysisKind: SportAnalysisKind;
  sportMetricsSnapshot: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
  } | null;
  children: React.ReactNode;
}) {
  if (
    session.status === "ready" &&
    session.videoUrl &&
    session.poses.length > 0
  ) {
    return (
      <AssetVideoSessionBridge
        session={session as SessionState & { status: "ready"; videoUrl: string }}
        sportAnalysisKind={sportAnalysisKind}
        sportMetricsSnapshot={sportMetricsSnapshot}
      >
        {children}
      </AssetVideoSessionBridge>
    );
  }
  return <>{children}</>;
}

type SessionStatus =
  | "loading_sample"
  | "processing_video"
  | "ready"
  | "error";

type SessionState = {
  status: SessionStatus;
  errorMessage?: string;
  videoUrl: string | null;
  poses: any[];
  angles: ReturnType<typeof computeAngleSeriesFromOpenMovePoses> | null;
  /** Time between pose samples (seconds); matches MoveNet video scan interval. */
  frameIntervalSec: number | null;
  /** UI label for current clip */
  sessionLabel: string;
  /** featured | upload | live */
  source: "featured" | "upload" | "live";
};

const initialSession: SessionState = {
  status: "loading_sample",
  videoUrl: null,
  poses: [],
  angles: null,
  frameIntervalSec: null,
  sessionLabel: "",
  source: "featured",
};

export default function OpenMoveStudio() {
  const [session, setSession] = useState<SessionState>(initialSession);
  /** MVP sport analysis (cleared when a new clip is processed). */
  const [cyclingAnalysisResult, setCyclingAnalysisResult] = useState<CyclingDualAnalysisResult | null>(null);
  const [cyclingAnalysisError, setCyclingAnalysisError] = useState<string | null>(null);
  const [pullUpsAnalysisResult, setPullUpsAnalysisResult] = useState<PullUpsAnalysisResult | null>(null);
  const [pullUpsAnalysisError, setPullUpsAnalysisError] = useState<string | null>(null);
  const [sportAnalysisKind, setSportAnalysisKind] = useState<SportAnalysisKind>("cycling");
  const [sportMenuOpen, setSportMenuOpen] = useState(false);
  const [cyclingLeg, setCyclingLeg] = useState<CyclingLeg>("left");
  const [cyclingKneeMenuOpen, setCyclingKneeMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(true);
  /** Keeps analysis UI mounted until width collapse finishes so close animation stays smooth. */
  const [analyticsDrawerContentMounted, setAnalyticsDrawerContentMounted] = useState(true);
  const analyticsDrawerOpenRef = useRef(analyticsDrawerOpen);
  analyticsDrawerOpenRef.current = analyticsDrawerOpen;
  const [guideOpen, setGuideOpen] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [tfProgress, setTfProgress] = useState(0);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectorRef = useRef<Awaited<ReturnType<typeof createMoveNetDetector>> | null>(null);
  const [videoIntrinsicAspect, setVideoIntrinsicAspect] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const { theme, toggleTheme } = useTheme();

  /** Avoid SSR mismatch; portal target only exists on client. */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  /**
   * Defer backdrop pointer events so the same touch that opened the rail
   * does not immediately hit the full-screen close target (ghost close).
   */
  const [mobileRailBackdropReady, setMobileRailBackdropReady] = useState(false);

  const overlaySportMetricsSnapshot = useMemo(() => {
    const cadence = cyclingAnalysisResult?.trough?.cadence_rpm ?? cyclingAnalysisResult?.peak?.cadence_rpm ?? null;
    const repeatabilityRmse =
      cyclingAnalysisResult?.trough?.smoothness?.rmseOverallDeg ??
      cyclingAnalysisResult?.peak?.smoothness?.rmseOverallDeg ??
      null;
    const repeatabilityPct =
      repeatabilityRmse == null || !Number.isFinite(repeatabilityRmse)
        ? null
        : Math.max(0, Math.min(100, 100 - Math.min(100, repeatabilityRmse)));
    const repCount = pullUpsAnalysisResult?.rep_count ?? null;

    const computeElbowSymmetry = () => {
      if (!session.angles) return null;
      const left = session.angles.leftElbowAngles.filter((v) => v != null) as number[];
      const right = session.angles.rightElbowAngles.filter((v) => v != null) as number[];
      if (left.length === 0 || right.length === 0) return null;
      const lAvg = left.reduce((s, v) => s + v, 0) / left.length;
      const rAvg = right.reduce((s, v) => s + v, 0) / right.length;
      if (!Number.isFinite(lAvg) || !Number.isFinite(rAvg) || lAvg <= 0 || rAvg <= 0) return null;
      const diff = Math.abs(lAvg - rAvg);
      return Math.max(0, 100 - (diff / Math.max(lAvg, rAvg)) * 100);
    };

    return {
      cyclingCadenceRpm: cadence,
      cyclingStrokeRepeatability: repeatabilityPct,
      pullupsRepCount: repCount,
      pullupsElbowSymmetry: computeElbowSymmetry(),
    };
  }, [cyclingAnalysisResult, pullUpsAnalysisResult, session.angles]);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isDesktop && panelOpen) {
      setMobileRailBackdropReady(false);
      let cancelled = false;
      const id = window.requestAnimationFrame(() => {
        if (cancelled) return;
        window.requestAnimationFrame(() => {
          if (!cancelled) setMobileRailBackdropReady(true);
        });
      });
      return () => {
        cancelled = true;
        window.cancelAnimationFrame(id);
      };
    }
    setMobileRailBackdropReady(false);
  }, [isDesktop, panelOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (session.status !== "ready" || !session.videoUrl) {
      setVideoIntrinsicAspect(null);
      return;
    }
    const url = session.videoUrl;
    setVideoIntrinsicAspect(null);
    let cancelled = false;
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    const onMeta = () => {
      if (cancelled) return;
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (w > 0 && h > 0) {
        setVideoIntrinsicAspect({ width: w, height: h });
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.src = url;
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onMeta();
    }
    return () => {
      cancelled = true;
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeAttribute("src");
      v.load();
    };
  }, [session.status, session.videoUrl]);

  /** Portrait until intrinsic metadata; landscape if aspect ≥ 1.05 (avoids noisy 1:1 flicker). */
  const isLandscapeVideo = useMemo(() => {
    if (!videoIntrinsicAspect || videoIntrinsicAspect.height <= 0) return false;
    return videoIntrinsicAspect.width / videoIntrinsicAspect.height >= 1.05;
  }, [videoIntrinsicAspect]);

  /**
   * Desktop: when rail is collapsed and analysis is not using drawer width, grow the stage row
   * to the full video area (spacers stay zero). Inner row keeps justify-center so portrait stays centered.
   */
  const expandStageToRemainingWidth = useMemo(() => {
    if (!isDesktop || panelOpen) return false;
    if (!session.angles) return true;
    if (!analyticsDrawerContentMounted) return true;
    return !analyticsDrawerOpen;
  }, [
    isDesktop,
    panelOpen,
    session.angles,
    analyticsDrawerContentMounted,
    analyticsDrawerOpen,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await createMoveNetDetector();
        if (!cancelled) {
          detectorRef.current = d;
          setDetectorReady(true);
        }
      } catch (e) {
        console.error("MoveNet load failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAnalyticsDrawerWidthTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "width" || e.target !== e.currentTarget) return;
      if (!analyticsDrawerOpenRef.current) {
        setAnalyticsDrawerContentMounted(false);
      }
    },
    []
  );

  useEffect(() => {
    if (analyticsDrawerOpen || !analyticsDrawerContentMounted) return;
    const id = window.setTimeout(() => {
      if (!analyticsDrawerOpenRef.current) {
        setAnalyticsDrawerContentMounted(false);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [analyticsDrawerOpen, analyticsDrawerContentMounted]);

  const applyProcessedVideo = useCallback(
    (
      videoUrl: string,
      poses: any[],
      label: string,
      source: SessionState["source"],
      frameIntervalSec: number
    ) => {
      const optimized = optimizeOpenMovePosesForClient(poses);
      const angles = computeAngleSeriesFromOpenMovePoses(optimized);
      setCyclingAnalysisResult(null);
      setCyclingAnalysisError(null);
      setPullUpsAnalysisResult(null);
      setPullUpsAnalysisError(null);
      setSession({
        status: "ready",
        videoUrl,
        poses: optimized,
        angles,
        frameIntervalSec,
        sessionLabel: label,
        source,
      });
    },
    []
  );

  const runTfjsOnUrl = useCallback(
    async (videoUrl: string, label: string, source: SessionState["source"]) => {
      const detector = detectorRef.current;
      if (!detector) {
        setSession((s) => ({
          ...s,
          status: "error",
          errorMessage: "Pose model is still loading. Wait a moment and try again.",
        }));
        return;
      }
      setCyclingAnalysisResult(null);
      setCyclingAnalysisError(null);
      setPullUpsAnalysisResult(null);
      setPullUpsAnalysisError(null);
      setSession((s) => ({
        ...s,
        status: "processing_video",
        videoUrl,
        errorMessage: undefined,
        sessionLabel: label,
        source,
        angles: null,
        frameIntervalSec: null,
        poses: [],
      }));
      setTfProgress(0);
      try {
        const { poses, frameIntervalSec } = await processVideoUrlForPoses(
          detector,
          videoUrl,
          (p) => setTfProgress(p)
        );
        applyProcessedVideo(videoUrl, poses, label, source, frameIntervalSec);
      } catch (e) {
        console.error(e);
        setSession((s) => ({
          ...s,
          status: "error",
          errorMessage:
            e instanceof Error ? e.message : "Could not analyze this video.",
        }));
      }
    },
    [applyProcessedVideo]
  );

  const loadFeaturedSample = useCallback(async () => {
    setCyclingAnalysisResult(null);
    setCyclingAnalysisError(null);
    setPullUpsAnalysisResult(null);
    setPullUpsAnalysisError(null);
    setSession({
      ...initialSession,
      status: "loading_sample",
    });
    try {
      const featured = await fetchFeaturedContent();
      if (!featured?.exerciseId) {
        setSession({
          ...initialSession,
          status: "error",
          errorMessage:
            "No featured exercise in admin. Link an exercise to Featured Content.",
        });
        return;
      }

      const exercise = await fetchExerciseById(featured.exerciseId);
      if (!exercise?.referenceVideoUrl) {
        setSession({
          ...initialSession,
          status: "error",
          errorMessage: "Featured exercise has no reference video.",
        });
        return;
      }

      const videoUrl = `/api/storage/video-proxy?fileName=${encodeURIComponent(
        exercise.referenceVideoUrl
      )}`;
      const keypointsUrl = exercise.referenceKeypointsUrl?.trim();

      if (keypointsUrl) {
        const proxyRes = await fetch("/api/storage/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: keypointsUrl }),
        });
        if (proxyRes.ok) {
          const raw = await proxyRes.json();
          const posesArray = Array.isArray(raw) ? raw : (raw as { poses?: any[] }).poses;
          if (posesArray?.length) {
            applyProcessedVideo(
              videoUrl,
              posesArray,
              `${featured.title} — ${exercise.title}`,
              "featured",
              getPoseSamplingFrameIntervalSec()
            );
            return;
          }
        }
      }

      // Fallback: TFJS on featured reference video (wait for detector)
      let waited = 0;
      while (!detectorRef.current && waited < 30000) {
        await new Promise((r) => setTimeout(r, 100));
        waited += 100;
      }
      if (!detectorRef.current) {
        setSession({
          ...initialSession,
          status: "error",
          errorMessage: "Pose model did not load in time. Check your connection and retry.",
        });
        return;
      }
      await runTfjsOnUrl(
        videoUrl,
        `${featured.title} — ${exercise.title}`,
        "featured"
      );
    } catch (e) {
      console.error(e);
      setSession({
        ...initialSession,
        status: "error",
        errorMessage:
          e instanceof Error ? e.message : "Failed to load featured sample.",
      });
    }
  }, [applyProcessedVideo, runTfjsOnUrl]);

  const runSportAnalysis = useCallback(() => {
    if (!session.angles || session.frameIntervalSec == null) return;
    if (sportAnalysisKind === "cycling") {
      setCyclingAnalysisResult(null);
      setCyclingAnalysisError(null);
      const res = analyzeCyclingDual({
        leftKneeAngles: session.angles.leftKneeAngles,
        rightKneeAngles: session.angles.rightKneeAngles,
        frameIntervalSec: session.frameIntervalSec,
        leg: cyclingLeg,
      });
      if (res.ok) {
        setCyclingAnalysisResult(res.result);
        setCyclingAnalysisError(null);
      } else {
        setCyclingAnalysisResult(null);
        setCyclingAnalysisError(res.error);
      }
      return;
    }
    setPullUpsAnalysisResult(null);
    setPullUpsAnalysisError(null);
    const res = analyzePullUps({
      leftElbowAngles: session.angles.leftElbowAngles,
      rightElbowAngles: session.angles.rightElbowAngles,
      frameIntervalSec: session.frameIntervalSec,
    });
    if (res.ok) {
      setPullUpsAnalysisResult(res.result);
      setPullUpsAnalysisError(null);
    } else {
      setPullUpsAnalysisResult(null);
      setPullUpsAnalysisError(res.error);
    }
  }, [session.angles, session.frameIntervalSec, cyclingLeg, sportAnalysisKind]);

  useEffect(() => {
    loadFeaturedSample();
  }, [loadFeaturedSample]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    await runTfjsOnUrl(url, file.name || "Uploaded video", "upload");
    e.target.value = "";
  };

  const onRecordingComplete = async (url: string) => {
    setShowLiveModal(false);
    await runTfjsOnUrl(url, "Live recording", "live");
  };

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky header: title, upload/record, play/pause when ready */}
      <div
        style={borderBottomTheme}
        className="sticky top-0 z-10 flex-shrink-0 px-4 pb-4 pt-4 md:px-8 md:pt-8"
      >
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="font-light uppercase tracking-wider text-[color:var(--muted-foreground)]" style={{ fontSize: "24px" }}>
                Mova Studio
              </h1>
              <p className="mt-0 text-xs font-normal leading-relaxed text-[color:var(--muted)]">
                Analyze and visualize the body&apos;s movement — add effects to explore. For best results, please{" "}
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="text-[12px] font-normal text-[color:var(--muted-foreground)] underline decoration-border-theme underline-offset-2 transition-all hover:text-[color:var(--foreground)] hover:decoration-[color:var(--muted-foreground)]"
                >
                  read our usage guide.
                </button>
              </p>
            </div>
            <div className="relative z-30 flex items-center gap-2">
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    style={borderAllTheme}
                    className="flex-shrink-0 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] p-2 text-[color:var(--muted-foreground)] backdrop-blur-md transition-all hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]"
                    title="Apps & Settings"
                  >
                    <MoreVertical size={16} />
                  </button>
                </Popover.Trigger>
                
                  <Popover.Content
                    side="bottom"
                    align="end"
                    sideOffset={8}
                    style={borderAllTheme}
                    className="z-[220] w-56 rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_90%,black)] p-2 shadow-2xl backdrop-blur-xl"
                  >
                    <div className="px-2 py-1 text-[9px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                      Apps
                    </div>
                    <Link
                      href="/"
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 font-normal text-xs text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]"
                    >
                      <Home size={12} />
                      Back to Mova Archive
                    </Link>
                    <div className="mt-1 flex items-center gap-2 rounded-md bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] px-2 py-1.5 font-normal text-xs text-[color:var(--foreground)]">
                      <LayoutDashboard className="h-3 w-3" />
                      <span>Mova Studio</span>
                      <span className="ml-auto flex shrink-0 items-center justify-center text-[var(--accent,#3b82f6)]">
                        <EffectSelectedCheckIcon className="scale-[0.85]" />
                      </span>
                    </div>
                    <div className="my-2 h-px bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
                    <div className="px-2 py-1 text-[9px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                      Account
                    </div>
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-md px-2 py-1.5 text-left font-bold text-xs text-[color:var(--muted)]"
                    >
                      Coming soon : )
                    </button>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="mt-1 flex min-h-[44px] w-full items-center justify-center rounded-md px-2 py-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]"
                      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                    >
                      {theme === "light" ? (
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          style={{ color: "var(--foreground)" }}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-6 w-6 text-[color:var(--foreground)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      )}
                    </button>
                  </Popover.Content>
               
              </Popover.Root>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                style={borderAllTheme}
                className="inline-flex shrink-0 rounded-lg p-2 text-[color:var(--muted-foreground)] backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                aria-label="Collapse panel"
                title="Collapse panel"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
          </div>

          <div style={borderTopTheme} className="space-y-3 pt-4">
            <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
              1. Upload or record video
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={session.status === "processing_video" || !detectorReady}
                style={borderAllTheme}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
              >
                <Upload size={16} /> Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={onFileChange}
              />
              <span
                className="shrink-0 text-[11px] uppercase tracking-wider text-[color:var(--muted)]"
                aria-hidden
              >
                or
              </span>
              <button
                type="button"
                onClick={() => setShowLiveModal(true)}
                disabled={session.status === "processing_video" || !detectorReady}
                style={borderAllTheme}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
              >
                <Video size={16} /> Record
              </button>
            </div>
            {session.sessionLabel ? (
              <p className="line-clamp-2 text-[11px] text-[color:var(--muted)]">
                <span className="text-[color:var(--muted-foreground)]">Current video source:</span>{" "}
                {session.sessionLabel}
              </p>
            ) : null}
            {session.status === "ready" ? (
              <div className="relative z-0 pt-1">
                <StudioRailPlaybackButton />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/*
        Layout contract: fill space below header with a flex column so ChromeRail gets a height budget.
        Do not wrap StudioPanelChrome in overflow-y-auto — ChromeRail owns scroll + pinned export footer.
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        {session.status === "processing_video" ? (
          <div style={borderBottomTheme} className="flex-shrink-0 px-4 py-3 md:px-8">
            <div className="h-1.5 overflow-hidden rounded-full bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              <div
                className="h-full bg-[var(--accent,#3b82f6)] transition-all"
                style={{ width: `${tfProgress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-[color:var(--muted)]">
              Analyzing motion… {tfProgress}%
            </p>
          </div>
        ) : null}

        {session.status === "ready" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2 pr-0.5 md:px-8 md:pt-5 md:pb-3">
              <p className="mb-0 text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                2. Add Visualization Overlays
              </p>
              <StudioPanelChrome scrollContainer="passthrough" />
              <div
                className="mt-2 space-y-2 pt-4 text-[color:var(--foreground)]"
              >
                <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  3. Sport analysis
                </p>
                <div className="min-w-0">
                  <div className={exportPanelFieldLabelClass}>Sport</div>
                  <Popover.Root open={sportMenuOpen} onOpenChange={setSportMenuOpen}>
                    <Popover.Trigger asChild>
                      <button type="button" className={exportPanelSelectTriggerClass}>
                        <span className="truncate">
                          {sportAnalysisKind === "cycling" ? "Cycling" : "Pull-ups"}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${sportMenuOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        side="bottom"
                        align="start"
                        sideOffset={6}
                        collisionPadding={12}
                        className={exportPanelPopoverContentClass}
                      >
                        <div
                          role="menuitem"
                          className={exportPanelDropdownMenuItemClass}
                          onClick={() => {
                            setSportAnalysisKind("cycling");
                            setSportMenuOpen(false);
                          }}
                        >
                          Cycling
                        </div>
                        <div
                          role="menuitem"
                          className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                          onClick={() => {
                            setSportAnalysisKind("pullups");
                            setSportMenuOpen(false);
                          }}
                        >
                          Pull-ups
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
                {sportAnalysisKind === "cycling" ? (
                  <>
                    <div className="min-w-0">
                      <div className={exportPanelFieldLabelClass}>Knee</div>
                      <Popover.Root open={cyclingKneeMenuOpen} onOpenChange={setCyclingKneeMenuOpen}>
                        <Popover.Trigger asChild>
                          <button type="button" className={exportPanelSelectTriggerClass}>
                            <span className="truncate">{cyclingLeg === "left" ? "Left" : "Right"}</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${cyclingKneeMenuOpen ? "rotate-180" : ""}`}
                            />
                          </button>
                        </Popover.Trigger>
                        <Popover.Portal>
                          <Popover.Content
                            side="bottom"
                            align="start"
                            sideOffset={6}
                            collisionPadding={12}
                            className={exportPanelPopoverContentClass}
                          >
                            <div
                              role="menuitem"
                              className={exportPanelDropdownMenuItemClass}
                              onClick={() => {
                                setCyclingLeg("left");
                                setCyclingKneeMenuOpen(false);
                              }}
                            >
                              Left
                            </div>
                            <div
                              role="menuitem"
                              className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                              onClick={() => {
                                setCyclingLeg("right");
                                setCyclingKneeMenuOpen(false);
                              }}
                            >
                              Right
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                    <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                      We analyze <strong className="text-[color:var(--foreground)]">both</strong> bottom-of-stroke
                      (trough) and top-of-stroke (peak) timing from the same knee trace.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                    We combine <strong className="text-[color:var(--foreground)]">left and right</strong> elbow angles,
                    then count reps from flexion peaks (smoothed + spacing + minimum range of motion).
                  </p>
                )}
                <button
                  type="button"
                  onClick={runSportAnalysis}
                  disabled={!session.angles || session.frameIntervalSec == null}
                  style={borderAllTheme}
                  className="w-full rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
                >
                  Analyze
                </button>
                {sportAnalysisKind === "cycling" && cyclingAnalysisError ? (
                  <p className="text-[10px] leading-snug text-red-500/90">{cyclingAnalysisError}</p>
                ) : sportAnalysisKind === "cycling" && cyclingAnalysisResult ? (
                  <p className="text-[10px] text-[color:var(--muted)]">
                    Done — open analytics and the &quot;Sport analysis&quot; tab.
                  </p>
                ) : null}
                {sportAnalysisKind === "pullups" && pullUpsAnalysisError ? (
                  <p className="text-[10px] leading-snug text-red-500/90">{pullUpsAnalysisError}</p>
                ) : sportAnalysisKind === "pullups" && pullUpsAnalysisResult ? (
                  <p className="text-[10px] text-[color:var(--muted)]">
                    Done — open analytics and the &quot;Sport analysis&quot; tab.
                  </p>
                ) : null}
              </div>
            </div>
            <StudioRailExportFooter />
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <ConditionalEngineBridge
      session={session}
      sportAnalysisKind={sportAnalysisKind}
      sportMetricsSnapshot={overlaySportMetricsSnapshot}
    >
    <div className="flex h-[100dvh] w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {isDesktop ? (
        <aside
          style={{
            width: panelOpen ? "30vw" : 0,
            transition: openMoveRailWidthTransition,
            ...(panelOpen ? borderRightTheme : { borderRight: "none" }),
          }}
          className={`z-20 flex h-full min-h-0 min-w-0 max-w-[min(28vw)] flex-shrink-0 flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl ${!panelOpen ? "pointer-events-none" : ""}`}
        >
          {panelContent}
        </aside>
      ) : null}

      {/* &lt;lg: overlay rail — portaled to body (avoids overflow/transform clipping); z above stage FABs */}
      {portalTarget && !isDesktop && panelOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[200] bg-black/50"
                style={{ pointerEvents: mobileRailBackdropReady ? "auto" : "none" }}
                aria-label="Close controls panel"
                onClick={() => setPanelOpen(false)}
              />
              <div
                className="fixed left-0 top-0 z-[210] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl"
                style={{ ...borderRightTheme, width: "min(79vw, 30rem)" }}
              >
                {panelContent}
              </div>
            </>,
            portalTarget
          )
        : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={`flex min-h-0 min-w-0 flex-1 ${isDesktop ? "flex-row" : "flex-col"}`}>
          {isDesktop && !panelOpen ? (
            <div className="shrink-0 py-4 pl-4 pr-0 flex flex-col items-start justify-start">
              <button
                type="button"
                onClick={() => setPanelOpen(true)}
                style={borderAllTheme}
                className="inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                aria-label="Expand panel"
                title="Expand panel"
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          ) : null}
          {/* Video area */}
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[var(--background)]">
          {!isDesktop && !panelOpen && !analyticsOpen ? (
            <button
              type="button"
              onClick={() => setPanelOpen(true)}
              className="fixed z-[100] inline-flex rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] p-2 text-[color:var(--muted-foreground)] shadow-lg backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]"
              style={{
                ...borderAllTheme,
                top: "max(1rem, env(safe-area-inset-top))",
                left: "max(1rem, env(safe-area-inset-left))",
              }}
              aria-label="Open controls panel"
              title="Open controls panel"
            >
              <PanelLeftOpen size={18} />
            </button>
          ) : null}
          {session.status === "ready" && session.angles && !analyticsOpen ? (
            <button
              type="button"
              onClick={() => setAnalyticsOpen(true)}
              className="absolute right-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] text-[color:var(--foreground)] shadow-lg backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] md:hidden"
              style={{
                ...borderAllTheme,
                top: "max(1rem, env(safe-area-inset-top))",
                right: "max(1rem, env(safe-area-inset-right))",
              }}
              aria-label="Open motion analysis"
              title="Motion analysis"
            >
              <BarChart3 size={16} stroke="currentColor" />
            </button>
          ) : null}
          {session.status === "loading_sample" && (
            <div className="flex flex-col items-center gap-3 text-[color:var(--muted-foreground)]">
              <Loader2 className="h-9 w-9 animate-spin text-[var(--accent,#3b82f6)]" />
              <p className="text-md">Loading featured sample…</p>
            </div>
          )}

          {session.status === "error" && (
            <div className="max-w-md px-4 text-center">
              <p className="text-[color:var(--foreground)] opacity-90 text-sm mb-4">{session.errorMessage}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => loadFeaturedSample()}
                  className="px-4 py-2 rounded-lg text-sm bg-[var(--accent,#3b82f6)] text-white"
                >
                  Retry
                </button>
                <Link
                  href="/"
                  style={borderAllTheme}
                  className="px-4 py-2 rounded-lg text-sm text-[color:var(--foreground)] opacity-90"
                >
                  Home
                </Link>
              </div>
            </div>
          )}

          {(session.status === "ready" || session.status === "processing_video") &&
            session.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-2 md:p-4">
                {session.status === "ready" && session.poses.length > 0 ? (
                  <div
                    className={
                      isLandscapeVideo || expandStageToRemainingWidth
                        ? "flex h-full min-h-[min(50vh,520px)] max-h-full w-full max-w-full items-center justify-center md:max-h-[calc(100dvh-24px)]"
                        : "flex h-full min-h-[min(50vh,520px)] max-h-full w-full max-w-[min(100%,min(78vw,20rem))] items-center justify-center md:max-h-[calc(100dvh-24px)]"
                    }
                  >
                    <div className="flex h-full w-full min-w-0 flex-row items-stretch">
                      <div
                        className="min-h-0"
                        style={
                          analyticsDrawerContentMounted ||
                          expandStageToRemainingWidth
                            ? {
                                flexGrow: 0,
                                flexShrink: 0,
                                flexBasis: 0,
                                minWidth: 0,
                                maxWidth: 0,
                                overflow: "hidden",
                                pointerEvents: "none",
                              }
                            : {
                                flexGrow: 1,
                                flexShrink: 1,
                                flexBasis: 0,
                                minWidth: 0,
                              }
                        }
                        aria-hidden
                      />
                      <div
                        className="flex h-full min-h-0 flex-row items-stretch gap-3 justify-center"
                        style={
                          analyticsDrawerContentMounted ||
                          expandStageToRemainingWidth
                            ? {
                                flexGrow: 1,
                                flexShrink: 1,
                                flexBasis: 0,
                                minWidth: 0,
                              }
                            : {
                                flexGrow: 0,
                                flexShrink: 1,
                                flexBasis: "auto",
                                minWidth: 0,
                                maxWidth: "100%",
                              }
                        }
                      >
                        <div
                          className={
                            isLandscapeVideo
                              ? isDesktop
                                ? "flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [contain:layout]"
                                : "flex w-full min-h-0 min-w-0 max-w-full flex-1 items-center justify-center self-stretch [contain:layout]"
                              : "flex h-full min-w-[min(200px,42vw)] flex-none items-start justify-center self-stretch [contain:layout]"
                          }
                        >
                          <AssetVideoPlayerStage
                            videoUrl={session.videoUrl}
                            intrinsicAspect={videoIntrinsicAspect}
                            className={
                              isLandscapeVideo
                                ? isDesktop
                                  ? "relative mx-auto h-auto w-full max-h-[min(94dvh,calc(100dvh-24px))] max-w-full min-h-0 overflow-hidden rounded-lg bg-[#111214] shadow-lg"
                                  : "relative mx-auto h-auto w-full max-h-[min(92dvh,calc(100dvh-48px))] max-w-full min-h-0 overflow-hidden rounded-lg bg-[#111214] shadow-lg"
                                : expandStageToRemainingWidth
                                  ? "relative h-full max-h-[min(100dvh,calc(100dvh-100px))] w-auto max-w-full overflow-hidden rounded-lg bg-[#111214] shadow-lg md:max-h-[min(94dvh,calc(100dvh-24px))]"
                                  : "relative h-full max-h-[min(100dvh,calc(100dvh-100px))] w-auto max-w-[min(100%,min(100vw,56rem))] overflow-hidden rounded-lg bg-[#111214] shadow-lg md:max-h-[min(94dvh,calc(100dvh-24px))]"
                            }
                          />
                        </div>
                        {session.angles ? (
                          <div
                            className="hidden min-h-0 min-w-0 shrink-0 flex-row items-stretch gap-2 md:flex"
                            style={{
                              flexGrow: 0,
                              flexShrink: 0,
                              flexBasis: "auto",
                              minWidth: 0,
                            }}
                          >
                            {!analyticsDrawerContentMounted ? (
                              <div className="flex shrink-0 flex-col items-center justify-start self-stretch py-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAnalyticsDrawerContentMounted(true);
                                    // Next frame: first paint drawer at width 0 so width transition runs to 100%.
                                    requestAnimationFrame(() => {
                                      requestAnimationFrame(() => setAnalyticsDrawerOpen(true));
                                    });
                                  }}
                                  style={borderAllTheme}
                                  className="inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                                  aria-label="Show analytics"
                                  title="Show analytics"
                                >
                                  <BarChart3 size={18} />
                                </button>
                              </div>
                            ) : (
                              <div
                                onTransitionEnd={onAnalyticsDrawerWidthTransitionEnd}
                                style={{
                                  width: analyticsDrawerOpen
                                    ? DESKTOP_ANALYSIS_DRAWER_WIDTH
                                    : 0,
                                  transition: openMoveRailWidthTransition,
                                }}
                                className={`flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden ${!analyticsDrawerOpen ? "pointer-events-none" : ""}`}
                              >
                                <div className="min-h-0 flex-1 overflow-hidden p-0 open-move-studio-panel-scroll">
                                  <MotionAnalysisPanel
                                    poses={session.poses}
                                    angles={session.angles}
                                    videoUrl={session.videoUrl}
                                    frameIntervalSec={session.frameIntervalSec}
                                    onRequestClose={() => setAnalyticsDrawerOpen(false)}
                                    enableSportAnalysisTab
                                    sportAnalysisKind={sportAnalysisKind}
                                    cyclingAnalysisResult={cyclingAnalysisResult}
                                    cyclingAnalysisError={cyclingAnalysisError}
                                    pullUpsAnalysisResult={pullUpsAnalysisResult}
                                    pullUpsAnalysisError={pullUpsAnalysisError}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className="min-h-0"
                        style={
                          analyticsDrawerContentMounted ||
                          expandStageToRemainingWidth
                            ? {
                                flexGrow: 0,
                                flexShrink: 0,
                                flexBasis: 0,
                                minWidth: 0,
                                maxWidth: 0,
                                overflow: "hidden",
                                pointerEvents: "none",
                              }
                            : {
                                flexGrow: 1,
                                flexShrink: 1,
                                flexBasis: 0,
                                minWidth: 0,
                              }
                        }
                        aria-hidden
                      />
                    </div>
                  </div>
                ) : session.status === "processing_video" ? (
                  <div
                    style={borderAllTheme}
                    className="relative aspect-[9/16] max-h-[70dvh] w-full max-w-lg overflow-hidden rounded-lg bg-[var(--surface)]"
                  >
                    <video
                      src={session.videoUrl}
                      className="w-full h-full object-contain opacity-40"
                      muted
                      playsInline
                      controls={false}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)]">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent,#3b82f6)]" />
                      <p className="text-sm text-[color:var(--foreground)]">Analyzing motion… {tfProgress}%</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog.Root open={guideOpen} onOpenChange={setGuideOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[215] bg-black/60" />
          {/*
            Full-viewport flex shell: centers card (no left:50% + translate). Transparent + pointer-events-none
            so overlay receives outside clicks; py-8 keeps space when vertically centered.
          */}
          <Dialog.Content className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto border-0 bg-transparent px-4 py-8 shadow-none outline-none pointer-events-none">
            <div
              className="pointer-events-auto flex min-w-0 flex-col overflow-hidden rounded-xl bg-[var(--card-bg)] p-3 shadow-2xl backdrop-blur-xl sm:p-4"
              style={{
                ...borderAllTheme,
                height: "min(78vh, 640px)",
                maxHeight: "min(78vh, 640px)",
                width: "min(calc(100vw - 2rem), 600px)",
              }}
            >
              <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                <Dialog.Title className="text-sm text-[color:var(--foreground)]">
                  Usage guide
                </Dialog.Title>
                <Dialog.Close className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                  <X size={18} />
                </Dialog.Close>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden pr-1">
                <UsageGuideCarousel
                  active={guideOpen}
                  appearance="onCard"
                  maxWidth="100%"
                  className="h-full min-h-0"
                />
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Mobile: analytics dialog */}
      <Dialog.Root open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[215] md:hidden" />
          <Dialog.Content
            style={borderAllTheme}
            className="fixed inset-x-2 bottom-2 top-2 z-[220] flex flex-col overflow-hidden rounded-xl bg-[var(--background)] shadow-2xl backdrop-blur-xl md:hidden"
          >
            <div style={borderBottomTheme} className="flex justify-between items-center px-2 py-2 flex-shrink-0">
              <Dialog.Title className="text-sm font-medium text-[color:var(--foreground)]">Motion analysis</Dialog.Title>
              <Dialog.Close className="p-1 rounded text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto open-move-studio-panel-scroll p-2">
              {session.status === "ready" && session.angles && session.videoUrl ? (
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-[color:var(--muted)]" />
                    </div>
                  }
                >
                  <MotionAnalysisPanel
                    poses={session.poses}
                    angles={session.angles}
                    videoUrl={session.videoUrl}
                    frameIntervalSec={session.frameIntervalSec}
                    enableSportAnalysisTab
                    sportAnalysisKind={sportAnalysisKind}
                    cyclingAnalysisResult={cyclingAnalysisResult}
                    cyclingAnalysisError={cyclingAnalysisError}
                    pullUpsAnalysisResult={pullUpsAnalysisResult}
                    pullUpsAnalysisError={pullUpsAnalysisError}
                  />
                </Suspense>
              ) : (
                <p className="text-sm text-[color:var(--muted)] p-4">Load a sample or upload a video first.</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Live record modal */}
      <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[230]" />
          <Dialog.Content
            style={borderAllTheme}
            className="fixed inset-2 z-[231] flex flex-col overflow-hidden rounded-xl bg-[var(--card-bg)] md:inset-8"
          >
            <div style={borderBottomTheme} className="flex justify-between items-center px-3 py-2 flex-shrink-0">
              <Dialog.Title className="text-sm text-[color:var(--foreground)]">Live recording</Dialog.Title>
              <Dialog.Close className="p-2 rounded-lg hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] text-[color:var(--foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center p-2 overflow-auto">
              <LiveVideoPlayer
                onRecordingComplete={onRecordingComplete}
                onMethodChange={() => setShowLiveModal(false)}
                referenceAngles={undefined}
                exercise={null}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    </ConditionalEngineBridge>
  );
}
