"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import AssetVideoPlayerStage from "../../app/motion-explore/AssetVideoPlayerStage";
import type { AssetVideoEngine } from "../../app/motion-explore/useAssetVideoEngine";

const borderAllTheme = { border: "1px solid var(--border-secondary)" } as const;
const PANE_GAP_PX = 12;

type VideoAspect = { width: number; height: number } | null;
type FitSize = { width: number; height: number };

function defaultAspect(intrinsic: VideoAspect): { width: number; height: number } {
  if (intrinsic && intrinsic.width > 0 && intrinsic.height > 0) return intrinsic;
  return { width: 9, height: 16 };
}

/** Fit a video frame inside a cell without exceeding width or height. */
function fitVideoInCell(
  cellWidth: number,
  cellHeight: number,
  aspectWidth: number,
  aspectHeight: number
): FitSize {
  if (cellWidth <= 0 || cellHeight <= 0) return { width: 0, height: 0 };
  const aspect = aspectWidth / aspectHeight;
  let height = cellHeight;
  let width = height * aspect;
  if (width > cellWidth) {
    width = cellWidth;
    height = width / aspect;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
}

interface ComparePaneProps {
  engine: AssetVideoEngine;
  videoUrl: string;
  videoSources?: Array<{ src: string; type: string }>;
  intrinsicAspect: VideoAspect;
  fitSize: FitSize;
  children?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
}

function ComparePane({
  engine,
  videoUrl,
  videoSources,
  intrinsicAspect,
  fitSize,
  children,
  loading = false,
  loadingLabel = "Analyzing motion…",
}: ComparePaneProps) {
  const frameClass =
    "relative h-full w-full min-h-0 min-w-0 overflow-hidden rounded-lg bg-[#111214] shadow-lg";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden">
      {loading ? (
        <div
          style={{ ...borderAllTheme, width: fitSize.width || undefined, height: fitSize.height || undefined }}
          className="relative shrink-0 overflow-hidden rounded-lg bg-[var(--surface)]"
        >
          <video src={videoUrl} className="h-full w-full object-contain opacity-40" muted playsInline />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:color-mix(in_srgb,var(--foreground)_35%,transparent)]">
            <Loader2 className="h-7 w-7 animate-spin text-[var(--accent,#3b82f6)]" />
            <p className="px-3 text-center text-xs text-[color:var(--foreground)]">{loadingLabel}</p>
          </div>
        </div>
      ) : fitSize.width > 0 && fitSize.height > 0 ? (
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ width: fitSize.width, height: fitSize.height }}
        >
          <AssetVideoPlayerStage
            engine={engine}
            videoUrl={videoUrl}
            videoSources={videoSources}
            intrinsicAspect={intrinsicAspect}
            className={frameClass}
          >
            {children}
          </AssetVideoPlayerStage>
        </div>
      ) : null}
    </div>
  );
}

export interface ExerciseCompareStageProps {
  userEngine: AssetVideoEngine;
  referenceEngine: AssetVideoEngine;
  userVideoUrl: string;
  referenceVideoUrl: string;
  userVideoSources?: Array<{ src: string; type: string }>;
  referenceVideoSources?: Array<{ src: string; type: string }>;
  userIntrinsicAspect: VideoAspect;
  referenceIntrinsicAspect: VideoAspect;
  /** Portrait clips → side-by-side; landscape clips → stacked. */
  isLandscapeLayout: boolean;
  userLoading?: boolean;
  userLoadingLabel?: string;
  playbackOverlay?: ReactNode;
}

export default function ExerciseCompareStage({
  userEngine,
  referenceEngine,
  userVideoUrl,
  referenceVideoUrl,
  userVideoSources,
  referenceVideoSources,
  userIntrinsicAspect,
  referenceIntrinsicAspect,
  isLandscapeLayout,
  userLoading = false,
  userLoadingLabel,
  playbackOverlay,
}: ExerciseCompareStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const userAspect = defaultAspect(userIntrinsicAspect);
  const referenceAspect = defaultAspect(referenceIntrinsicAspect);

  let userFit: FitSize = { width: 0, height: 0 };
  let referenceFit: FitSize = { width: 0, height: 0 };

  if (containerSize.width > 0 && containerSize.height > 0) {
    if (isLandscapeLayout) {
      const cellWidth = containerSize.width;
      const cellHeight = (containerSize.height - PANE_GAP_PX) / 2;
      userFit = fitVideoInCell(cellWidth, cellHeight, userAspect.width, userAspect.height);
      referenceFit = fitVideoInCell(cellWidth, cellHeight, referenceAspect.width, referenceAspect.height);
    } else {
      const cellWidth = (containerSize.width - PANE_GAP_PX) / 2;
      const cellHeight = containerSize.height;
      userFit = fitVideoInCell(cellWidth, cellHeight, userAspect.width, userAspect.height);
      referenceFit = fitVideoInCell(cellWidth, cellHeight, referenceAspect.width, referenceAspect.height);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`flex h-full min-h-0 w-full max-w-full flex-1 items-stretch justify-center self-stretch overflow-hidden ${
        isLandscapeLayout ? "flex-col gap-3" : "flex-row gap-3"
      }`}
    >
      <ComparePane
        engine={userEngine}
        videoUrl={userVideoUrl}
        videoSources={userVideoSources}
        intrinsicAspect={userIntrinsicAspect}
        fitSize={userFit}
        loading={userLoading}
        loadingLabel={userLoadingLabel}
      >
        {!userLoading ? playbackOverlay : null}
      </ComparePane>

      <ComparePane
        engine={referenceEngine}
        videoUrl={referenceVideoUrl}
        videoSources={referenceVideoSources}
        intrinsicAspect={referenceIntrinsicAspect}
        fitSize={referenceFit}
      />
    </div>
  );
}
