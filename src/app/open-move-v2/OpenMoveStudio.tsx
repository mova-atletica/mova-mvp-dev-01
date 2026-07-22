"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Upload,
  Video,
  BarChart3,
  Loader2,
  X,
  Play,
} from "lucide-react";
import LiveVideoPlayer from "../../components/LiveVideoPlayer";
import { UsageGuideCarousel } from "../../components/UsageGuideCarousel";
import {
  computeAngleSeriesFromOpenMovePoses,
  optimizeOpenMovePosesForClient,
} from "../../lib/openMoveAngleSeries";
import {
  createMoveNetDetector,
  processVideoUrlForPoses,
} from "../../lib/tfjsProcessVideo";
import {
  analyzeCyclingDual,
  analyzePlank,
  analyzePoseFlexibility,
  analyzePullUps,
  analyzeSquat,
} from "../../lib/sportAnalysis";
import type {
  CyclingDualAnalysisResult,
  CyclingLeg,
  PoseFlexibilityAnalysisResult,
  PoseFlexibilityFocusArea,
  PoseFlexibilitySide,
  PlankAnalysisResult,
  PlankFacingSide,
  PullUpsAnalysisResult,
  SquatAnalysisResult,
  SquatSide,
  SportAnalysisKind,
} from "../../lib/sportAnalysis";
import type { SportMetricsSnapshot } from "../../lib/effects/stats";

import AssetVideoPlayerStage from "../motion-explore/AssetVideoPlayerStage";
import MotionAnalysisPanel from "../motion-explore/MotionAnalysisPanel";
import {
  AssetVideoPlayerChromeExportFooter,
  AssetVideoPlayerChromeRailScroll,
} from "../motion-explore/AssetVideoPlayerChromeRail";
import { useAssetVideoEngine } from "../motion-explore/useAssetVideoEngine";
import {
  AssetVideoEngineProvider,
  useAssetVideoEngineContext,
  useOptionalAssetVideoEngine,
} from "../motion-explore/assetVideoEngineContext";
import AppMegaMenu from "../../components/AppMegaMenu";
import { buildLeaderboardScorePayload } from "../../lib/leaderboardScore";
import { ProgramModalCloseButton } from "../../components/exercise-studio/ExerciseStudioProgramControls";
import { openMoveSessionHasActiveWork } from "../../lib/openMoveSession";
import {
  ARCHIVE_RAIL_WIDTH_COLLAPSED,
  archiveCollapsedRailControlClass,
} from "../../components/archive/archiveRailTheme";
import OpenMoveSportSetupFields from "./OpenMoveSportSetupFields";
import { EmbeddedModalPopoverProvider } from "../../contexts/EmbeddedModalPopoverContext";
import {
  getSportAnalysisLabel,
  type OpenMoveStudioProps,
} from "../../types/openMoveStudio";

/** Inline theme borders — `var(--border)` from ThemeContext; avoids Tailwind v4 not emitting `.border-border-theme`. */
const borderRightTheme = { borderRight: "1px solid var(--border)" } as const;
const borderBottomTheme = { borderBottom: "1px solid var(--border)" } as const;
const borderTopTheme = { borderTop: "1px solid var(--border)" } as const;
const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;

/** Rail width — CSS transition only (no framer-motion). */
const openMoveRailWidthTransition = "width 0.35s ease-in-out";

/**
 * True when a Radix popover/menu is currently mounted (open) — export format/quality,
 * effect-config selects, apps menu, etc. Used to stop the mobile rail backdrop from closing
 * the panel when a tap is really just dismissing one of those popovers.
 */
function isRailPopoverContentOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector("[data-radix-popper-content-wrapper]"));
}

/** Desktop analysis drawer: fixed cap so landscape video keeps room in the stage row. */
const DESKTOP_ANALYSIS_DRAWER_WIDTH = "clamp(16rem, 36vw, 32rem)";
/** Slightly narrower in the homepage modal so the drawer isn't clipped by modal inset. */
const DESKTOP_ANALYSIS_DRAWER_WIDTH_EMBEDDED = "clamp(14rem, 26vw, 22rem)";
const FEATURED_VIDEO_MP4_PATH = "/featured/featured.mp4";
const FEATURED_KEYPOINTS_PATH = "/featured/featured-keypoints.json";
const FEATURED_FRAME_INTERVAL_SEC = 0.1;
const MOBILE_PERFORMANCE_NOTICE_STORAGE_KEY = "openMoveMobilePerformanceNoticeDismissed";

function openMovePortalLayers(embedded: boolean) {
  if (!embedded) {
    return {
      mobileRailBackdrop: 200,
      mobileRail: 210,
      guideOverlay: 215,
      guideContent: 220,
      analyticsOverlay: 215,
      analyticsContent: 220,
      performanceOverlay: 225,
      performanceContent: 226,
      liveOverlay: 230,
      liveContent: 231,
    } as const;
  }
  return {
    mobileRailBackdrop: 300,
    mobileRail: 310,
    guideOverlay: 315,
    guideContent: 320,
    analyticsOverlay: 315,
    analyticsContent: 320,
    performanceOverlay: 325,
    performanceContent: 326,
    liveOverlay: 330,
    liveContent: 331,
  } as const;
}

/** Stage overlay play/pause — tap center play to start, tap video area to pause. */
function StudioStagePlaybackOverlay() {
  const engine = useOptionalAssetVideoEngine();
  if (!engine) return null;
  const { isPlaying, toggleVideoPlayback } = engine;
  return (
    <>
      {isPlaying ? (
        <button
          type="button"
          onClick={toggleVideoPlayback}
          className="absolute inset-0 z-20 cursor-pointer"
          aria-label="Pause video"
        >
          
        </button>
      ) : (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <button
            type="button"
            onClick={toggleVideoPlayback}
            style={borderAllTheme}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] text-[color:var(--foreground)] shadow-lg backdrop-blur-md transition hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
            aria-label="Play video"
            title="Play"
          >
            <Play className="h-5 w-5 translate-x-[1px]" stroke="currentColor" />
          </button>
        </div>
      )}
    </>
  );
}

function PausePlaybackWhenMobileAnalyticsOpen({ active }: { active: boolean }) {
  const engine = useOptionalAssetVideoEngine();

  useEffect(() => {
    if (!active) return;
    const video = engine?.videoRef?.current;
    if (!video || video.paused) return;
    video.pause();
  }, [active, engine]);

  return null;
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
  sportMetricsSnapshot: SportMetricsSnapshot | null;
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
  showVideoEngine,
  children,
}: {
  session: SessionState;
  sportAnalysisKind: SportAnalysisKind;
  sportMetricsSnapshot: SportMetricsSnapshot | null;
  showVideoEngine: boolean;
  children: React.ReactNode;
}) {
  if (
    showVideoEngine &&
    session.status === "ready" &&
    session.videoUrl &&
    (session.poses?.length ?? 0) > 0
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
  | "idle"
  | "loading_sample"
  | "clip_ready"
  | "processing_video"
  | "ready"
  | "error";

type AnalyzedSetupSnapshot = {
  cyclingLeg: CyclingLeg;
  plankFacingSide: PlankFacingSide;
  squatSide: SquatSide;
  poseFlexibilitySide: PoseFlexibilitySide;
  poseFlexibilityFocusAreas: PoseFlexibilityFocusArea[];
};

function analyzedSetupSnapshot(
  cyclingLeg: CyclingLeg,
  plankFacingSide: PlankFacingSide,
  squatSide: SquatSide,
  poseFlexibilitySide: PoseFlexibilitySide,
  poseFlexibilityFocusAreas: PoseFlexibilityFocusArea[]
): AnalyzedSetupSnapshot {
  return {
    cyclingLeg,
    plankFacingSide,
    squatSide,
    poseFlexibilitySide,
    poseFlexibilityFocusAreas: [...poseFlexibilityFocusAreas],
  };
}

function analyzedSetupsMatch(a: AnalyzedSetupSnapshot, b: AnalyzedSetupSnapshot): boolean {
  if (a.cyclingLeg !== b.cyclingLeg) return false;
  if (a.plankFacingSide !== b.plankFacingSide) return false;
  if (a.squatSide !== b.squatSide) return false;
  if (a.poseFlexibilitySide !== b.poseFlexibilitySide) return false;
  if (a.poseFlexibilityFocusAreas.length !== b.poseFlexibilityFocusAreas.length) return false;
  return a.poseFlexibilityFocusAreas.every((area) => b.poseFlexibilityFocusAreas.includes(area));
}

type SessionState = {
  status: SessionStatus;
  errorMessage?: string;
  videoUrl: string | null;
  videoSources: Array<{ src: string; type: string }> | null;
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
  /** Featured clip URL from first paint so the browser can fetch video while keypoints load. */
  videoUrl: FEATURED_VIDEO_MP4_PATH,
  videoSources: null,
  poses: [],
  angles: null,
  frameIntervalSec: null,
  sessionLabel: "",
  source: "featured",
};

const idleSession: SessionState = {
  status: "idle",
  videoUrl: null,
  videoSources: null,
  poses: [],
  angles: null,
  frameIntervalSec: null,
  sessionLabel: "",
  source: "upload",
};

/** Archive modal — default Open Movement Viz starts empty (no featured sample). */
const embeddedStudioIdleSession: SessionState = { ...idleSession };

export default function OpenMoveStudio({
  mode = "default",
  initialSport = "pullups",
  analysisTitle,
  setupHint,
  embedded = false,
  embeddedCloseConfirmOpen = false,
  onClose,
  onActiveSessionChange,
  analysisSlug,
  onQuickAnalysisComplete,
  onStudioSessionPersist,
}: OpenMoveStudioProps = {}) {
  const isQuickAnalysis = mode === "quickAnalysis";
  const embeddedQuickAnalysis = embedded && isQuickAnalysis;
  const portalLayers = openMovePortalLayers(embedded);
  const skipFeaturedSample = embedded && !isQuickAnalysis;
  const deferRailUntilVideo = skipFeaturedSample || embeddedQuickAnalysis;
  const [session, setSession] = useState<SessionState>(() => {
    if (isQuickAnalysis) return idleSession;
    if (skipFeaturedSample) return embeddedStudioIdleSession;
    return initialSession;
  });
  const sessionVideoUrlRef = useRef<string | null>(session.videoUrl);
  sessionVideoUrlRef.current = session.videoUrl;
  const studioPersistKeyRef = useRef<string | null>(null);
  const railVisible = !deferRailUntilVideo || session.status !== "idle";
  /** MVP sport analysis (cleared when a new clip is processed). */
  const [cyclingAnalysisResult, setCyclingAnalysisResult] = useState<CyclingDualAnalysisResult | null>(null);
  const [cyclingAnalysisError, setCyclingAnalysisError] = useState<string | null>(null);
  const [pullUpsAnalysisResult, setPullUpsAnalysisResult] = useState<PullUpsAnalysisResult | null>(null);
  const [pullUpsAnalysisError, setPullUpsAnalysisError] = useState<string | null>(null);
  const [plankAnalysisResult, setPlankAnalysisResult] = useState<PlankAnalysisResult | null>(null);
  const [plankAnalysisError, setPlankAnalysisError] = useState<string | null>(null);
  const [squatAnalysisResult, setSquatAnalysisResult] = useState<SquatAnalysisResult | null>(null);
  const [squatAnalysisError, setSquatAnalysisError] = useState<string | null>(null);
  const [poseFlexibilityAnalysisResult, setPoseFlexibilityAnalysisResult] =
    useState<PoseFlexibilityAnalysisResult | null>(null);
  const [poseFlexibilityAnalysisError, setPoseFlexibilityAnalysisError] = useState<string | null>(null);
  const sportAnalysisKind: SportAnalysisKind = isQuickAnalysis ? initialSport : "cycling";
  const [cyclingLeg, setCyclingLeg] = useState<CyclingLeg>("left");
  const [cyclingKneeMenuOpen, setCyclingKneeMenuOpen] = useState(false);
  const [plankFacingSide, setPlankFacingSide] = useState<PlankFacingSide>("left");
  const [plankSideMenuOpen, setPlankSideMenuOpen] = useState(false);
  const [squatSide, setSquatSide] = useState<SquatSide>("left");
  const [squatSideMenuOpen, setSquatSideMenuOpen] = useState(false);
  const [poseFlexibilitySide, setPoseFlexibilitySide] = useState<PoseFlexibilitySide>("left");
  const [poseFlexibilitySideMenuOpen, setPoseFlexibilitySideMenuOpen] = useState(false);
  const [poseFlexibilityFocusAreas, setPoseFlexibilityFocusAreas] = useState<PoseFlexibilityFocusArea[]>([
    "hips",
    "torso",
  ]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [lastAnalyzedSetup, setLastAnalyzedSetup] = useState<AnalyzedSetupSnapshot | null>(null);
  const [panelOpen, setPanelOpen] = useState(() => !deferRailUntilVideo);
  const [isDesktop, setIsDesktop] = useState(false);
  const [viewportResolved, setViewportResolved] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(true);
  /** Keeps analysis UI mounted until width collapse finishes so close animation stays smooth. */
  const [analyticsDrawerContentMounted, setAnalyticsDrawerContentMounted] = useState(true);
  const analyticsDrawerOpenRef = useRef(analyticsDrawerOpen);
  analyticsDrawerOpenRef.current = analyticsDrawerOpen;
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobilePerformanceNoticeOpen, setMobilePerformanceNoticeOpen] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [tfProgress, setTfProgress] = useState(0);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectorRef = useRef<Awaited<ReturnType<typeof createMoveNetDetector>> | null>(null);
  const [videoIntrinsicAspect, setVideoIntrinsicAspect] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /** Avoid SSR mismatch; portal target only exists on client. */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  /**
   * Defer backdrop pointer events so the same touch that opened the rail
   * does not immediately hit the full-screen close target (ghost close).
   */
  const [mobileRailBackdropReady, setMobileRailBackdropReady] = useState(false);
  /**
   * Set on the backdrop's pointerdown when a rail popover is open, so the ensuing click
   * (which really dismissed the popover) does not also collapse the panel.
   */
  const suppressBackdropCloseRef = useRef(false);

  /**
   * Portal mobile rail into the studio root (not document.body) so embedded Dialog
   * treats panel taps as inside content. Whitelisting body-portaled rail + preventDefault
   * on onPointerDownOutside cancels the original pointerdown and breaks all panel clicks.
   */
  const setStudioRootRef = useCallback((node: HTMLDivElement | null) => {
    setPortalTarget(node);
  }, []);
  const overlaySportMetricsSnapshot = useMemo(() => {
    if (!isQuickAnalysis) return null;
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
    const squatReps = squatAnalysisResult?.rep_count ?? null;
    const poseFlexMetrics = poseFlexibilityAnalysisResult?.focusMetrics ?? [];
    const poseMetric = (focusArea: PoseFlexibilityFocusArea) =>
      poseFlexMetrics.find((metric) => metric.focusArea === focusArea)?.value ?? null;

    const computeElbowSymmetry = () => {
      if (!session.angles) return null;
      const leftRaw = session.angles.leftElbowAngles;
      const rightRaw = session.angles.rightElbowAngles;
      if (!leftRaw?.length || !rightRaw?.length) return null;
      const left = leftRaw.filter((v) => v != null) as number[];
      const right = rightRaw.filter((v) => v != null) as number[];
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
      plankHoldDurationSec: plankAnalysisResult?.holdDurationSec ?? null,
      plankCorrectionCount: plankAnalysisResult?.correctionCount ?? null,
      plankAvgHipDeviation: null,
      plankAvgHipAngleDeg: plankAnalysisResult?.avgHipAngleDeg ?? null,
      squatRepCount: squatReps,
      poseFlexibilityLegsDeg: poseMetric("legs"),
      poseFlexibilityHipsDeg: poseMetric("hips"),
      poseFlexibilityTorsoDeg: poseMetric("torso"),
      poseFlexibilityShouldersDeg: poseMetric("shoulders"),
    };
  }, [
    isQuickAnalysis,
    cyclingAnalysisResult,
    pullUpsAnalysisResult,
    plankAnalysisResult,
    squatAnalysisResult,
    poseFlexibilityAnalysisResult,
    session.angles,
  ]);

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
    const onChange = () => {
      setIsDesktop(mq.matches);
      setViewportResolved(true);
    };
    onChange();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!viewportResolved) return;
    if (isDesktop) {
      setMobilePerformanceNoticeOpen(false);
      return;
    }
    try {
      if (window.localStorage.getItem(MOBILE_PERFORMANCE_NOTICE_STORAGE_KEY) === "true") return;
    } catch {
      // If storage is unavailable, show the notice for this session only.
    }
    setMobilePerformanceNoticeOpen(true);
  }, [isDesktop, viewportResolved]);

  const dismissMobilePerformanceNotice = useCallback(() => {
    try {
      window.localStorage.setItem(MOBILE_PERFORMANCE_NOTICE_STORAGE_KEY, "true");
    } catch {
      // Storage can be unavailable in restricted browser modes.
    }
    setMobilePerformanceNoticeOpen(false);
  }, []);

  useEffect(() => {
    onActiveSessionChange?.(openMoveSessionHasActiveWork(session, isQuickAnalysis));
  }, [session, isQuickAnalysis, onActiveSessionChange]);

  useEffect(() => {
    if (deferRailUntilVideo && session.status !== "idle") {
      setPanelOpen(true);
    }
  }, [deferRailUntilVideo, session.status]);

  useEffect(() => {
    if (embeddedCloseConfirmOpen) {
      setPanelOpen(false);
    }
  }, [embeddedCloseConfirmOpen]);

  const togglePoseFlexibilityFocusArea = useCallback((area: PoseFlexibilityFocusArea) => {
    setPoseFlexibilityFocusAreas((prev) => {
      if (prev.includes(area)) {
        return prev.length <= 1 ? prev : prev.filter((item) => item !== area);
      }
      return prev.length >= 3 ? prev : [...prev, area];
    });
  }, []);

  useEffect(() => {
    if (!session.videoUrl) {
      setVideoIntrinsicAspect(null);
      return;
    }
    if (
      session.status !== "ready" &&
      session.status !== "loading_sample" &&
      session.status !== "processing_video" &&
      session.status !== "clip_ready"
    ) {
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

  const currentSetup = useMemo(
    () =>
      analyzedSetupSnapshot(
        cyclingLeg,
        plankFacingSide,
        squatSide,
        poseFlexibilitySide,
        poseFlexibilityFocusAreas
      ),
    [cyclingLeg, plankFacingSide, squatSide, poseFlexibilitySide, poseFlexibilityFocusAreas]
  );

  const setupChangedFromLastAnalyze = useMemo(() => {
    if (!lastAnalyzedSetup) return false;
    return !analyzedSetupsMatch(currentSetup, lastAnalyzedSetup);
  }, [currentSetup, lastAnalyzedSetup]);

  const sessionHasVideo = session.status !== "idle" && Boolean(session.videoUrl);
  const showVideoEngine = !embeddedQuickAnalysis || hasAnalyzed;
  const showAnalyzeButton =
    embeddedQuickAnalysis &&
    sessionHasVideo &&
    (!hasAnalyzed || setupChangedFromLastAnalyze);


  const clearSportAnalysisResults = useCallback(() => {
    setCyclingAnalysisResult(null);
    setCyclingAnalysisError(null);
    setPullUpsAnalysisResult(null);
    setPullUpsAnalysisError(null);
    setPlankAnalysisResult(null);
    setPlankAnalysisError(null);
    setSquatAnalysisResult(null);
    setSquatAnalysisError(null);
    setPoseFlexibilityAnalysisResult(null);
    setPoseFlexibilityAnalysisError(null);
  }, []);

  const applySportAnalysisFromData = useCallback(
    (
      angles: NonNullable<SessionState["angles"]>,
      poses: any[],
      frameIntervalSec: number,
      setup: AnalyzedSetupSnapshot
    ) => {
      const emitQuickComplete = (
        kind: SportAnalysisKind,
        sportAnalysis: unknown,
        scoreBuilder: () => ReturnType<typeof buildLeaderboardScorePayload>
      ) => {
        if (!isQuickAnalysis || !analysisSlug || !onQuickAnalysisComplete) return;
        const payload = scoreBuilder();
        if (!payload) return;
        onQuickAnalysisComplete(payload, {
          videoUrl: sessionVideoUrlRef.current,
          angles,
          poses,
          frameIntervalSec,
          sportAnalysisKind: kind,
          sportAnalysis,
        });
      };

      if (sportAnalysisKind === "cycling") {
        setCyclingAnalysisResult(null);
        setCyclingAnalysisError(null);
        const res = analyzeCyclingDual({
          leftKneeAngles: angles.leftKneeAngles,
          rightKneeAngles: angles.rightKneeAngles,
          frameIntervalSec,
          leg: setup.cyclingLeg,
        });
        if (res.ok) {
          setCyclingAnalysisResult(res.result);
          setCyclingAnalysisError(null);
          emitQuickComplete("cycling", res.result, () =>
            buildLeaderboardScorePayload(analysisSlug!, "cycling", { cycling: res.result })
          );
        } else {
          setCyclingAnalysisResult(null);
          setCyclingAnalysisError(res.error);
        }
        return;
      }
      if (sportAnalysisKind === "pullups") {
        setPullUpsAnalysisResult(null);
        setPullUpsAnalysisError(null);
        const res = analyzePullUps({
          leftElbowAngles: angles.leftElbowAngles,
          rightElbowAngles: angles.rightElbowAngles,
          frameIntervalSec,
        });
        if (res.ok) {
          setPullUpsAnalysisResult(res.result);
          setPullUpsAnalysisError(null);
          emitQuickComplete("pullups", res.result, () =>
            buildLeaderboardScorePayload(analysisSlug!, "pullups", { pullUps: res.result })
          );
        } else {
          setPullUpsAnalysisResult(null);
          setPullUpsAnalysisError(res.error);
        }
        return;
      }
      if (sportAnalysisKind === "plank") {
        setPlankAnalysisResult(null);
        setPlankAnalysisError(null);
        const res = analyzePlank({
          poses,
          frameIntervalSec,
          facingSide: setup.plankFacingSide,
        });
        if (res.ok) {
          setPlankAnalysisResult(res.result);
          setPlankAnalysisError(null);
          emitQuickComplete("plank", res.result, () =>
            buildLeaderboardScorePayload(analysisSlug!, "plank", { plank: res.result })
          );
        } else {
          setPlankAnalysisResult(null);
          setPlankAnalysisError(res.error);
        }
        return;
      }
      if (sportAnalysisKind === "squat") {
        setSquatAnalysisResult(null);
        setSquatAnalysisError(null);
        const squatRes = analyzeSquat({
          poses,
          frameIntervalSec,
          side: setup.squatSide,
        });
        if (squatRes.ok) {
          setSquatAnalysisResult(squatRes.result);
          setSquatAnalysisError(null);
          emitQuickComplete("squat", squatRes.result, () =>
            buildLeaderboardScorePayload(analysisSlug!, "squat", { squat: squatRes.result })
          );
        } else {
          setSquatAnalysisResult(null);
          setSquatAnalysisError(squatRes.error);
        }
        return;
      }
      setPoseFlexibilityAnalysisResult(null);
      setPoseFlexibilityAnalysisError(null);
      const poseFlexRes = analyzePoseFlexibility({
        poses,
        frameIntervalSec,
        side: setup.poseFlexibilitySide,
        focusAreas: setup.poseFlexibilityFocusAreas,
      });
      if (poseFlexRes.ok) {
        setPoseFlexibilityAnalysisResult(poseFlexRes.result);
        setPoseFlexibilityAnalysisError(null);
        emitQuickComplete("poseFlexibility", poseFlexRes.result, () =>
          buildLeaderboardScorePayload(analysisSlug!, "poseFlexibility", {
            poseFlexibility: poseFlexRes.result,
          })
        );
      } else {
        setPoseFlexibilityAnalysisResult(null);
        setPoseFlexibilityAnalysisError(poseFlexRes.error);
      }
    },
    [sportAnalysisKind, isQuickAnalysis, analysisSlug, onQuickAnalysisComplete]
  );

  const persistStudioSessionIfNeeded = useCallback(
    (
      angles: NonNullable<SessionState["angles"]>,
      poses: any[],
      frameIntervalSec: number,
      videoUrl: string | null,
      sessionLabel: string | null
    ) => {
      if (isQuickAnalysis || !onStudioSessionPersist) return;
      const key = `${videoUrl ?? ""}:${poses.length}:${frameIntervalSec}`;
      if (studioPersistKeyRef.current === key) return;
      studioPersistKeyRef.current = key;
      onStudioSessionPersist({
        videoUrl,
        angles,
        poses,
        frameIntervalSec,
        sessionLabel,
      });
    },
    [isQuickAnalysis, onStudioSessionPersist]
  );

  const attachVideoClip = useCallback(
    (videoUrl: string, label: string, source: SessionState["source"]) => {
      clearSportAnalysisResults();
      setHasAnalyzed(false);
      setLastAnalyzedSetup(null);
      studioPersistKeyRef.current = null;
      setSession({
        status: "clip_ready",
        videoUrl,
        videoSources: null,
        poses: [],
        angles: null,
        frameIntervalSec: null,
        sessionLabel: label,
        source,
        errorMessage: undefined,
      });
    },
    [clearSportAnalysisResults]
  );

  const runEmbeddedAnalyze = useCallback(async () => {
    const videoUrl = session.videoUrl;
    if (!videoUrl) return;

    if (
      hasAnalyzed &&
      session.status === "ready" &&
      session.angles &&
      session.frameIntervalSec != null
    ) {
      if (!setupChangedFromLastAnalyze) return;
      applySportAnalysisFromData(
        session.angles,
        session.poses,
        session.frameIntervalSec,
        currentSetup
      );
      setLastAnalyzedSetup(currentSetup);
      return;
    }

    if (session.status !== "clip_ready" && session.status !== "error") return;

    const detector = detectorRef.current;
    if (!detector) {
      setSession((s) => ({
        ...s,
        status: "error",
        errorMessage: "Pose model is still loading. Wait a moment and try again.",
      }));
      return;
    }

    clearSportAnalysisResults();
    setHasAnalyzed(false);
    setLastAnalyzedSetup(null);
    setSession((s) => ({
      ...s,
      status: "processing_video",
      videoUrl,
      videoSources: null,
      errorMessage: undefined,
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
      const optimized = optimizeOpenMovePosesForClient(poses);
      const angles = computeAngleSeriesFromOpenMovePoses(optimized);
      setSession({
        status: "ready",
        videoUrl,
        videoSources: null,
        poses: optimized,
        angles,
        frameIntervalSec,
        sessionLabel: session.sessionLabel,
        source: session.source,
      });
      applySportAnalysisFromData(angles, optimized, frameIntervalSec, currentSetup);
      setHasAnalyzed(true);
      setLastAnalyzedSetup(currentSetup);
      persistStudioSessionIfNeeded(
        angles,
        optimized,
        frameIntervalSec,
        videoUrl,
        session.sessionLabel ?? null
      );
    } catch (e) {
      console.error(e);
      setSession((s) => ({
        ...s,
        status: "clip_ready",
        errorMessage: e instanceof Error ? e.message : "Could not analyze this video.",
        poses: [],
        angles: null,
        frameIntervalSec: null,
      }));
    }
  }, [
    session.videoUrl,
    session.status,
    session.angles,
    session.frameIntervalSec,
    session.poses,
    session.sessionLabel,
    session.source,
    hasAnalyzed,
    setupChangedFromLastAnalyze,
    currentSetup,
    clearSportAnalysisResults,
    applySportAnalysisFromData,
    persistStudioSessionIfNeeded,
  ]);

  const applyProcessedVideo = useCallback(
    (
      videoUrl: string,
      videoSources: Array<{ src: string; type: string }> | null,
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
      setPlankAnalysisResult(null);
      setPlankAnalysisError(null);
      setSquatAnalysisResult(null);
      setSquatAnalysisError(null);
      setPoseFlexibilityAnalysisResult(null);
      setPoseFlexibilityAnalysisError(null);
      setSession({
        status: "ready",
        videoUrl,
        videoSources,
        poses: optimized,
        angles,
        frameIntervalSec,
        sessionLabel: label,
        source,
      });
      persistStudioSessionIfNeeded(angles, optimized, frameIntervalSec, videoUrl, label);
    },
    [persistStudioSessionIfNeeded]
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
      setPlankAnalysisResult(null);
      setPlankAnalysisError(null);
      setSquatAnalysisResult(null);
      setSquatAnalysisError(null);
      setPoseFlexibilityAnalysisResult(null);
      setPoseFlexibilityAnalysisError(null);
      setSession((s) => ({
        ...s,
        status: "processing_video",
        videoUrl,
        videoSources: null,
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
        applyProcessedVideo(videoUrl, null, poses, label, source, frameIntervalSec);
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
    setPlankAnalysisResult(null);
    setPlankAnalysisError(null);
    setSquatAnalysisResult(null);
    setSquatAnalysisError(null);
    setPoseFlexibilityAnalysisResult(null);
    setPoseFlexibilityAnalysisError(null);
    setSession({ ...initialSession, status: "loading_sample" });
    try {
      const keypointsRes = await fetch(FEATURED_KEYPOINTS_PATH, { cache: "default" });
      if (!keypointsRes.ok) {
        setSession({
          ...initialSession,
          status: "error",
          videoUrl: null,
          errorMessage:
            "Featured sample unavailable. Upload a video or record live to continue.",
        });
        return;
      }
      const raw = await keypointsRes.json();
      const posesArray = Array.isArray(raw) ? raw : (raw as { poses?: any[] }).poses;
      if (!posesArray?.length) {
        setSession({
          ...initialSession,
          status: "error",
          videoUrl: null,
          errorMessage:
            "Featured sample unavailable. Upload a video or record live to continue.",
        });
        return;
      }
      applyProcessedVideo(
        FEATURED_VIDEO_MP4_PATH,
        null,
        posesArray,
        "Featured sample",
        "featured",
        FEATURED_FRAME_INTERVAL_SEC
      );
    } catch (e) {
      console.error(e);
      setSession({
        ...initialSession,
        status: "error",
        videoUrl: null,
        errorMessage:
          "Featured sample unavailable. Upload a video or record live to continue.",
      });
    }
  }, [applyProcessedVideo]);

  const runSportAnalysis = useCallback(() => {
    if (!session.angles || session.frameIntervalSec == null) return;
    applySportAnalysisFromData(
      session.angles,
      session.poses,
      session.frameIntervalSec,
      currentSetup
    );
  }, [
    session.angles,
    session.frameIntervalSec,
    session.poses,
    currentSetup,
    applySportAnalysisFromData,
  ]);

  useEffect(() => {
    if (!isQuickAnalysis && !embedded) {
      loadFeaturedSample();
    }
  }, [isQuickAnalysis, embedded, loadFeaturedSample]);

  useEffect(() => {
    if (!isQuickAnalysis || embeddedQuickAnalysis) return;
    if (session.status !== "ready") return;
    if (!session.angles || session.frameIntervalSec == null) return;
    runSportAnalysis();
  }, [
    isQuickAnalysis,
    embeddedQuickAnalysis,
    session.status,
    session.angles,
    session.frameIntervalSec,
    session.poses,
    cyclingLeg,
    plankFacingSide,
    squatSide,
    poseFlexibilitySide,
    poseFlexibilityFocusAreas,
    sportAnalysisKind,
    runSportAnalysis,
  ]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (embeddedQuickAnalysis) {
      attachVideoClip(url, file.name || "Uploaded video", "upload");
      e.target.value = "";
      return;
    }
    await runTfjsOnUrl(url, file.name || "Uploaded video", "upload");
    e.target.value = "";
  };

  const onRecordingComplete = async (url: string) => {
    setShowLiveModal(false);
    if (embeddedQuickAnalysis) {
      attachVideoClip(url, "Live recording", "live");
      return;
    }
    await runTfjsOnUrl(url, "Live recording", "live");
  };

  const sportSetupFields = (
    <OpenMoveSportSetupFields
      embedded={embedded}
      sportAnalysisKind={sportAnalysisKind}
      cyclingLeg={cyclingLeg}
      cyclingKneeMenuOpen={cyclingKneeMenuOpen}
      onCyclingKneeMenuOpenChange={setCyclingKneeMenuOpen}
      onCyclingLegChange={setCyclingLeg}
      plankFacingSide={plankFacingSide}
      plankSideMenuOpen={plankSideMenuOpen}
      onPlankSideMenuOpenChange={setPlankSideMenuOpen}
      onPlankFacingSideChange={setPlankFacingSide}
      squatSide={squatSide}
      squatSideMenuOpen={squatSideMenuOpen}
      onSquatSideMenuOpenChange={setSquatSideMenuOpen}
      onSquatSideChange={setSquatSide}
      poseFlexibilitySide={poseFlexibilitySide}
      poseFlexibilitySideMenuOpen={poseFlexibilitySideMenuOpen}
      onPoseFlexibilitySideMenuOpenChange={setPoseFlexibilitySideMenuOpen}
      onPoseFlexibilitySideChange={setPoseFlexibilitySide}
      poseFlexibilityFocusAreas={poseFlexibilityFocusAreas}
      onTogglePoseFlexibilityFocusArea={togglePoseFlexibilityFocusArea}
    />
  );

  const uploadRecordDisabled =
    session.status === "processing_video" || (!embeddedQuickAnalysis && !detectorReady);

  const uploadRecordButtons = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadRecordDisabled}
        style={borderAllTheme}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
      >
        <Upload size={12} /> Upload
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
        /
      </span>
      <button
        type="button"
        onClick={() => setShowLiveModal(true)}
        disabled={uploadRecordDisabled}
        style={borderAllTheme}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
      >
        <Video size={12} /> Record
      </button>
    </div>
  );

  const desktopCollapsedRail = (
    <div className="flex h-full flex-col items-center gap-3 py-3">
      {!embedded ? (
        <Link
          href="/"
          className={archiveCollapsedRailControlClass}
          aria-label="Mova Archive home"
          title="Mova Archive"
        >
          <Image
            src="/images/brand/logo/Logo_Contained.svg"
            alt=""
            width={24}
            height={24}
            className="h-8 w-8"
            style={{ filter: "var(--logo-color)" }}
          />
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        style={borderAllTheme}
        className={`${archiveCollapsedRailControlClass} text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]`}
        aria-label="Expand panel"
        title="Expand panel"
      >
        <PanelLeftOpen size={18} />
      </button>
      {embedded && onClose ? (
        <ProgramModalCloseButton onClose={onClose} />
      ) : (
        <AppMegaMenu activeApp="studio" iconOnly embeddedInModal={embedded} />
      )}
    </div>
  );

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sticky header: title, upload/record, play/pause when ready */}
      <div
        style={borderBottomTheme}
        className="sticky top-0 z-10 flex-shrink-0 p-8 pb-4"
      >
        <div className="relative space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="font-light uppercase tracking-wider text-[color:var(--muted-foreground)]" style={{ fontSize: "18px" }}>
                {isQuickAnalysis ? analysisTitle ?? getSportAnalysisLabel(sportAnalysisKind) : "Open Movement Viz"}
              </h1>
              <p className="mt-0 text-xs font-normal leading-relaxed text-[color:var(--muted)]">
                {embeddedQuickAnalysis ? (
                  <>
                    {setupHint ? `${setupHint}. ` : null}
                    Upload or record a clip, then choose your setup and analyze.
                  </>
                ) : isQuickAnalysis ? (
                  <>
                    {setupHint ? `${setupHint}. ` : null}
                    Upload or record a clip — analysis runs automatically when ready.
                  </>
                ) : (
                  <>
                    Visualize body movement with effects and joint charts. For best results, please{" "}
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      className="text-[12px] font-normal text-[color:var(--muted-foreground)] underline decoration-border-theme underline-offset-2 transition-all hover:text-[color:var(--foreground)] hover:decoration-[color:var(--muted-foreground)]"
                    >
                      read our usage guide.
                    </button>
                  </>
                )}
              </p>
            </div>
            <div className="relative z-30 flex items-center gap-2">
              {embedded && onClose ? (
                <ProgramModalCloseButton onClose={onClose} />
              ) : (
                <AppMegaMenu activeApp="studio" embeddedInModal={embedded} />
              )}
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

          {embeddedQuickAnalysis ? (
            <>
              <div style={borderTopTheme} className="space-y-2 pt-2">
                <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  1. Upload or record video
                </p>
                {uploadRecordButtons}
                {session.sessionLabel ? (
                  <p className="line-clamp-2 text-[11px] text-[color:var(--muted)]">
                    <span className="text-[color:var(--muted-foreground)]">Current video source:</span>{" "}
                    {session.sessionLabel}
                  </p>
                ) : null}
              </div>
              {sessionHasVideo ? (
                <div style={borderTopTheme} className="space-y-2 pt-2">
                  <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    2. Setup
                  </p>
                  {sportSetupFields}
                  {session.status === "clip_ready" ? (
                    <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                      Choose your setup, then analyze.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {showAnalyzeButton ? (
                <div style={borderTopTheme} className="space-y-2 pt-2">
                  {session.errorMessage && session.status === "clip_ready" ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{session.errorMessage}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void runEmbeddedAnalyze()}
                    disabled={
                      session.status === "processing_video" ||
                      !detectorReady ||
                      poseFlexibilityFocusAreas.length < 1
                    }
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent,#3b82f6)] px-3 py-2.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {hasAnalyzed && setupChangedFromLastAnalyze ? "Re-analyze" : "Analyze"}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {isQuickAnalysis ? (
                <div style={borderTopTheme} className="space-y-2 pt-2">
                  <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    1. Setup
                  </p>
                  {sportSetupFields}
                </div>
              ) : null}

              <div style={borderTopTheme} className="space-y-2 pt-2">
                <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  {isQuickAnalysis ? "2. Upload or record video" : "1. Upload or record video"}
                </p>
                {uploadRecordButtons}
                {session.sessionLabel ? (
                  <p className="line-clamp-2 text-[11px] text-[color:var(--muted)]">
                    <span className="text-[color:var(--muted-foreground)]">Current video source:</span>{" "}
                    {session.sessionLabel}
                  </p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/*
        Layout contract: fill space below header with a flex column so ChromeRail gets a height budget.
        Do not wrap StudioPanelChrome in overflow-y-auto — ChromeRail owns scroll + pinned export footer.
      */}
      <div className="flex min-h-0 flex-1 flex-col">
        {session.status === "processing_video" ? (
          <div style={borderBottomTheme} className="flex-shrink-0 p-2">
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

        {session.status === "ready" && (!embeddedQuickAnalysis || hasAnalyzed) ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto p-8 pt-2">
              {isQuickAnalysis && !embeddedQuickAnalysis ? (
                <div className="mb-0 space-y-2 text-[color:var(--foreground)]">
                  <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                    3. Analysis
                  </p>
                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                    {getSportAnalysisLabel(sportAnalysisKind)}
                  </p>
                  <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                    Analysis runs automatically when your clip is ready.
                  </p>
                  {sportAnalysisKind === "cycling" && cyclingAnalysisError ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{cyclingAnalysisError}</p>
                  ) : sportAnalysisKind === "cycling" && cyclingAnalysisResult ? (
                    <p className="text-[10px] text-[color:var(--muted)]">
                      View results in the &quot;Sport analysis&quot; tab.
                    </p>
                  ) : null}
                  {sportAnalysisKind === "pullups" && pullUpsAnalysisError ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{pullUpsAnalysisError}</p>
                  ) : sportAnalysisKind === "pullups" && pullUpsAnalysisResult ? (
                    <p className="text-[10px] text-[color:var(--muted)]">
                      View results in the &quot;Sport analysis&quot; tab.
                    </p>
                  ) : null}
                  {sportAnalysisKind === "plank" && plankAnalysisError ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{plankAnalysisError}</p>
                  ) : sportAnalysisKind === "plank" && plankAnalysisResult ? (
                    <p className="text-[10px] text-[color:var(--muted)]">
                      View results in the &quot;Sport analysis&quot; tab.
                    </p>
                  ) : null}
                  {sportAnalysisKind === "squat" && squatAnalysisError ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{squatAnalysisError}</p>
                  ) : sportAnalysisKind === "squat" && squatAnalysisResult ? (
                    <p className="text-[10px] text-[color:var(--muted)]">
                      View results in the &quot;Sport analysis&quot; tab.
                    </p>
                  ) : null}
                  {sportAnalysisKind === "poseFlexibility" && poseFlexibilityAnalysisError ? (
                    <p className="text-[10px] leading-snug text-red-500/90">{poseFlexibilityAnalysisError}</p>
                  ) : sportAnalysisKind === "poseFlexibility" && poseFlexibilityAnalysisResult ? (
                    <p className="text-[10px] text-[color:var(--muted)]">
                      View results in the &quot;Sport analysis&quot; tab.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <p
                className={`mb-0 text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)] ${isQuickAnalysis && !embeddedQuickAnalysis ? "mt-6" : ""}`}
              >
                {isQuickAnalysis
                  ? embeddedQuickAnalysis
                    ? "3. Movement Visualization"
                    : "4. Movement Visualization"
                  : "2. Movement Visualization"}
              </p>
              <StudioPanelChrome scrollContainer="passthrough" />
            </div>
            <StudioRailExportFooter />
          </div>
        ) : null}
      </div>
    </div>
  );

  const sportAnalysisPanelProps = isQuickAnalysis
    ? {
        enableSportAnalysisTab: true as const,
        sportAnalysisKind,
        cyclingAnalysisResult,
        cyclingAnalysisError,
        pullUpsAnalysisResult,
        pullUpsAnalysisError,
        plankAnalysisResult,
        plankAnalysisError,
        squatAnalysisResult,
        squatAnalysisError,
        poseFlexibilityAnalysisResult,
        poseFlexibilityAnalysisError,
      }
    : { enableSportAnalysisTab: false as const };

  return (
    <EmbeddedModalPopoverProvider embeddedInModal={embedded}>
    <ConditionalEngineBridge
      session={session}
      sportAnalysisKind={sportAnalysisKind}
      sportMetricsSnapshot={overlaySportMetricsSnapshot}
      showVideoEngine={showVideoEngine}
    >
    <div
      ref={setStudioRootRef}
      className={`relative flex w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)] ${
        embedded ? "h-full min-h-0 flex-col" : "h-[100dvh]"
      }`}
    >
      <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${embedded ? "w-full" : "w-full"}`}>
      <PausePlaybackWhenMobileAnalyticsOpen active={!isDesktop && analyticsOpen} />
      {isDesktop && railVisible ? (
        <aside
          style={{
            width: panelOpen ? "30vw" : ARCHIVE_RAIL_WIDTH_COLLAPSED,
            transition: openMoveRailWidthTransition,
            ...borderRightTheme,
          }}
          className="z-20 flex h-full min-h-0 min-w-0 max-w-[min(28vw)] flex-shrink-0 flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl"
        >
          {panelOpen ? panelContent : desktopCollapsedRail}
        </aside>
      ) : null}

      {/* &lt;lg: overlay rail — portaled into studio root (inside Dialog when embedded) */}
      {portalTarget && !isDesktop && railVisible && panelOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="absolute inset-y-0 right-0 bg-black/50"
                style={{
                  left: "min(79vw, 30rem)",
                  zIndex: portalLayers.mobileRailBackdrop,
                  pointerEvents: mobileRailBackdropReady ? "auto" : "none",
                }}
                aria-label="Close controls panel"
                onPointerDown={() => {
                  suppressBackdropCloseRef.current = isRailPopoverContentOpen();
                }}
                onClick={() => {
                  if (suppressBackdropCloseRef.current) {
                    suppressBackdropCloseRef.current = false;
                    return;
                  }
                  setPanelOpen(false);
                }}
              />
              <div
                className="absolute left-0 top-0 flex h-full max-h-full flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl"
                style={{
                  ...borderRightTheme,
                  width: "min(79vw, 30rem)",
                  zIndex: portalLayers.mobileRail,
                }}
              >
                {panelContent}
              </div>
            </>,
            portalTarget
          )
        : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className={`flex min-h-0 min-w-0 flex-1 ${isDesktop ? "flex-row" : "flex-col"}`}>
          {/* Video area */}
          <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center bg-[var(--background)]">
          {embedded && onClose && (isDesktop ? !railVisible : !panelOpen) ? (
            <div
              className="absolute z-[100]"
              style={{
                top: "max(1rem, env(safe-area-inset-top))",
                right: "max(1rem, env(safe-area-inset-right))",
              }}
            >
              <ProgramModalCloseButton onClose={onClose} />
            </div>
          ) : null}
          {!isDesktop ? (
            <div
              className="absolute z-[100] flex flex-col gap-2"
              style={{
                top: "max(1rem, env(safe-area-inset-top))",
                left: "max(1rem, env(safe-area-inset-left))",
              }}
            >
              {railVisible && !panelOpen ? (
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="inline-flex rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] p-2 text-[color:var(--muted-foreground)] shadow-lg backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)]"
                  style={borderAllTheme}
                  aria-label="Open controls panel"
                  title="Open controls panel"
                >
                  <PanelLeftOpen size={18} />
                </button>
              ) : null}
              {session.status === "ready" && session.angles && (!embeddedQuickAnalysis || hasAnalyzed) && !analyticsOpen ? (
                <button
                  type="button"
                  onClick={() => setAnalyticsOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] text-[color:var(--foreground)] shadow-lg backdrop-blur-md transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  style={borderAllTheme}
                  aria-label="Open motion analysis"
                  title="Motion analysis"
                >
                  <BarChart3 size={16} stroke="currentColor" />
                </button>
              ) : null}
            </div>
          ) : null}
          {isQuickAnalysis && session.status === "idle" && !embeddedQuickAnalysis ? (
            <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
              <p className="text-base text-[color:var(--foreground)]">Upload or record to get started</p>
              {uploadRecordButtons}
              {setupHint ? (
                <p className="text-xs text-[color:var(--muted)]">{setupHint}</p>
              ) : null}
            </div>
          ) : null}
          {embeddedQuickAnalysis && session.status === "idle" ? (
            <div className="flex max-w-md flex-col items-center gap-5 px-6 text-center">
              <p className="text-base font-light text-[color:var(--foreground)]">
                Upload or record a video to get started.
              </p>
              {setupHint ? (
                <p className="text-xs text-[color:var(--muted)]">{setupHint}</p>
              ) : null}
              {uploadRecordButtons}
            </div>
          ) : null}
          {skipFeaturedSample && session.status === "idle" ? (
            <div className="flex max-w-md flex-col items-center gap-5 px-6 text-center">
              <p className="text-base mb-4 font-light text-[color:var(--foreground)]">
                Upload or record a video to get started.
              </p>
              <div className="w-full mb-6 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
                <p className="mb-2 text-xs font-medium text-[color:var(--foreground)]">for best results, remember:</p>
                <ul className="space-y-1.5 mb-2 text-left">
                  <li>Film only one person in the frame at a time</li>
                  <li>Maintain good lighting and contrast from the background</li>
                  <li>Body fully inside the camera frame</li>
                </ul>
              </div>
              {uploadRecordButtons}
            </div>
          ) : null}
          {session.status === "loading_sample" && !session.videoUrl && !skipFeaturedSample ? (
            <div className="flex flex-col items-center gap-3 text-[color:var(--muted-foreground)]">
              <Loader2 className="h-9 w-9 animate-spin text-[var(--accent,#3b82f6)]" />
              <p className="text-md">Loading featured sample…</p>
            </div>
          ) : null}

          {session.status === "error" && (
            <div className="max-w-md px-4 text-center">
              <p className="text-[color:var(--foreground)] opacity-90 text-sm mb-4">{session.errorMessage}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {isQuickAnalysis || embedded ? (
                  uploadRecordButtons
                ) : (
                  <button
                    type="button"
                    onClick={() => loadFeaturedSample()}
                    className="px-4 py-2 rounded-lg text-sm bg-[var(--accent,#3b82f6)] text-white"
                  >
                    Retry
                  </button>
                )}
                {!embedded ? (
                  <Link
                    href="/"
                    style={borderAllTheme}
                    className="px-4 py-2 rounded-lg text-sm text-[color:var(--foreground)] opacity-90"
                  >
                    Home
                  </Link>
                ) : null}
              </div>
            </div>
          )}

          {(session.status === "ready" ||
            session.status === "clip_ready" ||
            session.status === "processing_video" ||
            session.status === "loading_sample") &&
            session.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center md:p-4">
                {session.status === "ready" && (session.poses?.length ?? 0) > 0 && showVideoEngine ? (
                  <div
                    className={
                      isDesktop
                        ? isLandscapeVideo || expandStageToRemainingWidth
                          ? "flex h-full min-h-[min(50vh,520px)] max-h-full w-full max-w-full self-stretch items-stretch justify-center md:max-h-[calc(100dvh-24px)]"
                          : "flex h-full min-h-[min(50vh,520px)] max-h-full w-full max-w-[min(100%,min(78vw,20rem))] self-stretch items-stretch justify-center md:max-h-[calc(100dvh-24px)]"
                        : "flex h-full min-h-[min(50vh,520px)] max-h-full w-full max-w-full self-stretch items-stretch justify-center"
                    }
                  >
                    <div className="flex h-full w-full min-w-0 flex-row items-stretch">
                      <div
                        className="min-h-0"
                        style={{
                          flexGrow: 0,
                          flexShrink: 0,
                          flexBasis: 0,
                          minWidth: 0,
                          maxWidth: 0,
                          overflow: "hidden",
                          pointerEvents: "none",
                        }}
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
                            isDesktop
                              ? isLandscapeVideo
                                ? "flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [contain:layout]"
                                : "flex h-full min-w-[min(200px,42vw)] flex-none items-stretch justify-center self-stretch"
                              : "flex w-full min-h-0 min-w-0 max-w-full flex-1 items-center justify-center self-stretch [contain:layout]"
                          }
                        >
                          <AssetVideoPlayerStage
                            videoUrl={session.videoUrl}
                            videoSources={session.videoSources ?? undefined}
                            intrinsicAspect={videoIntrinsicAspect}
                            className={
                              isLandscapeVideo
                                ? isDesktop
                                  ? "relative mx-auto h-auto w-full max-h-[min(94dvh,calc(100dvh-24px))] max-w-full min-h-0 overflow-hidden rounded-lg bg-[#111214] shadow-lg"
                                  : "relative mx-auto h-auto w-full max-h-[100dvh] max-w-full min-h-0 overflow-hidden"
                                : expandStageToRemainingWidth
                                  ? "relative h-full max-h-[min(100dvh,calc(100dvh-0px))] w-auto max-w-full overflow-hidden rounded-lg bg-[#111214] shadow-lg md:max-h-[min(94dvh,calc(100dvh-24px))]"
                                  : "relative h-full max-h-[min(100dvh,calc(100dvh-0px))] w-auto max-w-[min(100%,min(100vw,56rem))] overflow-hidden bg-[#111214] shadow-lg md:max-h-[min(100dvh,calc(100dvh-0px))]"
                            }
                          >
                            <StudioStagePlaybackOverlay />
                          </AssetVideoPlayerStage>
                        </div>
                        {session.angles && isDesktop ? (
                          <div
                            className="flex min-h-0 min-w-0 shrink-0 flex-row items-stretch gap-2"
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
                            ) : analyticsDrawerContentMounted ? (
                              <div
                                onTransitionEnd={onAnalyticsDrawerWidthTransitionEnd}
                                style={{
                                  width: analyticsDrawerOpen
                                    ? embedded
                                      ? DESKTOP_ANALYSIS_DRAWER_WIDTH_EMBEDDED
                                      : DESKTOP_ANALYSIS_DRAWER_WIDTH
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
                                    {...sportAnalysisPanelProps}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className="min-h-0"
                        style={{
                          flexGrow: 0,
                          flexShrink: 0,
                          flexBasis: 0,
                          minWidth: 0,
                          maxWidth: 0,
                          overflow: "hidden",
                          pointerEvents: "none",
                        }}
                        aria-hidden
                      />
                    </div>
                  </div>
                ) : session.status === "clip_ready" ? (
                  <div className="flex max-w-lg flex-col items-center gap-3 px-4">
                    <div
                      style={borderAllTheme}
                      className="relative aspect-[9/16] max-h-[70dvh] w-full overflow-hidden rounded-lg bg-[var(--surface)]"
                    >
                      <video
                        src={session.videoUrl}
                        className="h-full w-full object-contain"
                        muted
                        playsInline
                        controls
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
                ) : session.status === "loading_sample" ? (
                  <div
                    style={borderAllTheme}
                    className="relative aspect-[9/16] max-h-[70dvh] w-full max-w-lg overflow-hidden rounded-lg bg-[var(--surface)]"
                  >
                    <video
                      src={session.videoUrl}
                      className="w-full h-full object-contain opacity-40"
                      muted
                      playsInline
                      preload="auto"
                      controls={false}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)]">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--accent,#3b82f6)]" />
                      <p className="text-sm text-[color:var(--foreground)]">Loading featured sample…</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

      </div>

      <Dialog.Root
        open={viewportResolved && !isDesktop && mobilePerformanceNoticeOpen}
        onOpenChange={(open) => {
          if (open) {
            setMobilePerformanceNoticeOpen(true);
            return;
          }
          dismissMobilePerformanceNotice();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black/55"
            style={{ zIndex: portalLayers.performanceOverlay }}
          />
          <Dialog.Content
            style={{
              ...borderAllTheme,
              width: "min(calc(100vw - 2rem), 22rem)",
              zIndex: portalLayers.performanceContent,
            }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] p-4 text-[color:var(--foreground)] shadow-2xl outline-none"
          >
            <Dialog.Title className="text-base font-medium">Desktop recommended</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
              For the smoothest video analysis and feedback, use Open Movement Viz on desktop. Mobile works, but playback
              and charts may feel slower.
            </Dialog.Description>
            <button
              type="button"
              onClick={dismissMobilePerformanceNotice}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent,#3b82f6)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Got it
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={guideOpen} onOpenChange={setGuideOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black/60"
            style={{ zIndex: portalLayers.guideOverlay }}
          />
          {/*
            Full-viewport flex shell: centers card (no left:50% + translate). Transparent + pointer-events-none
            so overlay receives outside clicks; py-8 keeps space when vertically centered.
          */}
          <Dialog.Content
            className="fixed inset-0 flex items-center justify-center overflow-y-auto border-0 bg-transparent px-4 py-8 shadow-none outline-none pointer-events-none"
            style={{ zIndex: portalLayers.guideContent }}
          >
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

      {/* Mobile: analytics dialog — portaled full-screen sheet (plain Studio + mini-app/quick-analysis) */}
      {!isDesktop ? (
      <Dialog.Root open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black/70"
            style={{ zIndex: portalLayers.analyticsOverlay }}
          />
          <Dialog.Content
            style={{ ...borderAllTheme, zIndex: portalLayers.analyticsContent }}
            className="fixed inset-x-2 bottom-2 top-2 flex flex-col overflow-hidden rounded-xl bg-[var(--background)] shadow-2xl backdrop-blur-xl"
          >
            <div className="flex justify-between items-center px-2 py-2 flex-shrink-0">
              <Dialog.Title className="text-sm font-medium text-[color:var(--foreground)]">Motion analysis</Dialog.Title>
              <Dialog.Close className="p-1 rounded text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto open-move-studio-panel-scroll p-2">
              {session.status === "ready" && session.angles && session.videoUrl && (!embeddedQuickAnalysis || hasAnalyzed) ? (
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
                    syncPlaybackFrame={false}
                    {...sportAnalysisPanelProps}
                  />
                </Suspense>
              ) : (
                <p className="text-sm text-[color:var(--muted)] p-4">Load a sample or upload a video first.</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      ) : null}

      {/* Live record modal — fullscreen video; close via toolbar, Escape, or Change Method */}
      <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 bg-black"
            style={{ zIndex: portalLayers.liveOverlay }}
          />
          <Dialog.Content
            className="fixed inset-0 flex flex-col overflow-hidden border-0 bg-black p-0 shadow-none outline-none"
            style={{ zIndex: portalLayers.liveContent }}
          >
            <Dialog.Title
              style={{
                position: "absolute",
                left: "-10000px",
                top: "0",
                width: "1px",
                height: "1px",
                margin: "-1px",
                padding: 0,
                overflow: "hidden",
                clip: "rect(0, 0, 0, 0)",
                whiteSpace: "nowrap",
                border: 0,
              }}
            >
              Record from camera
            </Dialog.Title>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <LiveVideoPlayer
                onRecordingComplete={onRecordingComplete}
                onMethodChange={() => setShowLiveModal(false)}
                onEmbeddedClose={() => setShowLiveModal(false)}
                referenceAngles={undefined}
                exercise={null}
                plankLiveCoach={isQuickAnalysis && sportAnalysisKind === "plank"}
                plankFacingSide={plankFacingSide}
                squatLiveCoach={isQuickAnalysis && sportAnalysisKind === "squat"}
                squatSide={squatSide}
                layoutVariant="embeddedFullscreen"
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      </div>
    </div>
    </ConditionalEngineBridge>
    </EmbeddedModalPopoverProvider>
  );
}
