// Muybridge effect: draw a grid of key frames using pre-extracted frames

export interface MuybridgeConfig {
  gridRows?: number;
  gridCols?: number;
  padding?: number; // px, between 0 and 9
  frameStagger?: number; // seconds between frames in adjacent tiles
  showBorders?: boolean; // whether to show borders around tiles
  borderColor?: string; // color of tile borders
  borderWidth?: number; // width of tile borders
}

// Cache for pre-extracted video frames
const frameCache = new Map<string, HTMLImageElement>();
const extractionInProgress = new Set<string>();

/**
 * New function: Render Muybridge effect from a canvas with applied effects
 * This processes each frame with effects applied
 */
export async function renderMuybridgeFromCanvas(
  ctx: CanvasRenderingContext2D,
  sourceVideo: HTMLVideoElement,
  poses: any[],
  config: MuybridgeConfig = {},
  frameTime: number = 0,
  isExport: boolean = false,
  effectRenderer?: (ctx: CanvasRenderingContext2D, video: HTMLVideoElement, poses: any[], time: number) => Promise<void> | void,
  videoVisibility?: { showVideo: boolean; opacity: number; blendMode: string }
) {

  
  const rows = config.gridRows || 3;
  const cols = config.gridCols || 3;
  const padding = Math.max(0, Math.min(9, config.padding ?? 8));
  const showBorders = config.showBorders !== false;
  const borderColor = config.borderColor || '#333';
  const borderWidth = config.borderWidth || 2;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to use the original video dimensions for proper grid calculations
  let canvasWidth = ctx.canvas.width;
  let canvasHeight = ctx.canvas.height;
  
  if (isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we need to use the original video dimensions
      canvasWidth = sourceVideo.videoWidth;
      canvasHeight = sourceVideo.videoHeight;
    }
  }

  // Calculate cell size (including padding)
  const totalPadX = padding * (cols - 1);
  const totalPadY = padding * (rows - 1);
  const cellW = (canvasWidth - totalPadX) / cols;
  const cellH = (canvasHeight - totalPadY) / rows;

  // Clear the entire canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Get video dimensions for proper scaling
  const videoWidth = sourceVideo.videoWidth;
  const videoHeight = sourceVideo.videoHeight;
  
  if (!videoWidth || !videoHeight) {
    console.warn('Video dimensions not available for Muybridge effect');
    return;
  }

  // Calculate video aspect ratio for proper scaling within cells
  const videoAspectRatio = videoWidth / videoHeight;
  const cellAspectRatio = cellW / cellH;

  // Calculate scaling to fit video frame within cell while maintaining aspect ratio
  let drawWidth: number, drawHeight: number;
  
  if (videoAspectRatio > cellAspectRatio) {
    // Video is wider than cell - scale by cell width
    drawWidth = cellW;
    drawHeight = cellW / videoAspectRatio;
  } else {
    // Video is taller than cell - scale by cell height
    drawHeight = cellH;
    drawWidth = cellH * videoAspectRatio;
  }

  // Calculate frame times for each tile
  const totalFrames = rows * cols;
  const frameTimes: number[] = [];
  const frameStagger = config.frameStagger || 0.5;
  const interval = Math.max(0.1, frameStagger);
  
  for (let i = 0; i < totalFrames; i++) {
    const time = Math.min(i * interval, (sourceVideo.duration || 0) - 0.1);
    frameTimes.push(time);
  }

  // Calculate animation offset based on current time
  const animationSpeed = 2.0; // seconds per cycle
  const animationOffset = Math.floor((frameTime / animationSpeed) * totalFrames) % totalFrames;

  // Create a temporary canvas for processing each frame
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCanvas.width = videoWidth;
  tempCanvas.height = videoHeight;

  // Save original video time
  const originalTime = sourceVideo.currentTime;
  const videoId = sourceVideo.src;

  try {
    // For live preview, use a simpler approach to avoid constant video seeking
    if (!isExport) {
      // Use cached frames if available, otherwise show a simplified grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * (cellW + padding);
          const y = r * (cellH + padding);
          
          // Calculate animated frame index for this tile
          const baseFrameIndex = r * cols + c;
          const animatedFrameIndex = (baseFrameIndex + animationOffset) % totalFrames;
          const tileFrameTime = frameTimes[animatedFrameIndex] || 0;
          
          // Center the frame within the cell
          const drawX = x + (cellW - drawWidth) / 2;
          const drawY = y + (cellH - drawHeight) / 2;
          
          // Create cache key for this frame
          const cacheKey = `${videoId}-${tileFrameTime.toFixed(2)}`;
          
          // Check if we have effects to apply
          if (effectRenderer) {
            // If effects are active, we need to process each tile individually
            try {
              // Clear temp canvas
              tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
              
              // Draw video frame to temp canvas (use cached frame if available, otherwise current frame)
              if (frameCache.has(cacheKey)) {
                const cachedFrame = frameCache.get(cacheKey)!;
                if (videoVisibility?.showVideo !== false) {
                  tempCtx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                  tempCtx.drawImage(cachedFrame, 0, 0, tempCanvas.width, tempCanvas.height);
                  tempCtx.globalAlpha = 1.0;
                }
              } else {
                // Use current video frame as fallback
                if (videoVisibility?.showVideo !== false) {
                  tempCtx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                  tempCtx.drawImage(sourceVideo, 0, 0, tempCanvas.width, tempCanvas.height);
                  tempCtx.globalAlpha = 1.0;
                }
              }
              
              // Apply effects to this tile
              const result = effectRenderer(tempCtx, sourceVideo, poses, tileFrameTime);
              if (result instanceof Promise) {
                await result;
              }
              
              // Draw the processed tile to main canvas
              ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, drawX, drawY, drawWidth, drawHeight);
              
            } catch (error) {
              console.warn('Failed to process live preview tile with effects:', error);
              // Fallback to cached frame or current video
              if (frameCache.has(cacheKey)) {
                const cachedFrame = frameCache.get(cacheKey)!;
                if (videoVisibility?.showVideo !== false) {
                  ctx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                  ctx.drawImage(cachedFrame, drawX, drawY, drawWidth, drawHeight);
                  ctx.globalAlpha = 1.0;
                }
              } else {
                if (videoVisibility?.showVideo !== false) {
                  ctx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                  ctx.drawImage(sourceVideo, 0, 0, sourceVideo.videoWidth, sourceVideo.videoHeight, drawX, drawY, drawWidth, drawHeight);
                  ctx.globalAlpha = 1.0;
                }
              }
            }
          } else {
            // No effects - use cached frames or current video (original behavior)
            if (frameCache.has(cacheKey)) {
              const cachedFrame = frameCache.get(cacheKey)!;
              if (videoVisibility?.showVideo !== false) {
                ctx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                ctx.drawImage(cachedFrame, drawX, drawY, drawWidth, drawHeight);
                ctx.globalAlpha = 1.0;
              }
            } else {
              // Draw current video frame as fallback
              if (videoVisibility?.showVideo !== false) {
                ctx.globalAlpha = videoVisibility?.opacity ?? 1.0;
                ctx.drawImage(sourceVideo, 0, 0, sourceVideo.videoWidth, sourceVideo.videoHeight, drawX, drawY, drawWidth, drawHeight);
                ctx.globalAlpha = 1.0;
              }
            }
          }

          // Draw borders if enabled
          if (showBorders) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }
      }
    } else {
      // For export, do the full processing with seeking and effects
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * (cellW + padding);
          const y = r * (cellH + padding);
          
          // Calculate animated frame index for this tile
          const baseFrameIndex = r * cols + c;
          const animatedFrameIndex = (baseFrameIndex + animationOffset) % totalFrames;
          const tileFrameTime = frameTimes[animatedFrameIndex] || 0;
          
          // Center the frame within the cell
          const drawX = x + (cellW - drawWidth) / 2;
          const drawY = y + (cellH - drawHeight) / 2;
          
          try {
            // Set video to this frame time
            sourceVideo.currentTime = tileFrameTime;
            
            // Wait for video to seek to the correct time
            await new Promise<void>((resolve) => {
              const handleSeeked = () => {
                sourceVideo.removeEventListener('seeked', handleSeeked);
                resolve();
              };
              sourceVideo.addEventListener('seeked', handleSeeked);
              
              // Fallback timeout
              setTimeout(() => {
                sourceVideo.removeEventListener('seeked', handleSeeked);
                resolve();
              }, 100);
            });

            // Clear temp canvas
            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            // Draw video frame if video visibility is enabled
            if (videoVisibility?.showVideo !== false) {
              tempCtx.globalAlpha = videoVisibility?.opacity ?? 1.0;
              tempCtx.drawImage(sourceVideo, 0, 0, tempCanvas.width, tempCanvas.height);
              tempCtx.globalAlpha = 1.0;
            }
            
            // Apply effects if provided
            if (effectRenderer) {
              // Apply effects if provided
              const result = effectRenderer(tempCtx, sourceVideo, poses, tileFrameTime);
              if (result instanceof Promise) {
                await result;
              }
            }
            
            // Draw the processed frame to the main canvas
            ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, drawX, drawY, drawWidth, drawHeight);
            
          } catch (error) {
            console.warn('Failed to process frame for tile:', error);
            // Draw a placeholder
            ctx.fillStyle = '#333';
            ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
          }

          // Draw borders if enabled
          if (showBorders) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(x, y, cellW, cellH);
          }
        }
      }
    }
  } finally {
    // Restore original video time only if we changed it (during export)
    if (isExport) {
      sourceVideo.currentTime = originalTime;
    }
    
    // Clean up temp canvas
    tempCanvas.remove();
  }
}

/**
 * Pre-extract key frames from video at regular intervals
 */
export async function preExtractKeyFrames(
  video: HTMLVideoElement,
  config: MuybridgeConfig = {}
): Promise<void> {
  const rows = config.gridRows || 3;
  const cols = config.gridCols || 3;
  const frameStagger = config.frameStagger || 0.5;
  const totalFrames = rows * cols;
  
  if (!video.src || !video.duration) {
    console.warn('Video not ready for frame extraction');
    return;
  }

  const videoId = video.src;
  
  // Check if extraction is already in progress
  if (extractionInProgress.has(videoId)) {
    return;
  }
  
  extractionInProgress.add(videoId);
  
  try {
    // Extract frames at regular intervals throughout the video
    const frameTimes: number[] = [];
    const interval = Math.max(0.1, frameStagger);
    
    for (let i = 0; i < totalFrames; i++) {
      const time = Math.min(i * interval, video.duration - 0.1);
      frameTimes.push(time);
    }
    

    
    // Extract each frame
    const extractionPromises = frameTimes.map(async (time, index) => {
      const cacheKey = `${videoId}-${time.toFixed(2)}`;
      
      // Skip if already cached
      if (frameCache.has(cacheKey)) {
        return;
      }
      
      try {
        const frameImage = await extractFrameAtTime(video, time);
        if (frameImage) {
          frameCache.set(cacheKey, frameImage);
        } else {
          console.warn(`Failed to extract frame ${index} at ${time}s`);
        }
      } catch (error) {
        console.warn(`Failed to extract frame at ${time}s:`, error);
      }
    });
    
    await Promise.all(extractionPromises);
    
  } catch (error) {
    console.error('Failed to pre-extract frames:', error);
  } finally {
    extractionInProgress.delete(videoId);
  }
}

/**
 * Extract a single frame at a specific time
 */
function extractFrameAtTime(video: HTMLVideoElement, time: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    
    // Set canvas size to match video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Create a temporary video element
    const tempVideo = document.createElement('video');
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    
    let timeoutId: NodeJS.Timeout;
    
    tempVideo.onloadedmetadata = () => {
      tempVideo.currentTime = time;
      timeoutId = setTimeout(() => {
        console.warn('Frame extraction timeout');
        resolve(null);
        cleanup();
      }, 3000);
    };
    
    tempVideo.onseeked = () => {
      clearTimeout(timeoutId);
      try {
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to image
        const img = new Image();
        img.onload = () => {
          resolve(img);
          cleanup();
        };
        img.onerror = () => {
          resolve(null);
          cleanup();
        };
        img.src = canvas.toDataURL();
        
      } catch (error) {
        console.warn('Failed to extract frame:', error);
        resolve(null);
        cleanup();
      }
    };
    
    tempVideo.onerror = () => {
      clearTimeout(timeoutId);
      console.warn('Failed to load video for frame extraction');
      resolve(null);
      cleanup();
    };
    
    function cleanup() {
      tempVideo.remove();
      canvas.remove();
    }
    
    tempVideo.src = video.src;
  });
}

/**
 * Draws the Muybridge effect on the given canvas context.
 * @param ctx CanvasRenderingContext2D
 * @param video HTMLVideoElement
 * @param poses Array of pose data (not used in this effect)
 * @param config MuybridgeConfig
 * @param frameTime Current time in seconds
 */
export function renderMuybridge(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: MuybridgeConfig = {},
  frameTime: number = 0,
  isExport: boolean = false
) {
  const rows = config.gridRows || 3;
  const cols = config.gridCols || 3;
  const padding = Math.max(0, Math.min(9, config.padding ?? 8));
  const frameStagger = config.frameStagger || 0.5;
  const showBorders = config.showBorders !== false;
  const borderColor = config.borderColor || '#333';
  const borderWidth = config.borderWidth || 2;
  
  // During export, the canvas context is already scaled by resolutionMultiplier
  // We need to use the original video dimensions for proper grid calculations
  let canvasWidth = ctx.canvas.width;
  let canvasHeight = ctx.canvas.height;
  
  if (isExport) {
    // Detect if we're in a scaled context by checking the transform
    const transform = ctx.getTransform();
    const contextScale = transform.a; // a and d should be equal for uniform scaling
    
    if (contextScale !== 1) {
      // The context is already scaled, so we need to use the original video dimensions
      canvasWidth = video.videoWidth;
      canvasHeight = video.videoHeight;
    }
  }

  // Calculate cell size (including padding)
  const totalPadX = padding * (cols - 1);
  const totalPadY = padding * (rows - 1);
  const cellW = (canvasWidth - totalPadX) / cols;
  const cellH = (canvasHeight - totalPadY) / rows;

  // Debug logging for Muybridge rendering (only during export)

  // Clear the entire canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Get video dimensions for proper scaling
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  
  if (!videoWidth || !videoHeight) {
    console.warn('Video dimensions not available for Muybridge effect');
    return;
  }

  // Calculate video aspect ratio for proper scaling within cells
  const videoAspectRatio = videoWidth / videoHeight;
  const cellAspectRatio = cellW / cellH;

  // Calculate scaling to fit video frame within cell while maintaining aspect ratio
  let drawWidth: number, drawHeight: number;
  
  if (videoAspectRatio > cellAspectRatio) {
    // Video is wider than cell - scale by cell width
    drawWidth = cellW;
    drawHeight = cellW / videoAspectRatio;
  } else {
    // Video is taller than cell - scale by cell height
    drawHeight = cellH;
    drawWidth = cellH * videoAspectRatio;
  }

  // Get the pre-extracted frame times for this video
  const videoId = video.src;
  const totalFrames = rows * cols;
  const frameTimes: number[] = [];
  const interval = Math.max(0.1, frameStagger);
  
  for (let i = 0; i < totalFrames; i++) {
    const time = Math.min(i * interval, (video.duration || 0) - 0.1);
    frameTimes.push(time);
  }

  // Calculate animation offset based on current time
  // This makes the grid cycle through different frame combinations
  const animationSpeed = 2.0; // seconds per cycle
  const animationOffset = Math.floor((frameTime / animationSpeed) * totalFrames) % totalFrames;

  // Draw each tile with its corresponding frame
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * (cellW + padding);
      const y = r * (cellH + padding);
      
      // Calculate animated frame index for this tile
      const baseFrameIndex = r * cols + c;
      const animatedFrameIndex = (baseFrameIndex + animationOffset) % totalFrames;
      const tileFrameTime = frameTimes[animatedFrameIndex] || 0;
      
      // Center the frame within the cell
      const drawX = x + (cellW - drawWidth) / 2;
      const drawY = y + (cellH - drawHeight) / 2;
      
      // Create cache key for this frame (same as extraction)
      const cacheKey = `${videoId}-${tileFrameTime.toFixed(2)}`;
      
      // Check if we have this frame cached
      if (frameCache.has(cacheKey)) {
        const cachedFrame = frameCache.get(cacheKey)!;
        

        
        ctx.drawImage(cachedFrame, drawX, drawY, drawWidth, drawHeight);
      } else {
        // Draw a loading placeholder with animation
        const loadingColor = `hsl(${(r * cols + c) * 30}, 70%, 85%)`;
        ctx.fillStyle = loadingColor;
        ctx.fillRect(x, y, cellW, cellH);
        
        // Add an animated loading indicator
        const loadingProgress = (Date.now() / 1000) % 2; // 2-second cycle
        const loadingAlpha = 0.3 + (loadingProgress * 0.4); // Fade in/out
        
        ctx.fillStyle = `rgba(255, 255, 255, ${loadingAlpha})`;
        ctx.fillRect(x + cellW * 0.4, y + cellH * 0.4, cellW * 0.2, cellH * 0.2);
        
        // Add loading text for larger grids
        if (totalFrames > 9) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Loading...', x + cellW / 2, y + cellH * 0.7);
        }
      }
      
      // Draw border if enabled
      if (showBorders) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(x, y, cellW, cellH);
      }
    }
  }
}

/**
 * Clear the frame cache for a specific video
 */
export function clearFrameCache(videoSrc?: string) {
  if (videoSrc) {
    // Clear cache for specific video
    for (const key of frameCache.keys()) {
      if (key.startsWith(videoSrc)) {
        frameCache.delete(key);
      }
    }
  } else {
    // Clear entire cache
    frameCache.clear();
  }
} 