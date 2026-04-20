"use client";

import React from "react";
import type { AssetVideoEngine } from "./useAssetVideoEngine";
import { useOptionalAssetVideoEngine } from "./assetVideoEngineContext";

export type AssetVideoPlayerStageProps = {
  videoUrl: string;
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
};

export default function AssetVideoPlayerStage({
  videoUrl,
  engine: engineProp,
  children,
  className,
  intrinsicAspect,
}: AssetVideoPlayerStageProps) {
  const fromCtx = useOptionalAssetVideoEngine();
  const engine = engineProp ?? fromCtx;
  if (!engine) {
    throw new Error(
      "AssetVideoPlayerStage requires an engine prop or a parent AssetVideoEngineProvider"
    );
  }

  const { videoRef, canvasRef, containerRef, setIsPlaying } = engine;

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "relative mx-auto w-full max-w-[400px] aspect-[400/711] min-h-[200px] rounded-sm overflow-hidden bg-[#111214] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center pb-[30px]"
      }
      style={
        className
          ? {
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
            }
      }
    >
      <video
        ref={videoRef}
        src={videoUrl}
        style={{
          display: "block",
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
      />

      <canvas
        ref={canvasRef}
        style={{
          pointerEvents: "none",
          zIndex: 2,
          borderRadius: "0.75rem",
        }}
      />

      {children}
    </div>
  );
}
