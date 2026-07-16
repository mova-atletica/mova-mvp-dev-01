"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Upload,
  Video,
  X,
} from "lucide-react";
import LiveVideoPlayer from "../LiveVideoPlayer";
import AppMegaMenu from "../AppMegaMenu";
import {
  computeAngleSeriesFromOpenMovePoses,
  optimizeOpenMovePosesForClient,
} from "../../lib/openMoveAngleSeries";
import {
  createMoveNetDetector,
  processVideoUrlForPoses,
} from "../../lib/tfjsProcessVideo";
import AssetVideoPlayerStage from "../../app/motion-explore/AssetVideoPlayerStage";
import MotionAnalysisPanel from "../../app/motion-explore/MotionAnalysisPanel";
import {
  AssetVideoPlayerChromeExportFooter,
  AssetVideoPlayerChromeRailScroll,
} from "../../app/motion-explore/AssetVideoPlayerChromeRail";
import { useAssetVideoEngine } from "../../app/motion-explore/useAssetVideoEngine";
import {
  AssetVideoEngineProvider,
  useAssetVideoEngineContext,
  useOptionalAssetVideoEngine,
} from "../../app/motion-explore/assetVideoEngineContext";
import { useExerciseStudioData } from "../../hooks/useExerciseStudioData";
import { getProgramsContainingExercise } from "../../lib/programsContainingExercise";
import ExerciseDetailsTabContent from "./ExerciseDetailsTabContent";
import ExerciseCompareStage from "./ExerciseCompareStage";
import ExerciseCompareEngineBridge from "./ExerciseCompareEngineBridge";
import ExerciseStudioProgramChrome, {
  type ProgramStudioChromeConfig,
  type ProgramSessionDetailsChrome,
} from "./ExerciseStudioProgramChrome";
import { ProgramSessionNavButtons, ProgramModalCloseButton } from "./ExerciseStudioProgramControls";
import {
  ProgramModalBottomNav,
  ProgramModalTopBar,
} from "./ExerciseStudioProgramShell";
import {
  emptyClipSession,
  isReadyClipSession,
  type ClipSession,
  type ReadyClipSession,
} from "./exerciseStudioTypes";

const borderRightTheme = { borderRight: "1px solid var(--border)" } as const;
const borderTopTheme = { borderTop: "1px solid var(--border)" } as const;
const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;
const railWidthTransition = "width 0.35s ease-in-out";
const DESKTOP_ANALYSIS_DRAWER_WIDTH = "clamp(16rem, 36vw, 32rem)";
const REFERENCE_FRAME_INTERVAL_SEC = 0.1;

type VideoAspect = { width: number; height: number } | null;

function StudioStagePlaybackOverlay() {
  const engine = useOptionalAssetVideoEngine();
  if (!engine) return null;
  const { isPlaying, toggleVideoPlayback } = engine;
  return isPlaying ? (
    <button
      type="button"
      onClick={toggleVideoPlayback}
      className="absolute inset-0 z-20 cursor-pointer"
      aria-label="Pause video"
    />
  ) : (
    <div className="absolute inset-0 z-30 flex items-center justify-center">
      <button
        type="button"
        onClick={toggleVideoPlayback}
        style={borderAllTheme}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] text-[color:var(--foreground)] shadow-lg backdrop-blur-md transition hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
        aria-label="Play video"
      >
        <Play className="h-5 w-5 translate-x-[1px]" stroke="currentColor" />
      </button>
    </div>
  );
}

function StudioRailExportFooter() {
  const engine = useOptionalAssetVideoEngine();
  if (!engine) return null;
  return (
    <AssetVideoPlayerChromeExportFooter engine={engine} accordionTitle="Download & export video" />
  );
}

function StudioPanelChrome() {
  const engine = useAssetVideoEngineContext();
  return <AssetVideoPlayerChromeRailScroll engine={engine} scrollContainer="passthrough" />;
}

function AssetVideoSessionBridge({
  session,
  children,
}: {
  session: ReadyClipSession;
  children: ReactNode;
}) {
  const engine = useAssetVideoEngine({
    videoUrl: session.videoUrl,
    poses: session.poses,
    exerciseTitle: session.sessionLabel,
    sportAnalysisKind: "pullups",
    sportMetricsSnapshot: null,
  });
  return <AssetVideoEngineProvider engine={engine}>{children}</AssetVideoEngineProvider>;
}

function ConditionalEngineBridge({
  session,
  children,
}: {
  session: ClipSession | null;
  children: ReactNode;
}) {
  if (session && isReadyClipSession(session)) {
    return <AssetVideoSessionBridge session={session}>{children}</AssetVideoSessionBridge>;
  }
  return <>{children}</>;
}

function CompareProcessingStage({
  referenceSession,
  userSession,
  referenceIntrinsicAspect,
  isLandscapeLayout,
  tfProgress,
}: {
  referenceSession: ReadyClipSession;
  userSession: ClipSession & { videoUrl: string };
  referenceIntrinsicAspect: VideoAspect;
  isLandscapeLayout: boolean;
  tfProgress: number;
}) {
  const referenceEngine = useAssetVideoEngineContext();
  return (
    <ExerciseCompareStage
      userEngine={referenceEngine}
      referenceEngine={referenceEngine}
      userVideoUrl={userSession.videoUrl}
      referenceVideoUrl={referenceSession.videoUrl}
      referenceVideoSources={referenceSession.videoSources ?? undefined}
      userIntrinsicAspect={null}
      referenceIntrinsicAspect={referenceIntrinsicAspect}
      isLandscapeLayout={isLandscapeLayout}
      userLoading
      userLoadingLabel={`Analyzing motion… ${tfProgress}%`}
    />
  );
}

function StudioAnalyticsDrawer({
  session,
  isDesktop,
  analyticsDrawerContentMounted,
  analyticsDrawerOpen,
  onAnalyticsDrawerWidthTransitionEnd,
  onOpenDrawer,
  onCloseDrawer,
}: {
  session: ReadyClipSession;
  isDesktop: boolean;
  analyticsDrawerContentMounted: boolean;
  analyticsDrawerOpen: boolean;
  onAnalyticsDrawerWidthTransitionEnd: (e: React.TransitionEvent<HTMLDivElement>) => void;
  onOpenDrawer: () => void;
  onCloseDrawer: () => void;
}) {
  if (!isDesktop) return null;

  if (!analyticsDrawerContentMounted) {
    return (
      <div className="flex shrink-0 flex-col self-stretch py-0">
        <button
          type="button"
          onClick={onOpenDrawer}
          style={borderAllTheme}
          className="inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
          aria-label="Show analytics"
        >
          <BarChart3 size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onTransitionEnd={onAnalyticsDrawerWidthTransitionEnd}
      style={{
        width: analyticsDrawerOpen ? DESKTOP_ANALYSIS_DRAWER_WIDTH : 0,
        transition: railWidthTransition,
      }}
      className={`flex min-h-0 min-w-0 flex-shrink-0 flex-col overflow-hidden ${!analyticsDrawerOpen ? "pointer-events-none" : ""}`}
    >
      <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-hidden">
        <MotionAnalysisPanel
          poses={session.poses}
          angles={session.angles}
          videoUrl={session.videoUrl}
          frameIntervalSec={session.frameIntervalSec}
          onRequestClose={onCloseDrawer}
        />
      </div>
    </div>
  );
}

interface ExerciseStudioPageProps {
  exerciseId: string;
  /** When true, hides archive chrome (Mova label, mega menu) for modal embedding. */
  embedded?: boolean;
  /** Program session controls — rendered in the rail header when embedded in a program modal. */
  programStudio?: ProgramStudioChromeConfig;
}

export default function ExerciseStudioPage({
  exerciseId,
  embedded = false,
  programStudio,
}: ExerciseStudioPageProps) {
  const { exercise, videoUrl, referencePoses, loading, error } = useExerciseStudioData(exerciseId);
  const programs = useMemo(
    () => (exercise ? getProgramsContainingExercise(exercise.id) : []),
    [exercise]
  );

  const [referenceSession, setReferenceSession] = useState<ClipSession>({
    ...emptyClipSession,
    status: "loading",
  });
  const [userSession, setUserSession] = useState<ClipSession | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsDrawerOpen, setAnalyticsDrawerOpen] = useState(true);
  const [analyticsDrawerContentMounted, setAnalyticsDrawerContentMounted] = useState(true);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  const [tfProgress, setTfProgress] = useState(0);
  const [referenceIntrinsicAspect, setReferenceIntrinsicAspect] = useState<VideoAspect>(null);
  const [userIntrinsicAspect, setUserIntrinsicAspect] = useState<VideoAspect>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [mobileRailBackdropReady, setMobileRailBackdropReady] = useState(false);

  const isProgramShell = embedded && !!programStudio;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectorRef = useRef<Awaited<ReturnType<typeof createMoveNetDetector>> | null>(null);
  const analyticsDrawerOpenRef = useRef(analyticsDrawerOpen);
  analyticsDrawerOpenRef.current = analyticsDrawerOpen;
  const referenceBootstrapRef = useRef<string | null>(null);

  const isCompareMode =
    isReadyClipSession(referenceSession) && userSession != null && isReadyClipSession(userSession);

  const isUserProcessing = userSession?.status === "processing_video";

  const railSession = useMemo((): ReadyClipSession | null => {
    if (userSession && isReadyClipSession(userSession)) return userSession;
    if (isReadyClipSession(referenceSession)) return referenceSession;
    return null;
  }, [userSession, referenceSession]);

  const analysisSession = useMemo((): ReadyClipSession | null => {
    if (userSession && isReadyClipSession(userSession)) return userSession;
    if (isReadyClipSession(referenceSession)) return referenceSession;
    return null;
  }, [userSession, referenceSession]);

  const programSessionDetails = useMemo((): ProgramSessionDetailsChrome | undefined => {
    if (!programStudio) return undefined;
    return {
      completed: programStudio.completed,
      onToggleComplete: programStudio.onToggleComplete,
      hasPrev: programStudio.hasPrev,
      hasNext: programStudio.hasNext,
      onPrev: programStudio.onPrev,
      onNext: programStudio.onNext,
      index: programStudio.index,
      total: programStudio.total,
    };
  }, [programStudio]);

  const compareLayoutLandscape = useMemo(() => {
    const aspect = userIntrinsicAspect ?? referenceIntrinsicAspect;
    return aspect != null && aspect.width > aspect.height;
  }, [userIntrinsicAspect, referenceIntrinsicAspect]);

  const referenceOnlyLandscape =
    referenceIntrinsicAspect != null && referenceIntrinsicAspect.width > referenceIntrinsicAspect.height;

  const applyProcessedVideo = useCallback(
    (
      target: "reference" | "user",
      url: string,
      videoSources: Array<{ src: string; type: string }> | null,
      poses: unknown[],
      label: string,
      source: ClipSession["source"],
      frameIntervalSec: number
    ) => {
      const optimized = optimizeOpenMovePosesForClient(poses);
      const angles = computeAngleSeriesFromOpenMovePoses(optimized);
      const next: ClipSession = {
        status: "ready",
        videoUrl: url,
        videoSources,
        poses: optimized,
        angles,
        frameIntervalSec,
        sessionLabel: label,
        source,
      };
      if (target === "reference") setReferenceSession(next);
      else setUserSession(next);
    },
    []
  );

  const runReferenceTfjs = useCallback(
    async (url: string, label: string) => {
      const detector = detectorRef.current;
      if (!detector) {
        setReferenceSession((s) => ({
          ...s,
          status: "error",
          errorMessage: "Pose model is still loading. Wait a moment and try again.",
        }));
        return;
      }
      setReferenceSession({
        status: "processing_video",
        videoUrl: url,
        videoSources: null,
        errorMessage: undefined,
        sessionLabel: label,
        source: "reference",
        angles: null,
        frameIntervalSec: null,
        poses: [],
      });
      setTfProgress(0);
      try {
        const { poses, frameIntervalSec } = await processVideoUrlForPoses(detector, url, (p) =>
          setTfProgress(p)
        );
        applyProcessedVideo("reference", url, null, poses, label, "reference", frameIntervalSec);
      } catch (e) {
        console.error(e);
        setReferenceSession((s) => ({
          ...s,
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Could not analyze this video.",
        }));
      }
    },
    [applyProcessedVideo]
  );

  const runUserTfjs = useCallback(
    async (url: string, label: string, source: "upload" | "live") => {
      const detector = detectorRef.current;
      if (!detector) {
        setUserSession({
          status: "error",
          errorMessage: "Pose model is still loading. Wait a moment and try again.",
          videoUrl: url,
          videoSources: null,
          sessionLabel: label,
          source,
          angles: null,
          frameIntervalSec: null,
          poses: [],
        });
        return;
      }
      setUserSession({
        status: "processing_video",
        videoUrl: url,
        videoSources: null,
        errorMessage: undefined,
        sessionLabel: label,
        source,
        angles: null,
        frameIntervalSec: null,
        poses: [],
      });
      setTfProgress(0);
      try {
        const { poses, frameIntervalSec } = await processVideoUrlForPoses(detector, url, (p) =>
          setTfProgress(p)
        );
        applyProcessedVideo("user", url, null, poses, label, source, frameIntervalSec);
      } catch (e) {
        console.error(e);
        setUserSession({
          status: "error",
          errorMessage: e instanceof Error ? e.message : "Could not analyze this video.",
          videoUrl: url,
          videoSources: null,
          sessionLabel: label,
          source,
          angles: null,
          frameIntervalSec: null,
          poses: [],
        });
      }
    },
    [applyProcessedVideo]
  );

  useEffect(() => {
    if (!isProgramShell) setPortalTarget(document.body);
  }, [isProgramShell]);

  useEffect(() => {
    if (isProgramShell) setPanelOpen(isDesktop);
  }, [isProgramShell, isDesktop]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isDesktop && panelOpen) {
      setMobileRailBackdropReady(false);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setMobileRailBackdropReady(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setMobileRailBackdropReady(false);
  }, [isDesktop, panelOpen]);

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

  useEffect(() => {
    if (loading || error || !exercise || !videoUrl) return;
    const bootstrapKey = `${exercise.id}:${videoUrl}`;
    if (referenceBootstrapRef.current === bootstrapKey) return;
    referenceBootstrapRef.current = bootstrapKey;

    if (referencePoses?.length) {
      applyProcessedVideo(
        "reference",
        videoUrl,
        null,
        referencePoses,
        `${exercise.title} (reference)`,
        "reference",
        REFERENCE_FRAME_INTERVAL_SEC
      );
      return;
    }

    setReferenceSession({
      ...emptyClipSession,
      status: "loading",
      videoUrl,
      sessionLabel: exercise.title,
      source: "reference",
    });
  }, [loading, error, exercise, videoUrl, referencePoses, applyProcessedVideo]);

  useEffect(() => {
    if (!exercise || !videoUrl || referencePoses?.length) return;
    if (referenceSession.status !== "loading" || !referenceSession.videoUrl) return;
    if (!detectorReady) return;
    runReferenceTfjs(videoUrl, `${exercise.title} (reference)`);
  }, [
    exercise,
    videoUrl,
    referencePoses,
    referenceSession.status,
    referenceSession.videoUrl,
    detectorReady,
    runReferenceTfjs,
  ]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    await runUserTfjs(url, file.name || "Uploaded video", "upload");
    e.target.value = "";
  };

  const onRecordingComplete = async (url: string) => {
    setShowLiveModal(false);
    await runUserTfjs(url, "Live recording", "live");
  };

  const clearUserClip = () => setUserSession(null);

  useEffect(() => {
    if (!userSession?.videoUrl) {
      setUserIntrinsicAspect(null);
      return;
    }
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = userSession.videoUrl;
    const onMeta = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        setUserIntrinsicAspect({ width: v.videoWidth, height: v.videoHeight });
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.src = "";
    };
  }, [userSession?.videoUrl]);

  const onAnalyticsDrawerWidthTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.propertyName !== "width" || e.target !== e.currentTarget) return;
      if (!analyticsDrawerOpenRef.current) setAnalyticsDrawerContentMounted(false);
    },
    []
  );

  const openAnalyticsDrawer = () => {
    setAnalyticsDrawerContentMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnalyticsDrawerOpen(true));
    });
  };

  const toggleDetailsPanel = useCallback(() => {
    setPanelOpen((open) => {
      if (open) return false;
      setAnalyticsOpen(false);
      return true;
    });
  }, []);

  const toggleAnalyticsPanel = useCallback(() => {
    setAnalyticsOpen((open) => {
      if (open) return false;
      setPanelOpen(false);
      return true;
    });
  }, []);

  const mobileProgramShellPanel = isProgramShell && !isDesktop;

  const programRailHeader =
    programStudio && !mobileProgramShellPanel ? (
      <ExerciseStudioProgramChrome
        {...programStudio}
        showClose={!isProgramShell}
        onCollapsePanel={() => setPanelOpen(false)}
      />
    ) : null;

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      {!mobileProgramShellPanel ? (
      <div
        style={{ borderBottom: "1px solid var(--border)" }}
        className={`sticky top-0 z-10 flex-shrink-0 ${programStudio || embedded ? "p-4 pb-3" : "p-8 pb-4"}`}
      >
        {programRailHeader ? (
          programRailHeader
        ) : (
          <div className={`flex items-start gap-2 ${embedded ? "justify-end" : "justify-between"}`}>
            {!embedded ? (
              <div className="min-w-0 flex-1">
                <p
                  className="font-light uppercase tracking-wider text-[color:var(--muted-foreground)]"
                  style={{ fontSize: "11px" }}
                >
                  Mova Archive
                </p>
              </div>
            ) : null}
            <div className="relative z-30 flex items-center gap-2">
              {!embedded ? <AppMegaMenu activeApp="archive" /> : null}
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
        )}
      </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={`open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto pt-2 ${
            programStudio || embedded ? "p-4" : "p-8"
          }`}
        >
          <section className="space-y-3">

            {exercise ? (
              <ExerciseDetailsTabContent
                exercise={exercise}
                programs={programs}
                variant="rail"
                programComplete={
                  programSessionDetails
                    ? {
                        completed: programSessionDetails.completed,
                        onToggleComplete: programSessionDetails.onToggleComplete,
                      }
                    : undefined
                }
              />
            ) : null}
          </section>

          <section style={borderTopTheme} className="mt-6 space-y-3 pt-6">
            <p className="text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Try it yourself
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUserProcessing || !detectorReady}
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
              <span className="shrink-0 text-[11px] uppercase tracking-wider text-[color:var(--muted)]">
                or
              </span>
              <button
                type="button"
                onClick={() => setShowLiveModal(true)}
                disabled={isUserProcessing || !detectorReady}
                style={borderAllTheme}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)] px-3 py-2 text-xs font-light text-[color:var(--foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_15%,transparent)] disabled:opacity-50"
              >
                <Video size={12} /> Record
              </button>
            </div>
            {userSession?.sessionLabel ? (
              <p className="line-clamp-2 text-[11px] text-[color:var(--muted)]">
                <span className="text-[color:var(--muted-foreground)]">Your clip:</span>{" "}
                {userSession.sessionLabel}
              </p>
            ) : null}
            {userSession && userSession.status !== "idle" ? (
              <button
                type="button"
                onClick={clearUserClip}
                disabled={isUserProcessing}
                className="text-[11px] underline disabled:opacity-50"
                style={{ color: "var(--muted-foreground)" }}
              >
                Clear your clip
              </button>
            ) : null}
            {isUserProcessing ? (
              <div className="pt-1">
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
            {userSession?.status === "error" ? (
              <p className="text-[10px] text-red-500/90">{userSession.errorMessage}</p>
            ) : null}
            {programSessionDetails ? (
              <div className="pt-2">
                <ProgramSessionNavButtons
                  index={programSessionDetails.index}
                  total={programSessionDetails.total}
                  hasPrev={programSessionDetails.hasPrev}
                  hasNext={programSessionDetails.hasNext}
                  onPrev={programSessionDetails.onPrev}
                  onNext={programSessionDetails.onNext}
                />
              </div>
            ) : null}
          </section>

          {railSession ? (
            <section style={borderTopTheme} className="mt-6 space-y-3 pt-6">
              <p className="mb-0 text-[11px] font-normal uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Movement visualization
              </p>
              <StudioPanelChrome />
            </section>
          ) : null}
        </div>

        {railSession ? <StudioRailExportFooter /> : null}
      </div>
    </div>
  );

  const renderStageRow = (stageNode: ReactNode, options?: { compare?: boolean }) => (
    <div
      className={`flex w-full max-w-full flex-1 items-stretch justify-center self-stretch overflow-hidden ${
        options?.compare ? "h-full min-h-0" : "h-full min-h-[min(50vh,520px)]"
      }`}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-row items-stretch gap-2 overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 items-stretch justify-center self-stretch overflow-hidden">
          {stageNode}
        </div>
        {analysisSession && isDesktop ? (
          <div className="flex min-h-0 min-w-0 shrink-0 flex-row items-stretch gap-2">
            <StudioAnalyticsDrawer
              session={analysisSession}
              isDesktop={isDesktop}
              analyticsDrawerContentMounted={analyticsDrawerContentMounted}
              analyticsDrawerOpen={analyticsDrawerOpen}
              onAnalyticsDrawerWidthTransitionEnd={onAnalyticsDrawerWidthTransitionEnd}
              onOpenDrawer={openAnalyticsDrawer}
              onCloseDrawer={() => setAnalyticsDrawerOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className={`flex w-full flex-col bg-[var(--background)] ${
          embedded ? "h-full min-h-0" : "h-[100dvh]"
        }`}
      >
        {isProgramShell && !isDesktop && programStudio ? (
          <ProgramModalTopBar
            programStudio={programStudio}
            detailsOpen={false}
            analyticsOpen={false}
            onToggleDetails={toggleDetailsPanel}
            onToggleAnalysis={toggleAnalyticsPanel}
            hasAnalysis={false}
          />
        ) : null}
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent,#3b82f6)]" />
        </div>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div
        className={`flex w-full flex-col bg-[var(--background)] ${
          embedded ? "h-full min-h-0" : "h-[100dvh]"
        }`}
      >
        {isProgramShell && !isDesktop && programStudio ? (
          <ProgramModalTopBar
            programStudio={programStudio}
            detailsOpen={false}
            analyticsOpen={false}
            onToggleDetails={toggleDetailsPanel}
            onToggleAnalysis={toggleAnalyticsPanel}
            hasAnalysis={false}
          />
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-sm" style={{ color: "var(--section-subtitle)" }}>
          {error ?? "Exercise not found"}
        </p>
        <Link href="/" className="mt-4 text-sm underline" style={{ color: "var(--foreground)" }}>
          Back to archive
        </Link>
        </div>
      </div>
    );
  }

  const showStage =
    isReadyClipSession(referenceSession) ||
    referenceSession.status === "loading" ||
    referenceSession.status === "processing_video" ||
    isUserProcessing;

  const renderStudioChrome = (stageContent: ReactNode) => (
    <div
      className={`relative flex w-full flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)] ${
        embedded ? "h-full min-h-0" : "h-[100dvh]"
      }`}
    >
        {isProgramShell && !isDesktop && programStudio ? (
          <ProgramModalTopBar
            programStudio={programStudio}
            detailsOpen={panelOpen}
            analyticsOpen={analyticsOpen}
            onToggleDetails={toggleDetailsPanel}
            onToggleAnalysis={toggleAnalyticsPanel}
            hasAnalysis={!!analysisSession}
          />
        ) : null}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {isDesktop ? (
          <aside
            style={{
              width: panelOpen ? "30vw" : 0,
              transition: railWidthTransition,
              ...(panelOpen ? borderRightTheme : { borderRight: "none" }),
            }}
            className={`z-20 flex h-full min-h-0 min-w-0 max-w-[min(28vw)] flex-shrink-0 flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl ${!panelOpen ? "pointer-events-none" : ""}`}
          >
            {panelContent}
          </aside>
        ) : null}

        {portalTarget && !isDesktop && panelOpen && !isProgramShell
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
              <div className="flex shrink-0 flex-col items-start justify-start gap-2 py-4 pl-4 pr-0">
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  style={borderAllTheme}
                  className="inline-flex rounded-lg p-2 text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]"
                  aria-label="Expand panel"
                >
                  <PanelLeftOpen size={18} />
                </button>
                {programStudio ? (
                  <ProgramModalCloseButton onClose={programStudio.onClose} />
                ) : null}
              </div>
            ) : null}

            <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-[var(--background)]">
              {!isDesktop && !isProgramShell ? (
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
                      className="inline-flex rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] p-2 text-[color:var(--muted-foreground)] shadow-lg backdrop-blur-md"
                      style={borderAllTheme}
                      aria-label="Open controls"
                    >
                      <PanelLeftOpen size={18} />
                    </button>
                  ) : null}
                  {analysisSession && !analyticsOpen ? (
                    <button
                      type="button"
                      onClick={() => setAnalyticsOpen(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--card-bg)_88%,transparent)] text-[color:var(--foreground)] shadow-lg backdrop-blur-md"
                      style={borderAllTheme}
                      aria-label="Open analysis"
                    >
                      <BarChart3 size={16} />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {referenceSession.status === "error" ? (
                <div className="max-w-md px-4 text-center">
                  <p className="mb-4 text-sm text-[color:var(--foreground)]">
                    {referenceSession.errorMessage}
                  </p>
                  {videoUrl ? (
                    <button
                      type="button"
                      onClick={() => runReferenceTfjs(videoUrl, `${exercise.title} (reference)`)}
                      className="rounded-lg bg-[var(--accent,#3b82f6)] px-4 py-2 text-sm text-white"
                    >
                      Retry analysis
                    </button>
                  ) : null}
                </div>
              ) : null}

              {showStage && referenceSession.videoUrl ? (
                <div
                  className={`absolute inset-0 flex overflow-hidden ${
                    isCompareMode || isUserProcessing
                      ? "items-stretch justify-center p-1 md:p-2"
                      : "items-center justify-center p-2 md:p-4"
                  }`}
                >
                  {stageContent}
                </div>
              ) : null}
            </div>
          </div>

        {isProgramShell && !isDesktop && panelOpen ? (
          <>
            <button
              type="button"
              className="absolute inset-0 z-20 bg-black/50"
              style={{ pointerEvents: mobileRailBackdropReady ? "auto" : "none" }}
              aria-label="Close exercise details"
              onClick={() => setPanelOpen(false)}
            />
            <div
              className="absolute bottom-0 left-0 top-0 z-30 flex flex-col overflow-hidden bg-[var(--header-bg)] backdrop-blur-xl"
              style={{ ...borderRightTheme, width: "min(85vw, 30rem)" }}
            >
              {panelContent}
            </div>
          </>
        ) : null}

        {isProgramShell && !isDesktop && analyticsOpen ? (
          <div className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-[var(--background)]">
            <div
              style={{ borderBottom: "1px solid var(--border)" }}
              className="flex flex-shrink-0 px-4 py-2"
            >
              <p className="text-sm font-medium">Analysis</p>
            </div>
            <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto p-2">
              {analysisSession ? (
                <Suspense
                  fallback={
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-[color:var(--muted)]" />
                    </div>
                  }
                >
                  <MotionAnalysisPanel
                    poses={analysisSession.poses}
                    angles={analysisSession.angles}
                    videoUrl={analysisSession.videoUrl}
                    frameIntervalSec={analysisSession.frameIntervalSec}
                    syncPlaybackFrame={false}
                  />
                </Suspense>
              ) : (
                <p className="p-4 text-sm text-[color:var(--muted)]">Load the reference video first.</p>
              )}
            </div>
          </div>
        ) : null}
        </div>
        </div>

        {isProgramShell && !isDesktop && !panelOpen && !analyticsOpen && programStudio ? (
          <ProgramModalBottomNav programStudio={programStudio} />
        ) : null}

        {isProgramShell && showLiveModal ? (
          <div className="absolute inset-0 z-40 flex flex-col overflow-hidden bg-black">
            <LiveVideoPlayer
              onRecordingComplete={onRecordingComplete}
              onMethodChange={() => setShowLiveModal(false)}
              onEmbeddedClose={() => setShowLiveModal(false)}
              referenceAngles={undefined}
              exercise={exercise}
              layoutVariant="embeddedFullscreen"
            />
          </div>
        ) : null}

        {!isProgramShell ? (
          <Dialog.Root open={showLiveModal} onOpenChange={setShowLiveModal}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[230] bg-black" />
              <Dialog.Content className="fixed inset-0 z-[231] flex flex-col overflow-hidden border-0 bg-black p-0 outline-none">
                <Dialog.Title className="sr-only">Record from camera</Dialog.Title>
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <LiveVideoPlayer
                    onRecordingComplete={onRecordingComplete}
                    onMethodChange={() => setShowLiveModal(false)}
                    onEmbeddedClose={() => setShowLiveModal(false)}
                    referenceAngles={undefined}
                    exercise={exercise}
                    layoutVariant="embeddedFullscreen"
                  />
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        ) : null}

        {!isProgramShell && !isDesktop ? (
          <Dialog.Root open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[215] bg-black/70" />
              <Dialog.Content
                style={borderAllTheme}
                className="fixed inset-x-2 bottom-2 top-2 z-[220] flex flex-col overflow-hidden rounded-xl bg-[var(--background)] shadow-2xl backdrop-blur-xl"
              >
                <div className="flex flex-shrink-0 items-center justify-between px-2 py-2">
                  <Dialog.Title className="text-sm font-medium">Analysis</Dialog.Title>
                  <Dialog.Close className="rounded p-1 text-[color:var(--muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                    <X size={18} />
                  </Dialog.Close>
                </div>
                <div className="open-move-studio-panel-scroll min-h-0 flex-1 overflow-y-auto p-2">
                  {analysisSession ? (
                    <Suspense
                      fallback={
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-[color:var(--muted)]" />
                        </div>
                      }
                    >
                      <MotionAnalysisPanel
                        poses={analysisSession.poses}
                        angles={analysisSession.angles}
                        videoUrl={analysisSession.videoUrl}
                        frameIntervalSec={analysisSession.frameIntervalSec}
                        syncPlaybackFrame={false}
                      />
                    </Suspense>
                  ) : (
                    <p className="p-4 text-sm text-[color:var(--muted)]">Load the reference video first.</p>
                  )}
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        ) : null}
    </div>
  );

  const buildStageContent = (
    compareEngines?: {
      userEngine: ReturnType<typeof useAssetVideoEngine>;
      referenceEngine: ReturnType<typeof useAssetVideoEngine>;
    }
  ): ReactNode => {
    if (isCompareMode && compareEngines && userSession && isReadyClipSession(userSession)) {
      return renderStageRow(
        <ExerciseCompareStage
          userEngine={compareEngines.userEngine}
          referenceEngine={compareEngines.referenceEngine}
          userVideoUrl={userSession.videoUrl}
          referenceVideoUrl={referenceSession.videoUrl}
          userVideoSources={userSession.videoSources ?? undefined}
          referenceVideoSources={referenceSession.videoSources ?? undefined}
          userIntrinsicAspect={userIntrinsicAspect}
          referenceIntrinsicAspect={referenceIntrinsicAspect}
          isLandscapeLayout={compareLayoutLandscape}
          playbackOverlay={<StudioStagePlaybackOverlay />}
        />,
        { compare: true }
      );
    }

    if (isUserProcessing && isReadyClipSession(referenceSession) && userSession?.videoUrl) {
      return renderStageRow(
        <CompareProcessingStage
          referenceSession={referenceSession}
          userSession={userSession as ClipSession & { videoUrl: string }}
          referenceIntrinsicAspect={referenceIntrinsicAspect}
          isLandscapeLayout={compareLayoutLandscape}
          tfProgress={tfProgress}
        />,
        { compare: true }
      );
    }

    if (isReadyClipSession(referenceSession) && !isCompareMode) {
      return renderStageRow(
        <AssetVideoPlayerStage
          videoUrl={referenceSession.videoUrl}
          videoSources={referenceSession.videoSources ?? undefined}
          intrinsicAspect={referenceIntrinsicAspect}
          className={
            referenceOnlyLandscape
              ? "relative mx-auto h-auto w-full max-h-[min(94dvh,calc(100dvh-24px))] max-w-full min-h-0 overflow-hidden rounded-lg bg-[#111214] shadow-lg"
              : "relative h-full max-h-[min(100dvh,calc(100dvh-0px))] w-auto max-w-[min(100%,min(100vw,56rem))] overflow-hidden rounded-lg bg-[#111214] shadow-lg md:max-h-[min(100dvh,calc(100dvh-0px))]"
          }
        >
          <StudioStagePlaybackOverlay />
        </AssetVideoPlayerStage>
      );
    }

    if (!referenceSession.videoUrl) return null;

    return (
      <div
        style={borderAllTheme}
        className="relative aspect-[9/16] max-h-[70dvh] w-full max-w-lg overflow-hidden rounded-lg bg-[var(--surface)]"
      >
        <video
          src={referenceSession.videoUrl}
          className="h-full w-full object-contain opacity-50"
          muted
          playsInline
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth > 0 && v.videoHeight > 0) {
              setReferenceIntrinsicAspect({
                width: v.videoWidth,
                height: v.videoHeight,
              });
            }
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent,#3b82f6)]" />
          <p className="text-sm text-[color:var(--foreground)]">
            {referenceSession.status === "processing_video"
              ? `Analyzing motion… ${tfProgress}%`
              : "Loading reference…"}
          </p>
        </div>
      </div>
    );
  };

  if (isCompareMode && userSession && isReadyClipSession(userSession) && isReadyClipSession(referenceSession)) {
    return (
      <ExerciseCompareEngineBridge userSession={userSession} referenceSession={referenceSession}>
        {(engines) => renderStudioChrome(buildStageContent(engines))}
      </ExerciseCompareEngineBridge>
    );
  }

  return (
    <ConditionalEngineBridge session={railSession}>
      {renderStudioChrome(buildStageContent())}
    </ConditionalEngineBridge>
  );
}
