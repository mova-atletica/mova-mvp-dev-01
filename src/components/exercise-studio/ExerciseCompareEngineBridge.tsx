"use client";

import { useEffect, type ReactNode } from "react";
import { useAssetVideoEngine, type AssetVideoEngine } from "../../app/motion-explore/useAssetVideoEngine";
import { AssetVideoEngineProvider } from "../../app/motion-explore/assetVideoEngineContext";
import type { ReadyClipSession } from "./exerciseStudioTypes";

/** Re-export engine type for compare stage consumers. */
export type { AssetVideoEngine };

interface ExerciseCompareEngineBridgeProps {
  userSession: ReadyClipSession;
  referenceSession: ReadyClipSession;
  children: (engines: {
    userEngine: ReturnType<typeof useAssetVideoEngine>;
    referenceEngine: ReturnType<typeof useAssetVideoEngine>;
  }) => ReactNode;
}

export default function ExerciseCompareEngineBridge({
  userSession,
  referenceSession,
  children,
}: ExerciseCompareEngineBridgeProps) {
  const userEngine = useAssetVideoEngine({
    videoUrl: userSession.videoUrl,
    poses: userSession.poses,
    exerciseTitle: userSession.sessionLabel,
    sportAnalysisKind: "pullups",
    sportMetricsSnapshot: null,
  });

  const referenceEngine = useAssetVideoEngine({
    videoUrl: referenceSession.videoUrl,
    poses: referenceSession.poses,
    exerciseTitle: referenceSession.sessionLabel,
    sportAnalysisKind: "pullups",
    sportMetricsSnapshot: null,
  });

  const userEffectsKey = JSON.stringify(
    userEngine.activeEffects.map((e) => ({ id: e.effect.id, enabled: e.enabled, config: e.config }))
  );

  useEffect(() => {
    referenceEngine.setActiveEffects(userEngine.activeEffects);
  }, [userEffectsKey, referenceEngine, userEngine.activeEffects]);

  useEffect(() => {
    referenceEngine.setStatsConfig(userEngine.statsConfig);
  }, [referenceEngine, userEngine.statsConfig]);

  useEffect(() => {
    referenceEngine.setVideoVisibility(userEngine.videoVisibility);
  }, [referenceEngine, userEngine.videoVisibility]);

  useEffect(() => {
    const userVideo = userEngine.videoRef.current;
    const refVideo = referenceEngine.videoRef.current;
    if (!userVideo || !refVideo) return;

    const onPlay = () => {
      void refVideo.play().catch(() => {});
    };
    const onPause = () => {
      refVideo.pause();
    };

    userVideo.addEventListener("play", onPlay);
    userVideo.addEventListener("pause", onPause);
    return () => {
      userVideo.removeEventListener("play", onPlay);
      userVideo.removeEventListener("pause", onPause);
    };
  }, [userEngine.videoRef, referenceEngine.videoRef, userSession.videoUrl, referenceSession.videoUrl]);

  return (
    <AssetVideoEngineProvider engine={userEngine}>
      {children({ userEngine, referenceEngine })}
    </AssetVideoEngineProvider>
  );
}
