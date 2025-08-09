/**
 * Vitruvian Composite Effect
 * 
 * Creates body segmentation overlays that show "ghost" versions of the person
 * at different time intervals, creating a layered effect that visualizes 
 * the full motion sequence with actual body shapes.
 */

export interface VitruvianConfig {
  // Overlay Settings
  overlayCount: number;        // Number of body overlays (3-6)
  delayInterval: number;       // Time between overlays in seconds (0.2-1.0)
  fadeDuration: number;        // How long overlays fade in seconds (1-3)
  
  // Visual Styling
  overlayOpacity: number;      // Base overlay opacity (0.1-0.8)
  colorScheme: 'monochrome' | 'rainbow' | 'heatmap' | 'gradient';
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  
  // Body Rendering
  showOutline: boolean;        // Draw body outline
  fillBody: boolean;           // Fill body shape
  outlineWidth: number;        // Outline thickness (1-5)
  
  // Motion Flow
  showMotionFlow: boolean;     // Show direction indicators
  flowArrows: boolean;         // Arrow indicators
  arrowSize: number;           // Arrow size (10-30)
}

interface BodyOverlay {
  timestamp: number;
  bodyShape: Path2D;
  opacity: number;
  color: string;
  age: number;
  centerPoint: { x: number; y: number };
}

class OverlayManager {
  private overlays: BodyOverlay[] = [];
  public maxOverlays: number;
  public fadeDuration: number;
  private lastUpdateTime: number = 0;
  
  constructor(maxOverlays: number, fadeDuration: number) {
    this.maxOverlays = maxOverlays;
    this.fadeDuration = fadeDuration;
  }
  
  addOverlay(timestamp: number, bodyShape: Path2D, color: string, centerPoint: { x: number; y: number }) {
    // Remove overlays that exceed max count
    if (this.overlays.length >= this.maxOverlays) {
      this.overlays.shift(); // Remove oldest
    }
    
    // Add new overlay
    this.overlays.push({
      timestamp,
      bodyShape,
      opacity: 1.0,
      color,
      age: 0,
      centerPoint
    });
  }
  
  updateOverlays(currentTime: number) {
    // Update ages and opacities based on actual time differences
    this.overlays.forEach(overlay => {
      overlay.age = currentTime - overlay.timestamp;
      overlay.opacity = Math.max(0, 1 - (overlay.age / this.fadeDuration));
    });
    
    // Remove fully faded overlays
    this.overlays = this.overlays.filter(overlay => overlay.opacity > 0.01);
    
    this.lastUpdateTime = currentTime;
  }
  
  getOverlays(): BodyOverlay[] {
    return [...this.overlays];
  }
  
  clear() {
    this.overlays = [];
  }
}

/**
 * Create body shape from pose keypoints (fallback when segmentation unavailable)
 */
function createBodyShapeFromPose(pose: any, scale: number = 1): { shape: Path2D; center: { x: number; y: number } } {
  const bodyShape = new Path2D();
  const keypoints = pose.keypoints;
  
  // Filter valid keypoints (confidence > 0.3)
  const validKeypoints = keypoints.filter((kp: any) => kp.score > 0.3);
  if (validKeypoints.length < 5) {
    // Not enough keypoints, return empty shape
    return { shape: bodyShape, center: { x: 0, y: 0 } };
  }
  
  // Key body points
  const nose = keypoints[0];
  const leftEye = keypoints[1];
  const rightEye = keypoints[2];
  const leftEar = keypoints[3];
  const rightEar = keypoints[4];
  const leftShoulder = keypoints[5];
  const rightShoulder = keypoints[6];
  const leftElbow = keypoints[7];
  const rightElbow = keypoints[8];
  const leftWrist = keypoints[9];
  const rightWrist = keypoints[10];
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  const leftKnee = keypoints[13];
  const rightKnee = keypoints[14];
  const leftAnkle = keypoints[15];
  const rightAnkle = keypoints[16];
  
  // Calculate center point
  const validPoints = validKeypoints.filter((kp: any) => kp.score > 0.5);
  const center = {
    x: validPoints.reduce((sum: number, kp: any) => sum + kp.x, 0) / validPoints.length * scale,
    y: validPoints.reduce((sum: number, kp: any) => sum + kp.y, 0) / validPoints.length * scale
  };
  
  // Create a more body-like silhouette by connecting keypoints
  const bodyPoints: Array<{x: number, y: number, valid: boolean}> = [];
  
  // Head contour (wider than just nose)
  if (nose.score > 0.3) {
    const headRadius = 30 * scale;
    const headX = nose.x * scale;
    const headY = nose.y * scale;
    
    // Create head circle
    bodyShape.moveTo(headX + headRadius, headY);
    bodyShape.arc(headX, headY, headRadius, 0, 2 * Math.PI);
  }
  
  // Body outline using connected points
  const bodyOutline: Array<{x: number, y: number}> = [];
  
  // Left side of body (top to bottom)
  if (leftShoulder.score > 0.3) bodyOutline.push({x: leftShoulder.x * scale, y: leftShoulder.y * scale});
  if (leftElbow.score > 0.3) bodyOutline.push({x: leftElbow.x * scale, y: leftElbow.y * scale});
  if (leftWrist.score > 0.3) bodyOutline.push({x: leftWrist.x * scale, y: leftWrist.y * scale});
  if (leftHip.score > 0.3) bodyOutline.push({x: leftHip.x * scale, y: leftHip.y * scale});
  if (leftKnee.score > 0.3) bodyOutline.push({x: leftKnee.x * scale, y: leftKnee.y * scale});
  if (leftAnkle.score > 0.3) bodyOutline.push({x: leftAnkle.x * scale, y: leftAnkle.y * scale});
  
  // Bottom connection
  if (rightAnkle.score > 0.3) bodyOutline.push({x: rightAnkle.x * scale, y: rightAnkle.y * scale});
  
  // Right side of body (bottom to top)
  if (rightKnee.score > 0.3) bodyOutline.push({x: rightKnee.x * scale, y: rightKnee.y * scale});
  if (rightHip.score > 0.3) bodyOutline.push({x: rightHip.x * scale, y: rightHip.y * scale});
  if (rightWrist.score > 0.3) bodyOutline.push({x: rightWrist.x * scale, y: rightWrist.y * scale});
  if (rightElbow.score > 0.3) bodyOutline.push({x: rightElbow.x * scale, y: rightElbow.y * scale});
  if (rightShoulder.score > 0.3) bodyOutline.push({x: rightShoulder.x * scale, y: rightShoulder.y * scale});
  
  // Create body shape from outline
  if (bodyOutline.length > 3) {
    bodyShape.moveTo(bodyOutline[0].x, bodyOutline[0].y);
    for (let i = 1; i < bodyOutline.length; i++) {
      bodyShape.lineTo(bodyOutline[i].x, bodyOutline[i].y);
    }
    bodyShape.closePath();
  }
  
  // Add individual limb shapes for better body representation
  // Torso (main body mass)
  if (leftShoulder.score > 0.3 && rightShoulder.score > 0.3 && 
      leftHip.score > 0.3 && rightHip.score > 0.3) {
    
    // Create rounded torso shape
    const torsoWidth = Math.abs(rightShoulder.x - leftShoulder.x) * scale;
    const torsoHeight = Math.abs(leftHip.y - leftShoulder.y) * scale;
    const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * scale;
    const centerY = ((leftShoulder.y + leftHip.y) / 2) * scale;
    
    bodyShape.ellipse(centerX, centerY, torsoWidth / 2, torsoHeight / 2, 0, 0, 2 * Math.PI);
  }
  
  // Thicker limbs for more body-like appearance
  if (leftShoulder.score > 0.3 && leftWrist.score > 0.3) {
    createLimbShape(bodyShape, leftShoulder, leftWrist, 25 * scale, scale);
  }
  if (rightShoulder.score > 0.3 && rightWrist.score > 0.3) {
    createLimbShape(bodyShape, rightShoulder, rightWrist, 25 * scale, scale);
  }
  if (leftHip.score > 0.3 && leftAnkle.score > 0.3) {
    createLimbShape(bodyShape, leftHip, leftAnkle, 35 * scale, scale);
  }
  if (rightHip.score > 0.3 && rightAnkle.score > 0.3) {
    createLimbShape(bodyShape, rightHip, rightAnkle, 35 * scale, scale);
  }
  
  return { shape: bodyShape, center };
}

/**
 * Create a limb shape between two points
 */
function createLimbShape(path: Path2D, start: any, end: any, width: number, scale: number) {
  const startX = start.x * scale;
  const startY = start.y * scale;
  const endX = end.x * scale;
  const endY = end.y * scale;
  
  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const length = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
  const angle = Math.atan2(endY - startY, endX - startX);
  
  // Create ellipse for limb
  path.ellipse(centerX, centerY, length / 2, width / 2, angle, 0, 2 * Math.PI);
}



/**
 * Get overlay color based on scheme
 */
function getOverlayColor(scheme: string, index: number, total: number, baseOpacity: number): string {
  const alpha = baseOpacity * (0.3 + (index / Math.max(total - 1, 1)) * 0.7);
  
  switch (scheme) {
    case 'monochrome':
      return `rgba(100, 200, 255, ${alpha})`;
    
    case 'rainbow':
      const hue = (index / Math.max(total - 1, 1)) * 300; // 0-300 degrees for nice rainbow
      return `hsla(${hue}, 70%, 60%, ${alpha})`;
    
    case 'heatmap':
      const intensity = index / Math.max(total - 1, 1);
      const heatRed = Math.floor(255 * intensity);
      const heatGreen = Math.floor(100 + 155 * (1 - intensity));
      const heatBlue = Math.floor(100 * (1 - intensity));
      return `rgba(${heatRed}, ${heatGreen}, ${heatBlue}, ${alpha})`;
    
    case 'gradient':
      const gradientPos = index / Math.max(total - 1, 1);
      const gradRed = Math.floor(100 + 155 * gradientPos);
      const gradGreen = Math.floor(150 + 105 * (1 - gradientPos));
      const gradBlue = 255;
      return `rgba(${gradRed}, ${gradGreen}, ${gradBlue}, ${alpha})`;
    
    default:
      return `rgba(100, 200, 255, ${alpha})`;
  }
}

/**
 * Draw motion flow arrows between overlay centers
 */
function renderMotionFlow(
  ctx: CanvasRenderingContext2D,
  overlays: BodyOverlay[],
  config: VitruvianConfig
) {
  if (!config.showMotionFlow || !config.flowArrows || overlays.length < 2) return;
  
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  for (let i = 0; i < overlays.length - 1; i++) {
    const start = overlays[i].centerPoint;
    const end = overlays[i + 1].centerPoint;
    
    // Skip if points are too close
    const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    if (distance < 20) continue;
    
    // Draw arrow
    drawArrow(ctx, start.x, start.y, end.x, end.y, config.arrowSize);
  }
  
  ctx.restore();
}

/**
 * Draw an arrow from start to end point
 */
function drawArrow(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, size: number) {
  const angle = Math.atan2(endY - startY, endX - startX);
  const arrowLength = size;
  const arrowAngle = Math.PI / 6;
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  
  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowLength * Math.cos(angle - arrowAngle),
    endY - arrowLength * Math.sin(angle - arrowAngle)
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowLength * Math.cos(angle + arrowAngle),
    endY - arrowLength * Math.sin(angle + arrowAngle)
  );
  ctx.stroke();
}

// Global overlay manager instance
let overlayManager: OverlayManager | null = null;

/**
 * Main render function for Vitruvian effect
 */
export function renderVitruvian(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  poses: any[],
  config: Partial<VitruvianConfig> = {},
  currentTime: number = 0,
  isExport: boolean = false
) {
  // Default configuration
  const defaultConfig: VitruvianConfig = {
    overlayCount: 4,
    delayInterval: 0.5,
    fadeDuration: 2.0,
    overlayOpacity: 0.6,
    colorScheme: 'rainbow',
    blendMode: 'screen',
    showOutline: true,
    fillBody: true,
    outlineWidth: 2,
    showMotionFlow: true,
    flowArrows: true,
    arrowSize: 20
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Initialize overlay manager if needed or config changed
  if (!overlayManager || 
      overlayManager.maxOverlays !== finalConfig.overlayCount ||
      overlayManager.fadeDuration !== finalConfig.fadeDuration) {
    overlayManager = new OverlayManager(finalConfig.overlayCount, finalConfig.fadeDuration);
  }
  
  if (!poses || poses.length === 0) return;

  // Calculate frame indices based on actual video timing (similar to motion-trails)
  const totalDuration = video.duration || 1;
  const totalFrames = poses.length;
  const framesPerSecond = totalFrames / totalDuration;
  
  // Find the current frame index based on actual video time
  const currentFrameIndex = Math.floor(currentTime * framesPerSecond);
  const currentPose = poses[Math.min(currentFrameIndex, totalFrames - 1)];
  
  if (!currentPose || !currentPose.keypoints) return;

  // Calculate scale based on canvas size vs video size
  const scaleX = isExport ? 1 : ctx.canvas.width / video.videoWidth;
  const scaleY = isExport ? 1 : ctx.canvas.height / video.videoHeight;
  const scale = Math.min(scaleX, scaleY);
  
  // Update overlay manager with actual current time
  overlayManager.updateOverlays(currentTime);
  
  // Check if we should add a new overlay
  const overlays = overlayManager.getOverlays();
  const shouldAddOverlay = overlays.length === 0 || 
    (currentTime - overlays[overlays.length - 1].timestamp) >= finalConfig.delayInterval;
  
  if (shouldAddOverlay) {
    // Create body shape from current pose
    const { shape: bodyShape, center } = createBodyShapeFromPose(currentPose, scale);
    const color = getOverlayColor(
      finalConfig.colorScheme, 
      overlays.length, 
      finalConfig.overlayCount,
      finalConfig.overlayOpacity
    );
    
    overlayManager.addOverlay(currentTime, bodyShape, color, center);
  }
  
  // Render all overlays
  ctx.save();
  
  const currentOverlays = overlayManager.getOverlays();
  currentOverlays.forEach((overlay, index) => {
    ctx.save();
    
    // Apply blend mode and opacity
    ctx.globalCompositeOperation = finalConfig.blendMode as GlobalCompositeOperation;
    ctx.globalAlpha = overlay.opacity;
    
    // Fill body shape
    if (finalConfig.fillBody) {
      ctx.fillStyle = overlay.color;
      ctx.fill(overlay.bodyShape);
    }
    
    // Draw outline
    if (finalConfig.showOutline) {
      ctx.strokeStyle = overlay.color;
      ctx.lineWidth = finalConfig.outlineWidth;
      ctx.stroke(overlay.bodyShape);
    }
    
    ctx.restore();
  });
  
  // Render motion flow
  if (finalConfig.showMotionFlow) {
    renderMotionFlow(ctx, currentOverlays, finalConfig);
  }
  
  ctx.restore();
}

/**
 * Reset the overlay manager (useful when switching videos)
 */
export function resetVitruvian() {
  if (overlayManager) {
    overlayManager.clear();
  }
  overlayManager = null; // Force recreation with new config
}

/**
 * Get default configuration for the effect
 */
export function getDefaultVitruvianConfig(): VitruvianConfig {
  return {
    overlayCount: 4,
    delayInterval: 0.5,
    fadeDuration: 2.0,
    overlayOpacity: 0.6,
    colorScheme: 'rainbow',
    blendMode: 'screen',
    showOutline: true,
    fillBody: true,
    outlineWidth: 2,
    showMotionFlow: true,
    flowArrows: true,
    arrowSize: 20
  };
} 