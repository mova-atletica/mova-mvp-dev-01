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
  ChevronDown,
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
  POSE_FLEXIBILITY_FOCUS_OPTIONS,
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
const DESKTOP_ANALYSIS_DRAWER_WIDTH = "clamp(16rem, 36vw, 32rem)";
const FEATURED_VIDEO_MP4_PATH = "/featured/featured.mp4";
const FEATURED_KEYPOINTS_PATH = "/featured/featured-keypoints.json";
const FEATURED_FRAME_INTERVAL_SEC = 0.1;
const MOBILE_PERFORMANCE_NOTICE_STORAGE_KEY = "openMoveMobilePerformanceNoticeDismissed";

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
  children,
}: {
  session: SessionState;
  sportAnalysisKind: SportAnalysisKind;
  sportMetricsSnapshot: SportMetricsSnapshot | null;
  children: React.ReactNode;
}) {
  if (
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
  | "loading_sample"
  | "processing_video"
  | "ready"
  | "error";

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

export default function OpenMoveStudio() {
  const [session, setSession] = useState<SessionState>(initialSession);
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
  const [sportAnalysisKind, setSportAnalysisKind] = useState<SportAnalysisKind>("pullups");
  const [sportMenuOpen, setSportMenuOpen] = useState(false);
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
  const [panelOpen, setPanelOpen] = useState(true);
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
  const { theme, toggleTheme } = useTheme();

  /** Avoid SSR mismatch; portal target only exists on client. */
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  /**
   * Defer backdrop pointer events so the same touch that opened the rail
   * does not immediately hit the full-screen close target (ghost close).
   */
  const [mobileRailBackdropReady, setMobileRailBackdropReady] = useState(false);
  /** Featured sample UX: auto-run once when clip is ready on pull-ups default. */
  const didAutoAnalyzeFeaturedRef = useRef(false);

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
    cyclingAnalysisResult,
    pullUpsAnalysisResult,
    plankAnalysisResult,
    squatAnalysisResult,
    poseFlexibilityAnalysisResult,
    session.angles,
  ]);

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
      session.status !== "processing_video"
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
    if (sportAnalysisKind === "pullups") {
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
      return;
    }
    if (sportAnalysisKind === "plank") {
      setPlankAnalysisResult(null);
      setPlankAnalysisError(null);
      const res = analyzePlank({
        poses: session.poses,
        frameIntervalSec: session.frameIntervalSec,
        facingSide: plankFacingSide,
      });
      if (res.ok) {
        setPlankAnalysisResult(res.result);
        setPlankAnalysisError(null);
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
        poses: session.poses,
        frameIntervalSec: session.frameIntervalSec,
        side: squatSide,
      });
      if (squatRes.ok) {
        setSquatAnalysisResult(squatRes.result);
        setSquatAnalysisError(null);
      } else {
        setSquatAnalysisResult(null);
        setSquatAnalysisError(squatRes.error);
      }
      return;
    }
    setPoseFlexibilityAnalysisResult(null);
    setPoseFlexibilityAnalysisError(null);
    const poseFlexRes = analyzePoseFlexibility({
      poses: session.poses,
      frameIntervalSec: session.frameIntervalSec,
      side: poseFlexibilitySide,
      focusAreas: poseFlexibilityFocusAreas,
    });
    if (poseFlexRes.ok) {
      setPoseFlexibilityAnalysisResult(poseFlexRes.result);
      setPoseFlexibilityAnalysisError(null);
    } else {
      setPoseFlexibilityAnalysisResult(null);
      setPoseFlexibilityAnalysisError(poseFlexRes.error);
    }
  }, [
    session.angles,
    session.frameIntervalSec,
    session.poses,
    cyclingLeg,
    plankFacingSide,
    squatSide,
    poseFlexibilitySide,
    poseFlexibilityFocusAreas,
    sportAnalysisKind,
  ]);

  useEffect(() => {
    loadFeaturedSample();
  }, [loadFeaturedSample]);

  useEffect(() => {
    // Reset one-shot guard whenever source/ready state changes away from featured-ready.
    if (session.source !== "featured" || session.status !== "ready") {
      didAutoAnalyzeFeaturedRef.current = false;
    }
  }, [session.source, session.status]);

  useEffect(() => {
    if (didAutoAnalyzeFeaturedRef.current) return;
    if (session.source !== "featured" || session.status !== "ready") return;
    if (!session.angles || session.frameIntervalSec == null) return;
    if (sportAnalysisKind !== "pullups") return;
    didAutoAnalyzeFeaturedRef.current = true;
    runSportAnalysis();
  }, [
    session.source,
    session.status,
    session.angles,
    session.frameIntervalSec,
    sportAnalysisKind,
    runSportAnalysis,
  ]);

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
        className="sticky top-0 z-10 flex-shrink-0 p-8 pb-4"
      >
        <div className="relative space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="font-light uppercase tracking-wider text-[color:var(--muted-foreground)]" style={{ fontSize: "18px" }}>
                Mova Studio
              </h1>
              <p className="mt-0 text-xs font-normal leading-relaxed text-[color:var(--muted)]">
                Analyze and visualize the body&apos;s movement. For best results, please{" "}
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
                      Mova Archive
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

          <div style={borderTopTheme} className="space-y-2 pt-2">
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
                or
              </span>
              <button
                type="button"
                onClick={() => setShowLiveModal(true)}
                disabled={session.status === "processing_video" || !detectorReady}
                style={borderAllTheme}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
              >
                <Video size={12} /> Record
              </button>
            </div>
            {session.sessionLabel ? (
              <p className="line-clamp-2 text-[11px] text-[color:var(--muted)]">
                <span className="text-[color:var(--muted-foreground)]">Current video source:</span>{" "}
                {session.sessionLabel}
              </p>
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

        {session.status === "ready" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto p-8 pt-2">
              <div className="mb-0 space-y-2 text-[color:var(--foreground)]">
                <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                  2. Sport Analysis
                </p>
                <div className="min-w-0">
                  <div className={exportPanelFieldLabelClass}>Select a movement</div>
                  <Popover.Root open={sportMenuOpen} onOpenChange={setSportMenuOpen}>
                    <Popover.Trigger asChild>
                      <button type="button" className={exportPanelSelectTriggerClass}>
                        <span className="truncate">
                          {sportAnalysisKind === "cycling"
                            ? "Cycling"
                            : sportAnalysisKind === "pullups"
                              ? "Pull-ups"
                              : sportAnalysisKind === "plank"
                                ? "Plank"
                                : sportAnalysisKind === "squat"
                                  ? "Squat"
                                  : "Pose Flexibility (Side View)"}
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
                          className={exportPanelDropdownMenuItemClass}
                          onClick={() => {
                            setSportAnalysisKind("pullups");
                            setSportMenuOpen(false);
                          }}
                        >
                          Pull-ups
                        </div>
                        <div
                          role="menuitem"
                          className={exportPanelDropdownMenuItemClass}
                          onClick={() => {
                            setSportAnalysisKind("plank");
                            setSportMenuOpen(false);
                          }}
                        >
                          Plank
                        </div>
                        <div
                          role="menuitem"
                          className={exportPanelDropdownMenuItemClass}
                          onClick={() => {
                            setSportAnalysisKind("squat");
                            setSportMenuOpen(false);
                          }}
                        >
                          Squat
                        </div>
                        <div
                          role="menuitem"
                          className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                          onClick={() => {
                            setSportAnalysisKind("poseFlexibility");
                            setSportMenuOpen(false);
                          }}
                        >
                          Pose Flexibility (Side View)
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
                ) : sportAnalysisKind === "pullups" ? (
                  <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                    We combine <strong className="text-[color:var(--foreground)]">left and right</strong> elbow angles,
                    then count reps from flexion peaks (smoothed + spacing + minimum range of motion).
                  </p>
                ) : sportAnalysisKind === "plank" ? (
                  <>
                    <div className="min-w-0">
                      <div className={exportPanelFieldLabelClass}>Side toward camera</div>
                      <Popover.Root open={plankSideMenuOpen} onOpenChange={setPlankSideMenuOpen}>
                        <Popover.Trigger asChild>
                          <button type="button" className={exportPanelSelectTriggerClass}>
                            <span className="truncate">{plankFacingSide === "left" ? "Left" : "Right"}</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${plankSideMenuOpen ? "rotate-180" : ""}`}
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
                                setPlankFacingSide("left");
                                setPlankSideMenuOpen(false);
                              }}
                            >
                              Left
                            </div>
                            <div
                              role="menuitem"
                              className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                              onClick={() => {
                                setPlankFacingSide("right");
                                setPlankSideMenuOpen(false);
                              }}
                            >
                              Right
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                    <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                      Turn so the <strong className="text-[color:var(--foreground)]">selected side</strong> faces the
                      camera. Form analysis uses hip, knee, and shoulder angles.
                    </p>
                  </>
                ) : sportAnalysisKind === "squat" ? (
                  <>
                    <div className="min-w-0">
                      <div className={exportPanelFieldLabelClass}>Side toward camera</div>
                      <Popover.Root open={squatSideMenuOpen} onOpenChange={setSquatSideMenuOpen}>
                        <Popover.Trigger asChild>
                          <button type="button" className={exportPanelSelectTriggerClass}>
                            <span className="truncate">{squatSide === "left" ? "Left" : "Right"}</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${squatSideMenuOpen ? "rotate-180" : ""}`}
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
                                setSquatSide("left");
                                setSquatSideMenuOpen(false);
                              }}
                            >
                              Left
                            </div>
                            <div
                              role="menuitem"
                              className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                              onClick={() => {
                                setSquatSide("right");
                                setSquatSideMenuOpen(false);
                              }}
                            >
                              Right
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                    <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                      Side-view squat MVP: selected knee drives rep count and depth. Advisory cues use lightweight
                      knee-over-ankle and trunk-lean proxies.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="min-w-0">
                      <div className={exportPanelFieldLabelClass}>Side toward camera</div>
                      <Popover.Root open={poseFlexibilitySideMenuOpen} onOpenChange={setPoseFlexibilitySideMenuOpen}>
                        <Popover.Trigger asChild>
                          <button type="button" className={exportPanelSelectTriggerClass}>
                            <span className="truncate">
                              {poseFlexibilitySide === "left" ? "Left side toward camera" : "Right side toward camera"}
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-[color:var(--muted)] transition-transform ${poseFlexibilitySideMenuOpen ? "rotate-180" : ""}`}
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
                                setPoseFlexibilitySide("left");
                                setPoseFlexibilitySideMenuOpen(false);
                              }}
                            >
                              Left side toward camera
                            </div>
                            <div
                              role="menuitem"
                              className={`${exportPanelDropdownMenuItemClass} border-b-0`}
                              onClick={() => {
                                setPoseFlexibilitySide("right");
                                setPoseFlexibilitySideMenuOpen(false);
                              }}
                            >
                              Right side toward camera
                            </div>
                          </Popover.Content>
                        </Popover.Portal>
                      </Popover.Root>
                    </div>
                    <div className="min-w-0">
                      <div className={exportPanelFieldLabelClass}>Focus areas (1-3)</div>
                      <div className="flex flex-wrap gap-1.5">
                        {POSE_FLEXIBILITY_FOCUS_OPTIONS.map((option) => {
                          const selected = poseFlexibilityFocusAreas.includes(option.key);
                          const disableRemove = selected && poseFlexibilityFocusAreas.length <= 1;
                          const disableAdd = !selected && poseFlexibilityFocusAreas.length >= 3;
                          return (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => togglePoseFlexibilityFocusArea(option.key)}
                              disabled={disableRemove || disableAdd}
                              style={selected ? { border: "1px solid var(--accent, #3b82f6)" } : borderAllTheme}
                              className={`rounded-full px-3 py-1 text-[11px] leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                selected
                                  ? "bg-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)] text-[color:var(--foreground)]"
                                  : "bg-[color:color-mix(in_srgb,var(--foreground)_5%,transparent)] text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[10px] leading-snug text-[color:var(--muted)]">
                      Analyze the full trimmed side-view clip. We calculate flexibility and alignment from the
                      selected focus areas.
                    </p>
                  </>
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
              <p className="mb-0 mt-6 text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                3. Movement Visualization
              </p>
              <StudioPanelChrome scrollContainer="passthrough" />
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
      <PausePlaybackWhenMobileAnalyticsOpen active={!isDesktop && analyticsOpen} />
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
          {!isDesktop ? (
            <div
              className="absolute z-[100] flex flex-col gap-2"
              style={{
                top: "max(1rem, env(safe-area-inset-top))",
                left: "max(1rem, env(safe-area-inset-left))",
              }}
            >
              {!panelOpen ? (
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
              {session.status === "ready" && session.angles && !analyticsOpen ? (
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
          {session.status === "loading_sample" && !session.videoUrl && (
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

          {(session.status === "ready" ||
            session.status === "processing_video" ||
            session.status === "loading_sample") &&
            session.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center md:p-4">
                {session.status === "ready" && (session.poses?.length ?? 0) > 0 ? (
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
                                    plankAnalysisResult={plankAnalysisResult}
                                    plankAnalysisError={plankAnalysisError}
                                    squatAnalysisResult={squatAnalysisResult}
                                    squatAnalysisError={squatAnalysisError}
                                    poseFlexibilityAnalysisResult={poseFlexibilityAnalysisResult}
                                    poseFlexibilityAnalysisError={poseFlexibilityAnalysisError}
                                  />
                                </div>
                              </div>
                            )}
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
          <Dialog.Overlay className="fixed inset-0 z-[225] bg-black/55" />
          <Dialog.Content
            style={{
              ...borderAllTheme,
              width: "min(calc(100vw - 2rem), 22rem)",
            }}
            className="fixed left-1/2 top-1/2 z-[226] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--card-bg)] p-4 text-[color:var(--foreground)] shadow-2xl outline-none"
          >
            <Dialog.Title className="text-base font-medium">Desktop recommended</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-[color:var(--muted-foreground)]">
              For the smoothest video analysis and feedback, use Mova Studio on desktop. Mobile works, but playback
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
      <Dialog.Root open={!isDesktop && analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-[215]" />
          <Dialog.Content
            style={borderAllTheme}
            className="fixed inset-x-2 bottom-2 top-2 z-[220] flex flex-col overflow-hidden rounded-xl bg-[var(--background)] shadow-2xl backdrop-blur-xl"
          >
            <div className="flex justify-between items-center px-2 py-2 flex-shrink-0">
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
                    syncPlaybackFrame={false}
                    enableSportAnalysisTab
                    sportAnalysisKind={sportAnalysisKind}
                    cyclingAnalysisResult={cyclingAnalysisResult}
                    cyclingAnalysisError={cyclingAnalysisError}
                    pullUpsAnalysisResult={pullUpsAnalysisResult}
                    pullUpsAnalysisError={pullUpsAnalysisError}
                    plankAnalysisResult={plankAnalysisResult}
                    plankAnalysisError={plankAnalysisError}
                    squatAnalysisResult={squatAnalysisResult}
                    squatAnalysisError={squatAnalysisError}
                    poseFlexibilityAnalysisResult={poseFlexibilityAnalysisResult}
                    poseFlexibilityAnalysisError={poseFlexibilityAnalysisError}
                  />
                </Suspense>
              ) : (
                <p className="text-sm text-[color:var(--muted)] p-4">Load a sample or upload a video first.</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Live record modal — fullscreen video; close via toolbar, Escape, or Change Method */}
      <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[230] bg-black" />
          <Dialog.Content className="fixed inset-0 z-[231] flex flex-col overflow-hidden border-0 bg-black p-0 shadow-none outline-none">
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
                plankLiveCoach={sportAnalysisKind === "plank"}
                plankFacingSide={plankFacingSide}
                squatLiveCoach={sportAnalysisKind === "squat"}
                squatSide={squatSide}
                layoutVariant="embeddedFullscreen"
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    </ConditionalEngineBridge>
  );
}
