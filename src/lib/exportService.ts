// Export service for asset generation
// Handles rendering effects to high-quality output and exporting

import { renderMotionTrails } from './effects/motion-trails';
import { renderMuybridgeFromCanvas } from './effects/muybridge';
import { renderStats } from './effects/stats';

export interface ExportConfig {
  format: 'png' | 'mp4' | 'gif';
  quality: 'low' | 'medium' | 'high';
  duration?: number; // for video exports
  framerate?: number; // for video/gif exports
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

/**
 * Render all active effects to a canvas
 */
async function renderEffectsToCanvas(
  video: HTMLVideoElement,
  poses: any[],
  activeEffects: any[],
  config: ExportConfig & { videoVisibility?: { showVideo: boolean; opacity: number; blendMode: GlobalCompositeOperation } }
): Promise<HTMLCanvasElement> {
  // For Muybridge effects, calculate the actual visual size of the preview
  // The preview canvas is scaled down by CSS to fit the 400x711 container
  const hasMuybridgeEffect = activeEffects.some(e => e.enabled && e.effect.id === 'muybridge');
  
  let outputWidth: number, outputHeight: number;
  
  if (hasMuybridgeEffect) {
    // For Muybridge effect, use the same pixel dimensions as the preview canvas
    // The preview canvas has pixel size = video.videoWidth × video.videoHeight
    // and is scaled down by CSS to fit the 400×711 container
    outputWidth = video.videoWidth;
    outputHeight = video.videoHeight;
    

  } else {
    // For other effects, use original video dimensions
    outputWidth = video.videoWidth;
    outputHeight = video.videoHeight;
  }
  
  // Create export canvas
  const canvas = createExportCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d')!;
  
  // Clear canvas
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  
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
    ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }
    
    // Render effects in proper order (matching live preview)
    // Step 1: Render motion effects (background effects)
    for (const effect of activeEffects) {
      if (!effect.enabled) continue;
      
      // Skip composite effects (like muybridge) for now
      if (effect.effect.id === 'muybridge') continue;
      
      switch (effect.effect.id) {
        case 'motion-trails':
          renderMotionTrails(ctx, video, poses, effect.config, video.currentTime, true); // isExport = true
          break;
        default:
          // Skip stats effects for now - render them last
          break;
      }
    }
    
    // Step 2: Render stats effects last (foreground effects)
    for (const effect of activeEffects) {
      if (!effect.enabled) continue;
      
      // Skip composite effects (like muybridge) for now
      if (effect.effect.id === 'muybridge') continue;
      
      switch (effect.effect.id) {
        case 'joint-angles':
        case 'range-of-motion':
        case 'exercise-details':
          renderStats(ctx, video, poses, effect.config, video.currentTime, true); // isExport = true
          break;
        default:
          // Skip non-stats effects
          break;
      }
    }
    
    // Step 2: Render composite effects (like muybridge) that should process the current canvas state
    const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
    if (muybridgeEffect) {
      // Clear the main canvas for muybridge to render to
      ctx.clearRect(0, 0, outputWidth, outputHeight);
      
      // Create an effect renderer function that applies all non-muybridge effects
      const effectRenderer = (frameCtx: CanvasRenderingContext2D, frameVideo: HTMLVideoElement, framePoses: any[], frameTime: number) => {
        // Apply all active non-muybridge effects to this frame
        for (const effect of activeEffects) {
          if (!effect.enabled || effect.effect.id === 'muybridge') continue;
          
          switch (effect.effect.id) {
            case 'motion-trails':
              try {
                renderMotionTrails(frameCtx, frameVideo, framePoses, effect.config, frameTime, true); // isExport = true
              } catch (error) {
                console.warn('Failed to render motion trails effect for export frame:', error);
              }
              break;
            default:
              console.warn(`Effect ${effect.effect.id} not implemented for export frame processing yet`);
          }
        }
      };
      
      // Render muybridge with effects applied to each frame
      await renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, video.currentTime, true, effectRenderer, config.videoVisibility);
      
      // Render exercise-details once over the entire canvas (not in individual tiles)
      const exerciseDetailsEffect = activeEffects.find(e => e.effect.id === 'exercise-details' && e.enabled);
      if (exerciseDetailsEffect) {
        renderStats(ctx, video, poses, exerciseDetailsEffect.config, video.currentTime, true); // isExport = true
      }
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
 * Create a simple GIF encoder using canvas frames
 */
class SimpleGifEncoder {
  private frames: ImageData[] = [];
  private width: number;
  private height: number;
  private delay: number;

  constructor(width: number, height: number, delay: number = 100) {
    this.width = width;
    this.height = height;
    this.delay = delay;
  }

  addFrame(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    this.frames.push(imageData);
  }

  async encode(): Promise<Blob> {
    // For now, return a simple animated PNG as GIF support is complex
    // This is a placeholder - in production you'd want a proper GIF encoder
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d')!;
    
    // Just return the first frame as PNG for now
    if (this.frames.length > 0) {
      ctx.putImageData(this.frames[0], 0, 0);
    }
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
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
    const duration = config.duration || 3;
    const framerate = config.framerate || 30;
    const totalFrames = Math.floor(duration * framerate);
    
    // Create a canvas for rendering frames
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Create a MediaStream from the canvas
    const stream = canvas.captureStream(framerate);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
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
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve({
          success: true,
          data: blob,
          filename: `mova-asset-${Date.now()}.webm`
        });
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Store original video state
      const originalCurrentTime = video.currentTime;
      const originalPlaybackRate = video.playbackRate;
      
      // Set video to beginning and pause
      video.currentTime = 0;
      video.pause();
      
      let frameCount = 0;
      
      const renderFrame = async () => {
        if (frameCount >= totalFrames) {
          mediaRecorder.stop();
          // Restore original video state
          video.currentTime = originalCurrentTime;
          video.playbackRate = originalPlaybackRate;
          return;
        }
        
        try {
          // Calculate time for this frame
          const frameTime = (frameCount / totalFrames) * duration;
          video.currentTime = frameTime;
          
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
            }, 2000); // 2 second timeout
            
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
          });
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Check if we should render video background
          const hasVideoReplacement = activeEffects.some(effect => 
            effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
          );
          
          // Check if Muybridge effect is active (it will handle its own video rendering)
          const hasMuybridgeEffect = activeEffects.some(effect => 
            effect.enabled && effect.effect.id === 'muybridge'
          );
          
          const shouldRenderVideo = config.videoVisibility?.showVideo !== false && !hasVideoReplacement && !hasMuybridgeEffect;
          
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
          // Step 1: Render motion effects (background effects)
          for (const effect of activeEffects) {
            if (!effect.enabled) continue;
            
            // Skip composite effects (like muybridge) for now
            if (effect.effect.id === 'muybridge') continue;
            
            switch (effect.effect.id) {
              case 'motion-trails':
                renderMotionTrails(ctx, video, poses, effect.config, frameTime, true); // isExport = true
                break;
              default:
                // Skip stats effects for now - render them last
                break;
            }
          }
          
          // Step 2: Render stats effects last (foreground effects)
          for (const effect of activeEffects) {
            if (!effect.enabled) continue;
            
            // Skip composite effects (like muybridge) for now
            if (effect.effect.id === 'muybridge') continue;
            
            switch (effect.effect.id) {
              case 'joint-angles':
              case 'range-of-motion':
              case 'exercise-details':
                renderStats(ctx, video, poses, effect.config, frameTime, true); // isExport = true
                break;
              default:
                // Skip non-stats effects
                break;
            }
          }
          
          // Step 2: Render composite effects (like muybridge) that should process the current canvas state
          const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
          if (muybridgeEffect) {
            // Clear the main canvas for muybridge to render to
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Create an effect renderer function that applies all non-muybridge effects
            const effectRenderer = (frameCtx: CanvasRenderingContext2D, frameVideo: HTMLVideoElement, framePoses: any[], frameTime: number) => {
              // Apply all active non-muybridge effects to this frame
              for (const effect of activeEffects) {
                if (!effect.enabled || effect.effect.id === 'muybridge') continue;
                
                switch (effect.effect.id) {
                  case 'motion-trails':
                    try {
                      renderMotionTrails(frameCtx, frameVideo, framePoses, effect.config, frameTime, true); // isExport = true
                    } catch (error) {
                      console.warn('Failed to render motion trails effect for video export frame:', error);
                    }
                    break;
                  default:
                    console.warn(`Effect ${effect.effect.id} not implemented for video export frame processing yet`);
                }
              }
            };
            
            // Render muybridge with effects applied to each frame
            await renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, frameTime, true, effectRenderer, config.videoVisibility);
            
            // Render exercise-details once over the entire canvas (not in individual tiles)
            const exerciseDetailsEffect = activeEffects.find(e => e.effect.id === 'exercise-details' && e.enabled);
            if (exerciseDetailsEffect) {
              renderStats(ctx, video, poses, exerciseDetailsEffect.config, frameTime, true); // isExport = true
            }
          }
          
          frameCount++;
          
          // Schedule next frame
          setTimeout(renderFrame, 1000 / framerate);
          
        } catch (error) {
          console.error('Error rendering frame:', error);
          // Stop recording on error
          mediaRecorder.stop();
          // Restore original video state
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
    console.error('Video export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during video export'
    };
  }
}

/**
 * Export as GIF using custom encoder
 */
async function exportAsGif(
  video: HTMLVideoElement,
  activeEffects: any[],
  poses: any[],
  config: ExportConfig & { videoVisibility?: { showVideo: boolean; opacity: number; blendMode: GlobalCompositeOperation } }
): Promise<ExportResult> {
  try {
    const duration = config.duration || 3;
    const framerate = config.framerate || 30;
    const totalFrames = Math.floor(duration * framerate);
    
    // Create encoder
    const encoder = new SimpleGifEncoder(video.videoWidth, video.videoHeight, 1000 / framerate);
    
    // Store original video state
    const originalCurrentTime = video.currentTime;
    const originalPlaybackRate = video.playbackRate;
    
    // Set video to beginning and pause
    video.currentTime = 0;
    video.pause();
    
    // Render frames
    for (let frame = 0; frame < totalFrames; frame++) {
      // Calculate time for this frame
      const frameTime = (frame / totalFrames) * duration;
      video.currentTime = frameTime;
      
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
        }, 2000); // 2 second timeout
        
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
      });
      
      // Create canvas for this frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Check if we should render video background
      const hasVideoReplacement = activeEffects.some(effect => 
        effect.enabled && effect.effect.videoConfig?.shouldRenderVideo === false
      );
      
      // Check if Muybridge effect is active (it will handle its own video rendering)
      const hasMuybridgeEffect = activeEffects.some(effect => 
        effect.enabled && effect.effect.id === 'muybridge'
      );
      
      const shouldRenderVideo = config.videoVisibility?.showVideo !== false && !hasVideoReplacement && !hasMuybridgeEffect;
      
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
      // Step 1: Render motion effects (background effects)
      for (const effect of activeEffects) {
        if (!effect.enabled) continue;
        
        // Skip composite effects (like muybridge) for now
        if (effect.effect.id === 'muybridge') continue;
        
        switch (effect.effect.id) {
          case 'motion-trails':
            renderMotionTrails(ctx, video, poses, effect.config, frameTime, true); // isExport = true
            break;
          default:
            // Skip stats effects for now - render them last
            break;
        }
      }
      
      // Step 2: Render stats effects last (foreground effects)
      for (const effect of activeEffects) {
        if (!effect.enabled) continue;
        
        // Skip composite effects (like muybridge) for now
        if (effect.effect.id === 'muybridge') continue;
        
        switch (effect.effect.id) {
          case 'joint-angles':
          case 'range-of-motion':
          case 'exercise-details':
            renderStats(ctx, video, poses, effect.config, frameTime, true); // isExport = true
            break;
          default:
            // Skip non-stats effects
            break;
        }
      }
      
      // Step 2: Render composite effects (like muybridge) that should process the current canvas state
      const muybridgeEffect = activeEffects.find(e => e.effect.id === 'muybridge' && e.enabled);
      if (muybridgeEffect) {
        // Clear the main canvas for muybridge to render to
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create an effect renderer function that applies all non-muybridge effects
        const effectRenderer = (frameCtx: CanvasRenderingContext2D, frameVideo: HTMLVideoElement, framePoses: any[], frameTime: number) => {
          // Apply all active non-muybridge effects to this frame
          for (const effect of activeEffects) {
            if (!effect.enabled || effect.effect.id === 'muybridge') continue;
            
            switch (effect.effect.id) {
              case 'motion-trails':
                try {
                  renderMotionTrails(frameCtx, frameVideo, framePoses, effect.config, frameTime, true); // isExport = true
                } catch (error) {
                  console.warn('Failed to render motion trails effect for GIF export frame:', error);
                }
                break;
              default:
                console.warn(`Effect ${effect.effect.id} not implemented for GIF export frame processing yet`);
            }
          }
        };
        
        // Render muybridge with effects applied to each frame
        await renderMuybridgeFromCanvas(ctx, video, poses, muybridgeEffect.config, frameTime, true, effectRenderer, config.videoVisibility);
        
        // Render exercise-details once over the entire canvas (not in individual tiles)
        const exerciseDetailsEffect = activeEffects.find(e => e.effect.id === 'exercise-details' && e.enabled);
        if (exerciseDetailsEffect) {
          renderStats(ctx, video, poses, exerciseDetailsEffect.config, frameTime, true); // isExport = true
        }
      }
      
      // Add frame to encoder
      encoder.addFrame(canvas);
      
      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Encode and get result
    const blob = await encoder.encode();
    
    // Restore original video state
    video.currentTime = originalCurrentTime;
    video.playbackRate = originalPlaybackRate;
    
    return {
      success: true,
      data: blob,
      filename: `mova-asset-${Date.now()}.png` // Note: Currently returns PNG, not GIF
    };
    
  } catch (error) {
    console.error('GIF export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during GIF export'
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
    if (config.format === 'mp4') {
      return await exportAsVideo(video, activeEffects, poses, config);
    } else if (config.format === 'gif') {
      return await exportAsGif(video, activeEffects, poses, config);
    } else {
      // Render effects to canvas
      const canvas = await renderEffectsToCanvas(video, poses, activeEffects, config);
      
      // Determine quality value
      const quality = config.quality === 'low' ? 0.7 : config.quality === 'medium' ? 0.85 : 1.0;
      
      // Export as image
      return await exportAsImage(canvas, config.format, quality);
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