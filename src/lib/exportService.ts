// Export service for asset generation
// Handles rendering effects to high-quality output and exporting

export interface ExportConfig {
  format: 'png' | 'jpg' | 'webp' | 'mp4';
  quality: 'low' | 'medium' | 'high';
  duration?: number; // for video exports
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
function createExportCanvas(width: number, height: number, disableHighDPI: boolean = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not create canvas context for export');
  }
  
  if (disableHighDPI) {
    // For Muybridge effects, don't use high DPI scaling to match preview canvas exactly
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
  } else {
    // Set high DPI for crisp exports
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Scale context for high DPI
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }
  
  return canvas;
}

/**
 * Render all active effects to a canvas
 */
async function renderEffectsToCanvas(
  video: HTMLVideoElement,
  poses: any[],
  activeEffects: any[],
  config: ExportConfig
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
    
    // Debug logging for export dimensions
    console.log('🔍 Muybridge Export Debug:', {
      videoDimensions: { width: video.videoWidth, height: video.videoHeight },
      videoAspectRatio: (video.videoWidth / video.videoHeight).toFixed(3),
      containerDimensions: { width: 400, height: 711 },
      finalExportDimensions: { width: outputWidth, height: outputHeight },
      note: 'Using preview canvas pixel dimensions (scaled by CSS in preview)'
    });
  } else {
    // For other effects, use original video dimensions
    outputWidth = video.videoWidth;
    outputHeight = video.videoHeight;
  }
  
  // Create export canvas
  const canvas = createExportCanvas(outputWidth, outputHeight, hasMuybridgeEffect); // Disable high DPI for Muybridge
  const ctx = canvas.getContext('2d')!;
  
  // Clear canvas
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  
  if (hasMuybridgeEffect) {
    // For Muybridge effect, render directly to the canvas
    for (const effect of activeEffects) {
      if (!effect.enabled) continue;
      
      switch (effect.effect.id) {
        case 'muybridge':
          const { renderMuybridge } = await import('./effects/muybridge');
          renderMuybridge(ctx, video, poses, effect.config, video.currentTime, true); // isExport = true
          break;
        default:
          console.warn(`Export not implemented for effect: ${effect.effect.id}`);
      }
    }
  } else {
    // For other effects, draw video background at original size
    ctx.drawImage(video, 0, 0, outputWidth, outputHeight);
    
    // Render each active effect
    for (const effect of activeEffects) {
      if (!effect.enabled) continue;
      
      switch (effect.effect.id) {
        case 'muybridge':
          const { renderMuybridge } = await import('./effects/muybridge');
          renderMuybridge(ctx, video, poses, effect.config, video.currentTime);
          break;
        default:
          console.warn(`Export not implemented for effect: ${effect.effect.id}`);
      }
    }
  }
  
  return canvas;
}

/**
 * Export as image (PNG, JPG, WebP)
 */
async function exportAsImage(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg' | 'webp',
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
      case 'jpg':
        mimeType = 'image/jpeg';
        filename = `mova-asset-${Date.now()}.jpg`;
        break;
      case 'webp':
        mimeType = 'image/webp';
        filename = `mova-asset-${Date.now()}.webp`;
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
 * Export as video (MP4)
 */
async function exportAsVideo(
  video: HTMLVideoElement,
  activeEffects: any[],
  poses: any[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    // Video export is not yet implemented
    // TODO: Implement using MediaRecorder API or FFmpeg.wasm
    return {
      success: false,
      error: 'Video export is coming soon! For now, please use PNG, JPG, or WebP format for image exports.'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main export function
 */
export async function exportAsset(
  video: HTMLVideoElement,
  poses: any[],
  activeEffects: any[],
  config: ExportConfig
): Promise<ExportResult> {
  try {
    if (config.format === 'mp4') {
      return await exportAsVideo(video, activeEffects, poses, config);
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