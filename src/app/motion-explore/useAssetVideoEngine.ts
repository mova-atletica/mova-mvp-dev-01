"use client";
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { exportAsset, downloadBlob, type ExportConfig } from "../../lib/exportService";
import { sampleVideoElementFps, safeExportFps } from "../../lib/videoFps";
import {
  renderMuybridge,
  renderMuybridgeFromCanvas,
  preExtractKeyFrames,
  clearFrameCache,
} from "../../lib/effects/muybridge";
import { renderMotionTrails } from "../../lib/effects/motion-trails";
import { renderMuybridgeTileEffects } from "../../lib/effects/muybridgeTileRenderer";
import { renderJointAngleTraceOverlay, renderStats } from "../../lib/effects/stats";
import { sortEffectsByOverlayDrawOrder } from "../../lib/effects/overlayDrawOrder";
import type { AssetVideoPlayerProps, Effect, ActiveEffect, EffectType } from "./assetVideoTypes";
import { availableEffects } from "./assetVideoTypes";

const DEFAULT_LABEL_CHIP = {
  labelBg: "glass" as const,
  labelBgColor: "#ffffff",
  labelBgOpacity: 0.22,
  labelBlurPx: 14,
};

export function useAssetVideoEngine({
  videoUrl,
  poses,
  exerciseTitle: _exerciseTitle,
  exercise: _exercise,
  sportAnalysisKind = "cycling",
  sportMetricsSnapshot = null,
}: AssetVideoPlayerProps) {
  const [activeEffects, setActiveEffects] = useState<ActiveEffect[]>([]);
  
  // Effects and poses are now working with both data formats!
  
  
  const [statsConfig, setStatsConfig] = useState<any>({ rom: true, live: true });
  // Use ExportConfig type from exportService for consistency
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'png',
    quality: 'high',
    duration: 3,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EffectType | 'export' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  /** Detected source fps; null until sampled. Export uses this (or 30 fallback). */
  const [sourceFps, setSourceFps] = useState<number | null>(null);
  const [videoVisibility, setVideoVisibility] = useState({
    showVideo: true,
    opacity: 1.0,
    blendMode: 'source-over' as GlobalCompositeOperation
  });
  
  // Custom dropdown states
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [qualityDropdownOpen, setQualityDropdownOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Force one paint after canvas/layout resizes so overlays do not disappear.
  const needsRedrawRef = useRef(true);

  // Same static effect modules as exportService — live preview and export share one code path.
  const effectModulesRef = useRef({
    renderMuybridge,
    renderMuybridgeFromCanvas,
    renderMotionTrails,
    renderStats,
  });

  // Track video duration + source fps when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    const probeFps = async () => {
      if (cancelled) return;
      const fps = await sampleVideoElementFps(video);
      if (!cancelled && fps != null) setSourceFps(fps);
    };

    const handleLoadedMetadata = () => {
      if (video.duration && isFinite(video.duration)) {
        setVideoDuration(video.duration);
      }
      void probeFps();
    };

    setSourceFps(null);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    // Also check if duration is already available
    if (video.duration && isFinite(video.duration)) {
      setVideoDuration(video.duration);
      void probeFps();
    }

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl]);


  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const addEffect = (effect: Effect) => {
    const newActiveEffect: ActiveEffect = {
      id: effect.id,
      effect,
      config: getDefaultConfigForEffect(effect),
      enabled: true,
      order: activeEffects.length
    };
    setActiveEffects(prev => [...prev, newActiveEffect]);
  };

  const getDefaultConfigForEffect = (effect: Effect) => {
    switch (effect.id) {
      case 'muybridge':
        return {
          gridSize: 3,
          gridRows: 3,
          gridCols: 3,
          padding: 0,
          frameStagger: 0.5,
          showBorders: true,
          borderColor: '#00ff00',
          borderWidth: 2
        };
      case 'motion-trails':
        return {
          trailLength: 10,
          trailOpacity: 0.6,
          trailStyle: 'simple',
          fadeOut: true,
          color: '#ffffff',
          thickness: 2,
          showBones: true,
          boneColor: '#ffffff',
          boneThickness: 1
        };
      case 'joint-angles':
        return {
          showJointAngles: true,
          enabledJoints: ['left_elbow', 'right_elbow'],
          angleColor: '#00ff00',
          angleSize: 12,
          showROM: false,
          romJoints: [],
          safeZoneEnabled: true,
          ...DEFAULT_LABEL_CHIP,
        };
      case 'joint-angle-trace':
        return {
          safeZoneEnabled: true,
          jointAngleChartJointA: 'left_knee',
          jointAngleChartJointB: 'right_knee',
          jointAngleChartColorA: '#000000',
          jointAngleChartColorB: '#ffffff',
          jointAngleChartSecondSeries: true,
          jointAngleChartLineStyleA: 'solid',
          jointAngleChartLineStyleB: 'solid',
          jointAngleChartLineThickness: 2,
          jointAngleChartInterpolateGaps: true,
          jointAngleChartMaxInterpGapFrames: 20,
        };
      case 'range-of-motion':
        return {
          showJointAngles: false,
          enabledJoints: [],
          showROM: true,
          romJoints: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
          romDisplayStyle: 'min_max',
          romColor: '#ff6b35',
          angleSize: 16,
          safeZoneEnabled: false,
          ...DEFAULT_LABEL_CHIP,
        };
      case 'metrics-chips':
        return {
          showJointAngles: false,
          enabledJoints: [],
          showROM: false,
          romJoints: [],
          safeZoneEnabled: true,
          showMetricChips: true,
          metricChipLayout: "bottom_center_row",
          metricChipTextColor: "#ffffff",
          metricChips: [],
        };
      case 'mobility-geometry':
        return {
          showMobilityGeometry: true,
          mobilityGeometryAxes: [
            {
              id: "axis-v-body",
              target: "body_center",
              orient: "vertical",
              color: "#ffffff",
              lineWidth: 1,
              lineLength: 220,
              lineStyle: "solid",
              capStyle: "tick",
              opacity: 0.9,
            },
            {
              id: "axis-h-hip",
              target: "hip_mid",
              orient: "horizontal",
              color: "#ffffff",
              lineWidth: 1,
              lineLength: 220,
              lineStyle: "solid",
              capStyle: "tick",
              opacity: 0.9,
            },
          ],
          mobilityGeometryArcs: [
            {
              id: "arc-left-hip",
              joint: "left_hip",
              color: "#ffffff",
              lineWidth: 1,
              lineStyle: "solid",
              arcRadius: 40,
              opacity: 0.9,
            },
          ],
        };
      case 'skeleton-overlay':
        return {
          showSkeleton: true,
          boneColor: '#00ff00',
          jointColor: '#00ff00',
          boneWeight: 2,
          jointSize: 4,
          showJoints: true,
          showBones: true,
          selectedJoints: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          selectedBones: ['5-7', '7-9', '6-8', '8-10', '11-13', '13-15', '12-14', '14-16', '5-6', '11-12', '5-11', '6-12']
        };
      default:
        return {};
    }
  };

  // Default-on behavior for Open Move: initialize with joint angles enabled.
  useEffect(() => {
    setActiveEffects((prev) => {
      if (prev.length > 0) return prev;
      const jointAnglesEffect = availableEffects.find((effect) => effect.id === "joint-angles");
      if (!jointAnglesEffect) return prev;
      return [
        {
          id: jointAnglesEffect.id,
          effect: jointAnglesEffect,
          config: getDefaultConfigForEffect(jointAnglesEffect),
          enabled: true,
          order: 0,
        },
      ];
    });
  }, []);

  const removeEffect = (effectId: string) => {
    if (effectId === 'muybridge') {
      clearFrameCache();
    }
    setActiveEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  // Pre-extract staggered frames so Muybridge preview tiles show distinct poses (no per-frame seek).
  useEffect(() => {
    const muybridgeEffect = activeEffects.find(
      (e) => e.effect.id === 'muybridge' && e.enabled
    );
    if (!muybridgeEffect) return;

    const video = videoRef.current;
    if (!video?.src) return;

    const config = muybridgeEffect.config;

    const extract = () => {
      clearFrameCache(video.src);
      preExtractKeyFrames(video, config)
        .then(() => {
          needsRedrawRef.current = true;
        })
        .catch(console.error);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      extract();
    } else {
      video.addEventListener('canplay', extract, { once: true });
      return () => video.removeEventListener('canplay', extract);
    }
  }, [activeEffects, videoUrl]);

  useEffect(() => {
    clearFrameCache();
  }, [videoUrl]);

  const isEffectActive = (effectId: string) => {
    return activeEffects.some(effect => effect.id === effectId);
  };

  const getEffectsForCategory = (category: EffectType) => {
    return availableEffects.filter(effect => effect.category === category);
  };

  const hasProblematicCombination = () => false;

  const handleExport = async () => {
    const video = videoRef.current;
    if (!video) {
      console.error('No video available for export');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);

    try {
      let fps = sourceFps;
      if (fps == null) {
        fps = await sampleVideoElementFps(video);
        if (fps != null) setSourceFps(fps);
      }

      const result = await exportAsset(video, poses, activeEffects, {
        ...exportConfig,
        framerate: safeExportFps(fps),
        videoVisibility,
        sportAnalysisKind,
        sportMetricsSnapshot,
      });
      
      if (result.success && result.data instanceof Blob && result.filename) {
        downloadBlob(result.data, result.filename);
        
        // Show success feedback
        setExportSuccess(true);
        setIsExporting(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => setExportSuccess(false), 3000);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
    }
  };

  // Canvas rendering effect - exact same as AssetGenerationModal
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let rafId: number;
    let lastDrawTime = 0;
    let lastConfigHash = '';
    
    function draw() {
      if (video && canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const currentTime = video.currentTime;
          
          // Optimization: only redraw if time changed significantly or config changed
          const configHash = JSON.stringify(activeEffects.map(e => ({ id: e.effect.id, enabled: e.enabled, config: e.config })));
          const timeChanged = Math.abs(currentTime - lastDrawTime) > 0.1; // Update every 100ms
          const configChanged = configHash !== lastConfigHash;
          // Until the first frame is decodable, drawImage can be blank; keep redrawing instead of
          // skipping (paused at t=0 would otherwise freeze an empty canvas on Safari/Edge).
          const videoReadyToPaint =
            video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

          if (
            videoReadyToPaint &&
            !timeChanged &&
            !configChanged &&
            !needsRedrawRef.current
          ) {
            rafId = requestAnimationFrame(draw);
            return;
          }
          
          lastDrawTime = currentTime;
          lastConfigHash = configHash;
          needsRedrawRef.current = false;
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Check if video should be rendered based on global toggle and effect overrides
          const hasVideoReplacement = activeEffects.some(effect => 
            effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
          );
          
          // Check if Muybridge effect is active (it will handle its own video rendering)
          const hasMuybridgeEffect = activeEffects.some(effect => 
            effect.enabled && effect.effect.id === 'muybridge'
          );
          
          // Render video background FIRST if no effect disables it and Muybridge is not active
          if (!hasVideoReplacement && !hasMuybridgeEffect) {
            // Apply video visibility settings
            if (videoVisibility.showVideo) {
              ctx.globalAlpha = videoVisibility.opacity;
              ctx.globalCompositeOperation = videoVisibility.blendMode;
              // Draw video scaled to fit the canvas (which now matches display size)
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              ctx.globalCompositeOperation = 'source-over';
              ctx.globalAlpha = 1.0;
            }
          }
          
          // Check if Muybridge effect is active
          const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
          
          if (muybridgeEffect && effectModulesRef.current.renderMuybridgeFromCanvas) {
            // If Muybridge is active, skip other effects and let Muybridge handle everything
            try {
              // Clear the main canvas for muybridge to render to
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              
              const effectRenderer = (
                frameCtx: CanvasRenderingContext2D,
                frameVideo: HTMLVideoElement,
                framePoses: any[],
                frameTime: number
              ) => {
                renderMuybridgeTileEffects(frameCtx, frameVideo, framePoses, frameTime, {
                  activeEffects,
                  sharedStatsSnapshot: { sportAnalysisKind, sportMetricsSnapshot },
                  isExport: false,
                });
              };
              
              // Render muybridge with effects applied to each frame (now synchronous)
              effectModulesRef.current.renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, currentTime, false, effectRenderer, videoVisibility);
            } catch (error) {
              console.warn('Failed to render muybridge effect:', error);
            }
          } else {
            // If no Muybridge effect, render effects in proper order
            // First render visual-guide effects (background layer)
            for (const effect of activeEffects) {
              if (!effect.enabled) continue;
              
              switch (effect.effect.id) {
                case 'motion-trails':
                  if (effectModulesRef.current.renderMotionTrails) {
                    // No transformation needed - canvas is now at video natural size
                    effectModulesRef.current.renderMotionTrails(ctx, video, poses, effect.config, currentTime);
                  }
                  break;
                case 'skeleton-overlay':
                  // Reuse the existing skeleton rendering logic from VideoPlayer
                  if (poses && poses.length > 0) {
                    const currentFrameIndex = Math.floor(currentTime * (poses.length / (video.duration || 1)));
                    if (currentFrameIndex < poses.length) {
                      const pose = poses[currentFrameIndex];
                      if (pose && pose.keypoints) {
                        const keypoints = pose.keypoints;
                        
                        // Get video dimensions for scaling
                        const videoWidth = video.videoWidth;
                        const videoHeight = video.videoHeight;
                        const canvasWidth = ctx.canvas.width;
                        const canvasHeight = ctx.canvas.height;
                        
                        // Calculate scale factors for object-fit: contain
                        const videoAspectRatio = videoWidth / videoHeight;
                        const canvasAspectRatio = canvasWidth / canvasHeight;
                        
                        let scaleX, scaleY, offsetX = 0, offsetY = 0;
                        
                        if (videoAspectRatio > canvasAspectRatio) {
                          scaleX = canvasWidth / videoWidth;
                          scaleY = scaleX;
                          offsetY = (canvasHeight - videoHeight * scaleY) / 2;
                        } else {
                          scaleY = canvasHeight / videoHeight;
                          scaleX = scaleY;
                          offsetX = (canvasWidth - videoWidth * scaleX) / 2;
                        }
                        
                        ctx.save();
                        
                        // Draw skeleton connections (bones)
                        if (effect.config.showBones) {
                          ctx.strokeStyle = effect.config.boneColor || '#00ff00';
                          ctx.lineWidth = effect.config.boneWeight || 2;
                          
                          const allConnections = [
                            [5, 7], [7, 9], // Left arm
                            [6, 8], [8, 10], // Right arm
                            [11, 13], [13, 15], // Left leg
                            [12, 14], [14, 16], // Right leg
                            [5, 6], // Shoulders
                            [11, 12], // Hips
                            [5, 11], // Left torso
                            [6, 12], // Right torso
                          ];
                          
                          // Only draw selected bones
                          allConnections.forEach(([start, end]) => {
                            const key = `${start}-${end}`;
                            if (!effect.config.selectedBones?.includes(key)) return;
                            
                            const startPoint = keypoints[start];
                            const endPoint = keypoints[end];
                            
                            if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
                              ctx.beginPath();
                              ctx.moveTo(startPoint.x * scaleX + offsetX, startPoint.y * scaleY + offsetY);
                              ctx.lineTo(endPoint.x * scaleX + offsetX, endPoint.y * scaleY + offsetY);
                              ctx.stroke();
                            }
                          });
                        }
                        
                        // Draw joints
                        if (effect.config.showJoints) {
                          ctx.fillStyle = effect.config.jointColor || '#00ff00';
                          
                          keypoints.forEach((keypoint: any, idx: number) => {
                            if (keypoint.score > 0.3 && effect.config.selectedJoints?.includes(idx)) {
                              ctx.beginPath();
                              ctx.arc(
                                keypoint.x * scaleX + offsetX, 
                                keypoint.y * scaleY + offsetY, 
                                effect.config.jointSize || 4, 
                                0, 
                                2 * Math.PI
                              );
                              ctx.fill();
                            }
                          });
                        }
                        
                        ctx.restore();
                      }
                    }
                  }
                  break;
                default:
                  // Skip stats effects for now - render them last
                  break;
              }
            }
            
            // Then render stats / overlay effects (fixed z-order: labels above geometry)
            for (const effect of sortEffectsByOverlayDrawOrder(activeEffects)) {
              if (!effect.enabled) continue;
              
              switch (effect.effect.id) {
                case 'joint-angle-trace':
                  if (poses && poses.length > 0) {
                    try {
                      ctx.save();
                      renderJointAngleTraceOverlay(ctx, video, poses, effect.config, currentTime);
                      ctx.restore();
                    } catch (error) {
                      console.error(`Error rendering ${effect.effect.name}:`, error);
                    }
                  }
                  break;
                case 'joint-angles':
                case 'range-of-motion':
                case 'metrics-chips':
                case 'mobility-geometry':
                  if (effectModulesRef.current.renderStats && poses && poses.length > 0) {
                    // No transformation needed - canvas is now at video natural size
                    try {
                      // Effects now work with both data formats!
                      
                      // Save canvas state before rendering effect
                      ctx.save();
                      effectModulesRef.current.renderStats(
                        ctx,
                        video,
                        poses,
                        {
                          ...effect.config,
                          sportAnalysisKind,
                          sportMetricsSnapshot,
                        },
                        currentTime
                      );
                      // Restore canvas state after rendering effect
                      ctx.restore();
                    } catch (error) {
                      console.error(`Error rendering ${effect.effect.name}:`, error);
                    }
                  }
                  break;
                default:
                  // Skip non-stats effects
                  break;
              }
            }
          }
          
          // Debug shapes removed - effects are now working!
          
          // Effects are now working with both named and indexed keypoints!
        }
      }
      rafId = requestAnimationFrame(draw);
    }
    
    draw();
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [activeEffects, poses, videoVisibility, videoUrl, sportAnalysisKind, sportMetricsSnapshot]);

  // Sync canvas size after layout (useLayoutEffect) so containerRef is set; retry ResizeObserver if ref was late.
  useLayoutEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let ro: ResizeObserver | null = null;
    let rafRetries = 0;
    let cancelled = false;

    function syncCanvasSize() {
      if (!video || !canvas) return;
      if (!video.videoWidth || !video.videoHeight) return;

      needsRedrawRef.current = true;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const container = containerRef.current;
      // Treat 0 as unknown — flex/aspect-ratio can report 0 before layout settles
      const cw = container?.clientWidth ?? 0;
      const ch = container?.clientHeight ?? 0;
      const containerWidth = cw > 0 ? cw : 400;
      const containerHeight = ch > 0 ? ch : 711;
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      let displayWidth: number;
      let displayHeight: number;

      if (videoAspectRatio > containerAspectRatio) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / videoAspectRatio;
      } else {
        displayHeight = containerHeight;
        displayWidth = containerHeight * videoAspectRatio;
      }

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      canvas.style.position = "absolute";
      const overlayTop = `${(containerHeight - displayHeight) / 2}px`;
      const overlayLeft = `${(containerWidth - displayWidth) / 2}px`;
      canvas.style.top = overlayTop;
      canvas.style.left = overlayLeft;

      const overlay = overlayRef.current;
      if (overlay) {
        overlay.style.position = "absolute";
        overlay.style.width = `${displayWidth}px`;
        overlay.style.height = `${displayHeight}px`;
        overlay.style.top = overlayTop;
        overlay.style.left = overlayLeft;
      }
    }

    function tryAttachResizeObserver() {
      if (cancelled || typeof ResizeObserver === "undefined") return;
      const container = containerRef.current;
      if (!container || ro) return;
      ro = new ResizeObserver(() => syncCanvasSize());
      ro.observe(container);
      syncCanvasSize();
    }

    const onMeta = () => syncCanvasSize();
    const onFirstFrameReady = () => {
      needsRedrawRef.current = true;
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("loadeddata", onFirstFrameReady);
    video.addEventListener("canplay", onFirstFrameReady);
    window.addEventListener("resize", syncCanvasSize);

    tryAttachResizeObserver();
    const bumpLayout = () => {
      if (cancelled) return;
      tryAttachResizeObserver();
      syncCanvasSize();
      if (!ro && rafRetries < 24) {
        rafRetries += 1;
        requestAnimationFrame(bumpLayout);
      }
    };
    requestAnimationFrame(() => {
      bumpLayout();
      requestAnimationFrame(syncCanvasSize);
    });

    syncCanvasSize();

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("loadeddata", onFirstFrameReady);
      video.removeEventListener("canplay", onFirstFrameReady);
      window.removeEventListener("resize", syncCanvasSize);
      ro?.disconnect();
    };
  }, [videoUrl]);
  return {
    activeEffects, setActiveEffects,
    statsConfig, setStatsConfig,
    exportConfig, setExportConfig,
    isExporting, setIsExporting,
    exportSuccess, setExportSuccess,
    selectedCategory, setSelectedCategory,
    isPlaying, setIsPlaying,
    videoDuration, setVideoDuration,
    sourceFps,
    videoVisibility, setVideoVisibility,
    formatDropdownOpen, setFormatDropdownOpen,
    qualityDropdownOpen, setQualityDropdownOpen,
    videoRef, canvasRef, overlayRef, containerRef,
    effectModulesRef,
    toggleVideoPlayback,
    addEffect, removeEffect, isEffectActive, getEffectsForCategory, hasProblematicCombination, handleExport,
    poses, videoUrl,
    sportAnalysisKind,
    sportMetricsSnapshot,
    availableEffects,
  };
}

export type AssetVideoEngine = ReturnType<typeof useAssetVideoEngine>;
