"use client";

import React, { useLayoutEffect, useState } from "react";
import type { AssetVideoEngine } from "./useAssetVideoEngine";
import { useOptionalAssetVideoEngine } from "./assetVideoEngineContext";

export type AssetVideoPlayerStageProps = {
  videoUrl?: string;
  /** When true, render pose canvas on neutral background without a video element. */
  metricsOnlyReplay?: boolean;
  /** Optional source list for browser fallback order (first supported source plays). */
  videoSources?: Array<{ src: string; type: string }>;
  /** When omitted, uses AssetVideoEngineProvider context */
  engine?: AssetVideoEngine;
  children?: React.ReactNode;
  /** className for the outer video frame (default matches legacy 400×711 phone frame) */
  className?: string;
  /**
   * Pixel dimensions from the file (e.g. videoWidth / videoHeight after loadedmetadata).
   * Sets CSS aspect-ratio so the frame width follows the real clip while height is driven by layout.
   * When omitted/null, callers that pass className should still get a sane default via style merge.
   */
  intrinsicAspect?: { width: number; height: number } | null;
  /**
   * Portrait / phone clips: fill parent height, derive width from aspect ratio in JS.
   * Avoids Safari collapsing `h-full` + `w-auto` + CSS `aspect-ratio` to a hairline.
   */
  heightDriven?: boolean;
};

function aspectFromIntrinsic(
  intrinsicAspect?: { width: number; height: number } | null
): number {
  if (
    intrinsicAspect &&
    intrinsicAspect.width > 0 &&
    intrinsicAspect.height > 0
  ) {
    return intrinsicAspect.width / intrinsicAspect.height;
  }
  return 9 / 16;
}

export default function AssetVideoPlayerStage({
  videoUrl = "",
  metricsOnlyReplay = false,
  videoSources,
  engine: engineProp,
  children,
  className,
  intrinsicAspect,
  heightDriven = false,
}: AssetVideoPlayerStageProps) {
  const fromCtx = useOptionalAssetVideoEngine();
  const engine = engineProp ?? fromCtx;
  if (!engine) {
    throw new Error(
      "AssetVideoPlayerStage requires an engine prop or a parent AssetVideoEngineProvider"
    );
  }

  const { videoRef, canvasRef, overlayRef, containerRef, setIsPlaying } = engine;
  const primarySrc = videoSources?.length ? videoSources[0]?.src : videoUrl;
  const needsCors =
    Boolean(primarySrc) &&
    !metricsOnlyReplay &&
    !primarySrc.startsWith("blob:") &&
    !primarySrc.startsWith("data:");

  const aspect = aspectFromIntrinsic(intrinsicAspect);
  const [heightDrivenBox, setHeightDrivenBox] = useState<{
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!heightDriven) {
      setHeightDrivenBox(null);
      return;
    }
    const el = containerRef.current;
    const parent = el?.parentElement;
    if (!parent) return;

    const measure = () => {
      const row = parent.parentElement;
      const availH = parent.clientHeight || row?.clientHeight || 0;
      if (availH <= 0) return;

      // Prefer the stage row width minus siblings (analysis drawer) so portrait
      // can grow to height × aspect instead of being stuck at the column min-width.
      let availW = parent.clientWidth;
      if (row && row.clientWidth > 0) {
        let reserved = 0;
        for (let i = 0; i < row.children.length; i++) {
          const sib = row.children[i];
          if (sib !== parent && sib instanceof HTMLElement) {
            reserved += sib.offsetWidth;
          }
        }
        const gapRaw = getComputedStyle(row).columnGap || getComputedStyle(row).gap || "0";
        const gap = Number.parseFloat(gapRaw) || 0;
        const gapTotal = Math.max(0, row.children.length - 1) * gap;
        availW = Math.max(availW, row.clientWidth - reserved - gapTotal);
      }
      if (availW <= 0) return;

      // Height-driven: always fill parent height. Clamp width only.
      const height = availH;
      let width = height * aspect;
      if (width > availW) {
        width = availW;
      }
      // Safari can report a collapsed width before layout settles — nudge off hairline only.
      if (width < 48 && availW >= 48) {
        width = Math.min(200, availW);
      }

      setHeightDrivenBox((prev) => {
        if (
          prev &&
          Math.abs(prev.width - width) < 0.5 &&
          Math.abs(prev.height - height) < 0.5
        ) {
          return prev;
        }
        return { width, height };
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    const row = parent.parentElement;
    if (row) ro.observe(row);
    return () => ro.disconnect();
  }, [heightDriven, aspect, containerRef]);

  const frameStyle: React.CSSProperties = className
    ? heightDriven
      ? {
          height: heightDrivenBox ? `${heightDrivenBox.height}px` : "100%",
          width: heightDrivenBox ? `${heightDrivenBox.width}px` : undefined,
          maxHeight: "100%",
          maxWidth: "100%",
          minWidth: heightDrivenBox ? undefined : "min(200px, 100%)",
          // Don't lock CSS aspect-ratio when height-driven — frame may be taller than
          // the clip AR; the video element object-contains inside.
          flexShrink: 0,
        }
      : {
          minHeight: "min(280px, 50vh)",
          aspectRatio:
            intrinsicAspect &&
            intrinsicAspect.width > 0 &&
            intrinsicAspect.height > 0
              ? `${intrinsicAspect.width} / ${intrinsicAspect.height}`
              : "9 / 16",
        }
    : {
        maxHeight: "min(85dvh, 711px)",
      };

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "relative mx-auto w-full max-w-[400px] aspect-[400/711] min-h-[200px] rounded-sm overflow-hidden bg-[#111214] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center pb-[30px]"
      }
      style={frameStyle}
    >
      <video
        ref={videoRef}
        // Signed Storage URLs need this before src so canvas export can read pixels.
        // Skip for blob:/data: (local analyze) — avoids unnecessary CORS mode.
        crossOrigin={needsCors ? "anonymous" : undefined}
        src={metricsOnlyReplay ? undefined : videoSources?.length ? undefined : videoUrl || undefined}
        style={{
          display: metricsOnlyReplay ? "none" : "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
          //borderRadius: "0.75rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        loop
        muted
        playsInline
        controls={false}
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      >
        {videoSources?.map((source) => (
          <source key={`${source.src}-${source.type}`} src={source.src} type={source.type} />
        ))}
      </video>

      <canvas
        ref={canvasRef}
        style={{
          pointerEvents: "none",
          zIndex: 2,
          borderRadius: "0.75rem",
        }}
      />

      <div
        ref={overlayRef}
        style={{
          zIndex: 3,
        }}
      >
        {children}
      </div>
    </div>
  );
}
