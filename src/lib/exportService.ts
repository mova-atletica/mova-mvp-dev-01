// Export service for asset generation
// Handles rendering effects to high-quality output and exporting

import { poseIndexAtTime, type PoseTimeline } from "./poseIndexAtTime";
import { renderMotionTrails } from './effects/motion-trails';
import { renderMuybridgeFromCanvas, preExtractKeyFrames } from './effects/muybridge';
import { renderMuybridgeTileEffects } from './effects/muybridgeTileRenderer';
import { sortEffectsByOverlayDrawOrder } from './effects/overlayDrawOrder';
import { renderJointAngleTraceOverlay, renderStats } from './effects/stats';
import { safeExportFps } from './videoFps';

const isDevelopment = process.env.NODE_ENV === 'development';

// Helper function for conditional error logging
// Non-critical effect rendering failures are silently handled in production
const logEffectError = (message: string, error: unknown) => {
  if (isDevelopment) {
    console.warn(message, error);
  }
  // In production, silently continue - these are non-critical effect rendering failures
};

function poseTimelineFromExportConfig(config: ExportConfig): PoseTimeline {
  return {
    timestamps: config.poseTimestamps ?? null,
    frameIntervalSec: config.frameIntervalSec ?? null,
  };
}

export interface ExportConfig {
  format: 'png' | 'webm';
  quality: 'low' | 'medium' | 'high';
  duration?: number; // for video exports
  /** Source fps (or override). Clamped 10–60; defaults to 30 if missing. */
  framerate?: number;
  /** Free-tier mini-app exports: draw brand mark bottom-right. */
  watermark?: boolean;
  sportAnalysisKind?: 'cycling' | 'pullups' | 'pushups' | 'plank' | 'squat' | 'poseFlexibility';
  sportMetricsSnapshot?: {
    cyclingCadenceRpm?: number | null;
    cyclingStrokeRepeatability?: number | null;
    pullupsRepCount?: number | null;
    pullupsElbowSymmetry?: number | null;
    plankHoldDurationSec?: number | null;
    plankCorrectionCount?: number | null;
    plankAvgHipDeviation?: number | null;
    plankAvgHipAngleDeg?: number | null;
    squatRepCount?: number | null;
    pushupsRepCount?: number | null;
    poseFlexibilityLegsDeg?: number | null;
    poseFlexibilityHipsDeg?: number | null;
    poseFlexibilityTorsoDeg?: number | null;
    poseFlexibilityShouldersDeg?: number | null;
  } | null;
  poseTimestamps?: number[] | null;
  frameIntervalSec?: number | null;
}

export interface ExportResult {
  success: boolean;
  data?: Blob | string;
  error?: string;
  filename?: string;
}

/**
 * Create a high-quality canvas for export rendering
 */
function createExportCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not create canvas context for export');
  }
  
  // Always use the same coordinate system as live preview for consistency
  // This ensures effects position correctly regardless of device pixel ratio
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  return canvas;
}

const WATERMARK_SRC = '/images/brand/logo/Logo_Contained.svg';
let watermarkImagePromise: Promise<HTMLImageElement | null> | null = null;

function loadBrandWatermarkImage(): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!watermarkImagePromise) {
    watermarkImagePromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('Failed to load export watermark logo');
        resolve(null);
      };
      img.src = WATERMARK_SRC;
    });
  }
  return watermarkImagePromise;
}

/**
 * Bottom-right brand mark for free exports: ~10% of short side, ~4.5% inset (IG safe zone), full opacity.
 */
async function drawExportWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  const logo = await loadBrandWatermarkImage();
  if (!logo) return;
  const shortSide = Math.min(canvasWidth, canvasHeight);
  const markSize = shortSide * 0.1;
  const inset = shortSide * 0.045;
  const x = canvasWidth - inset - markSize;
  const y = canvasHeight - inset - markSize;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(logo, x, y, markSize, markSize);
  ctx.restore();
}

/**
 * Render all active effects to a canvas
 */
async function renderEffectsToCanvas(
  video: HTMLVideoElement,
  poses: any[],
  activeEffects: any[],
  config: ExportConfig & { videoVisibility?: { showVideo: boolean; opacity: number; blendMode: GlobalCompositeOperation } }
): Promise<HTMLCanvasElement> {
  const timeline = poseTimelineFromExportConfig(config);
  const firstStatsConfig = activeEffects.find((e) =>
    e.enabled &&
    (
      e.effect.id === 'joint-angles' ||
      e.effect.id === 'range-of-motion' ||
      e.effect.id === 'metrics-chips' ||
      e.effect.id === 'mobility-geometry'
    )
  )?.config || {};
  const sharedStatsSnapshot = {
    sportAnalysisKind: config.sportAnalysisKind ?? firstStatsConfig.sportAnalysisKind,
    sportMetricsSnapshot: config.sportMetricsSnapshot ?? firstStatsConfig.sportMetricsSnapshot,
  };
  // For Muybridge effects, calculate the actual visual size of the preview
  // The preview canvas is scaled down by CSS to fit the 400x711 container
  const hasMuybridgeEffect = activeEffects.some(e => e.enabled && e.effect.id === 'muybridge');
  
  let outputWidth: number, outputHeight: number;
  
  // Resolution multiplier for higher quality exports
  const resolutionMultiplier = config.quality === 'high' ? 2.0 : config.quality === 'medium' ? 1.5 : 1.0;
  
  if (hasMuybridgeEffect) {
    // For Muybridge effect, use the same pixel dimensions as the preview canvas
    // The preview canvas has pixel size = video.videoWidth × video.videoHeight
    // and is scaled down by CSS to fit the 400×711 container
    outputWidth = video.videoWidth * resolutionMultiplier;
    outputHeight = video.videoHeight * resolutionMultiplier;
    

  } else {
    // For other effects, use original video dimensions with resolution multiplier
    outputWidth = video.videoWidth * resolutionMultiplier;
    outputHeight = video.videoHeight * resolutionMultiplier;
  }
  
  // Create export canvas
  const canvas = createExportCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d')!;
  
  // Scale context to match resolution multiplier
  ctx.scale(resolutionMultiplier, resolutionMultiplier);
  
  // Clear canvas
  ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
  
  // Get combined video configuration
  const hasVideoReplacement = activeEffects.some(effect => 
    effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
  );
  
  const shouldRenderVideo = config.videoVisibility?.showVideo !== false && !hasVideoReplacement && !hasMuybridgeEffect;
  
  if (shouldRenderVideo) {
    // Render video background with proper opacity and blend mode
    const opacity = config.videoVisibility?.opacity ?? 1.0;
    const blendMode = config.videoVisibility?.blendMode ?? 'normal';
    
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
    
    // Render effects in proper order (matching live preview)
    // Step 1: Render visual-guide effects (background layer)
    for (const effect of activeEffects) {
      if (!effect.enabled) continue;
      
      // Skip composite effects (like muybridge) for now
      if (effect.effect.id === 'muybridge') continue;
      
      switch (effect.effect.id) {
        case 'motion-trails':
          renderMotionTrails(ctx, video, poses, effect.config, video.currentTime, true, timeline);
          break;
        case 'skeleton-overlay':
          // Render skeleton overlay for image export
          if (poses && poses.length > 0) {
            const currentFrameIndex = poseIndexAtTime(video.currentTime, poses.length, {
              ...timeline,
              durationSec: video.duration,
            });
            if (currentFrameIndex != null && currentFrameIndex < poses.length) {
              const pose = poses[currentFrameIndex];
              if (pose && pose.keypoints) {
                const keypoints = pose.keypoints;
                
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
                      ctx.moveTo(startPoint.x, startPoint.y);
                      ctx.lineTo(endPoint.x, endPoint.y);
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
                        keypoint.x, 
                        keypoint.y, 
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
    
    // Step 2: Render stats / overlay effects (fixed z-order: labels above geometry)
    for (const effect of sortEffectsByOverlayDrawOrder(activeEffects)) {
      if (!effect.enabled) continue;
      
      // Skip composite effects (like muybridge) for now
      if (effect.effect.id === 'muybridge') continue;
      
      switch (effect.effect.id) {
        case 'joint-angle-trace':
          renderJointAngleTraceOverlay(
            ctx,
            video,
            poses,
            effect.config,
            video.currentTime,
            true,
            timeline
          );
          break;
        case 'joint-angles':
        case 'range-of-motion':
        case 'metrics-chips':
        case 'mobility-geometry':
          renderStats(
            ctx,
            video,
            poses,
            { ...effect.config, ...sharedStatsSnapshot, isExport: true },
            video.currentTime,
            true,
            timeline
          );
          break;
        default:
          // Skip non-stats effects
          break;
      }
    }
    
    // Step 2: Render composite effects (like muybridge) that should process the current canvas state
    const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
    if (muybridgeEffect) {
      await preExtractKeyFrames(video, muybridgeEffect.config);

      // Clear the main canvas for muybridge to render to
      ctx.clearRect(0, 0, video.videoWidth, video.videoHeight);
      
      const effectRenderer = (frameCtx: CanvasRenderingContext2D, frameVideo: HTMLVideoElement, framePoses: any[], frameTime: number) => {
        try {
          renderMuybridgeTileEffects(frameCtx, frameVideo, framePoses, frameTime, {
            activeEffects,
            sharedStatsSnapshot,
            isExport: true,
            timeline,
          });
        } catch (error) {
          logEffectError('Failed to render Muybridge tile effects for export frame:', error);
        }
      };
      
      // Render muybridge with effects applied to each frame
      await renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, video.currentTime, true, effectRenderer, config.videoVisibility);
    }

  if (config.watermark) {
    await drawExportWatermark(ctx, canvas.width, canvas.height);
  }

  return canvas;
}

/**
 * Export as image (PNG, JPG, WebP)
 */
async function exportAsImage(
  canvas: HTMLCanvasElement,
  format: 'png',
  quality: number
): Promise<ExportResult> {
  try {
    let mimeType: string;
    let filename: string;
    
    switch (format) {
      case 'png':
        mimeType = 'image/png';
        filename = `mova-asset-${Date.now()}.png`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, mimeType, quality);
    });
    
    return {
      success: true,
      data: blob,
      filename
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * Export as video using MediaRecorder API
 */
async function exportAsVideo(
  video: HTMLVideoElement,
  activeEffects: any[],
  poses: any[],
  config: ExportConfig & { videoVisibility?: { showVideo: boolean; opacity: number; blendMode: GlobalCompositeOperation } }
): Promise<ExportResult> {
  try {
    const timeline = poseTimelineFromExportConfig(config);
    const firstStatsConfig = activeEffects.find((e) =>
      e.enabled &&
      (
        e.effect.id === 'joint-angles' ||
        e.effect.id === 'range-of-motion' ||
        e.effect.id === 'metrics-chips' ||
        e.effect.id === 'mobility-geometry'
      )
    )?.config || {};
    const sharedStatsSnapshot = {
      sportAnalysisKind: config.sportAnalysisKind ?? firstStatsConfig.sportAnalysisKind,
      sportMetricsSnapshot: config.sportMetricsSnapshot ?? firstStatsConfig.sportMetricsSnapshot,
    };
    // Use actual video duration, but cap at config duration if provided
    const actualVideoDuration = video.duration || 0;
    const maxDuration = config.duration || actualVideoDuration;
    // Use the minimum of actual duration and max duration, or fallback to 3 if video duration is invalid
    const duration = actualVideoDuration > 0 
      ? Math.min(actualVideoDuration, maxDuration) 
      : (maxDuration || 3);
    
    const framerate = safeExportFps(config.framerate);
    const totalFrames = Math.floor(duration * framerate);
    const frameIntervalMs = 1000 / framerate;

    const muybridgeEffect = activeEffects.find(
      (e) => e.effect.id === 'muybridge' && e.enabled
    );
    const hasMuybridgeEffect = Boolean(muybridgeEffect);

    if (hasMuybridgeEffect && muybridgeEffect) {
      await preExtractKeyFrames(video, muybridgeEffect.config);
    }

    // Create a canvas for rendering frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Create a MediaStream from the canvas
    const stream = canvas.captureStream(framerate);
    const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack & {
      requestFrame?: () => void;
    };
    
    // Check for MP4 support (most browsers don't support MP4 in MediaRecorder)
    const mp4Supported = MediaRecorder.isTypeSupported('video/mp4;codecs=h264') || 
                         MediaRecorder.isTypeSupported('video/mp4');
    
    const mimeType = mp4Supported 
      ? (MediaRecorder.isTypeSupported('video/mp4;codecs=h264') ? 'video/mp4;codecs=h264' : 'video/mp4')
      : 'video/webm;codecs=vp8';
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: config.quality === 'low' ? 1000000 : config.quality === 'medium' ? 2000000 : 4000000
    });
    
    const chunks: Blob[] = [];
    
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunks, { type: mimeType });
        resolve({
          success: true,
          data: blob,
          filename: `mova-asset-${Date.now()}.${extension}`
        });
      };
      
      // Store original video state
      const originalCurrentTime = video.currentTime;
      const originalPlaybackRate = video.playbackRate;
      
      video.pause();
      
      let frameCount = 0;
      let recordingStarted = false;
      const recordStart = performance.now();

      const finishExport = () => {
        mediaRecorder.stop();
        video.currentTime = originalCurrentTime;
        video.playbackRate = originalPlaybackRate;
      };

      const renderMuybridgeExportFrame = async (frameTime: number) => {
        if (!muybridgeEffect) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const effectRenderer = (
          frameCtx: CanvasRenderingContext2D,
          frameVideo: HTMLVideoElement,
          framePoses: any[],
          tileTime: number
        ) => {
          try {
            renderMuybridgeTileEffects(frameCtx, frameVideo, framePoses, tileTime, {
              activeEffects,
              sharedStatsSnapshot,
              isExport: true,
              timeline,
            });
          } catch (error) {
            logEffectError('Failed to render Muybridge tile effects for video export frame:', error);
          }
        };

        await renderMuybridgeFromCanvas(
          ctx,
          video,
          poses,
          muybridgeEffect.config,
          frameTime,
          true,
          effectRenderer,
          config.videoVisibility
        );
      };
      
      const renderFrame = async () => {
        if (frameCount >= totalFrames) {
          finishExport();
          return;
        }
        
        try {
          const frameTime = (frameCount / totalFrames) * duration;

          if (hasMuybridgeEffect) {
            await renderMuybridgeExportFrame(frameTime);
          } else {
          // Ensure we don't seek beyond video duration
          video.currentTime = Math.min(frameTime, actualVideoDuration > 0 ? actualVideoDuration : duration);
          
          const seekTimeout = 2000;
          
          // Wait for video to seek with timeout and error handling
          await new Promise<void>((resolve, reject) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              clearTimeout(timeoutId);
              resolve();
            };
            
            const onError = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              clearTimeout(timeoutId);
              reject(new Error('Video seek failed'));
            };
            
            const timeoutId = setTimeout(() => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onError);
              reject(new Error('Video seek timeout'));
            }, seekTimeout);
            
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
          });
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Check if we should render video background
          const hasVideoReplacement = activeEffects.some(effect => 
            effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
          );
          
          const shouldRenderVideo = config.videoVisibility?.showVideo !== false && !hasVideoReplacement;
          
          if (shouldRenderVideo) {
            // Render video background with proper opacity and blend mode
            const opacity = config.videoVisibility?.opacity ?? 1.0;
            const blendMode = config.videoVisibility?.blendMode ?? 'normal';
            
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
          }
          
          // Render effects in proper order (matching live preview)
          // Step 1: Render visual-guide effects (background layer)
          for (const effect of activeEffects) {
            if (!effect.enabled) continue;
            
            // Skip composite effects (like muybridge) for now
            if (effect.effect.id === 'muybridge') continue;
            
            switch (effect.effect.id) {
              case 'motion-trails':
                renderMotionTrails(ctx, video, poses, effect.config, frameTime, true, timeline);
                break;
              case 'skeleton-overlay':
                // Render skeleton overlay for video export
                if (poses && poses.length > 0) {
                  const currentFrameIndex = poseIndexAtTime(frameTime, poses.length, {
                    ...timeline,
                    durationSec: video.duration,
                  });
                  if (currentFrameIndex != null && currentFrameIndex < poses.length) {
                    const pose = poses[currentFrameIndex];
                    if (pose && pose.keypoints) {
                      const keypoints = pose.keypoints;
                      
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
                            ctx.moveTo(startPoint.x, startPoint.y);
                            ctx.lineTo(endPoint.x, endPoint.y);
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
                              keypoint.x, 
                              keypoint.y, 
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
          
          // Step 2: Render stats / overlay effects (fixed z-order: labels above geometry)
          for (const effect of sortEffectsByOverlayDrawOrder(activeEffects)) {
            if (!effect.enabled) continue;
            
            // Skip composite effects (like muybridge) for now
            if (effect.effect.id === 'muybridge') continue;
            
            switch (effect.effect.id) {
              case 'joint-angle-trace':
                renderJointAngleTraceOverlay(
                  ctx,
                  video,
                  poses,
                  effect.config,
                  frameTime,
                  true,
                  timeline
                );
                break;
              case 'joint-angles':
              case 'range-of-motion':
              case 'metrics-chips':
              case 'mobility-geometry':
                renderStats(
                  ctx,
                  video,
                  poses,
                  { ...effect.config, ...sharedStatsSnapshot, isExport: true },
                  frameTime,
                  true,
                  timeline
                );
                break;
              default:
                // Skip non-stats effects
                break;
            }
          }
          }

          if (config.watermark) {
            await drawExportWatermark(ctx, canvas.width, canvas.height);
          }

          if (!recordingStarted) {
            mediaRecorder.start();
            recordingStarted = true;
          }

          track.requestFrame?.();
          frameCount++;

          if (frameCount >= totalFrames) {
            finishExport();
            return;
          }

          // Pace to ideal timeline; if seek+draw already ate the slot, don't sleep extra.
          const target = recordStart + frameCount * frameIntervalMs;
          const wait = target - performance.now();
          if (wait > 1) {
            await new Promise<void>((r) => setTimeout(r, wait));
          }
          void renderFrame();
          
        } catch (error) {
          if (isDevelopment) {
            console.error('Error rendering frame:', error);
          }
          mediaRecorder.stop();
          video.currentTime = originalCurrentTime;
          video.playbackRate = originalPlaybackRate;
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error during frame rendering'
          });
        }
      };
      
      // Start rendering frames
      renderFrame();
    });
    
  } catch (error) {
    if (isDevelopment) {
      console.error('Video export error:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during video export'
    };
  }
}

/**
 * Main export function - exports assets based on configuration
 */
export async function exportAsset(
  video: HTMLVideoElement,
  poses: any[],
  activeEffects: any[],
  config: ExportConfig & { videoVisibility?: { showVideo: boolean; opacity: number; blendMode: GlobalCompositeOperation } }
): Promise<ExportResult> {
  try {
    if (config.format === 'webm') {
      return await exportAsVideo(video, activeEffects, poses, config);
    } else {
      // Render effects to canvas
      const canvas = await renderEffectsToCanvas(video, poses, activeEffects, config);
      
      // Determine quality value
      const quality = config.quality === 'low' ? 0.7 : config.quality === 'medium' ? 0.85 : 1.0;
      
      // Export as image (only PNG supported now)
      return await exportAsImage(canvas, 'png', quality);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 